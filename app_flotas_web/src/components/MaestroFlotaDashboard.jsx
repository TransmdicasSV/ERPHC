import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function MaestroFlotaDashboard({ permisos }) {
  const [activeTab, setActiveTab] = useState('tractos'); // tractos | semirremolques
  const [tractos, setTractos] = useState([]);
  const [semirremolques, setSemirremolques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null); // Item being edited
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, sData] = await Promise.all([
        api.getTractos(),
        api.getSemirremolques()
      ]);
      setTractos(Array.isArray(tData) ? tData : []);
      setSemirremolques(Array.isArray(sData) ? sData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTractos = tractos.filter(t => 
    t?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t?.marca && t.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t?.operacion && t.operacion.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t?.cliente && t.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSR = semirremolques.filter(s => 
    s?.placa_sr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s?.tipo && s.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s?.marca && s.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>👑</span> Maestro de Flotas
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
            Base de datos maestra estática de Tractos y Semirremolques.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => { setActiveTab('tractos'); setCurrentPage(1); }}
          style={{
            padding: '1rem 2rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tractos' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'tractos' ? '#3b82f6' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: activeTab === 'tractos' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Tractos ({tractos.length})
        </button>
        <button
          onClick={() => { setActiveTab('semirremolques'); setCurrentPage(1); }}
          style={{
            padding: '1rem 2rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'semirremolques' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'semirremolques' ? '#3b82f6' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: activeTab === 'semirremolques' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Semirremolques ({semirremolques.length})
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por placa, marca, cliente..." 
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando maestro de flotas...</div>
      ) : (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
              <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {activeTab === 'tractos' ? (
                    <>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Placa</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Operación</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Cliente</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Marca / Modelo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Año</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Semirremolque Asignado</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Acciones</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Placa SR</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Tipo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Marca / Modelo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Chasis</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Capacidad</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Acciones</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const itemsPerPage = 8;
                  const targetList = activeTab === 'tractos' ? filteredTractos : filteredSR;
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = targetList.slice(indexOfFirstItem, indexOfLastItem);
                  
                  if (activeTab === 'tractos') {
                    return currentItems.map((t, i) => (
                      <tr 
                        key={t.placa} 
                        onClick={() => setSelectedItem({ type: 'tracto', data: t })}
                        style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{t.placa}</td>
                        <td style={{ padding: '1rem' }}>{t.operacion || '-'}</td>
                        <td style={{ padding: '1rem' }}>{t.cliente || '-'}</td>
                        <td style={{ padding: '1rem' }}>{t.marca || '-'} {t.modelo ? `/ ${t.modelo}` : ''}</td>
                        <td style={{ padding: '1rem' }}>{t.anio || '-'}</td>
                        <td style={{ padding: '1rem' }}>
                          {t.placa_sr ? (
                            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                              {t.placa_sr}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Sin SR</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {(!permisos || permisos.editar !== false) && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'tracto', data: t }); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '0.5rem' }}>✏️</button>
                              <button onClick={async (e) => { 
                                e.stopPropagation(); 
                                if(window.confirm(`¿Seguro que deseas eliminar el tracto ${t.placa}?`)) {
                                  try { await api.deleteVehiculo(t.placa); loadData(); }
                                  catch (err) { alert(err.message); }
                                }
                              }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ));
                  } else {
                    return currentItems.map((s, i) => (
                      <tr 
                        key={s.placa_sr} 
                        onClick={() => setSelectedItem({ type: 'sr', data: s })}
                        style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{s.placa_sr}</td>
                        <td style={{ padding: '1rem' }}>{s.tipo || '-'}</td>
                        <td style={{ padding: '1rem' }}>{s.marca || '-'} {s.modelo ? `/ ${s.modelo}` : ''}</td>
                        <td style={{ padding: '1rem' }}>{s.chasis || '-'}</td>
                        <td style={{ padding: '1rem' }}>{s.capacidad ? `${s.capacidad} GL` : '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {(!permisos || permisos.editar !== false) && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setEditItem({ type: 'sr', data: s }); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '0.5rem' }}>✏️</button>
                              <button onClick={async (e) => { 
                                e.stopPropagation(); 
                                if(window.confirm(`¿Seguro que deseas eliminar el semirremolque ${s.placa_sr}?`)) {
                                  try { await api.deleteSemirremolque(s.placa_sr); loadData(); }
                                  catch (err) { alert(err.message); }
                                }
                              }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ));
                  }
                })()}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginación */}
          {(() => {
            const itemsPerPage = 8;
            const targetList = activeTab === 'tractos' ? filteredTractos : filteredSR;
            const totalPages = Math.ceil(targetList.length / itemsPerPage);
            const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
            const indexOfLastItem = Math.min(currentPage * itemsPerPage, targetList.length);
            
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Mostrando {targetList.length > 0 ? indexOfFirstItem + 1 : 0} a {indexOfLastItem} de {targetList.length} registros
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)} 
                    style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: currentPage === 1 ? 'var(--bg-color)' : 'var(--bg-secondary)', color: currentPage === 1 ? '#6B7280' : 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Anterior
                  </button>
                  <button 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(prev => prev + 1)} 
                    style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: currentPage >= totalPages ? 'var(--bg-color)' : 'var(--bg-secondary)', color: currentPage >= totalPages ? '#6B7280' : 'var(--text-primary)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Lateral (Drawer) de Detalles */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '100vw', backgroundColor: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
          <style>
            {`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}
          </style>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {selectedItem.type === 'tracto' ? 'Ficha Técnica: Tracto' : 'Ficha Técnica: Semirremolque'}
            </h2>
            <button 
              onClick={() => setSelectedItem(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '2rem', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#60a5fa' }}>
                {selectedItem.type === 'tracto' ? selectedItem.data.placa : selectedItem.data.placa_sr}
              </h1>
              <p style={{ color: '#9ca3af', margin: '0.5rem 0 0' }}>
                {selectedItem.type === 'tracto' ? selectedItem.data.marca : selectedItem.data.marca} - {selectedItem.data.anio}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {selectedItem.type === 'tracto' ? (
                <>
                  <DetailBox label="Operación" value={selectedItem.data.operacion} />
                  <DetailBox label="Cliente" value={selectedItem.data.cliente} />
                  <DetailBox label="VIN" value={selectedItem.data.vin} full />
                  <DetailBox label="Modelo" value={selectedItem.data.modelo} />
                  <DetailBox label="Color" value={selectedItem.data.color} />
                  <DetailBox label="Peso (TON)" value={selectedItem.data.peso_ton} />
                  <DetailBox label="Potencia" value={selectedItem.data.potencia} />
                  <DetailBox label="Cilindros / Cilindrada" value={`${selectedItem.data.cilindros || '-'} cil / ${selectedItem.data.cilindrada || '-'} L`} />
                  <DetailBox label="Torque" value={selectedItem.data.torque} />
                  <DetailBox label="Cambios" value={selectedItem.data.cambios} />
                  <DetailBox label="Transmisión" value={selectedItem.data.transmision} full />
                  <DetailBox label="Suspensión Delantera" value={selectedItem.data.suspension_del} full />
                  <DetailBox label="Suspensión Posterior" value={selectedItem.data.suspension_post} full />
                </>
              ) : (
                <>
                  <DetailBox label="Tipo" value={selectedItem.data.tipo} full />
                  <DetailBox label="Modelo" value={selectedItem.data.modelo} />
                  <DetailBox label="Chasis" value={selectedItem.data.chasis} full />
                  <DetailBox label="Capacidad" value={selectedItem.data.capacidad ? `${selectedItem.data.capacidad} GL` : null} />
                  <DetailBox label="Compartimientos" value={selectedItem.data.compartimientos} />
                  <DetailBox label="Diámetro Interior" value={selectedItem.data.diametro_interior} />
                  <DetailBox label="Frecuencia P." value={selectedItem.data.frecuencia_p} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {isEditModalOpen && (
        <EditModal 
          item={editItem} 
          onClose={() => setIsEditModalOpen(false)} 
          onSaved={() => { setIsEditModalOpen(false); loadData(); }} 
        />
      )}
    </div>
  );
}

function DetailBox({ label, value, full }) {
  if (!value) return null;
  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', gridColumn: full ? 'span 2' : 'span 1' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function EditModal({ item, onClose, onSaved }) {
  const [formData, setFormData] = useState({ ...item.data });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item.type === 'tracto') {
        await api.updateVehiculo(formData.placa, formData);
      } else {
        await api.updateSemirremolque(formData.placa_sr, formData);
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isTracto = item.type === 'tracto';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Editar {isTracto ? 'Tracto' : 'Semirremolque'} - {isTracto ? formData.placa : formData.placa_sr}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <form id="edit-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {isTracto ? (
              <>
                <Field label="Operación" name="operacion" value={formData.operacion} onChange={handleChange} />
                <Field label="Cliente" name="cliente" value={formData.cliente} onChange={handleChange} />
                <Field label="VIN" name="vin" value={formData.vin} onChange={handleChange} />
                <Field label="Marca" name="marca" value={formData.marca} onChange={handleChange} />
                <Field label="Modelo" name="modelo" value={formData.modelo} onChange={handleChange} />
                <Field label="Año" name="anio" value={formData.anio} onChange={handleChange} />
                <Field label="Color" name="color" value={formData.color} onChange={handleChange} />
                <Field label="Peso (TON)" name="peso_ton" value={formData.peso_ton} onChange={handleChange} />
                <Field label="Potencia" name="potencia" value={formData.potencia} onChange={handleChange} />
                <Field label="Cilindros" name="cilindros" value={formData.cilindros} onChange={handleChange} />
                <Field label="Cilindrada" name="cilindrada" value={formData.cilindrada} onChange={handleChange} />
                <Field label="Torque" name="torque" value={formData.torque} onChange={handleChange} />
                <Field label="Cambios" name="cambios" value={formData.cambios} onChange={handleChange} />
                <Field label="Transmisión" name="transmision" value={formData.transmision} onChange={handleChange} />
                <Field label="Suspensión Delantera" name="suspension_del" value={formData.suspension_del} onChange={handleChange} />
                <Field label="Suspensión Posterior" name="suspension_post" value={formData.suspension_post} onChange={handleChange} />
                <Field label="Placa SR Asignado" name="placa_sr" value={formData.placa_sr} onChange={handleChange} />
              </>
            ) : (
              <>
                <Field label="Tipo" name="tipo" value={formData.tipo} onChange={handleChange} />
                <Field label="Marca" name="marca" value={formData.marca} onChange={handleChange} />
                <Field label="Modelo" name="modelo" value={formData.modelo} onChange={handleChange} />
                <Field label="Chasis" name="chasis" value={formData.chasis} onChange={handleChange} />
                <Field label="Capacidad" name="capacidad" value={formData.capacidad} onChange={handleChange} />
                <Field label="Compartimientos" name="compartimientos" value={formData.compartimientos} onChange={handleChange} />
                <Field label="Diámetro Interior" name="diametro_interior" value={formData.diametro_interior} onChange={handleChange} />
                <Field label="Frecuencia P." name="frecuencia_p" value={formData.frecuencia_p} onChange={handleChange} />
              </>
            )}
          </form>
        </div>
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} type="button" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
          <button form="edit-form" type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</label>
      <input type="text" name={name} value={value || ''} onChange={onChange} style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
    </div>
  );
}
