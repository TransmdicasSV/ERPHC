import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function SoporteTicketsDashboard({ permisos, usuario }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState('KANBAN'); // 'KANBAN' o 'HISTORIAL'
  const [showModal, setShowModal] = useState(false);
  const [showExternalTechModal, setShowExternalTechModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Estados para Modal de Resolución con Evidencia
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState(null);
  const [resolveFormData, setResolveFormData] = useState({ resolucion_desc: '', evidencia: null });
  const [formData, setFormData] = useState({
  placa: '',
  operacion: '',
  operador: '',
  tipo_solicitud: 'Soporte Técnico',
  descripcion: ''
});
  const canCreate = permisos?.crear === true;
  const [opcionesTicket, setOpcionesTicket] = useState(null);

useEffect(() => {
  if (!showModal || !canCreate) return;

  let vigente = true;
  setOpcionesTicket(null);

  api.getOpcionesTickets()
    .then(datos => {
      if (vigente) setOpcionesTicket(datos);
    })
    .catch(() => {
      if (vigente) {
        toast.error('No se pudieron cargar las opciones del ticket');
      }
    });

  return () => { vigente = false; };
}, [showModal, canCreate]);

const renderDestinoTicket = () => {
  const placa = formData.placa.trim().toUpperCase();
  const vehiculo = opcionesTicket?.vehiculos.find(v => v.placa === placa);

  const operacionAutomatica = vehiculo?.operacion
    || opcionesTicket?.operacionAsignada
    || '';

  const estilo = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  return (
    <>
      <input
        type="text"
        list="placas-ticket"
        autoComplete="off"
        maxLength={20}
        value={formData.placa}
        onChange={e => setFormData(actual => ({
          ...actual,
          placa: e.target.value.toUpperCase(),
          operacion: ''
        }))}
        placeholder="Opcional: escriba para buscar"
        style={estilo}
      />

      <datalist id="placas-ticket">
        {opcionesTicket?.vehiculos.map(v => (
          <option key={v.placa} value={v.placa} label={v.operacion} />
        ))}
      </datalist>

      <small>Ejemplo: V0R-721. Puede dejar la placa vacía.</small>

      <label style={{ display: 'block', margin: '0.75rem 0 0.4rem' }}>
        Operación
      </label>

      {placa || opcionesTicket?.operacionAsignada ? (
        <input
          type="text"
          readOnly
          value={operacionAutomatica}
          placeholder="Se obtiene al seleccionar una placa"
          style={estilo}
        />
      ) : (
        <select
          required
          value={formData.operacion || ''}
          onChange={e => setFormData(actual => ({
            ...actual,
            operacion: e.target.value
          }))}
          style={estilo}
          disabled={!opcionesTicket}
        >
          <option value="">Seleccione una operación</option>

          {opcionesTicket?.operaciones.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      )}
    </>
  );
};  
  const canManage = permisos?.gestionar === true;
  const isAdmin = ['admin', 'administrador'].includes(String(usuario?.rol || '').toLowerCase());

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidentes();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!canManage) {
      toast.error('No tienes permiso para gestionar tickets');
      return;
    }
    if (newStatus === 'Resuelto') {
      setResolvingTicketId(id);
      setResolveFormData({ resolucion_desc: '', evidencia: null });
      setShowResolveModal(true);
      return;
    }

    try {
      await api.updateIncidente(id, { estado: newStatus });
      toast.success(`Ticket actualizado a ${newStatus}`);
      fetchTickets(); // Recargar datos
    } catch (error) {
      toast.error('Error al actualizar ticket');
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('No tienes permiso para resolver tickets');
      return;
    }
    try {
      toast.loading('Resolviendo ticket...', { id: 'resolve-ticket' });
      const formData = new FormData();
      formData.append('estado', 'Resuelto');
      if (resolveFormData.resolucion_desc) {
        formData.append('resolucion_desc', resolveFormData.resolucion_desc);
      }
      if (resolveFormData.evidencia) {
        formData.append('evidencia', resolveFormData.evidencia);
      }

      await api.updateIncidenteConEvidencia(resolvingTicketId, formData);
      toast.success('Ticket resuelto exitosamente', { id: 'resolve-ticket' });
      setShowResolveModal(false);
      fetchTickets();
      if (selectedTicket && String(selectedTicket.id) === String(resolvingTicketId)) {
        setSelectedTicket({ ...selectedTicket, estado: 'Resuelto' });
      }
    } catch (error) {
      console.error("Error Front-end al resolver ticket:", error);
      toast.error(`Error al resolver ticket: ${error.message}`, { id: 'resolve-ticket' });
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      toast.error('Solo el administrador puede eliminar tickets');
      return;
    }
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

  if (!canCreate) {
    return toast.error('No tienes permiso para crear tickets');
  }

  if (!opcionesTicket) {
    return toast.error('Espere a que se carguen las opciones');
  }

  const placa = formData.placa.trim().toUpperCase();

  if (placa && !opcionesTicket.vehiculos.some(v => v.placa === placa)) {
    return toast.error(
      'Seleccione una placa de las sugerencias o deje el campo vacío'
    );
  }

  if (!placa && !opcionesTicket.operacionAsignada && !formData.operacion) {
    return toast.error('Seleccione una operación');
  }

  try {
    await api.createIncidente({
      ...formData,
      placa: placa || null
    });

    toast.success('Ticket creado exitosamente');
    setShowModal(false);
    fetchTickets();

    setFormData({
      placa: '',
      operacion: '',
      operador: '',
      tipo_solicitud: 'Soporte Técnico',
      descripcion: ''
    });
  } catch (error) {
    toast.error(error.message || 'Error al crear el ticket');
  }
};

  const pendientes = tickets.filter(t => t.estado === 'Pendiente');
  const enProceso = tickets.filter(t => t.estado === 'En Proceso');
  const resueltos = tickets.filter(t => t.estado === 'Resuelto');

  const getFilteredList = (list) => {
    return list.filter(t => {
      const p = t.placa ? String(t.placa).toLowerCase() : '';
      const id = t.id ? String(t.id).toLowerCase() : '';
      const s = searchTerm ? String(searchTerm).toLowerCase() : '';
      return p.includes(s) || `tkt-${id}`.includes(s);
    });
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('ticketId', id);
    // Usamos setTimeout para que la tarjeta no desaparezca mientras se arrastra (truco de Chrome)
    setTimeout(() => setDraggedTicketId(id), 0);
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault(); // Permite que se pueda soltar aquí
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!canManage) return; // Bloquear si es solo lectura
    const id = e.dataTransfer.getData('ticketId');
    if (id) {
      const ticket = tickets.find(t => String(t.id) === String(id));
      if (ticket && ticket.estado !== columnStatus) {
        handleStatusChange(id, columnStatus);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    let isoString = String(dateString);
    if (isoString.includes('T') && !isoString.endsWith('Z')) {
      isoString += 'Z'; // Forzar que sea reconocido como UTC si no trae la Z
    } else if (!isoString.includes('T')) {
      isoString = isoString.replace(' ', 'T') + 'Z';
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(dateString).split(' ')[0]; // Fallback si es invalida
    return d.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
  };

  const renderKanbanColumn = (title, status, ticketsList, colorHex, icon) => {
    if (statusFilter !== 'Todos' && statusFilter !== status) return null;

    const list = getFilteredList(ticketsList);

    return (
      <div
        className="kanban-column"
        style={{
          borderTop: `4px solid ${colorHex}`,
          backgroundColor: dragOverColumn === status ? '#F3F4F6' : 'var(--card-bg)',
          transition: 'background-color 0.2s ease',
          minHeight: '200px'
        }}
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            <span>{icon}</span> {title}
          </h3>
          <span style={{ backgroundColor: '#E5E7EB', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#4B5563' }}>{list.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {list.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '2px dashed #E5E7EB', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Soltar aquí
            </div>
          ) : (
            list.map(ticket => (
              <div
                key={ticket.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, ticket.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedTicket(ticket)}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  cursor: 'grab',
                  opacity: draggedTicketId === ticket.id ? 0.4 : 1,
                  transform: draggedTicketId === ticket.id ? 'scale(0.98)' : 'scale(1)',
                  transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.2s'
                }}
                onMouseEnter={(e) => { if (draggedTicketId !== ticket.id) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; } }}
                onMouseLeave={(e) => { if (draggedTicketId !== ticket.id) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem' }}>#TKT-{ticket.id}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{formatDate(ticket.fecha).split(' ')[0]}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #BFDBFE' }}>{ticket.placa || ('Sin placa · ' + ticket.operacion)}</span>
                  {ticket.prioridad && (
                    <span style={{ backgroundColor: ticket.prioridad === 'Alta' ? '#FEE2E2' : ticket.prioridad === 'Media' ? '#FEF3C7' : '#E0E7FF', color: ticket.prioridad === 'Alta' ? '#991B1B' : ticket.prioridad === 'Media' ? '#92400E' : '#3730A3', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: '800', fontSize: '0.7rem' }}>🔥 {ticket.prioridad}</span>
                  )}
                  {ticket.categoria && (
                    <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: '700', fontSize: '0.7rem' }}>{ticket.categoria}</span>
                  )}
                </div>
                <div style={{ fontWeight: '700', color: '#1F2937', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.2' }}>
                  {ticket.tipo_solicitud === 'Técnico Externo' ? '👷‍♂️ TÉCNICO EXTERNO' : ticket.tipo_solicitud}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                  {ticket.descripcion}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>👤</div>
                    {ticket.operador ? (ticket.operador.split(' ')[0]) : 'S/N'}
                  </div>

                  {/* Select Inline para cambio rápido de estado */}
                  <select
                    value={ticket.estado}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    disabled={!canManage}
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '1rem', border: '1px solid transparent', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', outline: 'none',
                      backgroundColor: ticket.estado === 'Pendiente' ? '#FEE2E2' : ticket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                      color: ticket.estado === 'Pendiente' ? '#991B1B' : ticket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                    }}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const isReadOnly = !canManage;

  if (isReadOnly) {
    return (
      <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>🎫</span> Tickets de Soporte de mi Operación
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
              Consulta el estado de los requerimientos pertenecientes a tu operación.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              ➕ Nueva Solicitud
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {tickets.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              No tienes solicitudes registradas.
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{ticket.tipo_solicitud} {ticket.placa ? `- ${ticket.placa}` : ''}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ticket.descripcion}</p>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9CA3AF' }}>📅 {formatDate(ticket.fecha)} | 👤 {ticket.operador}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    backgroundColor: ticket.estado === 'Pendiente' ? '#FEE2E2' : ticket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                    color: ticket.estado === 'Pendiente' ? '#991B1B' : ticket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                  }}>
                    {ticket.estado}
                  </span>
                  {ticket.resolucion_desc && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#065F46' }}>✓ {ticket.resolucion_desc}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Nuevo Ticket */}
        {canCreate && showModal && (
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', animation: 'scaleUp 0.2s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>Nuevo Ticket de Ayuda</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSaveTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Placa de Vehículo</label>
                    {renderDestinoTicket()}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Nombre del Solicitante</label>
                    <input type="text" value={formData.operador} onChange={e => setFormData({ ...formData, operador: e.target.value })} placeholder="Ej. Juan Pérez" required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outlineColor: 'var(--accent-color)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Tipo de Solicitud</label>
                  <select value={formData.tipo_solicitud} onChange={e => setFormData({ ...formData, tipo_solicitud: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outlineColor: 'var(--accent-color)' }}>
                    <option>Soporte Técnico</option>
                    <option>Solicitud de Accesorio</option>
                    <option>Revisión de Cámaras</option>
                    <option>Capacitación</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Problema</label>
                  <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} rows={4} required placeholder="Describa el problema detalladamente..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outlineColor: 'var(--accent-color)', resize: 'vertical' }}></textarea>
                </div>

                <button type="submit" style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem', transition: 'background 0.2s' }}>
                  Crear Ticket
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>Mesa de Ayuda de Tickets 🎟️</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestión centralizada de incidentes y requerimientos tecnológicos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowExternalTechModal(true)} style={{ padding: '0.75rem 1.5rem', background: '#FEF08A', color: '#854D0E', border: '1px solid #FDE047', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <span>👷‍♂️</span> Técnicos Externos
          </button>
          {canCreate && (
            <button onClick={() => setShowModal(true)} style={{ padding: '0.75rem 1.5rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>
              <span>➕ </span> Crear Nuevo Ticket
            </button>
          )}
        </div>
      </div>

      {/* Pestañas (Tabs) KANBAN vs HISTORIAL */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={() => setActiveTab('KANBAN')} style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'KANBAN' ? '3px solid #2563EB' : '3px solid transparent', color: activeTab === 'KANBAN' ? '#2563EB' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
          📋 Tablero Activo
        </button>
        <button onClick={() => setActiveTab('HISTORIAL')} style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', background: 'none', border: 'none', borderBottom: activeTab === 'HISTORIAL' ? '3px solid #10B981' : '3px solid transparent', color: activeTab === 'HISTORIAL' ? '#10B981' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
          📚 Historial de Trabajos Técnicos
        </button>
      </div>

      {activeTab === 'KANBAN' && (
        <>
          {/* Controles de Filtrado y Stats */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <input
              type="text"
              placeholder="🔍 Buscar placa o #TKT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: '1 1 250px', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => setStatusFilter('Todos')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: statusFilter === 'Todos' ? '#1F2937' : '#E5E7EB', color: statusFilter === 'Todos' ? 'white' : '#374151', transition: 'all 0.2s' }}>
                Todos ({pendientes.length + enProceso.length})
              </button>
              <button onClick={() => setStatusFilter('Pendiente')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: statusFilter === 'Pendiente' ? '#DC2626' : '#FEE2E2', color: statusFilter === 'Pendiente' ? 'white' : '#991B1B', transition: 'all 0.2s' }}>
                🔴 Pendientes ({pendientes.length})
              </button>
              <button onClick={() => setStatusFilter('En Proceso')} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: statusFilter === 'En Proceso' ? '#D97706' : '#FEF3C7', color: statusFilter === 'En Proceso' ? 'white' : '#92400E', transition: 'all 0.2s' }}>
                🟡 En Proceso ({enProceso.length})
              </button>
            </div>

            <button onClick={fetchTickets} style={{ padding: '0.75rem', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '0.5rem', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Recargar">
              🔄
            </button>
          </div>

          {/* Tablero Kanban */}
          <div className="kanban-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {renderKanbanColumn('Pendientes', 'Pendiente', pendientes, '#EF4444', '🔴')}
            {renderKanbanColumn('En Proceso', 'En Proceso', enProceso, '#F59E0B', '🟡')}
          </div>
        </>
      )}

      {activeTab === 'HISTORIAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="🔍 Buscar placa o #TKT en historial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '300px', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem' }}
            />
            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Total Resueltos: {resueltos.length}</span>
          </div>

          <div className="table-container" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>TKT</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>Fecha</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>Técnico / Tipo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>Problema / Solución</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#4B5563', fontSize: '0.85rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredList(resueltos).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No hay tickets resueltos.</td></tr>
                ) : (
                  getFilteredList(resueltos).map(ticket => (
                    <tr key={ticket.id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#111827' }}>#{ticket.id}</td>
                      <td style={{ padding: '1rem', color: '#4B5563', fontSize: '0.9rem' }}>{formatDate(ticket.fecha)}</td>
                      <td style={{ padding: '1rem' }}><span className="badge" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold', fontSize: '0.75rem' }}>{ticket.placa || ('Sin placa · ' + ticket.operacion)}</span></td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.9rem' }}>{ticket.tipo_solicitud}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>👤 {ticket.operador || 'S/N'}</div>
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.descripcion}><strong>Prob:</strong> {ticket.descripcion}</div>
                        {ticket.resolucion_desc && <div style={{ fontSize: '0.85rem', color: '#065F46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.resolucion_desc}><strong>Sol:</strong> {ticket.resolucion_desc}</div>}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {ticket.evidencia && (
                          <button onClick={() => window.open(ticket.evidencia, '_blank')} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '0.3rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} title="Ver Foto">
                            📸
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(ticket.id)} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar Permanente">
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Ticket */}
      {canCreate && showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>Nuevo Ticket de Ayuda</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Placa de Vehículo</label>
                  {renderDestinoTicket()}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Nombre del Solicitante</label>
                  <input type="text" value={formData.operador} onChange={e => setFormData({ ...formData, operador: e.target.value })} placeholder="Ej. Juan Pérez" required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outlineColor: 'var(--accent-color)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Categoría del Problema</label>
                <select value={formData.tipo_solicitud} onChange={e => setFormData({ ...formData, tipo_solicitud: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outlineColor: 'var(--accent-color)' }}>
                  <option value="Soporte Técnico">Soporte Técnico (General)</option>
                  <option value="GPS No Reporta">GPS No Reporta</option>
                  <option value="Cámaras Desconectadas">Cámaras Desconectadas</option>
                  <option value="Mantenimiento de Equipo">Mantenimiento de Equipo</option>
                  <option value="Instalación de Software">Instalación de Software</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>Descripción Detallada</label>
                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} rows="4" placeholder="Describa el problema reportado de manera clara..." required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical', outlineColor: 'var(--accent-color)' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #D1D5DB', color: '#374151', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>Guardar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Técnicos Externos */}
      {showExternalTechModal && (
        <div onClick={() => setShowExternalTechModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--card-bg)', width: '800px', maxWidth: '95%', maxHeight: '90vh', borderRadius: '1rem', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👷‍♂️ Historial de Técnicos Externos</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Tickets generados automáticamente en campo o creados manualmente para externos.</p>
              </div>
              <button onClick={() => setShowExternalTechModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6B7280' }}>&times;</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tickets.filter(t => t.tipo_solicitud === 'Técnico Externo').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <p>No hay solicitudes de técnicos externos.</p>
                  </div>
                ) : (
                  tickets.filter(t => t.tipo_solicitud === 'Técnico Externo').map(ticket => (
                    <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '0.5rem', backgroundColor: ticket.estado === 'Resuelto' ? '#F0FDF4' : 'white' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem' }}>#TKT-{ticket.id}</span>
                          <span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.1rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold', fontSize: '0.75rem' }}>{ticket.placa || ('Sin placa · ' + ticket.operacion)}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{formatDate(ticket.fecha)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#4B5563' }}>{ticket.descripcion}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: '700', fontSize: '0.75rem',
                          backgroundColor: ticket.estado === 'Pendiente' ? '#FEE2E2' : ticket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                          color: ticket.estado === 'Pendiente' ? '#991B1B' : ticket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                        }}>
                          {ticket.estado}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Ticket */}
      {selectedTicket && (
        <div onClick={() => setSelectedTicket(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s ease-out' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  <span>🎫</span> Ticket #TKT-{selectedTicket.id}
                </h2>
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Creado el: {formatDate(selectedTicket.fecha)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #E5E7EB' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Placa Asociada</span>
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', display: 'inline-block' }}>
                    {selectedTicket.placa || 'No Registra'}
                  </span>
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #E5E7EB' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estado Actual</span>
                  <select
                    value={selectedTicket.estado}
                    onChange={(e) => { handleStatusChange(selectedTicket.id, e.target.value); setSelectedTicket({ ...selectedTicket, estado: e.target.value }); }}
                    disabled={!canManage}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid transparent', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', outline: 'none', width: '100%',
                      backgroundColor: selectedTicket.estado === 'Pendiente' ? '#FEE2E2' : selectedTicket.estado === 'En Proceso' ? '#FEF3C7' : '#D1FAE5',
                      color: selectedTicket.estado === 'Pendiente' ? '#991B1B' : selectedTicket.estado === 'En Proceso' ? '#92400E' : '#065F46'
                    }}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #E5E7EB' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Detalles de la Solicitud</span>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Categoría: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{selectedTicket.tipo_solicitud}</span>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Solicitante: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{selectedTicket.operador || 'No especificado'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Descripción: </span>
                  <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.5rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.9rem' }}>
                    {selectedTicket.descripcion}
                  </div>
                </div>

                {selectedTicket.evidencia && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Evidencia Fotográfica de Resolución</span>
                    <img src={selectedTicket.evidencia} alt="Evidencia de resolución" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.5rem', backgroundColor: '#F3F4F6' }} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
              {isAdmin ? (
                <button type="button" onClick={() => { setSelectedTicket(null); handleDelete(selectedTicket.id); }} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>🗑️ Eliminar Ticket</button>
              ) : (
                <div></div>
              )}
              <button type="button" onClick={() => setSelectedTicket(null)} style={{ padding: '0.75rem 2rem', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resolución (Adjuntar Evidencia) */}
      {showResolveModal && (
        <div onClick={() => setShowResolveModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', animation: 'scaleUp 0.2s ease-out' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>✅ Resolver Ticket</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Adjunte una foto del trabajo realizado y/o un comentario opcional para el cierre.</p>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Evidencia Fotográfica (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setResolveFormData({ ...resolveFormData, evidencia: e.target.files[0] })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Nota de Resolución (Opcional)</label>
                <textarea
                  value={resolveFormData.resolucion_desc}
                  onChange={(e) => setResolveFormData({ ...resolveFormData, resolucion_desc: e.target.value })}
                  placeholder="Se reemplazó el equipo dañado por uno nuevo..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowResolveModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #D1D5DB', color: '#374151', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' }}>Cerrar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
