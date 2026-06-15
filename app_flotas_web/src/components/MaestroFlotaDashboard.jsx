import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function MaestroFlotaDashboard() {
  const [activeTab, setActiveTab] = useState('tractos'); // tractos | semirremolques
  const [tractos, setTractos] = useState([]);
  const [semirremolques, setSemirremolques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

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
          onClick={() => setActiveTab('tractos')}
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
          onClick={() => setActiveTab('semirremolques')}
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
          onChange={(e) => setSearchTerm(e.target.value)}
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
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Placa SR</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Tipo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Marca / Modelo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Chasis</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Capacidad</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'tractos' ? (
                  filteredTractos.map((t, i) => (
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
                    </tr>
                  ))
                ) : (
                  filteredSR.map((s, i) => (
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Lateral (Drawer) de Detalles */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '100vw', backgroundColor: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
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
    </div>
  );
}

function DetailBox({ label, value, full }) {
  if (!value) return null;
  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #374151', gridColumn: full ? 'span 2' : 'span 1' }}>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'white', fontWeight: '500', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
