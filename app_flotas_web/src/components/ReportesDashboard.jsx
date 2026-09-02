import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export function ReportesDashboard() {
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [operaciones, setOperaciones] = useState([]);
  const [operacion, setOperacion] = useState('');
  const [loadingOps, setLoadingOps] = useState(false);

  const handleOpenExport = async() =>{
    setModalOpen(true);
    setLoadingOps(true);
    setOperacion('');
    setOperaciones([]);
    try{
      const data = await api.getOperacionesReportes();
      setOperaciones(Array.isArray(data) ? data : []);
    }catch(error){
      toast.error(error.message);
      setModalOpen(false);
    } finally{
      setLoadingOps(false);
    }
  };
  
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(defaultStart);
  const [fechaFin, setFechaFin] = useState(defaultEnd);

 const handleDownloadMaster = async () => {
  if(loading) return;
  if(!operacion || !operaciones.includes(operacion)) return toast.error('Seleccione una operación válida.');
  if(!fechaInicio || !fechaFin){
    toast.error('Por favor seleccione un rango de fechas válido.');
    return;
  }
  if(fechaInicio>fechaFin){
    toast.error('La fecha de inicio no puede ser mayor a la fecha de fin.');
    return;
  }
  setLoading(true);
  const loadingToast = toast.loading('Generando las tres pestañas de la operacion seleccionada');

  try{
    const blob = await api.downloadMasterReport(
      fechaInicio,
      fechaFin,
      operacion
    );

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
     link.download = `Reporte_${operacion.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')}_${fechaInicio}_al_${fechaFin}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
     setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
     setModalOpen(false);

     toast.success('Reporte descargado exitosamente', { id: loadingToast });
  }catch(error){
    console.error(error);
    toast.error(error.message || 'Ocurrio un error al descargar reporte', {id: loadingToast});
  } finally{
    setLoading(false);
  }
 };


  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>Reportes Gerenciales 📈</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo centralizado de exportación de data e indicadores clave de rendimiento.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1rem', padding: '2rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', backgroundColor: '#10B981', opacity: 0.1, borderRadius: '50%', zIndex: 0 }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#D1FAE5', color: '#059669', padding: '1rem', borderRadius: '0.75rem', fontSize: '1.5rem' }}>
                📊
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Reporte Master de Auditoría</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descarga consolidada (Excel 8 Libros) con fotos incrustadas.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Fecha de Inicio</label>
                <input 
                  type="date" 
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Fecha de Fin</label>
                <input 
                  type="date" 
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            </div>

            <button 
              onClick={handleOpenExport}
              disabled={loading || loadingOps || modalOpen}
              style={{ 
                width: '100%', padding: '1rem', 
                backgroundColor: loading ? '#9CA3AF' : '#10B981', 
                color: 'white', border: 'none', borderRadius: '0.5rem', 
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', 
                fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                  Procesando Fotos e Información...
                </>
              ) : (
                <>
                  Descargar Excel Master
                </>
              )}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Incluye: TI-PR-01, REGISTRO, BBDD, LBB, PRX, GLP, AAQ, IND
            </p>
          </div>
        </div>
      </div>
            {modalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="export-title" onKeyDown={e => { if (e.key === 'Escape' && !loading) setModalOpen(false); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '480px' }}>
            <h3 id="export-title" style={{ marginTop: 0 }}>Exportar por operación</h3>
            <p>Período: {fechaInicio} al {fechaFin}. Se incluirá la última inspección de cada placa en ese rango.</p>
            <label htmlFor="export-operacion">Operación</label>
            <select id="export-operacion" autoFocus value={operacion} onChange={e => setOperacion(e.target.value)} disabled={loading || loadingOps} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <option value="">{loadingOps ? 'Cargando operaciones...' : 'Seleccione una operación'}</option>
              {operaciones.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {!loadingOps && !operaciones.length && <p>No hay operaciones disponibles.</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" disabled={loading} onClick={() => setModalOpen(false)} style={{ padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" disabled={loading || loadingOps || !operacion} onClick={handleDownloadMaster} style={{ padding: '0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#10B981', color: 'white', cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Generando...' : 'Descargar Excel'}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
