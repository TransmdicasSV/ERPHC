import React, { useState, useEffect } from 'react';
import { BASE_API_URL } from '../services/api';
import toast from 'react-hot-toast';

const TICKET_CATEGORIES = {
  "Equipos en Cabina (Mantenimiento)": [
    "Falla en Tablet (Piloto/Copiloto)",
    "Cambio/Reposición de Pulsera de Fatiga",
    "Falla en Radio Base / Intercomunicador",
    "Problemas con Cámaras (Internas/Externas)"
  ],
  "Apoyo Técnico - TELCOM (Instalaciones)": [
    "Instalación de Radio Base nueva",
    "Instalación de circuito de Cámaras",
    "Desinstalación / Retiro de equipos"
  ],
  "Sistemas de Terceros (Software/Sensores)": [
    "Tracklog: Instalación/Actualización App Copiloto",
    "Mix Telematics: Soporte/Revisión ADAS"
  ],
  "Otros": ["Otro requerimiento técnico"]
};

export function PublicPortal({ onAdminClick }) {
  const [placa, setPlaca] = useState('');
  const [placasDisponibles, setPlacasDisponibles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  
  const [stats, setStats] = useState({ totalFlota: 0, inspeccionesHoy: 0, ticker: [], trabajosTI: [] });
  const [recentSearches, setRecentSearches] = useState([]);

  // Estados del Formulario de Soporte
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportData, setSupportData] = useState({ 
    placa: '', 
    categoria: 'Equipos en Cabina (Mantenimiento)',
    tipo_solicitud: 'Falla en Tablet (Piloto/Copiloto)', 
    prioridad: 'Media',
    descripcion: '', 
    operador: '' 
  });
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    // Cargar historial de busquedas
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch(e) {}
    }

    // Fetch Stats
    fetch(`${BASE_API_URL}/api/public/stats`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(err => console.error('Error fetching public stats:', err));
      
    // Fetch Placas disponibles para el buscador
    fetch(`${BASE_API_URL}/api/public/placas`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlacasDisponibles(data);
      })
      .catch(err => console.error('Error fetching placas:', err));
  }, []);

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
      setShowResultModal(true);

      // Guardar en recientes
      const upperPlaca = placa.toUpperCase();
      let newRecent = [upperPlaca, ...recentSearches.filter(p => p !== upperPlaca)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = (placaABuscar) => {
    setPlaca(placaABuscar);
    // Simular el submit del form
    const pseudoEvent = { preventDefault: () => {} };
    // Usar un timeout pequeño para que el estado se actualice antes del fetch (o pasarlo directo)
    setTimeout(() => {
      document.getElementById('btn-buscar-publico').click();
    }, 50);
  };

  const submitSupportForm = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      const res = await fetch(`${BASE_API_URL}/api/incidentes_soporte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportData)
      });
      if (res.ok) {
        toast.success("Solicitud enviada correctamente a Base Zero.", { id: 'support-ticket' });
        setShowSupportModal(false);
        setSupportData({ 
          placa: '', 
          categoria: 'Equipos en Cabina (Mantenimiento)',
          tipo_solicitud: 'Falla en Tablet (Piloto/Copiloto)', 
          prioridad: 'Media',
          descripcion: '', 
          operador: '' 
        });
      } else {
        toast.error("Error al enviar solicitud.", { id: 'support-ticket' });
      }
    } catch (error) {
      toast.error("Falla de red al enviar la solicitud.", { id: 'support-ticket' });
    } finally {
      setSupportLoading(false);
    }
  };

  const DynamicTruckBackground = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden', pointerEvents: 'none', backgroundColor: '#020617' }}>
      {/* Panning Background Image */}
      <div style={{ 
        position: 'absolute', top: '-5%', left: '-5%', width: '110vw', height: '110vh', 
        backgroundImage: 'url(/bg-trucks.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        animation: 'bg-pan 30s linear infinite alternate', opacity: 0.7
      }} />
      {/* Overlay Oscuro para legibilidad */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(2,6,23,0.6) 0%, rgba(2,6,23,0.95) 100%)' }} />
      
      {/* Glowing accents */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(2,6,23,0) 60%)', borderRadius: '50%', animation: 'blob 15s infinite alternate' }} />
      <style>{`
        @keyframes bg-pan {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-2vw, -1vh) scale(1.05); }
        }
        @keyframes blob {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.1); }
          100% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @media print {
          body * { visibility: hidden; }
          #carnet-digital, #carnet-digital * { visibility: visible; }
          #carnet-digital { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
      <DynamicTruckBackground />
      {/* HEADER PÚBLICO */}
      <header style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10, gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '1.4rem', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}>J</div>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '1.2rem', letterSpacing: '1px', fontWeight: '800' }}>JDCALI <span style={{ color: '#38bdf8' }}>OMNI O.S.</span></h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '600' }}>Sistema de Control de Flotas / HSE-TI</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={onAdminClick}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'; e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <span>🔒</span> Acceso Corporativo
          </button>
        </div>
      </header>

      {/* ÁREA DE BÚSQUEDA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', zIndex: 10 }}>
        
        {/* LIVE STATS */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1rem 1.5rem', borderRadius: '1rem', textAlign: 'center', color: 'white', minWidth: '150px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Unidades Base</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#38bdf8' }}>{stats.totalFlota}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1rem 1.5rem', borderRadius: '1rem', textAlign: 'center', color: 'white', minWidth: '150px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Inspecciones Hoy</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.inspeccionesHoy}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1rem 1.5rem', borderRadius: '1rem', textAlign: 'center', color: 'white', minWidth: '150px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Sistema</p>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }}>
              EN LÍNEA <span style={{ width: 10, height: 10, backgroundColor: '#10b981', borderRadius: '50%', marginLeft: 8, boxShadow: '0 0 10px #10b981' }}></span>
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'white', margin: '0 0 0.25rem 0', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)', letterSpacing: '-0.5px' }}>Consulta de Estado de Flota</h2>
        <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '600px' }}>
          Ingrese la placa de la unidad para verificar su certificación operativa.
        </p>

        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', marginBottom: '1.5rem' }}>
          {/* Radar Animation Background */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '2px solid rgba(56, 189, 248, 0.3)', borderRadius: '0.5rem', animation: 'radar-pulse 2s infinite' }}></div>
          </div>
          <form onSubmit={handleSearch} style={{ position: 'relative', width: '100%', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', zIndex: 2 }}>
            <input 
              type="text" 
              list="placas-list"
              placeholder="Ej. ABC-123" 
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              style={{ flex: '1 1 200px', padding: '0.75rem 1rem', fontSize: '1.1rem', borderRadius: '0.5rem', border: '2px solid #38bdf8', outline: 'none', textTransform: 'uppercase', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)' }}
            />
            <datalist id="placas-list">
              {placasDisponibles.map((p, idx) => (
                <option key={idx} value={p} />
              ))}
            </datalist>
            <button 
            id="btn-buscar-publico"
            type="submit" 
            disabled={loading}
            style={{ flex: '1 1 120px', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>
        </div>

        {/* RECENT SEARCHES */}
        {recentSearches.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>Consultas Recientes:</span>
            {recentSearches.map((p, i) => (
              <button 
                key={i} 
                onClick={() => executeSearch(p)}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* PANELES INTERACTIVOS (Pizarra y Soporte en Acción) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '800px', marginTop: '1rem', paddingBottom: '4rem' }}>
          
          {/* Panel A: Pizarra de Avisos */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', color: 'white', backdropFilter: 'blur(5px)' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span> Pizarra de Operaciones
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '4px solid #38bdf8' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Hoy</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>Mantenimiento preventivo en ruta Sur. Manejen con precaución.</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '4px solid #10b981' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Aviso General</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>El uso de cámara y radio es obligatorio antes de iniciar ruta.</p>
              </div>
            </div>
          </div>

          {/* Panel B: Soporte en Acción */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', color: 'white', backdropFilter: 'blur(5px)' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔧</span> Trabajos de Soporte Recientes
            </h3>
            {stats.trabajosTI && stats.trabajosTI.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.trabajosTI.map(tkt => (
                  <div key={tkt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <div>
                      <strong style={{ color: '#10b981' }}>{tkt.placa}</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>{tkt.tipo}</p>
                    </div>
                    <span style={{ backgroundColor: '#064e3b', color: '#34d399', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold' }}>✓ Resuelto</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>No hay tickets recientes.</p>
            )}
          </div>
        </div>

        {/* MODAL RESULTADOS (Carnet Digital) */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #fca5a5', marginTop: '1rem' }}>
            ⚠️ {error}
          </div>
        )}
      </main>

      {/* TICKER MARQUEE */}
      {stats.ticker && stats.ticker.length > 0 && (
        <div style={{ width: '100%', overflow: 'hidden', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0', zIndex: 10, position: 'fixed', bottom: 0, left: 0 }}>
          <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'ticker 30s linear infinite' }}>
            {stats.ticker.map((t, idx) => (
              <span key={idx} style={{ color: 'white', fontSize: '0.85rem', margin: '0 2rem', fontWeight: '500' }}>
                {t.estado === 'APROBADO' ? '✅' : '⚠️'} <span style={{ color: '#94a3b8' }}>{t.hora}</span> - Placa: <strong style={{ color: t.estado === 'APROBADO' ? '#10b981' : '#f59e0b' }}>{t.placa}</strong> ({t.estado})
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {stats.ticker.map((t, idx) => (
              <span key={`dup-${idx}`} style={{ color: 'white', fontSize: '0.85rem', margin: '0 2rem', fontWeight: '500' }}>
                {t.estado === 'APROBADO' ? '✅' : '⚠️'} <span style={{ color: '#94a3b8' }}>{t.hora}</span> - Placa: <strong style={{ color: t.estado === 'APROBADO' ? '#10b981' : '#f59e0b' }}>{t.placa}</strong> ({t.estado})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING SOS BUTTON */}
      <button 
        onClick={() => setShowSupportModal(true)}
        style={{ position: 'fixed', bottom: '3rem', right: '1.5rem', zIndex: 50, backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '3rem', padding: '1rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)', transition: 'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
      >
        <span style={{ fontSize: '1.5rem' }}>🚨</span> Reportar Falla en mi Unidad
      </button>

      {/* MODAL RESULTADO (CARNET DIGITAL) */}
      {showResultModal && result && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div id="carnet-digital" style={{ backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', border: '2px solid #38bdf8', animation: 'blob 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', position: 'relative' }}>
            
            {/* Cerrar modal */}
            <button className="no-print" onClick={() => setShowResultModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>

            {/* Cabecera del Carnet */}
            <div style={{ backgroundColor: result.estado_general === 'APROBADO' ? '#059669' : '#dc2626', color: 'white', padding: '2rem 1.5rem 1.5rem 1.5rem', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '0.7rem', opacity: 0.8, letterSpacing: '2px', fontFamily: 'monospace' }}>JDCALI OMNI O.S.</div>
              <h3 style={{ fontSize: '2.5rem', margin: 0, fontWeight: '900', letterSpacing: '2px', textShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>{result.placa}</h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: '800', textTransform: 'uppercase', background: 'rgba(0,0,0,0.2)', display: 'inline-block', padding: '0.2rem 1rem', borderRadius: '2rem' }}>
                ESTADO: {result.estado_general}
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Última Inspección</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{result.fecha} {result.hora}</p>
                </div>
                {/* QR Mockup */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://jdcali.com/flota/${result.placa}&color=0f172a&bgcolor=ffffff`} alt="QR" style={{ borderRadius: '0.5rem', border: '2px solid #e2e8f0', padding: '2px' }} />
              </div>

              {/* Componentes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem 0.25rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cámaras</p>
                  <span style={{ color: result.camaras === 'OK' || result.camaras === 'NO APLICA' || result.camaras === 'N/A' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.9rem' }}>{result.camaras}</span>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem 0.25rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Radio</p>
                  <span style={{ color: result.radio === 'OK' || result.radio === 'NO APLICA' || result.radio === 'N/A' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.9rem' }}>{result.radio}</span>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem 0.25rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tablet</p>
                  <span style={{ color: result.tablet === 'OK' || result.tablet === 'NO APLICA' || result.tablet === 'N/A' ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '0.9rem' }}>{result.tablet}</span>
                </div>
              </div>

              {/* TIMELINE */}
              {result.timeline && result.timeline.length > 0 && (
                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>Historial Reciente</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.timeline.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                        <span style={{ color: item.estado === 'APROBADO' ? '#10b981' : '#ef4444', fontSize: '1rem' }}>{item.estado === 'APROBADO' ? '🟢' : '🔴'}</span>
                        <strong>{item.fecha}</strong> ({item.hora}) - {item.estado}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TICKET ACTIVO */}
              {result.incidente_pendiente && result.incidente_pendiente.estado !== 'Resuelto' && (
                <div style={{ marginBottom: '1.5rem', backgroundColor: '#FFFBEB', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#B45309', margin: 0, textTransform: 'uppercase' }}>
                      Ticket de Soporte Activo
                    </h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', color: '#92400E' }}>
                    <div><strong>Estado:</strong> <span style={{ backgroundColor: '#FDE68A', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>{result.incidente_pendiente.estado}</span></div>
                    <div><strong>Requerimiento:</strong> {result.incidente_pendiente.tipo_solicitud}</div>
                    <div><strong>Registrado el:</strong> {String(result.incidente_pendiente.fecha).split('T')[0]}</div>
                    <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#78350F' }}>"{result.incidente_pendiente.descripcion}"</div>
                  </div>
                </div>
              )}

              {/* Evidencias Fotográficas */}
              <h4 className="no-print" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>Evidencia Fotográfica</h4>
              <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {result.fotos.map((foto, idx) => (
                  foto.url ? (
                    <div key={idx} style={{ textAlign: 'center' }}>
                      <a href={foto.url} target="_blank" rel="noreferrer">
                        <img src={foto.url} alt={foto.tipo} style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                      </a>
                    </div>
                  ) : (
                    <div key={idx} style={{ textAlign: 'center', height: '70px', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.7rem', border: '1px dashed #cbd5e1' }}>
                      Sin Foto
                    </div>
                  )
                ))}
              </div>

              {/* Botones de Acción */}
              <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => window.print()}
                  style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                  <span>🖨️</span> Imprimir
                </button>
                <button 
                  onClick={() => { setShowResultModal(false); setSupportData({...supportData, placa: result.placa}); setShowSupportModal(true); }}
                  style={{ flex: 2, backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                  <span>🔧</span> Solicitar Soporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Categoría Principal</label>
                <select 
                  value={supportData.categoria} 
                  onChange={e => {
                    const newCat = e.target.value;
                    setSupportData({ ...supportData, categoria: newCat, tipo_solicitud: TICKET_CATEGORIES[newCat][0] });
                  }} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                >
                  {Object.keys(TICKET_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Requerimiento Específico</label>
                  <select 
                    value={supportData.tipo_solicitud} 
                    onChange={e => setSupportData({...supportData, tipo_solicitud: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                  >
                    {TICKET_CATEGORIES[supportData.categoria]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>Prioridad</label>
                  <select 
                    value={supportData.prioridad} 
                    onChange={e => setSupportData({...supportData, prioridad: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
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
