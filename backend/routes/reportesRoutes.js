import { Router } from 'express';
import ExcelJS from 'exceljs';

import { pool } from '../src/config/database.js';

import {
  generatePDF,
  generateExcel
} from '../reports.js';

import {
  generateMasterReport
} from '../reporteMaster.js';

export const apiReportesRoutes = Router();
export const reportesRoutes = Router();

// ==========================================
// OPERACIONES PARA REPORTES
// ==========================================

apiReportesRoutes.get(
  '/operaciones',
  async (req, res) => {
    try {
      const result = await pool.query(
        `
          SELECT MIN(op) AS operacion
          FROM (
            SELECT
              CASE
                WHEN LOWER(
                  BTRIM(
                    COALESCE(operacion, '')
                  )
                ) IN (
                  '',
                  'null',
                  'sin operacion',
                  'sin operación',
                  'falta identificar'
                )
                THEN 'Sin Operación'
                ELSE BTRIM(operacion)
              END AS op
            FROM vehiculos
            WHERE LOWER(
              BTRIM(
                COALESCE(operacion, '')
              )
            ) NOT IN (
              'test',
              'text'
            )
          ) operaciones_limpias
          GROUP BY LOWER(op)
          ORDER BY operacion
        `
      );

      return res.json(
        result.rows.map(row => row.operacion)
      );
    } catch (error) {
      console.error(
        'Error obteniendo operaciones de reportes:',
        error
      );

      return res.status(500).json({
        error:
          'No se pudieron cargar las operaciones'
      });
    }
  }
);

// ==========================================
// REPORTE MASTER
// ==========================================

apiReportesRoutes.get(
  '/master',
  async (req, res) => {
    const {
      startDate,
      endDate,
      operacion
    } = req.query;

    const fechaValida = value => {
      if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const date = new Date(
        `${value}T00:00:00Z`
      );

      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      !fechaValida(startDate) ||
      !fechaValida(endDate) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        error:
          'El rango de fechas no es válido'
      });
    }

    if (
      typeof operacion !== 'string' ||
      !operacion.trim() ||
      operacion.length > 100
    ) {
      return res.status(400).json({
        error:
          'Seleccione una operación válida'
      });
    }

    try {
      const workbook =
        await generateMasterReport(
          pool,
          startDate,
          endDate,
          operacion.trim()
        );

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Reporte_Master.xlsx'
      );

      await workbook.xlsx.write(res);

      return res.end();
    } catch (error) {
      console.error(
        'Error generando Reporte Master:',
        error
      );

      if (res.headersSent) {
        return res.destroy();
      }

      return res
        .status(
          error.status === 404
            ? 404
            : 500
        )
        .json({
          error:
            error.status === 404
              ? error.message
              : 'Error interno generando reporte'
        });
    }
  }
);

// ==========================================
// REPORTE DE MANTENIMIENTO EXCEL
// ==========================================

apiReportesRoutes.get(
  '/mantenimiento-excel',
  async (req, res) => {
    try {
      const workbook =
        new ExcelJS.Workbook();

      const sheet =
        workbook.addWorksheet(
          'Mantenimiento',
          {
            views: [
              {
                showGridLines: false
              }
            ]
          }
        );

      // ========================================
      // ESTILOS COMUNES
      // ========================================

      const borderAll = {
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

      const fontBold = {
        bold: true,
        name: 'Arial',
        size: 10
      };

      const fontNormal = {
        name: 'Arial',
        size: 9
      };

      const centerAlign = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };

      // ========================================
      // FILA 1: PROGRAMA
      // ========================================

      sheet.mergeCells('A1:U1');

      const f1 = sheet.getCell('A1');

      f1.value = 'PROGRAMA';

      f1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF1F4E99'
        }
      };

      f1.font = {
        bold: true,
        color: {
          argb: 'FFFFFFFF'
        },
        name: 'Arial'
      };

      f1.alignment = centerAlign;
      f1.border = borderAll;

      sheet.getCell('V1').value =
        'TI - PR - 01';

      sheet.getCell('V1').font =
        fontBold;

      sheet.getCell('V1').alignment =
        centerAlign;

      sheet.getCell('V1').border =
        borderAll;

      // ========================================
      // FILA 2 A 5: TÍTULO
      // ========================================

      sheet.mergeCells('D2:U5');

      const titulo =
        sheet.getCell('D2');

      titulo.value =
        'MANTENIMIENTO DE EQUIPOS TECNOLÓGICOS - TRACTO/CAMIONETAS';

      titulo.font = {
        bold: true,
        size: 14,
        name: 'Arial'
      };

      titulo.alignment =
        centerAlign;

      titulo.border =
        borderAll;

      // Logo

      sheet.mergeCells('A2:C5');

      sheet.getCell('A2').value =
        'TRANSMDICAS S.R.L.';

      sheet.getCell('A2').alignment =
        centerAlign;

      sheet.getCell('A2').font =
        fontBold;

      sheet.getCell('A2').border =
        borderAll;

      const metadata = [
        'Versión:',
        'Fecha:',
        'Revisa:',
        'Aprueba:'
      ];

      for (
        let i = 0;
        i < metadata.length;
        i++
      ) {
        const celda =
          sheet.getCell(
            `V${i + 2}`
          );

        celda.value =
          metadata[i];

        celda.border =
          borderAll;

        celda.font =
          fontNormal;
      }

      // ========================================
      // FILA 6: SECCIONES
      // ========================================

      const greenHeader = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF00FF99'
        }
      };

      sheet.mergeCells('A6:H6');
      sheet.getCell('A6').value =
        'DATOS';

      sheet.mergeCells('I6:K6');
      sheet.getCell('I6').value =
        'PROGRAMADO';

      sheet.mergeCells('L6:V6');
      sheet.getCell('L6').value =
        'EJECUTADO';

      [
        'A6',
        'I6',
        'L6'
      ].forEach(cell => {
        const celda =
          sheet.getCell(cell);

        celda.fill =
          greenHeader;

        celda.font =
          fontBold;

        celda.alignment =
          centerAlign;

        celda.border =
          borderAll;
      });

      // ========================================
      // FILA 7: COLUMNAS
      // ========================================

      const headers = [
        'N°',
        'TIPO DE VEHÍCULO',
        'PLACA',
        'MARCA TRACTO',
        'MODELO TRACTO',
        'AÑO FABRICACIÓN TRACTO',
        'OPERACIÓN',
        'CLIENTE',
        'FECHA ULT MANTENIMIENTO',
        'FRECUENCIA',
        'FECHA PROX MANTENIMIENTO',
        'DVR',
        'COPILOTO',
        'RADIO BASE',
        'HANDY',
        'CAMARA INTERNA',
        'CAMARA EXTERNA',
        'CAMARA DE RETROCESO',
        'SENSORES DE RETROCESO',
        'SENSORES DELANTEROS',
        'SISTEMA ADAS',
        'FECHA EJECUTADA'
      ];

      const widths = [
        4,
        15,
        12,
        12,
        12,
        15,
        12,
        12,
        15,
        10,
        15,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        15
      ];

      headers.forEach(
        (header, index) => {
          const colLetter =
            sheet.getColumn(
              index + 1
            ).letter;

          const celda =
            sheet.getCell(
              `${colLetter}7`
            );

          celda.value =
            header;

          celda.fill =
            greenHeader;

          celda.font = {
            bold: true,
            size: 8,
            name: 'Arial'
          };

          celda.alignment =
            centerAlign;

          celda.border =
            borderAll;

          sheet.getColumn(
            index + 1
          ).width =
            widths[index];
        }
      );

      sheet.getRow(7).height =
        80;

      // ========================================
      // OBTENER DATOS
      // ========================================

      const query = `
        SELECT
          v.*,
          COALESCE(
            i.fecha::text,
            m.fecha_ejecutada::text
          ) AS fecha_ejecutada_raw,

          COALESCE(
            m.frecuencia_dias,
            180
          ) AS frecuencia_dias,

          CASE
            WHEN i.camaras ILIKE '%OK%'
            THEN 'OK'
            ELSE COALESCE(
              m.dvr,
              'N/A'
            )
          END AS dvr,

          CASE
            WHEN i.tablet ILIKE '%OK%'
            THEN 'OK'
            ELSE COALESCE(
              m.copiloto,
              'N/A'
            )
          END AS copiloto,

          CASE
            WHEN i.radio ILIKE '%OK%'
            THEN 'OK'
            ELSE COALESCE(
              m.radio_base,
              'N/A'
            )
          END AS radio_base,

          COALESCE(
            m.handy,
            'N/A'
          ) AS handy,

          COALESCE(
            m.camara_interna,
            'N/A'
          ) AS camara_interna,

          COALESCE(
            m.camara_externa,
            'N/A'
          ) AS camara_externa,

          COALESCE(
            m.camara_retroceso,
            'N/A'
          ) AS camara_retroceso,

          COALESCE(
            m.sensores_retroceso,
            'N/A'
          ) AS sensores_retroceso,

          COALESCE(
            m.sensores_delanteros,
            'N/A'
          ) AS sensores_delanteros,

          COALESCE(
            m.sistema_adas,
            'N/A'
          ) AS sistema_adas

        FROM vehiculos v

        LEFT JOIN (
          SELECT
            placa,
            fecha,
            camaras,
            tablet,
            radio,
            id,
            ROW_NUMBER() OVER (
              PARTITION BY placa
              ORDER BY id DESC
            ) AS rn
          FROM inspecciones_flota
        ) i
          ON v.placa = i.placa
         AND i.rn = 1

        LEFT JOIN (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY placa
              ORDER BY id DESC
            ) AS rn
          FROM mantenimientos_tecnicos
        ) m
          ON v.placa = m.placa
         AND m.rn = 1

        ORDER BY v.placa ASC
      `;

      const dataRes =
        await pool.query(query);

      let rowNum = 8;

      dataRes.rows.forEach(
        (row, index) => {
          let rawFecha =
            row.fecha_ejecutada_raw;

          if (
            rawFecha &&
            rawFecha.includes('--')
          ) {
            rawFecha = null;
          }

          if (
            rawFecha &&
            rawFecha.includes('/')
          ) {
            const parts =
              rawFecha.split('/');

            if (parts.length === 3) {
              rawFecha =
                `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }

          const ultimoMantenimiento =
            rawFecha
              ? new Date(rawFecha)
              : null;

          const frecuencia =
            row.frecuencia_dias || 30;

          let proximoMantenimiento =
            null;

          if (ultimoMantenimiento) {
            proximoMantenimiento =
              new Date(
                ultimoMantenimiento
              );

            proximoMantenimiento.setDate(
              proximoMantenimiento.getDate() +
              frecuencia
            );
          }

          const formatDate = date => {
            return date
              ? date
                  .toISOString()
                  .split('T')[0]
              : '';
          };

          const rowData = [
            index + 1,
            row.tipo_vehiculo || '',
            row.placa,
            row.marca_tracto || '',
            row.modelo_tracto || '',
            row.anio_fabricacion || '',
            row.operacion || '',
            row.cliente || '',

            formatDate(
              ultimoMantenimiento
            ),

            frecuencia === 180
              ? 'Semestral'
              : `${frecuencia} días`,

            formatDate(
              proximoMantenimiento
            ),

            row.dvr || '',
            row.copiloto || '',
            row.radio_base || '',
            row.handy || '',
            row.camara_interna || '',
            row.camara_externa || '',
            row.camara_retroceso || '',
            row.sensores_retroceso || '',
            row.sensores_delanteros || '',
            row.sistema_adas || '',

            formatDate(
              ultimoMantenimiento
            )
          ];

          rowData.forEach(
            (value, colIndex) => {
              const celda =
                sheet.getCell(
                  `${
                    sheet.getColumn(
                      colIndex + 1
                    ).letter
                  }${rowNum}`
                );

              celda.value =
                value;

              celda.border =
                borderAll;

              celda.alignment =
                centerAlign;

              celda.font =
                fontNormal;
            }
          );

          rowNum++;
        }
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=MantenimientoEquipos.xlsx'
      );

      await workbook.xlsx.write(res);

      return res.end();
    } catch (error) {
      console.error(
        'Error generando Excel de mantenimiento:',
        error
      );

      return res.status(500).json({
        error:
          'Error al generar excel'
      });
    }
  }
);

// ==========================================
// REPORTES PDF / EXCEL
// ==========================================

reportesRoutes.get(
  '/pdf',
  async (req, res) => {
    await generatePDF(
      pool,
      req.query,
      res
    );
  }
);

reportesRoutes.get(
  '/excel',
  async (req, res) => {
    await generateExcel(
      pool,
      req.query,
      res
    );
  }
);
