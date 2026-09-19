import { toast } from 'react-hot-toast';

// Si estamos en desarrollo usa localhost, si es producción usa Render
export const BASE_API_URL = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8000` 
  : 'https://transmdicas-backend.onrender.com';
const BASE_URL = BASE_API_URL;

// Wrapper global para fetch que inyecta el token y maneja el 401
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('nexus_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Si no es FormData y no tiene Content-Type, agregamos JSON
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const newOptions = { ...options, headers };
  
  try {
    const response = await fetch(url, newOptions);
    
    // Solo forzar logout en 401 (Token inválido/expirado). 
    // 403 significa acceso denegado (ej. no es admin), no debe cerrar sesión.
    if (response.status === 401) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.reload();
      return response;
    }
    
    // Interceptar cualquier error HTTP y mostrarlo como Toast automáticamente
    if (!response.ok) {
      try {
        const errData = await response.clone().json();
        const errorMsg = errData.error || errData.message || `Error HTTP: ${response.status}`;
        toast.error(`Error del Servidor: ${errorMsg}`);
      } catch (e) {
        toast.error(`Error del Servidor (${response.status}): Ocurrió un problema.`);
      }
    }
    
    return response;
  } catch (error) {
    // Errores de red (ej. servidor caído, sin internet)
    toast.error(`Error de Conexión: ${error.message}`);
    throw error;
  }
};

export const api = {  // ==========================================
  // MAESTRO DE FLOTA
  // ==========================================
  getTractos: async () => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/maestro/tractos`);
    if (!response.ok) throw new Error('Error al cargar tractos');
    return response.json();
  },
  updateVehiculo: async (placa, data) => {
  const response = await fetchWithAuth(
    `${BASE_API_URL}/vehiculos/${encodeURIComponent(placa)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  const result =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
      'Error al actualizar vehículo'
    );
  }

  return result;
},
  
  deleteVehiculo: async (placa) => {
    const response = await fetchWithAuth(`${BASE_API_URL}/vehiculos/${placa}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al eliminar vehiculo');
    }
    return response.json();
  },




  // ==========================================
  // DIRECTORIO DE PERSONAL
  // ==========================================
  getPersonal: async () => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/personal`);
    if (!response.ok) throw new Error('Error al cargar personal');
    return response.json();
  },

  createPersonal: async (data) => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/personal`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al registrar personal');
    return response.json();
  },

  updatePersonal: async (id, data) => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/personal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar personal');
    return response.json();
  },

  deletePersonal: async (id) => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/personal/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Error al eliminar personal');
    return response.json();
  },

  // ==========================================
  // RELACIONALES
  // ==========================================
  getStats: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/stats/`);
    if (!response.ok) throw new Error('Error al cargar stats');
    return response.json();
  },

  getChartStats: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/stats/charts`);
    if (!response.ok) throw new Error('Error al obtener estadísticas de gráficos');
    return response.json();
  },

  getVehiculos: async (page = 1, limit = 50, search = '', operacion = '', estado = '') => {
    let url = `${BASE_URL}/vehiculos/?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (operacion) url += `&operacion=${encodeURIComponent(operacion)}`;
    if (estado) url += `&estado=${encodeURIComponent(estado)}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('Error al cargar vehiculos');
    return response.json();
  },

  updateVehiculo: async (placa, data) => {
    const response = await fetchWithAuth(`${BASE_URL}/vehiculos/${placa}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar vehiculo');
    return response.json();
  },

  createVehiculo: async (data) => {
    const response = await fetchWithAuth(`${BASE_URL}/vehiculos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al crear vehiculo');
    }
    return response.json();
  },

  deleteVehiculo: async (placa) => {
    const response = await fetchWithAuth(`${BASE_URL}/vehiculos/${placa}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al eliminar');
    }
    return response.json();
  },

  deleteInspeccion: async (id) => {
    const response = await fetchWithAuth(`${BASE_URL}/inspecciones/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Error al eliminar');
    return response.json();
  },

  getInspecciones: async (placa) => {
    const response = await fetchWithAuth(`${BASE_URL}/inspecciones/${placa}`);
    if (!response.ok) throw new Error('Error al cargar inspecciones');
    return response.json();
  },
  
  createInspeccion: async (formData) => {
    const response = await fetchWithAuth(`${BASE_URL}/inspecciones/`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const detalle = await response.json().catch(() => ({}));
      throw new Error(detalle.error || 'Error al crear inspeccion');
    }
    return response.json();
  },

  updateInspeccion: async (id, formData) => {
    const response = await fetchWithAuth(`${BASE_URL}/inspecciones/${id}`, {
      method: 'PUT',
      body: formData,
    });
    if (!response.ok) throw new Error('Error al actualizar inspeccion');
    return response.json();
  },
  getOpcionesTickets: async () => {
  const response = await fetchWithAuth(
    BASE_API_URL + '/api/incidentes/opciones'
  );
  if (!response.ok) {
    throw new Error('Error al cargar las opciones de tickets');
  }
  return response.json();
},
getOpcionesPulseras: async () => {
  const response = await fetchWithAuth(
    `${BASE_API_URL}/api/incidentes/pulseras/opciones`
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || 'Error al cargar las opciones de pulseras'
    );
  }

  return data;
},
createPulsera: async (data, evidencia) => {
  const payload = new FormData();

  Object.entries(data).forEach(([campo, valor]) => {
    if (valor !== null && valor !== undefined) {
      payload.append(campo, String(valor));
    }
  });

  if (evidencia) {
    payload.append('evidencia', evidencia);
  }

  const response = await fetchWithAuth(
    `${BASE_API_URL}/api/incidentes/pulseras`,
    {
      method: 'POST',
      body: payload
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
      'Error al registrar el reporte de pulsera'
    );
  }

  return result;
},
  // === INCIDENTES ===
  getIncidentes: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/incidentes`);
    if (!response.ok) throw new Error('Error al cargar incidentes');
    return response.json();
  },

createIncidente: async (data, evidencias = []) => {
  const payload = new FormData();

  Object.entries(data).forEach(([campo, valor]) => {
    if (valor !== null && valor !== undefined) {
      payload.append(campo, String(valor));
    }
  });

  evidencias.forEach(archivo => {
    payload.append('evidencias', archivo);
  });

  const response = await fetchWithAuth(
    `${BASE_URL}/api/incidentes_soporte`,
    {
      method: 'POST',
      body: payload
    }
  );

  if (!response.ok) {
    const detalle = await response.json().catch(() => ({}));
    throw new Error(detalle.error || 'Error al crear el ticket');
  }

  return response.json();
},

  updateIncidente: async (id, data) => {
    const res = await fetchWithAuth(`${BASE_URL}/api/incidentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar incidente');
    return res.json();
  },
  updateIncidenteConEvidencia: async (id, formData) => {
  const res = await fetchWithAuth(
    `${BASE_URL}/api/incidentes/${id}`,
    {
      method: 'PUT',
      body: formData
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));

    throw new Error(
      error.error ||
      error.message ||
      'Error al actualizar el ticket con evidencia'
    );
  }

  return res.json();
},

  deleteIncidente: async (id) => {
    const res = await fetchWithAuth(`${BASE_URL}/api/incidentes/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar incidente');
    }
    return res.json();
  },

  // === MANTENIMIENTOS ===
  getMantenimientos: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/mantenimientos/`);
    if (!response.ok) throw new Error('Error al cargar mantenimientos');
    return response.json();
  },

  createMantenimiento: async (data) => {
    const response = await fetchWithAuth(`${BASE_URL}/mantenimientos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al registrar mantenimiento');
    return response.json();
  },

downloadExcel: async () => {
  const response = await fetchWithAuth(
    `${BASE_URL}/api/reportes/mantenimiento-excel`
  );
  if (!response.ok) {
    throw new Error('Error al descargar el reporte de mantenimiento');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte_mantenimiento.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
},
getOperacionesReportes: async () =>{
  const response = await fetchWithAuth(`${BASE_URL}/api/reportes/operaciones`);
  if(!response.ok) throw new Error('No se pudieron cargar operaciones');
  return response.json();
},
downloadMasterReport : async (startDate, endDate, operacion) =>{
  const params = new URLSearchParams({
    startDate,
    endDate,
    operacion
  });
    const response = await fetchWithAuth(
    `${BASE_URL}/api/reportes/master?${params.toString()}`
  );
  if(!response.ok){
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Error al generar el reporte maestro');

  }
  return response.blob();
},

    getPersonalParaEntrega: async (dni, tipo = 'Entrega') => {
    const params = new URLSearchParams({ tipo });

    const response = await fetchWithAuth(
      `${BASE_URL}/api/entregas/personal/${encodeURIComponent(String(dni).trim())}?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al buscar al trabajador');
    }

    return data.persona;
  },
  // === ENTREGAS ===
  getEntregas: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/entregas`);
    if (!response.ok) throw new Error('Error al cargar entregas');
    return response.json();
  },

  createEntrega: async (data) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/entregas`, {
      method: 'POST',
      body: data,
    });
    if (!response.ok) {
      const text = await response.text();
      let err = `Status ${response.status}: `;
      try { const j = JSON.parse(text); err += j.error || text; } catch(e) { err += text; }
      throw new Error('Error backend: ' + err);
    }
    return response.json();
  },

  updateEntrega: async (id, data) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/entregas/${id}`, {
      method: 'PUT',
      body: data,
    });
    if (!response.ok) {
      const text = await response.text();
      let err = `Status ${response.status}: `;
      try { const j = JSON.parse(text); err += j.error || text; } catch(e) { err += text; }
      throw new Error('Error backend: ' + err);
    }
    return response.json();
  },

  deleteEntrega: async (id) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/entregas/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      let errText = 'Error al eliminar entrega';
      try { const resData = await response.json(); if (resData.error) errText += ': ' + resData.error; } catch(e){}
      throw new Error(errText);
    }
    return response.json();
  },

    uploadEntregasExcel: async (file, vista, confirmar = false, firma = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', vista || '');
    formData.append('confirmar', confirmar ? 'si' : 'no');
    formData.append('firma', firma);

    const response = await fetchWithAuth(`${BASE_URL}/api/entregas/upload-excel`, { method: 'POST', body: formData });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Error al importar inventario TI');
    }
    return response.json();
  },

    exportExcelEntregas: async (vista, categoria, fechaInicio, fechaFin) => {
    const params = new URLSearchParams();
    if (vista) params.set('tipo', vista);
    if (categoria) params.set('categoria', categoria);
    if (fechaInicio) params.set('fechaInicio', fechaInicio);
    if (fechaFin) params.set('fechaFin', fechaFin);

    const query = params.toString();
    const endpoint = `${BASE_URL}/api/entregas/export-excel${query ? `?${query}` : ''}`;
    const response = await fetchWithAuth(endpoint);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Error al exportar inventario TI');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodo = fechaInicio && fechaFin ? `_${fechaInicio}_al_${fechaFin}` : '';
    link.download = vista === 'Devolución'
      ? `devoluciones_ti${periodo}.xlsx`
      : `entregas_ti${periodo}.xlsx`;

    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
  },
downloadFlotasReport: async ({
  formato = 'pdf',
  filtro = 'todos',
  valor = '',
  fecha = 'siempre',
  fechaInicio = '',
  fechaFin = '',
  operacion = 'todas',
  signal
}) => {
  const params = new URLSearchParams({
    filtro,
    valor,
    fecha,
    operacion
  });
  if (fechaInicio) params.set('fechaInicio', fechaInicio);
  if (fechaFin) params.set('fechaFin', fechaFin);

  const response = await fetchWithAuth(
  `${BASE_URL}/reportes/${formato}?${params.toString()}`,
  { signal }
);

  if (!response.ok) {
    let mensaje = 'Error al generar el reporte';

    try {
      const data = await response.json();
      if (data.error) mensaje = data.error;
    } catch {
      // La respuesta puede ser un archivo o texto.
    }

    throw new Error(mensaje);
  }

  return response.blob();
},
};
