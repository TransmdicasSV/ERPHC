// Si estamos en desarrollo usa localhost, si es producción usa Render
export const BASE_API_URL = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8000` 
  : 'https://jdcali-backend.onrender.com';
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
  
  const response = await fetch(url, newOptions);
  
  // Solo forzar logout en 401 (Token inválido/expirado). 
  // 403 significa acceso denegado (ej. no es admin), no debe cerrar sesión.
  if (response.status === 401) {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    window.location.reload();
  }
  
  return response;
};

export const api = {  // ==========================================
  // MAESTRO DE FLOTA
  // ==========================================
  getTractos: async () => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/maestro/tractos`);
    if (!response.ok) throw new Error('Error al cargar tractos');
    return response.json();
  },
  
  getSemirremolques: async () => {
    const response = await fetchWithAuth(`${BASE_API_URL}/api/maestro/semirremolques`);
    if (!response.ok) throw new Error('Error al cargar semirremolques');
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
    if (!response.ok) throw new Error('Error al crear inspeccion');
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

  // === INCIDENTES ===
  getIncidentes: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/incidentes`);
    if (!response.ok) throw new Error('Error al cargar incidentes');
    return response.json();
  },

  createIncidente: async (data) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/incidentes_soporte`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear incidente');
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

  downloadExcel: () => {
    const token = localStorage.getItem('nexus_token');
    window.location.href = `${BASE_URL}/api/reportes/mantenimiento-excel?token=${token}`;
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

  uploadEntregasExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetchWithAuth(`${BASE_URL}/api/entregas/upload-excel`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      let errText = 'Error al subir Excel';
      try { const resData = await response.json(); if (resData.error) errText += ': ' + resData.error; } catch(e){}
      throw new Error(errText);
    }
    return response.json();
  },

  exportExcelEntregas: (vista) => {
    const token = localStorage.getItem('nexus_token');
    const param = vista ? `&tipo=${encodeURIComponent(vista)}` : '';
    window.location.href = `${BASE_URL}/api/entregas/export-excel?token=${token}${param}`;
  }
};
