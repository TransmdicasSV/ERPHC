import { pool } from './database.js';

const ESQUEMA_ESPERADO = {
  audit_logs: [
    'id',
    'user_id',
    'accion',
    'tabla_afectada',
    'fecha'
  ],

  entregas_ti: [
    'id',
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
    'tipo_movimiento',
    'documento_url'
  ],

  incidentes_soporte: [
    'id',
    'placa',
    'tipo_solicitud',
    'descripcion',
    'operador',
    'estado',
    'fecha',
    'categoria',
    'prioridad',
    'evidencia',
    'operacion',
    'implemento',
    'evidencias_iniciales',
    'persona_pulsera',
    'dni_persona_pulsera',
    'motivo_renovacion'
  ],

  tickets_unidades: [
    'id',
    'placa',
    'persona_id',
    'tipo_solicitud',
    'descripcion',
    'estado',
    'implemento',
    'evidencias',
    'fecha_creacion',
    'fecha_cierre'
  ],

  inspecciones_flota: [
  'id',
  'placa',
  'fecha_hora',
  'tablet',
  'radio',
  'camaras',
  'img_tablet',
  'img_radio',
  'img_camaras',
  'observaciones',
  'estado'
],

  mantenimientos_tecnicos: [
    'id',
    'placa',
    'fecha_ejecutada',
    'frecuencia_dias',
    'dvr',
    'copiloto',
    'radio_base',
    'handy',
    'camara_interna',
    'camara_externa',
    'camara_retroceso',
    'sensores_retroceso',
    'sensores_delanteros',
    'sistema_adas'
  ],

  personal: [
    'id',
    'nombre_completo',
    'dni',
    'area',
    'cargo',
    'estado',
    'created_at',
    'fecha_ingreso',
    'operacion',
    'fecha_cese'
  ],

  usuarios: [
    'id',
    'username',
    'password_hash',
    'rol',
    'estado',
    'permisos',
    'operacion',
    'created_at',
    'persona_id',
    'ultimo_acceso'
  ],

  vehiculos: [
    'placa',
    'tipo_vehiculo',
    'marca_tracto',
    'modelo_tracto',
    'anio_fabricacion',
    'operacion',
    'cliente'
  ]
};

const CAMPOS_DATE = [
  'entregas_ti.fecha',
  'mantenimientos_tecnicos.fecha_ejecutada',
  'vehiculos.anio_fabricacion',
  'personal.fecha_ingreso',
  'personal.fecha_cese'
];

export const initDb = async () => {
  const tablasEsperadas = Object.keys(
    ESQUEMA_ESPERADO
  );

  const { rows } = await pool.query(
    `SELECT
       table_name,
       column_name,
       data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [tablasEsperadas]
  );

  const tablasEncontradas = new Set(
    rows.map(row => row.table_name)
  );

  const columnasEncontradas = new Map(
    rows.map(row => [
      `${row.table_name}.${row.column_name}`,
      row.data_type
    ])
  );

  const faltantes = [];

  for (
    const [tabla, columnas] of
    Object.entries(ESQUEMA_ESPERADO)
  ) {
    if (!tablasEncontradas.has(tabla)) {
      faltantes.push(`tabla ${tabla}`);
      continue;
    }

    for (const columna of columnas) {
      const referencia = `${tabla}.${columna}`;

      if (!columnasEncontradas.has(referencia)) {
        faltantes.push(referencia);
      }
    }
  }

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan tablas o columnas, o permisos para verlas: ${faltantes.join(', ')}. Revisa la base y las migraciones.`
    );
  }

  for (const campo of CAMPOS_DATE) {
    if (columnasEncontradas.get(campo) !== 'date') {
      throw new Error(
        `${campo} debe ser DATE. No se modificó la base de datos.`
      );
    }
  }

  console.log(
    'Tablas y columnas requeridas verificadas. Sin cambios en la base de datos.'
  );
};