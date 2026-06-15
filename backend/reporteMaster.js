import ExcelJS from 'exceljs';
import https from 'https';
import http from 'http';

// Función para descargar imagen como buffer
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        return resolve(null); // Ignorar errores 404, etc
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', err => resolve(null));
  });
};

export const generateMasterReport = async (pool, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema OMNI';
  workbook.created = new Date();

  // Helper para crear pestaña de Operaciones (LBB, PRX, AAQ, IND)
  const createOperationSheet = async (sheetName, operationFilter) => {
    const ws = workbook.addWorksheet(sheetName);
    
    // Configurar columnas
    ws.columns = [
      { header: 'FECHA', key: 'fecha', width: 15 },
      { header: 'HORA', key: 'hora', width: 10 },
      { header: 'PLACA', key: 'placa', width: 15 },
      { header: 'CONDUCTOR', key: 'conductor', width: 25 },
      { header: 'ESTADO COPILOTO (TABLET)', key: 'tablet', width: 25 },
      { header: 'OBSERVACIONES COPILOTO', key: 'obs_tablet', width: 35 },
      { header: 'EVIDENCIA COPILOTO', key: 'img_tablet', width: 25 },
      { header: 'ESTADO CÁMARAS', key: 'camaras', width: 25 },
      { header: 'OBSERVACIONES CÁMARAS', key: 'obs_camaras', width: 35 },
      { header: 'EVIDENCIA CÁMARAS', key: 'img_camaras', width: 25 },
      { header: 'ESTADO RADIO BASE', key: 'radio', width: 25 },
      { header: 'OBSERVACIONES RADIO BASE', key: 'obs_radio', width: 35 },
      { header: 'EVIDENCIAS RADIO BASE', key: 'img_radio', width: 25 },
    ];

    // Estilo a la cabecera
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Query con JOIN a vehiculos
    let query = `
      SELECT i.*, v.operacion
      FROM inspecciones_flota i
      LEFT JOIN vehiculos v ON i.placa = v.placa
      WHERE i.fecha BETWEEN $1 AND $2
    `;
    const queryParams = [startDate, endDate];
    
    if (operationFilter) {
      if (operationFilter === 'LBB_Repsol') {
        query += " AND (v.operacion ILIKE '%Bambas%' OR v.operacion ILIKE '%Repsol%')";
      } else if (operationFilter === 'Primax') {
        query += " AND v.operacion ILIKE '%Primax%'";
      } else if (operationFilter === 'Quellaveco') {
        query += " AND v.operacion ILIKE '%Quellaveco%'";
      } else if (operationFilter === 'Industrias') {
        query += " AND v.operacion ILIKE '%Industrias%'";
      }
    }
    
    query += ' ORDER BY i.fecha DESC, i.hora DESC';

    const result = await pool.query(query, queryParams);
    const rows = result.rows;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; 
      
      const xlRow = ws.addRow({
        fecha: row.fecha,
        hora: row.hora,
        placa: row.placa,
        conductor: row.conductor,
        tablet: row.tablet,
        obs_tablet: row.observaciones, 
        img_tablet: '', 
        camaras: row.camaras,
        obs_camaras: '',
        img_camaras: '',
        radio: row.radio,
        obs_radio: '',
        img_radio: ''
      });
      
      xlRow.height = 80; 
      xlRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      const imgFields = [
        { url: row.img_tablet, colIndex: 6 }, 
        { url: row.img_camaras, colIndex: 9 },
        { url: row.img_radio, colIndex: 12 } 
      ];

      for (const field of imgFields) {
        if (field.url) {
          const fullUrl = field.url.startsWith('http') ? field.url : `http://localhost:8000/uploads/${field.url}`;
          const buffer = await downloadImage(fullUrl);
          if (buffer) {
            try {
              const imageId = workbook.addImage({
                buffer: buffer,
                extension: 'jpeg',
              });
              ws.addImage(imageId, {
                tl: { col: field.colIndex, row: rowIndex - 1 },
                ext: { width: 100, height: 100 }
              });
            } catch(e) {
              console.log('Error adding image to excel:', e.message);
            }
          }
        }
      }
    }
  };

  // ==============================================
  // 1. TI-PR-01 (Mantenimiento Técnico)
  // ==============================================
  const ws1 = workbook.addWorksheet('TI-PR-01', { views: [{ showGridLines: false }] });
  
  const borderAll = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  const fontBold = { bold: true, name: 'Arial', size: 10 };
  const fontNormal = { name: 'Arial', size: 9 };
  const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };

  ws1.mergeCells('A1:U1');
  const f1 = ws1.getCell('A1');
  f1.value = 'PROGRAMA';
  f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E99' } };
  f1.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
  f1.alignment = centerAlign;
  f1.border = borderAll;

  ws1.getCell('V1').value = 'TI - PR - 01';
  ws1.getCell('V1').font = fontBold;
  ws1.getCell('V1').alignment = centerAlign;
  ws1.getCell('V1').border = borderAll;

  ws1.mergeCells('D2:U5');
  const titulo = ws1.getCell('D2');
  titulo.value = 'MANTENIMIENTO DE EQUIPOS TECNOLÓGICOS - TRACTO/CAMIONETAS';
  titulo.font = { bold: true, size: 14, name: 'Arial' };
  titulo.alignment = centerAlign;
  titulo.border = borderAll;

  ws1.mergeCells('A2:C5');
  ws1.getCell('A2').value = 'TRANSMEDICAS S.R.L.';
  ws1.getCell('A2').alignment = centerAlign;
  ws1.getCell('A2').font = fontBold;
  ws1.getCell('A2').border = borderAll;

  const metadata = ['Versión:', 'Fecha:', 'Revisa:', 'Aprueba:'];
  for(let i=0; i<4; i++) {
    const c = ws1.getCell('V' + (i+2));
    c.value = metadata[i];
    c.border = borderAll;
    c.font = fontNormal;
  }

  const greenHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF99' } };
  ws1.mergeCells('A6:H6');
  ws1.getCell('A6').value = 'DATOS';
  ws1.mergeCells('I6:K6');
  ws1.getCell('I6').value = 'PROGRAMADO';
  ws1.mergeCells('L6:V6');
  ws1.getCell('L6').value = 'EJECUTADO';

  ['A6', 'I6', 'L6'].forEach(col => {
    const c = ws1.getCell(col);
    c.fill = greenHeader;
    c.font = fontBold;
    c.alignment = centerAlign;
    c.border = borderAll;
  });

  const headersMant = [
    'Nº', 'TIPO DE VEHÍCULO', 'PLACA', 'MARCA TRACTO', 'MODELO TRACTO', 'AÑO FABRICACIÓN TRACTO', 'OPERACIÓN', 'CLIENTE',
    'FECHA ULT MANTENIMIENTO', 'FRECUENCIA', 'FECHA PROX MANTENIMIENTO',
    'DVR', 'COPILOTO', 'RADIO BASE', 'HANDY', 'CAMARA INTERNA', 'CAMARA EXTERNA', 'CAMARA DE RETROCESO', 'SENSORES DE RETROCESO', 'SENSORES DELANTEROS', 'SISTEMA ADAS', 'FECHA EJECUTADA'
  ];
  const widthsMant = [4, 15, 12, 12, 12, 15, 12, 12, 15, 10, 15, 5,5,5,5,5,5,5,5,5,5, 15];
  
  headersMant.forEach((h, index) => {
    const colLetter = ws1.getColumn(index + 1).letter;
    const c = ws1.getCell(colLetter + '7');
    c.value = h;
    c.fill = greenHeader;
    c.font = { bold: true, size: 8, name: 'Arial' };
    c.alignment = centerAlign;
    c.border = borderAll;
    ws1.getColumn(index + 1).width = widthsMant[index];
  });
  ws1.getRow(7).height = 80; 

  const queryMant = `
    SELECT 
      v.*,
      COALESCE(i.fecha::text, m.fecha_ejecutada::text) as fecha_ejecutada_raw,
      COALESCE(m.frecuencia_dias, 180) as frecuencia_dias,
      CASE WHEN i.camaras ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.dvr, 'N/A') END as dvr,
      CASE WHEN i.tablet ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.copiloto, 'N/A') END as copiloto,
      CASE WHEN i.radio ILIKE '%OK%' THEN 'OK' ELSE COALESCE(m.radio_base, 'N/A') END as radio_base,
      COALESCE(m.handy, 'N/A') as handy,
      COALESCE(m.camara_interna, 'N/A') as camara_interna,
      COALESCE(m.camara_externa, 'N/A') as camara_externa,
      COALESCE(m.camara_retroceso, 'N/A') as camara_retroceso,
      COALESCE(m.sensores_retroceso, 'N/A') as sensores_retroceso,
      COALESCE(m.sensores_delanteros, 'N/A') as sensores_delanteros,
      COALESCE(m.sistema_adas, 'N/A') as sistema_adas
    FROM vehiculos v
    LEFT JOIN (
      SELECT placa, fecha, camaras, tablet, radio, id,
             ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
      FROM inspecciones_flota
    ) i ON v.placa = i.placa AND i.rn = 1
    LEFT JOIN (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY placa ORDER BY id DESC) as rn
      FROM mantenimientos_tecnicos
    ) m ON v.placa = m.placa AND m.rn = 1
    ORDER BY v.placa ASC
  `;
  const dataRes = await pool.query(queryMant);

  let rowNum = 8;
  dataRes.rows.forEach((row, i) => {
    let rawF = row.fecha_ejecutada_raw;
    if (rawF && rawF.includes('--')) rawF = null;
    if (rawF && rawF.includes('/')) {
      const parts = rawF.split('/');
      if (parts.length === 3) rawF = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    let ultMant = rawF ? new Date(rawF) : null;
    let freq = row.frecuencia_dias || 30;
    let proxMant = null;
    if (ultMant) {
      proxMant = new Date(ultMant);
      proxMant.setDate(proxMant.getDate() + freq);
    }

    const formatDate = (d) => d ? d.toISOString().split('T')[0] : '';

    const rowData = [
      i + 1,
      row.tipo_vehiculo || '',
      row.placa,
      row.marca_tracto || '',
      row.modelo_tracto || '',
      row.anio_fabricacion || '',
      row.operacion || '',
      row.cliente || '',
      formatDate(ultMant),
      freq === 180 ? 'Semestral' : `${freq} días`,
      formatDate(proxMant),
      row.dvr || '', row.copiloto || '', row.radio_base || '', row.handy || '',
      row.camara_interna || '', row.camara_externa || '', row.camara_retroceso || '',
      row.sensores_retroceso || '', row.sensores_delanteros || '', row.sistema_adas || '',
      formatDate(ultMant)
    ];

    rowData.forEach((val, colIndex) => {
      const c = ws1.getCell(ws1.getColumn(colIndex + 1).letter + rowNum);
      c.value = val;
      c.font = fontNormal;
      c.alignment = centerAlign;
      c.border = borderAll;
    });
    rowNum++;
  });


  // ==============================================
  // 2. REGISTRO (Inspecciones - Gerencial)
  // ==============================================
  const ws2 = workbook.addWorksheet('REGISTRO');
  ws2.columns = [
    { header: 'PROGRAMA', key: 'programa', width: 20 },
    { header: 'PLACA', key: 'placa', width: 15 },
    { header: 'TIPO DE VEHÍCULO', key: 'tipo', width: 18 },
    { header: 'ESTADO DE VEHÍCULO', key: 'estado_vehiculo', width: 15 },
    { header: 'FECHA', key: 'fecha', width: 15 },
    { header: 'HORA', key: 'hora', width: 10 },
    { header: 'TABLET', key: 'tablet', width: 15 },
    { header: 'RADIO BASE', key: 'radio', width: 15 },
    { header: 'CÁMARAS', key: 'camaras', width: 15 },
    { header: 'OBSERVACIONES', key: 'observaciones', width: 45 }
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

  const queryGerencial = `
    SELECT 
      v.placa, v.tipo_vehiculo as tipo, v.operacion as programa, 'Activo' as estado_vehiculo,
      i.fecha, i.hora, i.tablet, i.radio, i.camaras, i.observaciones
    FROM vehiculos v
    LEFT JOIN inspecciones_flota i ON v.placa = i.placa
    WHERE i.fecha BETWEEN $1 AND $2
    ORDER BY i.fecha DESC NULLS LAST, i.hora DESC NULLS LAST, v.placa ASC
  `;
  const regResGerencial = await pool.query(queryGerencial, [startDate, endDate]);
  regResGerencial.rows.forEach(r => ws2.addRow(r));

  // ==============================================
  // 3. BBDD
  // ==============================================
  workbook.addWorksheet('BBDD');

  // ==============================================
  // 4. LBB (Bambas o Repsol)
  // ==============================================
  await createOperationSheet('LBB', 'LBB_Repsol');

  // ==============================================
  // 5. PRX
  // ==============================================
  await createOperationSheet('PRX', 'Primax');

  // ==============================================
  // 6. GLP
  // ==============================================
  workbook.addWorksheet('GLP');

  // ==============================================
  // 7. AAQ
  // ==============================================
  await createOperationSheet('AAQ', 'Quellaveco');

  // ==============================================
  // 8. IND
  // ==============================================
  await createOperationSheet('IND', 'Industrias');

  return workbook;
};
