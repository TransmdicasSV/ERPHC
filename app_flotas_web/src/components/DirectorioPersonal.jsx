import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function DirectorioPersonal() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(null);
  
  const [formData, setFormData] = useState({
    id_interno: '',
    nombre_completo: '',
    dni: '',
    modalidad: '',
    area: '',
    cargo: '',
    telefono: '',
    estado: 'Activo'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getPersonal();
      setPersonal(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (person = null) => {
    if (person) {
      setEditingPersonal(person);
      setFormData({
        id_interno: person.id_interno || '',
        nombre_completo: person.nombre_completo || '',
        dni: person.dni || '',
        modalidad: person.modalidad || '',
        area: person.area || '',
        cargo: person.cargo || '',
        telefono: person.telefono || '',
        estado: person.estado || 'Activo'
      });
    } else {
      setEditingPersonal(null);
      setFormData({
        id_interno: '',
        nombre_completo: '',
        dni: '',
        modalidad: '',
        area: '',
        cargo: '',
        telefono: '',
        estado: 'Activo'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingPersonal) {
        await api.updatePersonal(editingPersonal.id, formData);
      } else {
        await api.createPersonal(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('Error guardando los datos del personal: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      try {
        await api.deletePersonal(id);
        loadData();
      } catch (error) {
        alert('Error eliminando: ' + error.message);
      }
    }
  };

  const filteredPersonal = personal.filter(p => 
    p?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p?.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p?.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p?.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>👤</span> Directorio de Personal
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
            Gestión centralizada de colaboradores de la empresa.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          + Añadir Personal
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre, DNI, cargo o área..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1rem' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando directorio...</div>
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
              <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>DNI</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Nombres y Apellidos</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Cargo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Área</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Teléfono</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Estado</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonal.map((p, i) => (
                  <tr 
                    key={p.id} 
                    style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)', transition: 'background 0.2s' }}
                  >
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.dni}</td>
                    <td style={{ padding: '1rem' }}>{p.nombre_completo}</td>
                    <td style={{ padding: '1rem' }}>{p.cargo || '-'}</td>
                    <td style={{ padding: '1rem' }}>{p.area || '-'}</td>
                    <td style={{ padding: '1rem' }}>{p.telefono || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.875rem', 
                        fontWeight: 'bold',
                        backgroundColor: p.estado === 'Activo' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: p.estado === 'Activo' ? '#10b981' : '#ef4444'
                      }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenModal(p)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '1rem' }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPersonal.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No se encontraron resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Formulario */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                {editingPersonal ? 'Editar Personal' : 'Nuevo Personal'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nombres y Apellidos *</label>
                <input 
                  type="text" 
                  value={formData.nombre_completo}
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>DNI *</label>
                <input 
                  type="text" 
                  value={formData.dni}
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Teléfono</label>
                <input 
                  type="text" 
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cargo</label>
                <input 
                  type="text" 
                  value={formData.cargo}
                  onChange={e => setFormData({...formData, cargo: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Área / Operación</label>
                <input 
                  type="text" 
                  value={formData.area}
                  onChange={e => setFormData({...formData, area: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Modalidad</label>
                <input 
                  type="text" 
                  value={formData.modalidad}
                  onChange={e => setFormData({...formData, modalidad: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Estado</label>
                <select 
                  value={formData.estado}
                  onChange={e => setFormData({...formData, estado: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
