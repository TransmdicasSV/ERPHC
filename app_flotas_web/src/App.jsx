import React, { useState, useEffect } from 'react';
import { FlotasDashboard } from './components/FlotasDashboard';
import { RadarDashboard } from './components/RadarDashboard';
import { ResumenDashboard } from './components/ResumenDashboard';
import { EntregasTIDashboard } from './components/EntregasTIDashboard';
import { MantenimientoTecnico } from './components/MantenimientoTecnico';
import { SoporteTicketsDashboard } from './components/SoporteTicketsDashboard';
import { PublicPortal } from './components/PublicPortal';
import { Login } from './components/Login';
import { MaestroFlotaDashboard } from './components/MaestroFlotaDashboard';
import { DirectorioPersonal } from './components/DirectorioPersonal';
import { ReportesDashboard } from './components/ReportesDashboard';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  const [viewMode, setViewMode] = useState('public'); // 'public', 'login', 'admin'
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('jdcali_tab') || 'resumen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSoporteOpen, setIsSoporteOpen] = useState(false);
  const [isInventarioOpen, setIsInventarioOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // Para menú colapsable de maestros
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('jdcali_theme');
    return saved === 'dark';
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      setViewMode('admin');
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jdcali_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jdcali_theme', 'light');
    }
  }, [isDarkMode]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('jdcali_tab', tab);
    setIsSidebarOpen(false); // Cierra en móviles al navegar
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
    setViewMode('public');
  };

  if (!user && viewMode === 'public') {
    return (
      <>
        <Toaster position="bottom-right" />
        <PublicPortal onAdminClick={() => setViewMode('login')} />
      </>
    );
  }

  if (!user && viewMode === 'login') {
    return (
      <>
        <Toaster position="bottom-right" />
        <Login onLoginSuccess={(u) => { setUser(u); setViewMode('admin'); }} />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', position: 'relative' }}>
      <Toaster position="bottom-right" />
      
      {/* BOTÓN HAMBURGUESA (Solo visible en móviles) */}
      <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        <span style={{ fontWeight: 'bold' }}>JDCALI OMNI O.S. 👑</span>
        <span>{isSidebarOpen ? '✖' : '☰'}</span>
      </button>

      {/* OVERLAY FONDO OSCURO EN MÓVIL AL ABRIR MENÚ */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 }}
        />
      )}

      {/* SIDEBAR CORPORATIVO */}
      <aside className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1F2937' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#60A5FA', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>JDCALI OMNI O.S. 👑</h1>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>by J. Alanguia</p>
        </div>
        
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1F2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'bold', color: 'white', textTransform: 'capitalize' }}>{user.username}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase' }}>{user.rol}</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <button 
            onClick={() => setActiveTab('resumen')}
            style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: activeTab === 'resumen' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'resumen' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
            📊 Centro de Control
          </button>
            <div
              onClick={() => setActiveMenu(activeMenu === 'maestros' ? null : 'maestros')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                cursor: 'pointer',
                backgroundColor: activeMenu === 'maestros' ? '#1f2937' : 'transparent',
                color: activeMenu === 'maestros' ? 'white' : '#9ca3af',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>📦</span> Maestros Generales
              </div>
              <span style={{ transform: activeMenu === 'maestros' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </div>
            
            {activeMenu === 'maestros' && (
              <div style={{ backgroundColor: '#111827' }}>
                <button
                  onClick={() => setActiveTab('maestro')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeTab === 'maestro' ? 'white' : '#9ca3af',
                    backgroundColor: activeTab === 'maestro' ? '#374151' : 'transparent',
                    fontSize: '0.8rem'
                  }}
                >
                  🚚 Flota
                </button>
                <button
                  onClick={() => setActiveTab('personal')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: 'none',
                    cursor: 'pointer',
                    color: activeTab === 'personal' ? 'white' : '#9ca3af',
                    backgroundColor: activeTab === 'personal' ? '#374151' : 'transparent',
                    fontSize: '0.8rem'
                  }}
                >
                  👤 Personal
                </button>
              </div>
            )}

          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: activeTab === 'dashboard' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'dashboard' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
            📋 Registro de Inspecciones
          </button>
          <button 
            onClick={() => setActiveTab('radar')}
            style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: activeTab === 'radar' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'radar' ? '#10B981' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
            <span>📡 C.O.R.E. Radar</span>
            {activeTab !== 'radar' && <span style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981'}}></span>}
          </button>
          {/* MENU DESPLEGABLE: SOPORTE TI */}
          <div style={{ margin: '0.5rem 0' }}>
            <button 
              onClick={() => setIsSoporteOpen(!isSoporteOpen)}
              style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎧 Soporte TI</span>
              <span>{isSoporteOpen ? '▲' : '▼'}</span>
            </button>
            
            {isSoporteOpen && (
              <div style={{ backgroundColor: '#111827', padding: '0.5rem 0' }}>
                <button 
                  onClick={() => setActiveTab('tickets')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'tickets' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'tickets' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                  🎫 Tickets de Soporte
                </button>
              </div>
            )}
          </div>
          {/* MENU DESPLEGABLE: INVENTARIO TI */}
          <div style={{ margin: '0.5rem 0' }}>
            <button 
              onClick={() => setIsInventarioOpen(!isInventarioOpen)}
              style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📦 Inventario TI</span>
              <span>{isInventarioOpen ? '▲' : '▼'}</span>
            </button>
            
            {isInventarioOpen && (
              <div style={{ backgroundColor: '#111827', padding: '0.5rem 0' }}>
                <button 
                  onClick={() => setActiveTab('entregas')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'entregas' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'entregas' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                  📤 Entregas
                </button>
                <button 
                  onClick={() => setActiveTab('devoluciones')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'devoluciones' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'devoluciones' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                  📥 Devoluciones
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('mantenimiento')}
            style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: activeTab === 'mantenimiento' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'mantenimiento' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
            🛠️ Mantenimiento Técnico
          </button>
          <button 
            onClick={() => setActiveTab('reportes')}
            style={{ width: '100%', textAlign: 'left', padding: '1rem 1.5rem', background: activeTab === 'reportes' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'reportes' ? '#60A5FA' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
            📈 Reportes Gerenciales
          </button>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid #1F2937', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{ background: '#374151', border: 'none', borderRadius: '2rem', padding: '0.5rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <span style={{ zIndex: 1, padding: '0 0.5rem' }}>☀️</span>
            <span style={{ zIndex: 1, padding: '0 0.5rem' }}>🌙</span>
            <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: isDarkMode ? '50%' : '2px', width: 'calc(50% - 2px)', backgroundColor: isDarkMode ? '#4F46E5' : '#F59E0B', borderRadius: '2rem', transition: 'all 0.3s ease' }}></div>
          </button>
          
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content-admin">
        {activeTab === 'resumen' && <ResumenDashboard />}
        {activeTab === 'maestro' && <MaestroFlotaDashboard />}
        {activeTab === 'personal' && <DirectorioPersonal />}
        {activeTab === 'dashboard' && <FlotasDashboard />}
        {activeTab === 'radar' && <RadarDashboard navigate={setActiveTab} />}
        {activeTab === 'entregas' && <EntregasTIDashboard vista="Entrega" />}
        {activeTab === 'devoluciones' && <EntregasTIDashboard vista="Devolución" />}
        {activeTab === 'tickets' && <SoporteTicketsDashboard />}
        {activeTab === 'mantenimiento' && <MantenimientoTecnico />}
        {activeTab === 'reportes' && <ReportesDashboard />}
      </main>
    </div>
  );
}

export default App;
