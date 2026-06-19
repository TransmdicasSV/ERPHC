import { useEffect, useState, useRef } from 'react';
import { api, BASE_API_URL } from '../services/api';
import toast from 'react-hot-toast';

const processImageWithWatermark = (file, placa, fecha, hora) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Sello de agua fondo
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const padding = 20;
      const fontSize = Math.max(30, canvas.width * 0.03); 
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      const text1 = `PLACA: ${placa || 'SIN-PLACA'}`;
      const text2 = `FECHA: ${fecha} ${hora}`;
      const metrics1 = ctx.measureText(text1);
      const metrics2 = ctx.measureText(text2);
      const textWidth = Math.max(metrics1.width, metrics2.width);
      
      const rectWidth = textWidth + padding * 2;
      const rectHeight = (fontSize * 2) + padding * 3;
      const x = canvas.width - rectWidth - 20;
      const y = canvas.height - rectHeight - 20;

      ctx.fillRect(x, y, rectWidth, rectHeight);
      
      // Texto
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'top';
      ctx.fillText(text1, x + padding, y + padding);
      ctx.fillText(text2, x + padding, y + padding * 2 + fontSize);

      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: file.type }));
      }, file.type, 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
};

function MobileCameraInput({ label, onSelect, preview, setPreview }) {
  const fileInputRef = useRef(null);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    onSelect(file, setPreview);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        onChange={handleCapture}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button 
          type="button" 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            flex: 1, padding: '0.8rem', 
            background: preview ? '#4B5563' : '#10B981', 
            color: 'white', border: 'none', borderRadius: '0.5rem', 
            fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
            fontSize: '1rem'
          }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          {preview ? 'Cambiar Foto' : `Tomar Foto`}
        </button>
        {preview && (
          <img src={preview} alt="Preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '0.25rem', border: '2px solid #10B981' }} />
        )}
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 8;

export function FlotasDashboard() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortFecha, setSortFecha] = useState('desc'); // 'desc', 'asc', o 'none'

  // Modals
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [editInspData, setEditInspData] = useState(null);
  const [historyPlaca, setHistoryPlaca] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, categoria, filtroEstado]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoria, filtroEstado]);

  useEffect(() => {
    if (!loading && vehiculos.length > 0) {
      const quickPlaca = localStorage.getItem('quick_search_placa');
      if (quickPlaca) {
        localStorage.removeItem('quick_search_placa');
        const cleanPlaca = quickPlaca.replace(/[^A-Z0-9]/gi, '');
        
        const vehiculoDb = vehiculos.find(v => v.placa.replace(/[^A-Z0-9]/gi, '') === cleanPlaca);
        
        if (vehiculoDb) {
          setSearchTerm(vehiculoDb.placa);
          setCategoria('Todos');
          setHistoryPlaca(vehiculoDb.placa); // Abrir historial automáticamente
        } else {
          toast.error('Placa no encontrada en los registros. Debe registrarla en el Maestro de Flota.', { id: 'quick-placa' });
        }
      }
    }
  }, [vehiculos, loading]);

  const loadData = async () => {
    try {
      // Pedimos 1000 para traer todos y poder ordenar globalmente en el frontend
      const vData = await api.getVehiculos(1, 1000, searchTerm, categoria, filtroEstado);
      setVehiculos(vData.data || []);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredVehiculos = () => {
    let filtered = [...vehiculos];

    if (sortFecha !== 'none') {
      filtered.sort((a, b) => {
        const parseDate = (d) => {
          if (!d || d === '--/--/----' || d.trim() === '') return new Date(0);
          if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
          } else if (d.includes('-')) {
            const parts = d.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
              if (parts[2].length === 4) return new Date(parts[2], parts[1] - 1, parts[0]);
            }
          }
          return new Date(d);
        };
        const dateA = parseDate(a.fecha);
        const dateB = parseDate(b.fecha);
        
        // Si ambas son 'Sin registro', no cambiar su orden relativo
        if (dateA.getTime() === 0 && dateB.getTime() === 0) return 0;
        // Si solo una es 'Sin registro', siempre enviarla al fondo
        if (dateA.getTime() === 0) return 1;
        if (dateB.getTime() === 0) return -1;

        if (sortFecha === 'asc') return dateA - dateB;
        return dateB - dateA;
      });
    }

    return filtered;
  };


  const filteredData = getFilteredVehiculos();
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'Operativa': return { bg: '#D1FAE5', text: '#065F46', border: '#34D399' };
      case 'Observada': return { bg: '#FEE2E2', text: '#991B1B', border: '#F87171' };
      default: return { bg: '#FEF3C7', text: '#92400E', border: '#FBBF24' }; // Falta de revisión
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos...</div>;

  return (
    <div>
      {/* HEADER Y ACCIONES */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Registro de Inspecciones</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión de unidades y reportes fotográficos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowExportModal(true)}
            style={{ backgroundColor: '#1E3A8A', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
            ⬇ Exportar
          </button>
          <button 
            onClick={() => setShowInspectionModal(true)}
            style={{ backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
            + Nueva Inspección
          </button>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            {['Todos', 'Primax', 'Bambas', 'Industrias', 'Repsol', 'Mantenimiento', 'GLP', 'Falta identificar'].map(cat => (
              <button 
                key={cat}
                onClick={() => setCategoria(cat)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                  fontWeight: '500', fontSize: '0.875rem',
                  backgroundColor: categoria === cat ? 'white' : 'transparent',
                  color: categoria === cat ? 'black' : '#4B5563',
                  boxShadow: categoria === cat ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* FILTROS DE ESTADO */}
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            {['Todos', 'Operativa', 'Observada', 'Falta de revisión'].map(est => (
              <button 
                key={est}
                onClick={() => setFiltroEstado(est)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                  fontWeight: '500', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  backgroundColor: filtroEstado === est ? 'white' : 'transparent',
                  color: filtroEstado === est ? 'black' : '#4B5563',
                  boxShadow: filtroEstado === est ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}>
                {est === 'Operativa' && <span style={{width:8, height:8, borderRadius:'50%', backgroundColor:'#10B981'}}></span>}
                {est === 'Observada' && <span style={{width:8, height:8, borderRadius:'50%', backgroundColor:'#EF4444'}}></span>}
                {est === 'Falta de revisión' && <span style={{width:8, height:8, borderRadius:'50%', backgroundColor:'#F59E0B'}}></span>}
                {est}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por placa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', outline: 'none' }}
          />
        </div>
      </div>


      {/* TABLA PRINCIPAL DE VEHÍCULOS */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando vehículos...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Operación</th>
                  <th>Estado</th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                      if (sortFecha === 'desc') setSortFecha('asc');
                      else if (sortFecha === 'asc') setSortFecha('none');
                      else setSortFecha('desc');
                    }}
                    title="Clic para ordenar por fecha"
                  >
                    Última Inspección {sortFecha === 'desc' ? '⬇️' : sortFecha === 'asc' ? '⬆️' : '↕️'}
                  </th>
                  <th style={{textAlign: 'right'}}>Historial / Reportes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr><td colSpan="6" style={{textAlign: 'center'}}>No hay registros coincidentes</td></tr>
                ) : (
                  paginatedData.map(v => {
                    const colors = getStatusColor(v.estado);
                    return (
                    <tr key={v.placa}>
                      <td style={{ fontWeight: '700', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {v.placa}
                      </td>
                      <td><span className="badge" style={{ backgroundColor: 'var(--bg-color)', border: '1px solid #E5E7EB' }}>{v.programa || 'Sin Categoría'}</span></td>
                      <td>
                        <span style={{ 
                          backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                          padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                        }}>
                          {v.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {(() => {
                          const f = v.fecha;
                          if (!f || f === '--/--/----' || f.trim() === '') return 'Sin registro';
                          if (f.includes('-')) {
                            const p = f.split('-');
                            if (p.length === 3) {
                              if (p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`; // YYYY-MM-DD -> DD-MM-YYYY
                              return f; // Already DD-MM-YYYY
                            }
                          }
                          return f;
                        })()}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => window.open(`${BASE_API_URL}/reportes/pdf?filtro=placa&valor=${v.placa}&token=${localStorage.getItem('nexus_token')}`, '_blank')}
                            style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.4rem 0.8rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            PDF Directo
                          </button>
                          <button 
                            onClick={() => setHistoryPlaca(v.placa)}
                            style={{ backgroundColor: '#EFF6FF', color: 'var(--accent-color)', border: '1px solid #BFDBFE', padding: '0.4rem 0.8rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Ver Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
            
            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', cursor: currentPage===1?'not-allowed':'pointer', backgroundColor: 'var(--card-bg)' }}>Ant</button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', cursor: currentPage===totalPages?'not-allowed':'pointer', backgroundColor: 'var(--card-bg)' }}>Sig</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showInspectionModal && <InspectionModal onClose={() => {setShowInspectionModal(false); setEditInspData(null);}} onReload={loadData} vehiculosExistentes={vehiculos} editInsp={editInspData} />}
      {historyPlaca && <HistoryModal placa={historyPlaca} onClose={() => setHistoryPlaca(null)} onEdit={(insp) => { setEditInspData(insp); setShowInspectionModal(true); }} refreshTrigger={refreshTrigger} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </div>
  );
}

// ==========================================
// MODAL: GENERADOR DE REPORTES
// ==========================================
function ExportModal({ onClose }) {
  const [formato, setFormato] = useState('pdf');
  const [filtro, setFiltro] = useState('todos');
  const [valor, setValor] = useState('');

  const handleExport = () => {
    if (filtro !== 'todos' && filtro !== 'gerencial' && !valor.trim()) {
      toast.error('Debe ingresar un valor para filtrar');
      return;
    }
    const token = localStorage.getItem('nexus_token') || '';
    const url = `${BASE_API_URL}/reportes/${formato}?filtro=${filtro}&valor=${valor}&token=${token}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '450px', transform: 'scale(1)', animation: 'scaleUp 0.2s ease-out' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Generador de Reportes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Formato de Archivo</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ opacity: filtro === 'gerencial' ? 0.5 : 1 }}>
                <input type="radio" name="formato" checked={formato === 'pdf' && filtro !== 'gerencial'} onChange={() => setFormato('pdf')} disabled={filtro === 'gerencial'} /> PDF con Fotos
              </label>
              <label>
                <input type="radio" name="formato" checked={formato === 'excel'} onChange={() => setFormato('excel')} /> Excel con Enlaces
              </label>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Filtro de Extracción</label>
            <select value={filtro} onChange={e=>{
              const newFiltro = e.target.value;
              setFiltro(newFiltro); 
              setValor('');
              if (newFiltro === 'gerencial') setFormato('excel');
            }} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ddd' }}>
              <option value="todos">Todas las Unidades (Completo)</option>
              <option value="placa">Por Placa Específica</option>
              <option value="programa">Por Operación (Categoría)</option>
              <option value="gerencial">Reporte Gerencial (Último Estado, Sin Fotos)</option>
            </select>
          </div>
          
          {filtro === 'placa' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Ingrese Placa</label>
              <input value={valor} onChange={e=>setValor(e.target.value)} type="text" placeholder="Ej. ABC-123" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ddd' }} />
            </div>
          )}
          
          {filtro === 'programa' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Seleccione Operación</label>
              <select value={valor} onChange={e=>setValor(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #ddd' }}>
                <option value="">Seleccione...</option>
                <option value="Primax">Primax</option>
                <option value="Bambas">Bambas</option>
                <option value="Industrias">Industrias</option>
                <option value="Repsol">Repsol</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="GLP">GLP</option>
                <option value="Falta identificar">Falta identificar</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleExport} style={{ padding: '0.5rem 1rem', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}>Descargar Reporte</button>
          </div>
        </div>
      </div>
    </div>
  );
}



// ==========================================
// MODAL DE HISTORIAL
// ==========================================
function HistoryModal({ placa, onClose, onEdit, refreshTrigger }) {
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsp, setSelectedInsp] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [placa, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      const data = await api.getInspecciones(placa);
      // Ensure sorted by newest
      const sorted = [...data].sort((a,b) => {
        const da = new Date(a.fecha.split('-').reverse().join('-') + 'T' + a.hora);
        const db = new Date(b.fecha.split('-').reverse().join('-') + 'T' + b.hora);
        return db - da; // desc
      });
      setInspecciones(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Eliminar esta inspección del historial?')) {
      try {
        toast.loading('Eliminando inspección...', { id: 'delete-inspeccion' });
        await api.deleteInspeccion(id);
        toast.success('Inspección eliminada', { id: 'delete-inspeccion' });
        fetchHistory();
      } catch (e) {
        toast.error(e.message, { id: 'delete-inspeccion' });
      }
    }
  }

  const handleEdit = (insp) => {
    onEdit(insp);
  };

  const renderBadge = (status) => {
    if (!status || status === 'N/A') return <span className="badge" style={{backgroundColor: '#E5E7EB', color: '#374151'}}>N/A</span>;
    if (status.toUpperCase() === 'OK') return <span className="badge badge-success">OK</span>;
    if (status.toUpperCase() === 'ERROR') return <span className="badge badge-error">Error</span>;
    return <span className="badge badge-warning">{status}</span>;
  };

  if (selectedInsp) {
    return <InspectionDetailModal insp={selectedInsp} placa={placa} onBack={() => setSelectedInsp(null)} />;
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'scaleUp 0.2s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Historial de Inspecciones</h3>
            <p style={{ color: 'var(--accent-color)', fontWeight: '700', fontSize: '1.1rem' }}>Vehículo: {placa}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => window.open(`${BASE_API_URL}/reportes/pdf?filtro=placa&valor=${placa}`, '_blank')} style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>⬇ PDF Directo</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem', color: '#6B7280' }}>&times;</button>
          </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 0' }}>
          {loading ? <div style={{textAlign:'center', padding:'2rem', color:'var(--text-secondary)'}}><p>Cargando historial...</p></div> : (
            inspecciones.length === 0 ? <div style={{textAlign:'center', padding:'2rem', color:'var(--text-secondary)'}}><p>No hay inspecciones registradas.</p></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                {/* Línea del Timeline */}
                <div style={{ position: 'absolute', left: '1.5rem', top: '1rem', bottom: '1rem', width: '2px', backgroundColor: '#E5E7EB', zIndex: 0 }}></div>
                
                {inspecciones.map((insp) => {
                    const isSoporte = insp.tablet === 'SOPORTE';
                    return (
                    <div key={insp.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                      {/* Punto del Timeline */}
                      <div style={{ width: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: isSoporte ? '#8B5CF6' : 'var(--accent-color)', border: '3px solid var(--bg-color)', boxShadow: '0 0 0 2px #E5E7EB', marginTop: '1rem' }}></div>
                      </div>

                      {/* Tarjeta de Inspección o Soporte */}
                      <div className="card" style={{ flex: 1, padding: '1.25rem', cursor: 'pointer', border: isSoporte ? '2px solid #8B5CF6' : '1px solid var(--border-color)', backgroundColor: isSoporte ? '#F5F3FF' : 'var(--card-bg)' }} onClick={() => setSelectedInsp(insp)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.85rem', color: isSoporte ? '#7C3AED' : 'var(--text-secondary)', fontWeight: 'bold' }}>{insp.fecha} {insp.hora}</span>
                            {isSoporte && <span style={{ marginLeft: '1rem', padding: '0.2rem 0.5rem', backgroundColor: '#8B5CF6', color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>Soporte Técnico</span>}
                          </div>
                          
                          {/* Botón Opciones (tres puntos) */}
                          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setMenuOpenId(menuOpenId === insp.id ? null : insp.id)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>⋮</button>
                            {menuOpenId === insp.id && (
                              <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '150px' }}>
                                <button onClick={() => { handleEdit(insp); setMenuOpenId(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)' }}>✏️ Editar</button>
                                <button onClick={() => handleDelete(insp.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>🗑️ Eliminar</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSoporte ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '500' }}>{insp.observaciones}</p>
                            {insp.img_tablet && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>📸 Ver Evidencia</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', alignItems: 'center', border: '1px solid #F3F4F6' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>📱 Tablet</span>
                              {renderBadge(insp.tablet)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', alignItems: 'center', border: '1px solid #F3F4F6' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>📻 Radio Base</span>
                              {renderBadge(insp.radio)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', alignItems: 'center', border: '1px solid #F3F4F6' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>📹 Cámaras</span>
                              {renderBadge(insp.camaras)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL DE DETALLE DE INSPECCIÓN (FOTOS)
// ==========================================
function InspectionDetailModal({ insp, placa, onBack }) {
  const [zoomImage, setZoomImage] = useState(null);
  const imgUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${BASE_API_URL}/uploads/${filename}`;
  };

  const isSoporte = insp.tablet === 'SOPORTE';

  const renderBadge = (status) => {
    if (!status || status === 'N/A') return <span className="badge" style={{backgroundColor: '#E5E7EB', color: '#374151'}}>N/A</span>;
    if (status.toUpperCase() === 'OK') return <span className="badge badge-success">OK</span>;
    if (status.toUpperCase() === 'ERROR') return <span className="badge badge-error">Error</span>;
    return <span className="badge badge-warning">{status}</span>;
  };

  const imageStyle = { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '0.25rem', cursor: 'zoom-in', border: '1px solid #ddd', transition: 'transform 0.2s' };

  return (
    <div onClick={onBack} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', cursor: 'pointer', marginRight: '1rem' }}>← Volver</button>
          <div style={{flex: 1}}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{isSoporte ? 'Detalle de Soporte Técnico' : 'Detalle de Inspección'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Placa: {placa} | Fecha: {insp.fecha} {insp.hora}</p>
          </div>
        </div>

        {!isSoporte ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Tablet {renderBadge(insp.tablet)}</h4>
              {insp.img_tablet ? <img src={imgUrl(insp.img_tablet)} alt="Tablet" style={imageStyle} onClick={() => setZoomImage(imgUrl(insp.img_tablet))} /> : <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>Sin Imagen</div>}
            </div>
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Radio Base {renderBadge(insp.radio)}</h4>
              {insp.img_radio ? <img src={imgUrl(insp.img_radio)} alt="Radio" style={imageStyle} onClick={() => setZoomImage(imgUrl(insp.img_radio))} /> : <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>Sin Imagen</div>}
            </div>
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Cámaras {renderBadge(insp.camaras)}</h4>
              {insp.img_camaras ? <img src={imgUrl(insp.img_camaras)} alt="Cámaras" style={imageStyle} onClick={() => setZoomImage(imgUrl(insp.img_camaras))} /> : <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>Sin Imagen</div>}
            </div>
          </div>
        ) : (
          insp.img_tablet && (
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Evidencia Fotográfica</h4>
              <img src={imgUrl(insp.img_tablet)} alt="Evidencia" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '0.25rem', cursor: 'zoom-in', border: '1px solid #ddd', transition: 'transform 0.2s', backgroundColor: '#F3F4F6' }} onClick={() => setZoomImage(imgUrl(insp.img_tablet))} />
            </div>
          )
        )}

        {insp.observaciones && (
          <div style={{ marginTop: '1.5rem', backgroundColor: '#FEF3C7', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #FDE68A' }}>
            <h4 style={{ color: '#D97706', marginBottom: '0.5rem', fontWeight: 'bold' }}>📝 Observaciones</h4>
            <p style={{ color: '#92400E', whiteSpace: 'pre-wrap', margin: 0 }}>{insp.observaciones}</p>
          </div>
        )}
      </div>

      {/* Visor de Imagen Grande (Lightbox) */}
      {zoomImage && (
        <div onClick={() => setZoomImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', flexDirection: 'column' }}>
          <img src={zoomImage} alt="Zoom" style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: '0.5rem', border: '2px solid white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} />
          <p style={{ color: 'white', marginTop: '1rem', fontWeight: 'bold' }}>Clic en cualquier lugar para cerrar</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODAL DE NUEVA / EDITAR INSPECCIÓN
// ==========================================
function InspectionModal({ onClose, onReload, vehiculosExistentes, editInsp }) {
  const [placaInput, setPlacaInput] = useState(editInsp ? editInsp.placa : '');
  
  // Encontrar vehículo si coincide exactamente
  const vehiculoSeleccionado = vehiculosExistentes.find(v => v.placa === placaInput.toUpperCase()) || (editInsp ? { placa: editInsp.placa, programa: editInsp.programa } : null);
  const programaAsociado = vehiculoSeleccionado ? vehiculoSeleccionado.programa : 'Esperando selección válida...';
  
  const getLocalDateString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  };

  const now = new Date();
  const [fecha, setFecha] = useState(editInsp && editInsp.fecha ? editInsp.fecha.substring(0,10) : getLocalDateString());
  const [hora, setHora] = useState(editInsp && editInsp.hora ? editInsp.hora : now.toTimeString().split(' ')[0].substring(0,5)); 
  
  const [tabletStatus, setTabletStatus] = useState(editInsp ? editInsp.tablet : 'OK');
  const [radioStatus, setRadioStatus] = useState(editInsp ? editInsp.radio : 'OK');
  const [camarasStatus, setCamarasStatus] = useState(editInsp ? editInsp.camaras : 'OK');

  const [imgTablet, setImgTablet] = useState(null);
  const [imgRadio, setImgRadio] = useState(null);
  const [imgCamaras, setImgCamaras] = useState(null);
  
  const [observaciones, setObservaciones] = useState(editInsp ? editInsp.observaciones || '' : '');

  const imgUrl = (filename) => `${BASE_API_URL}/uploads/${filename}`;
  const [previewTablet, setPreviewTablet] = useState(editInsp && editInsp.img_tablet ? imgUrl(editInsp.img_tablet) : null);
  const [previewRadio, setPreviewRadio] = useState(editInsp && editInsp.img_radio ? imgUrl(editInsp.img_radio) : null);
  const [previewCamaras, setPreviewCamaras] = useState(editInsp && editInsp.img_camaras ? imgUrl(editInsp.img_camaras) : null);

  const handleImageSelect = async (file, setImg, setPreview) => {
    if (!file) {
      setImg(null);
      setPreview(null);
      return;
    }
    // Mostrar preview rápido
    setPreview(URL.createObjectURL(file));
    
    // Procesar marca de agua asíncronamente
    toast.loading('Agregando marca de agua...', { id: 'watermark' });
    try {
      const processedBlob = await processImageWithWatermark(file, placaInput.trim().toUpperCase(), fecha, hora);
      setImg(processedBlob);
      toast.success('Marca de agua lista', { id: 'watermark' });
    } catch (e) {
      toast.error('Error procesando imagen', { id: 'watermark' });
      setImg(file); // fallback
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) {
      toast.error("Por favor, seleccione una placa que exista en el sistema.", { duration: 5000 });
      return;
    }
    
    try {
      toast.loading(editInsp ? 'Actualizando inspección...' : 'Guardando inspección...', { id: 'save-inspeccion' });
      const formData = new FormData();
      formData.append('placa', placaInput.trim().toUpperCase());
      formData.append('programa', vehiculoSeleccionado.programa); 
      formData.append('fecha', fecha);
      formData.append('hora', hora);
      
      formData.append('tablet', tabletStatus);
      formData.append('radio', radioStatus);
      formData.append('camaras', camarasStatus);
      formData.append('observaciones', observaciones);
      
      if (imgTablet) formData.append('img_tablet', imgTablet);
      if (imgRadio) formData.append('img_radio', imgRadio);
      if (imgCamaras) formData.append('img_camaras', imgCamaras);

      if (editInsp) {
        await api.updateInspeccion(editInsp.id, formData);
      } else {
        await api.createInspeccion(formData);
      }
      toast.success('Inspección guardada exitosamente', { id: 'save-inspeccion' });

      // Lógica automática para solicitar Técnico Externo
      if (['Falta', 'Error'].includes(tabletStatus) || ['Falta', 'Error'].includes(radioStatus) || ['Falta', 'Error'].includes(camarasStatus)) {
        if (window.confirm('🚨 Se detectaron componentes con fallas o faltantes en esta unidad.\n\n¿Desea solicitar automáticamente un TÉCNICO EXTERNO a la mesa de ayuda?')) {
          try {
            let fallas = [];
            if (['Falta', 'Error'].includes(tabletStatus)) fallas.push('Tablet');
            if (['Falta', 'Error'].includes(radioStatus)) fallas.push('Radio');
            if (['Falta', 'Error'].includes(camarasStatus)) fallas.push('Cámaras');

            await api.createIncidente({
              placa: placaInput.trim().toUpperCase(),
              tipo_solicitud: 'Técnico Externo',
              descripcion: `🔴 Reporte automático desde campo. Fallas detectadas: ${fallas.join(', ')}.\nObservaciones del inspector: ${observaciones}`,
              operador: 'Sistema Inspecciones',
              fecha: new Date().toISOString()
            });
            toast.success('✅ Ticket de Técnico Externo creado y derivado a Soporte TI.');
          } catch (ticketError) {
            toast.error('No se pudo crear el ticket para el técnico externo.');
          }
        }
      }

      onReload();
      onClose();
    } catch (error) {
      toast.error("Error al guardar la inspección: " + error.message, { id: 'save-inspeccion' });
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{editInsp ? 'Editar Inspección Física' : 'Nueva Inspección Física'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Buscar Placa</label>
              <input 
                required 
                list="placas-datalist"
                value={placaInput} 
                onChange={e=>setPlacaInput(e.target.value.toUpperCase())} 
                placeholder="Escribe o selecciona..."
                type="text" 
                readOnly={!!editInsp}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${vehiculoSeleccionado ? '#10B981' : '#ddd'}`, textTransform: 'uppercase' }} 
              />
              <datalist id="placas-datalist">
                {vehiculosExistentes.map(v => <option key={v.placa} value={v.placa} />)}
              </datalist>
              {!vehiculoSeleccionado && placaInput && <p style={{color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem'}}>Placa no registrada.</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Operación Heredada</label>
              <input type="text" readOnly value={programaAsociado} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Fecha de Inspección</label>
              <input required type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Hora de Inspección</label>
              <input required type="time" value={hora} onChange={e=>setHora(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)' }}></div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>1. Tablet</h4>
                <select value={tabletStatus} onChange={e=>setTabletStatus(e.target.value)} style={{ padding: '0.4rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '1rem', minWidth: '120px' }}>
                  <option>OK</option><option>Error</option><option>Falta revision</option><option>No Aplica</option>
                </select>
              </div>
              <MobileCameraInput label="Tablet" onSelect={(file) => handleImageSelect(file, setImgTablet, setPreviewTablet)} preview={previewTablet} setPreview={setPreviewTablet} />
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>2. Radio Base</h4>
                <select value={radioStatus} onChange={e=>setRadioStatus(e.target.value)} style={{ padding: '0.4rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '1rem', minWidth: '120px' }}>
                  <option>OK</option><option>Error</option><option>Falta revision</option><option>No Aplica</option>
                </select>
              </div>
              <MobileCameraInput label="Radio" onSelect={(file) => handleImageSelect(file, setImgRadio, setPreviewRadio)} preview={previewRadio} setPreview={setPreviewRadio} />
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>3. Cámaras</h4>
                <select value={camarasStatus} onChange={e=>setCamarasStatus(e.target.value)} style={{ padding: '0.4rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '1rem', minWidth: '120px' }}>
                  <option>OK</option><option>Error</option><option>Falta revision</option><option>No Aplica</option>
                </select>
              </div>
              <MobileCameraInput label="Cámaras" onSelect={(file) => handleImageSelect(file, setImgCamaras, setPreviewCamaras)} preview={previewCamaras} setPreview={setPreviewCamaras} />
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <h4 style={{ color: 'var(--text-primary)', margin: 0, marginBottom: '0.5rem' }}>Observaciones / Trabajos Realizados</h4>
            <textarea 
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalle los mantenimientos realizados, piezas cambiadas u observaciones adicionales..."
              style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}>Registrar Evidencias</button>
          </div>
        </form>
      </div>
    </div>
  );
}
