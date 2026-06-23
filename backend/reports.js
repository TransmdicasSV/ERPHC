import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper para obtener buffer de imagen (Remoto o Local)
const fetchImage = async (urlOrFileName) => {
  if (!urlOrFileName) return null;
  if (urlOrFileName.startsWith('http')) {
    try {
      const response = await fetch(urlOrFileName);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (e) {
      return null;
    }
  } else {
    const localPath = path.join(__dirname, 'uploads', urlOrFileName);
    if (fs.existsSync(localPath)) return localPath;
    return null;
  }
};

// Helper para formatear fechas a DD-MM-YYYY
const formatDMY = (dateObj) => {
  if (!dateObj) return '';
  const dObj = new Date(dateObj);
  const d = dObj.getDate().toString().padStart(2, '0');
  const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
  const y = dObj.getFullYear();
  return `${d}-${m}-${y}`;
};

// ==========================================
// GENERADOR DE PDF (PROFESIONAL)
// ==========================================
export const generatePDF = async (pool, filtro, valor, res) => {
  try {
    let query = 'SELECT i.*, v.operacion as programa FROM inspecciones_flota i JOIN vehiculos v ON i.placa = v.placa';
    let params = [];

    if (filtro === 'placa') {
      query += ' WHERE i.placa = $1';
      params.push(valor.toUpperCase());
    } else if (filtro === 'programa') {
      if (valor === 'Falta identificar') {
        query += ` WHERE (v.operacion IS NULL OR v.operacion = '' OR LOWER(v.operacion) = 'sin operación')`;
      } else if (valor === 'Industrias') {
        query += ` WHERE LOWER(v.operacion) LIKE $1`;
        params.push('%industria%');
      } else if (valor === 'Bambas') {
        query += ` WHERE LOWER(v.operacion) LIKE $1`;
        params.push('%bambas%');
      } else {
        query += ` WHERE LOWER(v.operacion) = $1`;
        params.push(valor.toLowerCase());
      }
    }
    
    query += ' ORDER BY i.fecha DESC, i.hora DESC';
    const result = await pool.query(query, params);
    const inspecciones = result.rows;

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Flotas.pdf`);
    doc.pipe(res);

    let subtitle = 'Todas las unidades';
    if (filtro === 'placa') subtitle = `Filtro: Placa ${valor}`;
    if (filtro === 'programa') subtitle = `Filtro: Programa ${valor}`;

    // Dibujar Cabecera en una página
    const drawHeader = (pageNum) => {
      doc.rect(0, 0, doc.page.width, 80).fill('#0F172A'); // Slate 900
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('REPORTE DE INSPECCIONES TI', 40, 25, { align: 'left' });
      doc.fontSize(10).font('Helvetica').text(subtitle, 40, 50, { align: 'left' });
      doc.fontSize(10).font('Helvetica').text(`Generado: ${formatDMY(new Date())}`, 0, 50, { align: 'right', width: doc.page.width - 40 });
      doc.fillColor('#000000');
      doc.y = 100;
    };

    drawHeader(1);

    if (inspecciones.length === 0) {
      doc.fontSize(14).text('No hay inspecciones registradas para este filtro.', { align: 'center' });
      doc.end();
      return;
    }

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(`Total de Registros: ${inspecciones.length}`, 40, doc.y);
    doc.moveDown(1.5);

    // Helpers de dibujo
    const drawBadge = (text, x, y) => {
      const isOK = ['OK', 'N/A', 'NO APLICA'].includes(text.toUpperCase());
      const bgColor = isOK ? '#DEF7EC' : '#FDE8E8'; // Verde suave o Rojo suave
      const textColor = isOK ? '#03543F' : '#9B1C1C'; // Verde oscuro o Rojo oscuro
      
      doc.rect(x, y - 2, 80, 16).fill(bgColor);
      doc.fillColor(textColor).fontSize(8).font('Helvetica-Bold').text(text.toUpperCase(), x, y + 2, { width: 80, align: 'center' });
      doc.fillColor('#000000'); // reset
    };

    const checkPageBreak = (neededSpace) => {
      if (doc.y + neededSpace > doc.page.height - 60) {
        doc.addPage();
        drawHeader();
        return true;
      }
      return false;
    };

    // ================= CUERPO =================
    for (let i = 0; i < inspecciones.length; i++) {
      const insp = inspecciones[i];
      const startY = doc.y;
      
      // Estimar altura de la tarjeta
      let cardHeight = 110; 
      const imagesToRender = [];
      
      const tabletImg = await fetchImage(insp.img_tablet);
      if (tabletImg) imagesToRender.push({ label: 'Tablet', data: tabletImg });
      
      const radioImg = await fetchImage(insp.img_radio);
      if (radioImg) imagesToRender.push({ label: 'Radio Base', data: radioImg });
      
      const camarasImg = await fetchImage(insp.img_camaras);
      if (camarasImg) imagesToRender.push({ label: 'Cámaras', data: camarasImg });
      
      if (imagesToRender.length > 0) cardHeight += 160; // Espacio extra para fotos

      // Calcular altura extra por observaciones
      const obsText = insp.observaciones ? insp.observaciones.trim() : 'Ninguna';
      const obsHeight = doc.heightOfString(`Observaciones: ${obsText}`, { width: doc.page.width - 100, fontSize: 9 });
      cardHeight += obsHeight;

      checkPageBreak(cardHeight + 20);
      const cardY = doc.y;

      // Dibujar fondo de tarjeta
      doc.rect(40, cardY, doc.page.width - 80, cardHeight).fill('#F8FAFC').lineWidth(1).strokeColor('#E2E8F0').stroke();
      
      // Cabecera de la tarjeta
      doc.rect(40, cardY, doc.page.width - 80, 25).fill('#F1F5F9');
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(`Inspección ID: ${insp.id}   |   Placa: ${insp.placa}`, 50, cardY + 7);
      doc.fontSize(9).font('Helvetica').text(`${formatDMY(insp.fecha)} ${insp.hora}`, 40, cardY + 7, { align: 'right', width: doc.page.width - 90 });
      
      doc.fillColor('#334155');
      let currentY = cardY + 35;
      
      // Fila 1: Programa
      doc.fontSize(9).font('Helvetica-Bold').text('Programa:', 50, currentY, { continued: true }).font('Helvetica').text(` ${insp.programa || 'Sin Operación'}`);
      currentY += 20;

      // Fila 2: Estados
      doc.font('Helvetica-Bold').text('Equipos:', 50, currentY);
      doc.font('Helvetica').text('Tablet:', 120, currentY); drawBadge(insp.tablet || 'S/D', 160, currentY);
      doc.font('Helvetica').text('Radio:', 250, currentY); drawBadge(insp.radio || 'S/D', 290, currentY);
      doc.font('Helvetica').text('Cámaras:', 380, currentY); drawBadge(insp.camaras || 'S/D', 430, currentY);
      currentY += 25;

      // Fila 3: Observaciones
      doc.font('Helvetica-Bold').fillColor('#1E293B').text('Observaciones:', 50, currentY);
      doc.font('Helvetica').fillColor('#475569').text(obsText, 130, currentY, { width: doc.page.width - 180 });
      currentY += obsHeight + 15;

      // Renderizar Imágenes
      if (imagesToRender.length > 0) {
        let imgX = 50;
        imagesToRender.forEach(img => {
          // Borde de la foto
          doc.rect(imgX, currentY, 150, 110).fill('#FFFFFF').strokeColor('#CBD5E1').lineWidth(1).stroke();
          
          try {
            // fit centra la imagen gracias a align y valign
            doc.image(img.data, imgX + 2, currentY + 2, { width: 146, height: 106, fit: [146, 106], align: 'center', valign: 'center' });
          } catch(e) {
            doc.fillColor('#94A3B8').fontSize(8).text('(Error de Formato)', imgX, currentY + 50, { width: 150, align: 'center' });
          }
          
          // Etiqueta debajo
          doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text(img.label.toUpperCase(), imgX, currentY + 115, { width: 150, align: 'center' });
          imgX += 160;
        });
        currentY += 140;
      }

      doc.y = cardY + cardHeight + 15; // Mover al final de la tarjeta
    }

    // Dibujar numeración de páginas en el pie
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica').text(`Página ${i + 1} de ${range.count}`, 0, doc.page.height - 30, { align: 'center' });
    }

    doc.end();

  } catch (error) {
    console.error('Error generando PDF', error);
    if (!res.headersSent) res.status(500).json({ error: `Error generando PDF: ${error.message}` });
  }
};

// ==========================================
// GENERADOR DE EXCEL GENERAL / FILTRADO
// ==========================================
export const generateExcel = async (pool, filtro, valor, res) => {
  try {
    let query = '';
    let params = [];

    if (filtro === 'gerencial') {
      query = `
        SELECT 
          v.placa, v.tipo_vehiculo as tipo, v.operacion as programa, 'Activo' as estado_vehiculo,
          i.fecha, i.hora, i.tablet, i.radio, i.camaras, i.observaciones
        FROM vehiculos v
        LEFT JOIN inspecciones_flota i ON v.placa = i.placa
        ORDER BY i.fecha DESC NULLS LAST, i.hora DESC NULLS LAST, v.placa ASC
      `;
    } else {
      query = 'SELECT i.*, v.operacion as programa FROM inspecciones_flota i JOIN vehiculos v ON i.placa = v.placa';
      if (filtro === 'placa') {
        query += ' WHERE i.placa = $1';
        params.push(valor.toUpperCase());
      } else if (filtro === 'programa') {
        if (valor === 'Falta identificar') {
          query += ` WHERE (v.operacion IS NULL OR v.operacion = '' OR LOWER(v.operacion) = 'sin operación')`;
        } else if (valor === 'Industrias') {
          query += ` WHERE LOWER(v.operacion) LIKE $1`;
          params.push('%industria%');
        } else if (valor === 'Bambas') {
          query += ` WHERE LOWER(v.operacion) LIKE $1`;
          params.push('%bambas%');
        } else {
          query += ` WHERE LOWER(v.operacion) = $1`;
          params.push(valor.toLowerCase());
        }
      }
      query += ' ORDER BY i.fecha DESC, i.hora DESC';
    }
    const result = await pool.query(query, params);
    const inspecciones = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspecciones');

    if (filtro === 'gerencial') {
      // Configurar anchos de columna sin fijar la primera fila de cabecera automáticamente
      worksheet.columns = [
        { key: 'programa', width: 20 },
        { key: 'placa', width: 15 },
        { key: 'tipo', width: 18 },
        { key: 'estado_vehiculo', width: 15 },
        { key: 'fecha', width: 15 },
        { key: 'hora', width: 10 },
        { key: 'tablet', width: 15 },
        { key: 'radio', width: 15 },
        { key: 'camaras', width: 15 },
        { key: 'observaciones', width: 45 },
      ];

      // 1. Título principal
      const titleRow = worksheet.addRow(['REPORTE GERENCIAL DE FLOTAS E INSPECCIONES']);
      worksheet.mergeCells('A1:J1');
      titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Azul oscuro muy profesional
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 30;

      // 2. Subtítulo (Fecha de Generación)
      const dateRow = worksheet.addRow([`Fecha de Emisión: ${new Date().toLocaleString('es-PE')}`]);
      worksheet.mergeCells('A2:J2');
      dateRow.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF333333' } };
      dateRow.alignment = { vertical: 'middle', horizontal: 'right' };
      dateRow.height = 20;

      // Espaciador
      worksheet.addRow([]);

      // 3. Cabecera de la tabla
      const headerRow = worksheet.addRow([
        'Operación', 'Placa', 'Tipo Unidad', 'Estado Unidad', 
        'Última Insp.', 'Hora', 'Tablet', 'Radio Base', 'Cámaras', 'Observaciones'
      ]);
      
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Verde esmeralda
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 25;

      // Bordes para la cabecera
      headerRow.eachCell(cell => {
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'}
        };
      });

      // 4. Agregar Datos
      inspecciones.forEach((insp, index) => {
        const row = worksheet.addRow({
          programa: insp.programa || 'Sin Operación',
          placa: insp.placa,
          tipo: insp.tipo || 'N/A',
          estado_vehiculo: insp.estado_vehiculo || 'N/A',
          fecha: formatDMY(insp.fecha) || 'Sin Inspección',
          hora: insp.hora || '-',
          tablet: insp.tablet || '-',
          radio: insp.radio || '-',
          camaras: insp.camaras || '-',
          observaciones: insp.observaciones || '-'
        });

        // Estilos de filas de datos
        row.font = { name: 'Arial', size: 10 };
        row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        
        // Alineación izquierda para observaciones
        row.getCell(10).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        
        // Colores alternados (Zebra striping)
        if (index % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }

        row.eachCell(cell => {
          cell.border = {
            top: {style:'hair'}, left: {style:'hair'}, bottom: {style:'hair'}, right: {style:'hair'}
          };
        });
      });

      // Añadir Autocorrector de filtros a la tabla
      worksheet.autoFilter = 'A4:J4';
    } else {
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Placa', key: 'placa', width: 15 },
        { header: 'Programa', key: 'programa', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Hora', key: 'hora', width: 10 },
        { header: 'Tablet', key: 'tablet', width: 15 },
        { header: 'Radio Base', key: 'radio', width: 15 },
        { header: 'Cámaras', key: 'camaras', width: 15 },
        { header: 'Foto Tablet', key: 'img_tablet', width: 40 },
        { header: 'Foto Radio', key: 'img_radio', width: 40 },
        { header: 'Foto Cámaras', key: 'img_camaras', width: 40 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A8A' } };

      inspecciones.forEach(insp => {
        worksheet.addRow({
          id: insp.id,
          placa: insp.placa,
          programa: insp.programa,
          fecha: formatDMY(insp.fecha),
          hora: insp.hora,
          tablet: insp.tablet,
          radio: insp.radio,
          camaras: insp.camaras,
          img_tablet: insp.img_tablet ? `http://localhost:8000/uploads/${insp.img_tablet}` : 'N/A',
          img_radio: insp.img_radio ? `http://localhost:8000/uploads/${insp.img_radio}` : 'N/A',
          img_camaras: insp.img_camaras ? `http://localhost:8000/uploads/${insp.img_camaras}` : 'N/A',
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Flotas_${filtro || 'General'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generando Excel', error);
    res.status(500).send('Error interno');
  }
};
