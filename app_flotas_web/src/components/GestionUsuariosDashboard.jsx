import React, { useState, useEffect } from 'react';
import { BASE_API_URL } from '../services/api';

const MODULES = [
  { id: 'resumen', label: 'Centro de Control (Resumen)' },
  { id: 'maestros', label: 'Maestros Generales (Flota/Personal)' },
  { id: 'dashboard', label: 'Registro de Inspecciones' },
  { id: 'radar', label: 'C.O.R.E. Radar' },
  { id: 'tickets', label: 'Tickets de Soporte' },
  { id: 'entregas', label: 'Entregas TI' },
  { id: 'devoluciones', label: 'Devoluciones TI' },
  { id: 'mantenimiento', label: 'Mantenimiento Técnico' },
  { id: 'reportes', label: 'Reportes Gerenciales' },
  { id: 'usuarios', label: 'Gestión de Usuarios' }
];

const TEMPLATES = {
  admin: MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { ver: true, editar: true } }), {}),
  operaciones: {
    resumen: { ver: true, editar: false },
    maestros: { ver: true, editar: false },
    dashboard: { ver: false, editar: false },
    radar: { ver: true, editar: false },
    tickets: { ver: false, editar: false },
    entregas: { ver: false, editar: false },
    devoluciones: { ver: false, editar: false },
    mantenimiento: { ver: false, editar: false },
    reportes: { ver: true, editar: false },
    usuarios: { ver: false, editar: false }
  },
  supervisor: MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { ver: true, editar: false } }), {}),
  inspectores: {
    ...MODULES.reduce((acc, m) => ({ ...acc, [m.id]: { ver: true, editar: true } }), {}),
    usuarios: { ver: false, editar: false }
  }
};

export function GestionUsuariosDashboard() {
  const [usuarios, setUsuarios] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rol: 'operaciones',
    estado: 'activo',
    permisos: TEMPLATES.operaciones
  });

  const [selectedPersonalId, setSelectedPersonalId] = useState('');

  useEffect(() => {
    fetchData();
    fetchPersonal();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${BASE_API_URL}/api/usuarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonal = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const res = await fetch(`${BASE_API_URL}/api/personal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPersonal(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username,
        password: '',
        rol: user.rol,
        estado: user.estado,
        permisos: user.permisos || TEMPLATES[user.rol] || TEMPLATES.operaciones
      });
      setSelectedPersonalId('');
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        password: '',
        rol: 'operaciones',
        estado: 'activo',
        permisos: TEMPLATES.operaciones
      });
      setSelectedPersonalId('');
    }
    setModalOpen(true);
  };

  const handlePersonalChange = (e) => {
    const pId = e.target.value;
    setSelectedPersonalId(pId);
    if (pId) {
      const persona = personal.find(p => p.id.toString() === pId);
      if (persona) {
        setFormData({ ...formData, username: persona.dni });
      }
    }
  };

  const handleRolChange = (e) => {
    const newRol = e.target.value;
    setFormData({
      ...formData,
      rol: newRol,
      permisos: TEMPLATES[newRol] || TEMPLATES.operaciones
    });
  };

  const togglePermiso = (modulo, tipo) => {
    setFormData(prev => {
      const perms = { ...prev.permisos };
      if (!perms[modulo]) perms[modulo] = { ver: false, editar: false };
      perms[modulo][tipo] = !perms[modulo][tipo];
      
      // Si se quita "ver", también quitar "editar"
      if (tipo === 'ver' && !perms[modulo].ver) {
        perms[modulo].editar = false;
      }
      // Si se da "editar", también dar "ver"
      if (tipo === 'editar' && perms[modulo].editar) {
        perms[modulo].ver = true;
      }
      
      return { ...prev, permisos: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('nexus_token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${BASE_API_URL}/api/usuarios/${editingId}` : `${BASE_API_URL}/api/usuarios`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
    const token = localStorage.getItem('nexus_token');
    try {
      const res = await fetch(`${BASE_API_URL}/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Gestión de Usuarios (RBAC)</h1>
        <button 
          onClick={() => handleOpenModal()}
          style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Crear Usuario
        </button>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>DNI / Username</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Rol Base</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Módulos Asignados</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</td></tr>
            ) : usuarios.map(u => {
              const activeModules = u.permisos ? Object.entries(u.permisos).filter(([k,v]) => v?.ver).length : 0;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: u.rol === 'admin' ? '#DC2626' : u.rol === 'operaciones' ? '#3B82F6' : u.rol === 'supervisor' ? '#8B5CF6' : '#10B981' 
                    }}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{activeModules} módulos</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ color: u.estado === 'activo' ? '#10B981' : '#EF4444' }}>●</span> {u.estado}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button onClick={() => handleOpenModal(u)} style={{ background: 'transparent', border: '1px solid #374151', color: '#9CA3AF', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer', marginRight: '0.5rem' }}>✏️</button>
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer' }}>🗑️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <form id="user-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* COLUMNA IZQUIERDA: DATOS BÁSICOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {!editingId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Vincular con Personal (opcional)</label>
                      <select 
                        value={selectedPersonalId} 
                        onChange={handlePersonalChange}
                        style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1F2937', color: 'white', border: '1px solid #374151', outline: 'none' }}
                      >
                        <option value="">-- Seleccionar Trabajador --</option>
                        {personal.map(p => (
                          <option key={p.id} value={p.id}>{p.dni} - {p.nombre_completo}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Username (DNI)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      disabled={!!editingId}
                      style={{ padding: '0.75rem', borderRadius: '0.5rem', background: editingId ? '#111827' : '#1F2937', color: 'white', border: '1px solid #374151', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Contraseña {editingId && '(dejar en blanco para no cambiar)'}</label>
                    <input 
                      type="password"
                      required={!editingId}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1F2937', color: 'white', border: '1px solid #374151', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Rol Base (Plantilla)</label>
                      <select 
                        value={formData.rol}
                        onChange={handleRolChange}
                        style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1F2937', color: 'white', border: '1px solid #374151', outline: 'none' }}
                      >
                        <option value="admin">Administrador</option>
                        <option value="operaciones">Operaciones</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="inspectores">Inspectores</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Estado</label>
                      <select 
                        value={formData.estado}
                        onChange={e => setFormData({...formData, estado: e.target.value})}
                        style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1F2937', color: 'white', border: '1px solid #374151', outline: 'none' }}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: MATRIZ DE PERMISOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Matriz Dinámica de Accesos</label>
                  <div style={{ background: '#1F2937', borderRadius: '0.5rem', border: '1px solid #374151', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid #374151' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Módulo</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Ver</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Editar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(m => {
                          const perms = formData.permisos[m.id] || { ver: false, editar: false };
                          return (
                            <tr key={m.id} style={{ borderBottom: '1px solid #374151' }}>
                              <td style={{ padding: '0.5rem' }}>{m.label}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={perms.ver} 
                                  onChange={() => togglePermiso(m.id, 'ver')} 
                                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={perms.editar} 
                                  onChange={() => togglePermiso(m.id, 'editar')} 
                                  disabled={!perms.ver}
                                  style={{ transform: 'scale(1.2)', cursor: perms.ver ? 'pointer' : 'not-allowed', opacity: perms.ver ? 1 : 0.3 }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </form>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.1)' }}>
              <button onClick={() => setModalOpen(false)} type="button" style={{ background: 'transparent', color: '#9CA3AF', border: '1px solid #374151', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button form="user-form" type="submit" style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
