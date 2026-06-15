import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// GENERADOR DE PDF (BEAUTIFIED)
// ==========================================
export const generatePDF = async (pool, filtro, valor, res) => {
  try {
    let query = 'SELECT i.*, v.programa FROM inspecciones_flota i JOIN vehiculos v ON i.placa = v.placa';
    let params = [];

    if (filtro === 'placa') {
      query += ' WHERE i.placa = $1';
      params.push(valor.toUpperCase());
    } else if (filtro === 'programa') {
      query += ' WHERE v.programa = $1';
      params.push(valor);
    }
    
    query += ' ORDER BY i.fecha DESC, i.hora DESC';
    const result = await pool.query(query, params);
    const inspecciones = result.rows;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Flotas.pdf`);
    doc.pipe(res);

    // ================= HEADER CORPORATIVO =================
    doc.rect(0, 0, doc.page.width, 100).fill('#1E3A8A'); // Azul oscuro corporativo
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text('REPORTE DE INSPECCIONES', 0, 35, { align: 'center' });
    
    let subtitle = 'Todas las unidades';
    if (filtro === 'placa') subtitle = `Placa: ${valor}`;
    if (filtro === 'programa') subtitle = `Programa: ${valor}`;
    
    doc.fontSize(12).font('Helvetica').text(subtitle, 0, 65, { align: 'center' });
    doc.fillColor('#000000'); // Reset a negro
    doc.moveDown(4);

    if (inspecciones.length === 0) {
      doc.fontSize(14).text('No hay inspecciones registradas para este filtro.', { align: 'center' });
      doc.end();
      return;
    }

    doc.fontSize(12).font('Helvetica-Bold').text(`Total de Registros: ${inspecciones.length}`, { align: 'left' });
    doc.moveDown(2);

    // ================= CUERPO =================
    for (let i = 0; i < inspecciones.length; i++) {
      const insp = inspecciones[i];
      
      // Caja contenedora (fondo gris suave)
      const startY = doc.y;
      doc.rect(40, startY, doc.page.width - 80, 25).fill('#F3F4F6');
      
      // Título de la inspección
      doc.fillColor('#1F2937').fontSize(12).font('Helvetica-Bold').text(`Inspección ID: ${insp.id}  |  Placa: ${insp.placa}`, 50, startY + 7);
      
      // Fecha a la derecha
      doc.fontSize(10).font('Helvetica').text(`${formatDMY(insp.fecha)} ${insp.hora}`, 40, startY + 7, { align: 'right', width: doc.page.width - 90 });
      doc.fillColor('#000000');
      doc.y = startY + 35; // Mover debajo de la barra

      // Datos de estado
      doc.fontSize(10).font('Helvetica-Bold').text(`Programa: `, 50, doc.y, { continued: true }).font('Helvetica').text(`${insp.programa}`);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Estado Equipos: `, 50, doc.y, { continued: true }).font('Helvetica').text(`Tablet [${insp.tablet}] | Radio [${insp.radio}] | Cámaras [${insp.camaras}]`);
      doc.moveDown(1);

      // Renderizar Imágenes
      const imagesToRender = [];
      if (insp.img_tablet && fs.existsSync(path.join(__dirname, 'uploads', insp.img_tablet))) {
        imagesToRender.push({ label: 'Tablet', path: path.join(__dirname, 'uploads', insp.img_tablet) });
      }
      if (insp.img_radio && fs.existsSync(path.join(__dirname, 'uploads', insp.img_radio))) {
        imagesToRender.push({ label: 'Radio Base', path: path.join(__dirname, 'uploads', insp.img_radio) });
      }
      if (insp.img_camaras && fs.existsSync(path.join(__dirname, 'uploads', insp.img_camaras))) {
        imagesToRender.push({ label: 'Cámaras', path: path.join(__dirname, 'uploads', insp.img_camaras) });
      }

      let xOffset = 50;
      let maxImgHeight = 0;

      imagesToRender.forEach(img => {
        // Prevenir desborde de página por imagen
        if (doc.y > 650) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 40).fill('#1E3A8A'); // Header miniatura en nueva pág
          doc.fillColor('#FFFFFF').fontSize(12).text('REPORTE DE INSPECCIONES (Continuación)', 0, 15, { align: 'center' });
          doc.fillColor('#000000');
          doc.y = 60;
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6B7280').text(img.label, xOffset, doc.y);
        try {
          doc.image(img.path, xOffset, doc.y + 10, { width: 140, height: 100, fit: [140, 100] });
          maxImgHeight = 100;
        } catch(e) {
          doc.text('(Img no disponible)', xOffset, doc.y + 10);
        }
        xOffset += 160;
      });

      if (imagesToRender.length > 0) {
        doc.y += maxImgHeight + 25; // Espacio post imágenes
      }

      doc.moveDown(1.5);
      
      // Si la próxima tarjeta no cabe, saltamos de página
      if (doc.y > 700) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#1E3A8A');
        doc.fillColor('#FFFFFF').fontSize(12).text('REPORTE DE INSPECCIONES (Continuación)', 0, 15, { align: 'center' });
        doc.fillColor('#000000');
        doc.y = 60;
      }
    }

    doc.end();

  } catch (error) {
    console.error('Error generando PDF', error);
    if (!res.headersSent) res.status(500).send('Error interno');
  }
};

// ==========================================
// GENERADOR DE EXCEL GENERAL / FILTRADO
// ==========================================
export const generateExcel = async (pool, filtro, valor, res) => {
  try {
    let query = 'SELECT i.*, v.programa FROM inspecciones_flota i JOIN vehiculos v ON i.placa = v.placa';
    let params = [];

    if (filtro === 'placa') {
      query += ' WHERE i.placa = $1';
      params.push(valor.toUpperCase());
    } else if (filtro === 'programa') {
      query += ' WHERE v.programa = $1';
      params.push(valor);
    }
    
    query += ' ORDER BY i.fecha DESC, i.hora DESC';
    const result = await pool.query(query, params);
    const inspecciones = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspecciones');

    // Definir columnas
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

    // Estilizar cabecera
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A8A' } };

    // Agregar filas
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Flotas_${filtro || 'General'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generando Excel', error);
    res.status(500).send('Error interno');
  }
};
