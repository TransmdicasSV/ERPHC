import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function SoporteTicketsDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    placa: '',
    operador: '',
    tipo_solicitud: 'Soporte Técnico',
    descripcion: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidentes();
      setTickets(data);
    } catch (error) {
      toast.error('No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateIncidente(id, { estado: newStatus });
      toast.success(`Ticket actualizado a ${newStatus}`);
      fetchTickets(); // Recargar datos
    } catch (error) {
      toast.error('Error al actualizar ticket');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar permanentemente este ticket?')) return;
    try {
      await api.deleteIncidente(id);
      toast.success('Ticket eliminado');
      fetchTickets();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    try {
      await api.createIncidente({
        ...formData,
        fecha: new Date().toISOString()
      });
      toast.success('Ticket creado exitosamente');
      setShowModal(false);
      fetchTickets();
      setFormData({ placa: '', operador: '', tipo_solicitud: 'Soporte Técnico', descripcion: '' });
    } catch (error) {
      toast.error('Error al crear el ticket');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        `tkt-${t.id}`.includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'Todos' ? true : t.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    let isoString = dateString;
    if (isoString.includes('T') && !isoString.endsWith('Z')) {
      isoString += 'Z'; // Forzar que sea reconocido como UTC si no trae la Z
    } else if (!isoString.includes('T')) {
      isoString = isoString.replace(' ', 'T') + 'Z';
    }
    const d = new Date(isoString);
    return d.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
  };

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>Mesa de Ayuda TI 🎧</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Gestión centralizada de tickets de soporte y mantenimiento tecnológico.</p>

      {/* Controles de Filtrado */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Buscar por placa o #TKT..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: '1 1 250px', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', outline: 'none' }}
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', backgroundColor: 'var(--card-bg)', minWidth: '150px' }}>
          <option value="Todos">Todos los Estados</option>
          <option value="Pendiente">Pendientes</option>
          <option value="En Proceso">En Proceso</option>
          <option value="Resuelto">Resueltos</option>
        </select>
        <button onClick={fetchTickets} style={{ padding: '0.75rem 1rem', background: '#374151', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Actualizar
        </button>
        <button onClick={() => setShowModal(true)} style={{ padding: '0.75rem 1rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>
          ➕ Nuevo Ticket
        </button>
      </div>

      {/* Tabla de Tickets */}
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '2px solid #E5E7EB' }}>
            <tr>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}># Ticket</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fecha</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Placa</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Solicitud</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Operador</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando tickets...</td></tr>
            ) : filteredTickets.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron tickets.</td></tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: ticket.estado === 'Resuelto' ? '#F9FAFB' : 'white' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1F2937' }}>TKT-{ticket.id}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDate(ticket.fecha)}</td>
                  <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold' }}>{ticket.placa}</span></td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>{ticket.tipo_solicitud}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{ticket.descripcion}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ticket.operador || 'No especificado'}</td>
                  <td style={{ padding: '1rem' }}>
                    <select 
                      value={ticket.estado} 
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      style={{ 
                        padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid #D1D5DB', fontWeight: 'bold', fontSize: '0.8rem',
                        backgroundColor: ticket.estado === 'Pendiente' ? '#FEE2E2' : ticket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                        color: ticket.estado === 'Pendiente' ? '#991B1B' : ticket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                      }}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Resuelto">Resuelto</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setSelectedTicket(ticket)} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>👁️</span> Ver
                    </button>
                    <button onClick={() => handleDelete(ticket.id)} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Ticket */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Nuevo Ticket de Ayuda</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >✕</button>
            </div>
            
            <form onSubmit={handleSaveTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Placa de Vehículo</label>
                  <input type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} placeholder="Opcional" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nombre del Solicitante</label>
                  <input type="text" value={formData.operador} onChange={e => setFormData({...formData, operador: e.target.value})} placeholder="Ej. Juan Pérez" required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Categoría del Problema</label>
                <select value={formData.tipo_solicitud} onChange={e => setFormData({...formData, tipo_solicitud: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <option value="Soporte Técnico">Soporte Técnico (General)</option>
                  <option value="GPS No Reporta">GPS No Reporta</option>
                  <option value="Cámaras Desconectadas">Cámaras Desconectadas</option>
                  <option value="Mantenimiento de Equipo">Mantenimiento de Equipo</option>
                  <option value="Instalación de Software">Instalación de Software</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Descripción Detallada</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} rows="4" placeholder="Describa el problema reportado..." required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Crear Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Ticket */}
      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '550px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎫</span> Detalle de Ticket #TKT-{selectedTicket.id}
              </h2>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
              >✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Placa</span>
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {selectedTicket.placa || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Estado Actual</span>
                  <span style={{ 
                    padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem',
                    backgroundColor: selectedTicket.estado === 'Pendiente' ? '#FEE2E2' : selectedTicket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                    color: selectedTicket.estado === 'Pendiente' ? '#991B1B' : selectedTicket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                   }}>
                    {selectedTicket.estado}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Fecha de Creación</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{formatDate(selectedTicket.fecha)}</div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Operador Solicitante</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedTicket.operador || 'No especificado'}</div>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Categoría</span>
                <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.1rem' }}>{selectedTicket.tipo_solicitud}</div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descripción del Problema</span>
                <p style={{ margin: 0, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.5rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {selectedTicket.descripcion}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button type="button" onClick={() => setSelectedTicket(null)} style={{ padding: '0.75rem 2rem', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Detalles</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
