import React, { useState, useEffect } from 'react';
import { BASE_API_URL } from '../services/api';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function IncidentesDashboard({ navigate }) {
  const [incidentes, setIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadIncidentes();
  }, []);

  const loadIncidentes = async () => {
    try {
      const data = await api.getIncidentes();
      setIncidentes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateEstado = async (id, newStatus) => {
    try {
      toast.loading('Actualizando...', { id: 'update-incidente' });
      await api.updateIncidente(id, { estado: newStatus });
      toast.success('Estado actualizado', { id: 'update-incidente' });
      loadIncidentes();
    } catch (error) {
      toast.error('Error al actualizar: ' + error.message, { id: 'update-incidente' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este incidente de forma permanente?')) {
      try {
        toast.loading('Eliminando...', { id: 'delete-incidente' });
        await api.deleteIncidente(id);
        toast.success('Incidente eliminado', { id: 'delete-incidente' });
        loadIncidentes();
      } catch (error) {
        toast.error('Error al eliminar: ' + error.message, { id: 'delete-incidente' });
      }
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando incidentes...</div>;

  const pendientes = incidentes.filter(i => i.estado === 'Pendiente');
  const enProceso = incidentes.filter(i => i.estado === 'En Proceso');
  const resueltos = incidentes.filter(i => i.estado === 'Resuelto');

  const handleLocate = (placa) => {
    localStorage.setItem('quick_search_radar', placa);
    if (navigate) navigate('radar');
  };

  const TicketCard = ({ ticket }) => (
    <div style={{ backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${ticket.estado === 'Pendiente' ? '#EF4444' : ticket.estado === 'En Proceso' ? '#F59E0B' : '#10B981'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span 
          onClick={() => handleLocate(ticket.placa)}
          style={{ fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', textDecoration: 'underline', color: '#1D4ED8' }}
          title="Ver en Radar"
        >
          {ticket.placa} 🗺️
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {(() => {
            const [year, month, day] = ticket.fecha.split('T')[0].split('-');
            return `${day}/${month}/${year}`;
          })()}
        </span>
      </div>
      <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '0.9rem' }}>{ticket.novedad || 'Sin área/novedad'}</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        <span style={{ color: '#9CA3AF' }}>👤 {ticket.conductor}</span>
        <select 
          value={ticket.estado}
          onChange={(e) => updateEstado(ticket.id, e.target.value)}
          style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #D1D5DB', backgroundColor: 'var(--bg-color)', cursor: 'pointer' }}
        >
          <option value="Pendiente">Pendiente</option>
          <option value="En Proceso">En Proceso</option>
          <option value="Resuelto">Resuelto</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #F3F4F6', paddingTop: '0.5rem' }}>
        <button onClick={() => setSelectedTicket(ticket)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#EFF6FF', color: '#3B82F6', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>👁️ Ver Detalles</button>
        <button onClick={() => handleDelete(ticket.id)} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }} title="Eliminar Incidente">🗑️</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Gestión de Incidentes y Soporte</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Atención a solicitudes y reportes de operadores.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
        
        {/* Columna Pendientes */}
        <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <span>🔴 Pendientes</span>
            <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{pendientes.length}</span>
          </h3>
          {pendientes.map(t => <TicketCard key={t.id} ticket={t} />)}
          {pendientes.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay tickets nuevos</p>}
        </div>

        {/* Columna En Proceso */}
        <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <span>🟠 En Proceso</span>
            <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{enProceso.length}</span>
          </h3>
          {enProceso.map(t => <TicketCard key={t.id} ticket={t} />)}
          {enProceso.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay tickets en proceso</p>}
        </div>

        {/* Columna Resueltos */}
        <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <span>🟢 Resueltos</span>
            <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{resueltos.length}</span>
          </h3>
          {resueltos.map(t => <TicketCard key={t.id} ticket={t} />)}
          {resueltos.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay tickets resueltos</p>}
        </div>

      </div>

      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Detalle de Incidente</h3>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Placa Reportada</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1D4ED8' }}>{selectedTicket.placa}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Conductor/Operador</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{selectedTicket.conductor || 'No especificado'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Fecha de Reporte</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {selectedTicket.fecha 
                      ? new Date(selectedTicket.fecha.includes('T') ? selectedTicket.fecha : selectedTicket.fecha.replace(' ', 'T') + 'Z').toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) 
                      : ''}
                  </p>
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Área</p>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>{selectedTicket.area || 'Sin especificar'}</p>
              </div>
              <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Novedad / Descripción</p>
                <p style={{ margin: 0, color: '#374151', whiteSpace: 'pre-wrap' }}>{selectedTicket.novedad || 'No hay descripción detallada.'}</p>
              </div>
              {selectedTicket.img && (
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Evidencia Adjunta</p>
                  <img src={selectedTicket.img} alt="Evidencia" style={{ maxWidth: '100%', borderRadius: '0.5rem' }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedTicket(null)} style={{ padding: '0.5rem 1rem', backgroundcolor: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
