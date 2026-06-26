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
import { GestionUsuariosDashboard } from './components/GestionUsuariosDashboard';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  const [viewMode, setViewMode] = useState('public'); // 'public', 'login', 'admin'
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('jdcali_tab') || 'resumen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
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

  const isAdmin = user?.rol?.toLowerCase() === 'admin' || user?.rol?.toLowerCase() === 'administrador';
  const hasAccess = (modulo) => {
    if (isAdmin) return true;
    return user?.permisos?.[modulo]?.ver === true;
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
      <aside className={`sidebar-container ${isSidebarOpen ? 'open' : ''} ${isDesktopCollapsed ? 'collapsed' : ''}`} style={{ width: isDesktopCollapsed ? '70px' : '260px', transition: 'width 0.3s ease', position: 'relative', overflowX: 'hidden' }}>
        
        {/* CABECERA SIDEBAR */}
        <div style={{ padding: isDesktopCollapsed ? '1.25rem 0' : '1.25rem 1rem', borderBottom: '1px solid #1F2937', display: 'flex', flexDirection: isDesktopCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: isDesktopCollapsed ? '1rem' : '0', transition: 'padding 0.3s' }}>
          {!isDesktopCollapsed ? (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#60A5FA', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>JDCALI OMNI O.S.</h1>
              <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>by J. Alanguia</p>
            </div>
          ) : (
            <h1 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#60A5FA', margin: 0, textAlign: 'center' }}>JDC<br/>👑</h1>
          )}
          <button 
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="no-print"
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', borderRadius: '0.25rem' }}
            title={isDesktopCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <span style={{ fontSize: '1.4rem' }}>☰</span>
          </button>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {hasAccess('resumen') && (
            <button 
              onClick={() => setActiveTab('resumen')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'resumen' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'resumen' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📊</span>
              {!isDesktopCollapsed && <span>Centro de Control</span>}
            </button>
          )}
          
          {hasAccess('maestros') && (
            <>
              <div
                onClick={() => setActiveMenu(activeMenu === 'maestros' ? null : 'maestros')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isDesktopCollapsed ? 'center' : 'space-between',
                  padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem',
                  cursor: 'pointer',
                  backgroundColor: activeMenu === 'maestros' ? '#1f2937' : 'transparent',
                  color: activeMenu === 'maestros' ? 'white' : '#9ca3af',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📦</span>
                  {!isDesktopCollapsed && <span>Maestros Generales</span>}
                </div>
                {!isDesktopCollapsed && (
                  <span style={{ transform: activeMenu === 'maestros' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                )}
              </div>
              
              {activeMenu === 'maestros' && !isDesktopCollapsed && (
                <div style={{ backgroundColor: '#111827' }}>
                  <button
                    onClick={() => setActiveTab('maestro')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1rem 0.75rem 3rem', border: 'none', cursor: 'pointer', color: activeTab === 'maestro' ? 'white' : '#9ca3af', backgroundColor: activeTab === 'maestro' ? '#374151' : 'transparent', fontSize: '0.8rem' }}
                  >
                    <span style={{ fontSize: '1rem', marginRight: '0.5rem' }}>🚚</span>
                    <span>Flota</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('personal')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1rem 0.75rem 3rem', border: 'none', cursor: 'pointer', color: activeTab === 'personal' ? 'white' : '#9ca3af', backgroundColor: activeTab === 'personal' ? '#374151' : 'transparent', fontSize: '0.8rem' }}
                  >
                    <span style={{ fontSize: '1rem', marginRight: '0.5rem' }}>👤</span>
                    <span>Personal</span>
                  </button>
                </div>
              )}
            </>
          )}

          {hasAccess('dashboard') && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'dashboard' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'dashboard' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📋</span>
              {!isDesktopCollapsed && <span>Registro de Inspecciones</span>}
            </button>
          )}
          
          {hasAccess('radar') && (
            <button 
              onClick={() => setActiveTab('radar')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'space-between', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'radar' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'radar' ? '#10B981' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start' }}>
                 <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📡</span>
                 {!isDesktopCollapsed && <span>C.O.R.E. Radar</span>}
              </div>
              {!isDesktopCollapsed && activeTab !== 'radar' && <span style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981'}}></span>}
            </button>
          )}

          {/* MENU DESPLEGABLE: SOPORTE TI */}
          {(hasAccess('tickets') || hasAccess('entregas') || hasAccess('devoluciones') || hasAccess('mantenimiento')) && (
            <div style={{ margin: '0.5rem 0' }}>
              <button 
                onClick={() => setIsSoporteOpen(!isSoporteOpen)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'space-between', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>🎧</span>
                  {!isDesktopCollapsed && <span>Soporte TI</span>}
                </div>
                {!isDesktopCollapsed && <span>{isSoporteOpen ? '▲' : '▼'}</span>}
              </button>
              
              {!isDesktopCollapsed && isSoporteOpen && (
                <div style={{ backgroundColor: '#111827', padding: '0.5rem 0' }}>
                  {hasAccess('tickets') && (
                    <button 
                      onClick={() => setActiveTab('tickets')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'tickets' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'tickets' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                      <span style={{ fontSize: '1rem', marginRight: '0.5rem' }}>🎫</span>
                      <span>Tickets de Soporte</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MENU DESPLEGABLE: INVENTARIO TI */}
          {(hasAccess('entregas') || hasAccess('devoluciones')) && (
            <div style={{ margin: '0.5rem 0' }}>
              <button 
                onClick={() => setIsInventarioOpen(!isInventarioOpen)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'space-between', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📦</span>
                  {!isDesktopCollapsed && <span>Inventario TI</span>}
                </div>
                {!isDesktopCollapsed && <span>{isInventarioOpen ? '▲' : '▼'}</span>}
              </button>
              
              {!isDesktopCollapsed && isInventarioOpen && (
                <div style={{ backgroundColor: '#111827', padding: '0.5rem 0' }}>
                  {hasAccess('entregas') && (
                    <button 
                      onClick={() => setActiveTab('entregas')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'entregas' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'entregas' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                      <span style={{ fontSize: '1rem', marginRight: '0.5rem' }}>📤</span>
                      <span>Entregas</span>
                    </button>
                  )}
                  {hasAccess('devoluciones') && (
                    <button 
                      onClick={() => setActiveTab('devoluciones')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem 0.75rem 2.5rem', background: activeTab === 'devoluciones' ? '#374151' : 'transparent', border: 'none', color: activeTab === 'devoluciones' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                      <span style={{ fontSize: '1rem', marginRight: '0.5rem' }}>📥</span>
                      <span>Devoluciones</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {hasAccess('mantenimiento') && (
            <button 
              onClick={() => setActiveTab('mantenimiento')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'mantenimiento' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'mantenimiento' ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>🛠️</span>
              {!isDesktopCollapsed && <span>Mantenimiento Técnico</span>}
            </button>
          )}
          
          {hasAccess('reportes') && (
            <button 
              onClick={() => setActiveTab('reportes')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'reportes' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'reportes' ? '#60A5FA' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>📈</span>
              {!isDesktopCollapsed && <span>Reportes Gerenciales</span>}
            </button>
          )}

          {/* NUEVO MODULO: GESTION DE USUARIOS */}
          {hasAccess('usuarios') && (
            <button 
              onClick={() => setActiveTab('usuarios')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isDesktopCollapsed ? 'center' : 'flex-start', padding: isDesktopCollapsed ? '1rem 0' : '1rem 1.5rem', background: activeTab === 'usuarios' ? '#1F2937' : 'transparent', border: 'none', color: activeTab === 'usuarios' ? '#FBBF24' : '#9CA3AF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', marginTop: '1rem', borderTop: '1px solid #1F2937' }}>
              <span style={{ fontSize: '1.2rem', marginRight: isDesktopCollapsed ? '0' : '0.5rem' }}>🔐</span>
              {!isDesktopCollapsed && <span>Gestión de Usuarios</span>}
            </button>
          )}

        </nav>

      </aside>

      {/* ÁREA DERECHA: NAVBAR + CONTENIDO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* TOP NAVBAR (Gestión de Perfil y Preferencias) */}
        <header style={{ height: '64px', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 2rem', gap: '1.5rem', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 10 }}>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            title="Alternar Tema"
            style={{ background: '#374151', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>

          <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{user.username}</span>
              <span style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', fontWeight: '600' }}>{user.rol}</span>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(79, 70, 229, 0.4)' }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            title="Cerrar Sesión"
            style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', transition: 'all 0.2s' }} 
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = 'white'; }} 
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#EF4444'; }}
          >
            <span>🚪</span> Salir
          </button>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="main-content-admin" style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--bg-color)', margin: 0, width: '100%' }}>
          {activeTab === 'resumen' && hasAccess('resumen') && <ResumenDashboard permisos={isAdmin ? {editar:true} : user?.permisos?.resumen} />}
          {activeTab === 'maestro' && hasAccess('maestros') && <MaestroFlotaDashboard permisos={isAdmin ? {editar:true} : user?.permisos?.maestros} />}
          {activeTab === 'personal' && hasAccess('maestros') && <DirectorioPersonal permisos={isAdmin ? {editar:true} : user?.permisos?.maestros} />}
          {activeTab === 'dashboard' && hasAccess('dashboard') && <FlotasDashboard permisos={isAdmin ? {editar:true} : user?.permisos?.dashboard} />}
          {activeTab === 'radar' && hasAccess('radar') && <RadarDashboard navigate={setActiveTab} permisos={isAdmin ? {editar:true} : user?.permisos?.radar} />}
          {activeTab === 'entregas' && hasAccess('entregas') && <EntregasTIDashboard vista="Entrega" permisos={isAdmin ? {editar:true} : user?.permisos?.entregas} />}
          {activeTab === 'devoluciones' && hasAccess('devoluciones') && <EntregasTIDashboard vista="Devolución" permisos={isAdmin ? {editar:true} : user?.permisos?.devoluciones} />}
          {activeTab === 'tickets' && hasAccess('tickets') && <SoporteTicketsDashboard permisos={isAdmin ? {editar:true} : user?.permisos?.tickets} />}
          {activeTab === 'mantenimiento' && hasAccess('mantenimiento') && <MantenimientoTecnico permisos={isAdmin ? {editar:true} : user?.permisos?.mantenimiento} />}
          {activeTab === 'reportes' && hasAccess('reportes') && <ReportesDashboard permisos={isAdmin ? {editar:true} : user?.permisos?.reportes} />}
          {activeTab === 'usuarios' && hasAccess('usuarios') && <GestionUsuariosDashboard />}
        </main>
      </div>
    </div>
  );
}

export default App;
