import { Router } from 'express';
import ExcelJS from 'exceljs';
import xlsx from 'xlsx';
import fs from 'fs';
import { createHash } from 'crypto';

import {
  pool
} from '../../config/database.js';

import {
  requireAdmin,
  hasPermiso
} from '../../middlewares/auth.js';

import {
  upload
} from '../../middlewares/upload.js';

import {
  uploadToCloudinary,
  deleteFromCloudinary
} from '../../../services/cloudinaryService.js';
import {
  listarLegacy,
  registrarLegacy,
  buscarPersonal,
  listarInventario,
  registrarMovimiento,
  editarMovimiento,
  borrarMovimiento
} from './controller.js';

export const legacyEntregasRoutes = Router();
export const entregasRoutes = Router();

// ==========================================
// RUTAS LEGACY /entregas
// ==========================================

legacyEntregasRoutes.get(
  '/',
  listarLegacy
);

legacyEntregasRoutes.post(
  '/',
  registrarLegacy
);

// ==========================================
// CONSULTAR PERSONAL POR DNI
// ==========================================

entregasRoutes.get(
  '/personal/:dni',
  buscarPersonal
);

// ==========================================
// LISTAR INVENTARIO
// ==========================================

entregasRoutes.get(
  '/',
  listarInventario
);

// ==========================================
// CREAR ENTREGA / DEVOLUCIÓN
// ==========================================

entregasRoutes.post(
  '/',
  upload.single('acta'),
  registrarMovimiento
);

// ==========================================
// ACTUALIZAR
// ==========================================

entregasRoutes.put(
  '/:id',
  upload.single('acta'),
  editarMovimiento
);

// ==========================================
// ELIMINAR
// ==========================================

entregasRoutes.delete(
  '/:id',
  requireAdmin,
  borrarMovimiento
);

// ==========================================
// IMPORTAR EXCEL
// ==========================================

entregasRoutes.post(
  '/upload-excel',
  requireAdmin,
  (req, res, next) => {
    if (
      !hasPermiso(
        req,
        'entregas',
        'editar'
      ) ||
      !hasPermiso(
        req,
        'devoluciones',
        'editar'
      )
    ) {
      return res.status(403).json({
        error:
          'No tienes permiso para realizar cargas masivas de inventario'
      });
    }

    return next();
  },
  upload.single('file'),
  async (req, res) => {
    if (!req.file?.buffer) {
      return res.status(400).json({
        error:
          'Selecciona un archivo Excel'
      });
    }

    const tipo =
      req.body.tipo;

    if (
      ![
        'Entrega',
        'Devolución'
      ].includes(tipo)
    ) {
      return res.status(400).json({
        error:
          'Selecciona Entregas o Devoluciones antes de importar'
      });
    }

    let client;

    try {
      const texto = valor =>
        String(
          valor ?? ''
        ).trim();

      const normalizar = valor =>
        texto(valor)
          .replace(/\s+/g, ' ')
          .toUpperCase();

      const serieClave = valor =>
        /^(?:-*|S\/N|N\/A|NULL|SIN SERIE|NO APLICA)$/.test(
          normalizar(valor)
        )
          ? ''
          : normalizar(valor);

      const fallo = mensaje => {
        throw Object.assign(
          new Error(mensaje),
          {
            status: 400
          }
        );
      };

      const workbook =
        xlsx.read(
          req.file.buffer,
          {
            type: 'buffer',
            cellDates: false
          }
        );

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      if (!sheet) {
        fallo(
          'El archivo no contiene una hoja'
        );
      }

      const data =
        xlsx.utils.sheet_to_json(
          sheet,
          {
            header: 1,
            defval: null,
            blankrows: true,
            range: 0
          }
        );

      const titulo =
        normalizar(
          sheet.D2?.v
        );

      const tipoArchivo =
        titulo.includes(
          'DEVOLUCIONES'
        )
          ? 'Devolución'
          : titulo.includes(
              'ENTREGAS'
            )
            ? 'Entrega'
            : null;

      if (
        tipoArchivo !== tipo
      ) {
        fallo(
          'El título del Excel no corresponde a la sección seleccionada'
        );
      }

      const cabecera =
        data.findIndex(row => {
          return (
            normalizar(row[1]) ===
              'FECHA' &&
            normalizar(row[4]) ===
              'DNI' &&
            normalizar(row[8]) ===
              'EQUIPO' &&
            normalizar(
              row[11]
            ).startsWith('S/N')
          );
        });

      if (cabecera < 0) {
        fallo(
          'No se reconocen las columnas del formato de inventario TI'
        );
      }

      const convertirFecha = (
        valor,
        fila
      ) => {
        if (!texto(valor)) {
          return null;
        }

        let fechaISO;

        if (
          typeof valor === 'number'
        ) {
          const usa1904 = [
            true,
            1,
            '1',
            'true'
          ].includes(
            workbook.Workbook
              ?.WBProps
              ?.date1904
          );

          const dias =
            Math.floor(valor);

          if (
            !Number.isFinite(
              valor
            ) ||
            dias <
              (
                usa1904
                  ? 0
                  : 1
              ) ||
            (
              !usa1904 &&
              dias === 60
            )
          ) {
            fallo(
              `Fecha numérica no válida en la fila ${fila}`
            );
          }

          const base =
            usa1904
              ? Date.UTC(
                  1904,
                  0,
                  1
                )
              : Date.UTC(
                  1899,
                  11,
                  dias < 60
                    ? 31
                    : 30
                );

          const fecha =
            new Date(
              base +
              dias *
                86400000
            );

          if (
            Number.isNaN(
              fecha.getTime()
            )
          ) {
            fallo(
              `Fecha no válida en la fila ${fila}`
            );
          }

          fechaISO =
            fecha
              .toISOString()
              .slice(0, 10);
        } else {
          const partes =
            texto(valor).match(
              /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
            );

          fechaISO =
            partes
              ? `${partes[3]}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`
              : texto(valor);
        }

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(
            fechaISO
          ) ||
          fechaISO.startsWith(
            '0000-'
          )
        ) {
          fallo(
            `Formato de fecha no válido en la fila ${fila}`
          );
        }

        const fecha =
          new Date(
            `${fechaISO}T00:00:00.000Z`
          );

        if (
          Number.isNaN(
            fecha.getTime()
          ) ||
          fecha
            .toISOString()
            .slice(0, 10) !==
            fechaISO
        ) {
          fallo(
            `Fecha inexistente en la fila ${fila}`
          );
        }

        return fechaISO;
      };

      const campos = [
        'fecha',
        'encargado',
        'nombre',
        'dni',
        'cargo',
        'operacion',
        'condicion',
        'equipo_tipo',
        'marca',
        'modelo',
        'serie',
        'laptop',
        'mouse',
        'cargador',
        'motivo',
        'observaciones',
        'precio',
        'tipo_movimiento'
      ];

      const registros = [];

      for (
        let i =
          cabecera + 1;
        i < data.length;
        i++
      ) {
        const row =
          data[i];

        if (
          !row?.some(value =>
            texto(value)
          )
        ) {
          continue;
        }

        if (!texto(row[3])) {
          fallo(
            `Falta el nombre en la fila ${i + 1}`
          );
        }

        const registro =
          Object.fromEntries(
            campos
              .slice(0, 17)
              .map(
                (
                  campo,
                  index
                ) => [
                  campo,
                  texto(
                    row[
                      index + 1
                    ]
                  ) ||
                    null
                ]
              )
          );

        registro.fecha =
          convertirFecha(
            row[1],
            i + 1
          );

        registro.precio =
          !texto(row[17]) ||
          /^-+$/.test(
            texto(row[17])
          )
            ? null
            : Number(
                row[17]
              );

        if (
          registro.precio !==
            null &&
          !Number.isFinite(
            registro.precio
          )
        ) {
          fallo(
            `Precio no válido en la fila ${i + 1}`
          );
        }

        registro.tipo_movimiento =
          tipo;

        registro.fila =
          i + 1;

        registros.push(
          registro
        );
      }

      if (
        !registros.length ||
        registros.length >
          10000
      ) {
        fallo(
          'El Excel debe contener entre 1 y 10000 registros'
        );
      }

      const clave = registro =>
        JSON.stringify([
          normalizar(
            registro.tipo_movimiento ||
              'Entrega'
          ).replace(
            'DEVOLUCION',
            'DEVOLUCIÓN'
          ),

          registro.fecha || '',

          normalizar(
            registro.dni
          ),

          normalizar(
            registro.nombre
          ),

          normalizar(
            registro.equipo_tipo
          ),

          serieClave(
            registro.serie
          )
        ]);

      client =
        await pool.connect();

      await client.query(
        'BEGIN'
      );

      await client.query(
        "SET LOCAL lock_timeout = '5s'"
      );

      await client.query(
        "SET LOCAL statement_timeout = '30s'"
      );

      await client.query(
        'LOCK TABLE public.entregas_ti IN SHARE ROW EXCLUSIVE MODE'
      );

      const actual =
        await client.query(
          `
            SELECT *,
              to_char(
                fecha,
                'YYYY-MM-DD'
              ) AS fecha
            FROM public.entregas_ti
          `
        );

      const conocidas =
        new Set(
          actual.rows.map(
            clave
          )
        );

      const nuevos = [];

      let omitidos = 0;

      for (
        const registro
        of registros
      ) {
        const llave =
          clave(registro);

        if (
          conocidas.has(
            llave
          )
        ) {
          omitidos++;
          continue;
        }

        if (
          !registro.fecha ||
          !registro.dni ||
          !registro.equipo_tipo ||
          normalizar(
            registro.equipo_tipo
          ) === 'NUEVO'
        ) {
          fallo(
            `La fila ${registro.fila} no coincide con un registro existente y necesita revisar fecha, DNI o equipo antes de importarse`
          );
        }

        conocidas.add(
          llave
        );

        nuevos.push(
          registro
        );
      }

      const firma =
        createHash('sha256')
          .update(
            JSON.stringify(
              nuevos.map(
                registro =>
                  campos.map(
                    campo =>
                      registro[
                        campo
                      ]
                  )
              )
            )
          )
          .digest('hex');

      const resumen = {
        total:
          registros.length,
        nuevos:
          nuevos.length,
        omitidos,
        firma
      };

      if (
        req.body.confirmar !==
        'si'
      ) {
        await client.query(
          'ROLLBACK'
        );

        return res.json({
          ...resumen,
          revision: true,
          message:
            `Revisión: ${nuevos.length} por agregar; ${omitidos} ya reconocidos. No se guardó nada.`
        });
      }

      if (
        req.body.firma !==
        firma
      ) {
        fallo(
          'Los datos cambiaron desde la revisión. Vuelve a seleccionar el archivo para revisarlo otra vez'
        );
      }

      const sql = `
        INSERT INTO public.entregas_ti (
          ${campos.join(', ')}
        )
        VALUES (
          ${campos
            .map(
              (_, index) =>
                `$${index + 1}`
            )
            .join(', ')}
        )
      `;

      for (
        const registro
        of nuevos
      ) {
        await client.query(
          sql,
          campos.map(
            campo =>
              registro[
                campo
              ]
          )
        );
      }

      await client.query(
        'COMMIT'
      );

      return res.json({
        ...resumen,
        insertados:
          nuevos.length,
        message:
          `Importación completada: ${nuevos.length} agregados y ${omitidos} ya reconocidos.`
      });
    } catch (error) {
      if (client) {
        try {
          await client.query(
            'ROLLBACK'
          );
        } catch (
          rollbackError
        ) {
          client.release(
            rollbackError
          );

          client = null;
        }
      }

      console.error(
        'Error importando Excel:',
        error
      );

      return res
        .status(
          error.status ||
            500
        )
        .json({
          error:
            error.status ===
            400
              ? error.message
              : 'No se pudo completar la importación. Revisa el registro del backend antes de reintentar.'
        });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// ==========================================
// EXPORTAR EXCEL
// ==========================================

entregasRoutes.get(
  '/export-excel',
  async (req, res) => {
    try {
      const {
        tipo,
        categoria,
        fechaInicio,
        fechaFin
      } = req.query;

      const tipoNormalizado =
        String(tipo || '')
          .trim()
          .toLowerCase();

      const isValidISODate =
        value => {
          if (
            typeof value !==
              'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
              value
            )
          ) {
            return false;
          }

          const date =
            new Date(
              `${value}T00:00:00Z`
            );

          return (
            Number.isFinite(
              date.getTime()
            ) &&
            date
              .toISOString()
              .slice(
                0,
                10
              ) === value
          );
        };

      if (
        !isValidISODate(
          fechaInicio
        ) ||
        !isValidISODate(
          fechaFin
        ) ||
        fechaInicio >
          fechaFin
      ) {
        return res.status(400).json({
          error:
            'El rango de fechas no es válido'
        });
      }

      if (
        tipoNormalizado &&
        ![
          'entrega',
          'devolución',
          'devolucion'
        ].includes(
          tipoNormalizado
        )
      ) {
        return res.status(400).json({
          error:
            'Tipo de movimiento no válido'
        });
      }

      const puedeVerEntregas =
        hasPermiso(
          req,
          'entregas',
          'ver'
        );

      const puedeVerDevoluciones =
        hasPermiso(
          req,
          'devoluciones',
          'ver'
        );

      let tipoAutorizado =
        tipoNormalizado ===
        'entrega'
          ? 'Entrega'
          : (
              tipoNormalizado ===
                'devolución' ||
              tipoNormalizado ===
                'devolucion'
            )
            ? 'Devolución'
            : null;

      if (
        tipoAutorizado ===
          'Entrega' &&
        !puedeVerEntregas
      ) {
        return res.status(403).json({
          error:
            'No tienes permiso para exportar entregas'
        });
      }

      if (
        tipoAutorizado ===
          'Devolución' &&
        !puedeVerDevoluciones
      ) {
        return res.status(403).json({
          error:
            'No tienes permiso para exportar devoluciones'
        });
      }

      if (!tipoAutorizado) {
        if (
          puedeVerEntregas &&
          !puedeVerDevoluciones
        ) {
          tipoAutorizado =
            'Entrega';
        } else if (
          !puedeVerEntregas &&
          puedeVerDevoluciones
        ) {
          tipoAutorizado =
            'Devolución';
        } else if (
          !puedeVerEntregas &&
          !puedeVerDevoluciones
        ) {
          return res.status(403).json({
            error:
              'No tienes permiso para exportar inventario'
          });
        }
      }

      let query = `
        SELECT *
        FROM entregas_ti
        WHERE 1 = 1
      `;

      const params = [];

      if (
        tipoAutorizado ===
        'Devolución'
      ) {
        params.push(
          'Devolución'
        );

        query += `
          AND tipo_movimiento =
              $${params.length}
        `;
      } else if (
        tipoAutorizado ===
        'Entrega'
      ) {
        params.push(
          'Entrega'
        );

        query += `
          AND (
            tipo_movimiento =
              $${params.length}
            OR tipo_movimiento IS NULL
            OR tipo_movimiento = ''
          )
        `;
      }

      if (categoria) {
        params.push(
          `%${categoria}%`
        );

        query += `
          AND equipo_tipo
              ILIKE
              $${params.length}
        `;
      }

      params.push(
        fechaInicio,
        fechaFin
      );

      query += `
        AND NULLIF(
          BTRIM(fecha::text),
          ''
        )::date
        BETWEEN
          $${params.length - 1}::date
          AND
          $${params.length}::date
      `;

      query +=
        ' ORDER BY id ASC';

      const result =
        await pool.query(
          query,
          params
        );

      const entregas =
        result.rows;

      const formatDMY =
        dateObj => {
          if (!dateObj) {
            return '';
          }

          const day =
            dateObj
              .getDate()
              .toString()
              .padStart(
                2,
                '0'
              );

          const month =
            (
              dateObj.getMonth() +
              1
            )
              .toString()
              .padStart(
                2,
                '0'
              );

          const year =
            dateObj.getFullYear();

          return (
            `${day}-${month}-${year}`
          );
        };

      const workbook =
        new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet(
          'ENTREGAS TI',
          {
            views: [
              {
                showGridLines:
                  false
              }
            ]
          }
        );

      // Logo
      const logoPath =
        'C:\\Users\\LEONARDONEIRA\\.gemini\\antigravity\\brain\\e3497895-f6e2-4012-b5fb-890e3415d02a\\media__1781535209025.png';

      if (
        fs.existsSync(
          logoPath
        )
      ) {
        const logoImage =
          workbook.addImage({
            filename:
              logoPath,
            extension:
              'png'
          });

        worksheet.addImage(
          logoImage,
          {
            tl: {
              col: 0,
              row: 0
            },
            ext: {
              width: 250,
              height: 80
            }
          }
        );
      }

      worksheet.mergeCells(
        'D2:J3'
      );

      const titleCell =
        worksheet.getCell(
          'D2'
        );

      titleCell.value =
        tipoAutorizado ===
        'Devolución'
          ? 'REGISTRO DE DEVOLUCIONES TI'
          : 'REGISTRO DE ENTREGAS TI';

      titleCell.font = {
        name: 'Arial',
        size: 16,
        bold: true,
        color: {
          argb:
            'FFFFFFFF'
        }
      };

      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb:
            'FF1E40AF'
        }
      };

      titleCell.alignment = {
        vertical: 'middle',
        horizontal:
          'center'
      };

      worksheet.getRow(
        5
      ).height = 10;

      const headers = [
        'N°',
        'FECHA',
        'ENTREGADO POR TI',
        'NOMBRES Y APELLIDOS / CUSTODIO',
        'DNI',
        'CARGO',
        'OPERACION',
        'CONDICION DE EQUIPO A ENTREGAR',
        'EQUIPO',
        'MARCA',
        'MODELO',
        'S/N Y/O N° DE SERIE',
        'LAPTOP',
        'MOUSE',
        'CARGADOR',
        'MOTIVO DE ENTREGA Y/O CAMBIO',
        'OBSERVACION',
        'PRECIO'
      ];

      const headerRow =
        worksheet.getRow(6);

      headerRow.values =
        headers;

      headerRow.height =
        30;

      headerRow.eachCell(
        cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb:
                'FF3B82F6'
            }
          };

          cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: {
              argb:
                'FFFFFFFF'
            }
          };

          cell.alignment = {
            vertical:
              'middle',
            horizontal:
              'center',
            wrapText: true
          };

          cell.border = {
            top: {
              style: 'thin'
            },
            left: {
              style: 'thin'
            },
            bottom: {
              style: 'thin'
            },
            right: {
              style: 'thin'
            }
          };
        }
      );

      entregas.forEach(
        (
          entrega,
          index
        ) => {
          const row =
            worksheet.addRow([
              index + 1,

              entrega.fecha
                ? formatDMY(
                    new Date(
                      entrega.fecha
                    )
                  )
                : '',

              entrega.encargado ||
                '',

              entrega.nombre ||
                '',

              entrega.dni ||
                '',

              entrega.cargo ||
                '',

              entrega.operacion ||
                '',

              entrega.condicion ||
                '',

              entrega.equipo_tipo ||
                '',

              entrega.marca ||
                '',

              entrega.modelo ||
                '',

              entrega.serie ||
                '',

              entrega.laptop ||
                '',

              entrega.mouse ||
                '',

              entrega.cargador ||
                '',

              entrega.motivo ||
                '',

              entrega.observaciones ||
                '',

              entrega.precio ||
                ''
            ]);

          row.eachCell(
            cell => {
              cell.font = {
                name:
                  'Arial',
                size: 10
              };

              cell.alignment = {
                vertical:
                  'middle',
                horizontal:
                  'left',
                wrapText: true
              };

              cell.border = {
                top: {
                  style:
                    'thin',
                  color: {
                    argb:
                      'FFDDDDDD'
                  }
                },

                left: {
                  style:
                    'thin',
                  color: {
                    argb:
                      'FFDDDDDD'
                  }
                },

                bottom: {
                  style:
                    'thin',
                  color: {
                    argb:
                      'FFDDDDDD'
                  }
                },

                right: {
                  style:
                    'thin',
                  color: {
                    argb:
                      'FFDDDDDD'
                  }
                }
              };
            }
          );

          if (
            index % 2 === 0
          ) {
            row.eachCell(
              cell => {
                cell.fill = {
                  type:
                    'pattern',
                  pattern:
                    'solid',
                  fgColor: {
                    argb:
                      'FFF9FAFB'
                  }
                };
              }
            );
          }
        }
      );

      worksheet.columns = [
        { width: 5 },
        { width: 12 },
        { width: 20 },
        { width: 35 },
        { width: 15 },
        { width: 25 },
        { width: 20 },
        { width: 25 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 30 },
        { width: 30 },
        { width: 15 }
      ];

      const buffer =
        await workbook.xlsx
          .writeBuffer();

      const filename =
        tipoAutorizado ===
        'Devolución'
          ? `Devoluciones_TI_${fechaInicio}_al_${fechaFin}.xlsx`
          : `Entregas_TI_${fechaInicio}_al_${fechaFin}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}`
      );

      return res.send(
        buffer
      );
    } catch (error) {
      console.error(
        'Error exportando Excel:',
        error
      );
      return res.status(500).send(
        'Error generando el archivo Excel premium'
      );
    }
  }
);
