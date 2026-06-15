import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function SoporteTicketsDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

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

  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        `tkt-${t.id}`.includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'Todos' ? true : t.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const d = new Date(isoString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
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
                  <td style={{ padding: '1rem' }}>
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
    </div>
  );
}
