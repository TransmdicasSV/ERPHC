import React, { useState } from 'react';
import { BASE_API_URL } from '../services/api';
import toast from 'react-hot-toast';

export function PublicPortal({ onAdminClick }) {
  const [placa, setPlaca] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados del Formulario de Soporte
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportData, setSupportData] = useState({ placa: '', tipo_solicitud: 'Mantenimiento', descripcion: '', operador: '' });
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!placa.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${BASE_API_URL}/api/public/consulta/${placa.toUpperCase()}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Unidad no encontrada en nuestros registros.');
        throw new Error('Error al consultar el estado de la unidad.');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitSupportForm = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      const res = await fetch(`${BASE_API_URL}/api/public/incidentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportData)
      });
      if (res.ok) {
        toast.success("Solicitud enviada correctamente a Base Zero.", { id: 'support-ticket' });
        setShowSupportModal(false);
        setSupportData({ placa: '', tipo_solicitud: 'Mantenimiento', descripcion: '', operador: '' });
      } else {
        toast.error("Error al enviar solicitud.", { id: 'support-ticket' });
      }
    } catch (error) {
      toast.error("Falla de red al enviar la solicitud.", { id: 'support-ticket' });
    } finally {
      setSupportLoading(false);
    }
  };

  const ParticlesBackground = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, overflow: 'hidden', pointerEvents: 'none', backgroundColor: '#020617' }}>
      {/* Sci-Fi glowing blobs */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(2,6,23,0) 60%)', borderRadius: '50%', animation: 'blob 15s infinite alternate' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(2,6,23,0) 60%)', borderRadius: '50%', animation: 'blob 20s infinite alternate-reverse' }} />
      
      {/* Matrix Grid */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', perspective: '1000px', transform: 'rotateX(60deg) scale(2.5) translateY(-50%)', transformOrigin: 'top center', opacity: 0.6 }} />

      {/* Cyber Particles */}
      {[...Array(120)].map((_, i) => {
        const colors = ['#38bdf8', '#8b5cf6', '#a78bfa', '#f8fafc', '#60a5fa'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div key={i} style={{
            position: 'absolute',
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            backgroundColor: color,
            boxShadow: `0 0 10px 2px ${color}`,
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float-particle ${Math.random() * 15 + 8}s linear infinite`,
            animationDelay: `-${Math.random() * 20}s`
          }} />
        );
      })}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.1); }
          100% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { transform: translateY(-10vh) scale(1); opacity: 1; }
          90% { transform: translateY(-90vh) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative' }}>
      <ParticlesBackground />
      {/* HEADER PÚBLICO */}
      <header style={{ backgroundcolor: 'var(--text-primary)', padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>J</div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.1rem', letterSpacing: '1px' }}>JDCALI <span style={{ color: '#60a5fa' }}>OMNI O.S. 👑</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowSupportModal(true)}
            style={{ backgroundColor: '#EF4444', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
            <span>🆘</span> Soporte TI
          </button>
          <button 
            onClick={onAdminClick}
            style={{ background: 'transparent', border: '1px solid #374151', color: '#9ca3af', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#6b7280' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#374151' }}
          >
            <span>🔒</span> Acceso Corporativo
          </button>
        </div>
      </header>

      {/* ÁREA DE BÚSQUEDA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'white', margin: '0 0 0.25rem 0', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Consulta de Estado de Flota</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '600px' }}>
          Ingrese la placa para verificar la certificación operativa.
        </p>

        <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: '400px', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Ej. ABC-123" 
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            style={{ flex: '1 1 200px', padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: '0.5rem', border: '2px solid #d1d5db', outline: 'none', textTransform: 'uppercase' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ flex: '1 1 100px', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)' }}
          >
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {/* RESULTADOS */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #fca5a5' }}>
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div style={{ backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '600px', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {/* Cabecera del Resultado */}
            <div style={{ backgroundColor: result.estado_general === 'APROBADO' ? '#059669' : '#dc2626', color: 'white', padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>{result.placa}</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: '600', textTransform: 'uppercase' }}>
                ESTADO: {result.estado_general}
              </p>
            </div>

            {/* Detalles */}
            <div style={{ padding: '1rem 1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center', margin: '0 0 1rem 0' }}>
                Última inspección: <strong>{result.fecha} {result.hora}</strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#374151', fontSize: '0.8rem' }}>Cámaras</p>
                  <span style={{ color: result.camaras === 'OK' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>{result.camaras}</span>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#374151', fontSize: '0.8rem' }}>Radio</p>
                  <span style={{ color: result.radio === 'OK' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>{result.radio}</span>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#374151', fontSize: '0.8rem' }}>Tablet</p>
                  <span style={{ color: result.tablet === 'OK' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>{result.tablet}</span>
                </div>
              </div>

              {/* Evidencias Fotográficas */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>Evidencia Fotográfica</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                {result.fotos.map((foto, idx) => (
                  foto.url ? (
                    <div key={idx} style={{ textAlign: 'center' }}>
                      <a href={foto.url} target="_blank" rel="noreferrer">
                        <img src={foto.url} alt={foto.tipo} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} />
                      </a>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{foto.tipo}</p>
                    </div>
                  ) : (
                    <div key={idx} style={{ textAlign: 'center', height: '80px', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.7rem', border: '1px dashed #d1d5db' }}>
                      Sin Foto
                    </div>
                  )
                ))}
              </div>

              {/* Estado de Incidente Pendiente/Resuelto */}
              {result.incidente_pendiente && (
                <div style={{ 
                  marginTop: '1rem', 
                  backgroundColor: result.incidente_pendiente.estado === 'Resuelto' || result.incidente_pendiente.estado === 'Concluido' ? '#ecfdf5' : '#eff6ff', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem', 
                  border: `1px solid ${result.incidente_pendiente.estado === 'Resuelto' || result.incidente_pendiente.estado === 'Concluido' ? '#a7f3d0' : '#bfdbfe'}`, 
                  color: result.incidente_pendiente.estado === 'Resuelto' || result.incidente_pendiente.estado === 'Concluido' ? '#065f46' : '#1e3a8a', 
                  fontSize: '0.8rem', 
                  textAlign: 'center' 
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                    {result.incidente_pendiente.estado === 'Resuelto' || result.incidente_pendiente.estado === 'Concluido' ? '✅' : '🔧'} Ticket #TKT-{result.incidente_pendiente.id} - {result.incidente_pendiente.tipo_solicitud}
                  </strong>
                  Estado: <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{result.incidente_pendiente.estado}</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontStyle: 'italic', color: result.incidente_pendiente.estado === 'Resuelto' || result.incidente_pendiente.estado === 'Concluido' ? '#059669' : '#3b82f6' }}>{result.incidente_pendiente.descripcion}</p>
                </div>
              )}

              {/* Botón Global de Mantenimiento */}
              <div style={{ marginTop: '1rem', backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.8rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {result.estado_general !== 'APROBADO' && (
                  <>
                    <strong>⚠️ Atención Requerida:</strong> 
                    Su unidad tiene observaciones tecnológicas.
                  </>
                )}
                <button 
                  onClick={() => { setSupportData({...supportData, placa: result.placa}); setShowSupportModal(true); }}
                  style={{ marginTop: '0.25rem', backgroundColor: '#F59E0B', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '0.25rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  Solicitar Mantenimiento o Soporte
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE SOPORTE */}
      {showSupportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Solicitud de Soporte TI</h3>
            <form onSubmit={submitSupportForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Placa de la Unidad</label>
                <input required type="text" value={supportData.placa} onChange={e=>setSupportData({...supportData, placa: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Tipo de Solicitud</label>
                <select value={supportData.tipo_solicitud} onChange={e=>setSupportData({...supportData, tipo_solicitud: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}>
                  <option>Mantenimiento</option>
                  <option>Trabajo con Tracklog</option>
                  <option>Trabajo con Telcom</option>
                  <option>Descarga de Videos</option>
                  <option>Reporte de Falla (Cámara/Radio/Tablet)</option>
                  <option>Trabajos Extras (Instalaciones)</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Descripción / Detalles</label>
                <textarea required rows="3" value={supportData.descripcion} onChange={e=>setSupportData({...supportData, descripcion: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', resize: 'none' }} placeholder="Detalle su requerimiento..."></textarea>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Nombre del Operador (Opcional)</label>
                <input type="text" value={supportData.operador} onChange={e=>setSupportData({...supportData, operador: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} placeholder="Ej. Juan Pérez" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowSupportModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button type="submit" disabled={supportLoading} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: supportLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{supportLoading ? 'Enviando...' : 'Enviar Solicitud'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
