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

  programas_mantenimiento: [
    'id',
    'codigo',
    'nombre',
    'periodo_inicio',
    'periodo_fin',
    'version',
    'fecha_documento',
    'frecuencia_m1_dias',
    'frecuencia_m2_dias',
    'frecuencia_m3_dias',
    'estado',
    'created_at',
    'updated_at'
  ],

  programa_mantenimiento_unidades: [
    'id',
    'programa_id',
    'placa',
    'fecha_base_m1',
    'fecha_base_m2',
    'fecha_base_m3',
    'quincena_arranque',
    'observaciones',
    'created_at',
    'updated_at'
  ],

  programacion_mantenimiento: [
    'id',
    'programa_unidad_id',
    'fecha_programada',
    'nivel_mantenimiento',
    'estado',
    'fecha_reprogramada',
    'fecha_ejecucion',
    'observaciones',
    'created_at',
    'updated_at'
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
  'personal.fecha_cese',
  'programas_mantenimiento.periodo_inicio',
  'programas_mantenimiento.periodo_fin',
  'programas_mantenimiento.fecha_documento',
  'programa_mantenimiento_unidades.fecha_base_m1',
  'programa_mantenimiento_unidades.fecha_base_m2',
  'programa_mantenimiento_unidades.fecha_base_m3',
  'programa_mantenimiento_unidades.quincena_arranque',
  'programacion_mantenimiento.fecha_programada',
  'programacion_mantenimiento.fecha_reprogramada',
  'programacion_mantenimiento.fecha_ejecucion'
];

// Las tablas de TI-PR-01 usan timestamptz por decisión de diseño, a diferencia
// de las tablas antiguas, que guardan timestamp sin zona horaria.
const CAMPOS_TIMESTAMPTZ = [
  'programas_mantenimiento.created_at',
  'programas_mantenimiento.updated_at',
  'programa_mantenimiento_unidades.created_at',
  'programa_mantenimiento_unidades.updated_at',
  'programacion_mantenimiento.created_at',
  'programacion_mantenimiento.updated_at'
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

  for (const campo of CAMPOS_TIMESTAMPTZ) {
    if (
      columnasEncontradas.get(campo) !==
      'timestamp with time zone'
    ) {
      throw new Error(
        `${campo} debe ser TIMESTAMPTZ. No se modificó la base de datos.`
      );
    }
  }

  console.log(
    'Tablas y columnas requeridas verificadas. Sin cambios en la base de datos.'
  );
};