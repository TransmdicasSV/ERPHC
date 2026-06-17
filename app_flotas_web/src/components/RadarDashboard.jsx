import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, Tooltip, LayersControl } from 'react-leaflet';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { BASE_API_URL } from '../services/api';
import { jsPDF } from 'jspdf';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const BASE_LAT = -16.354118;
const BASE_LON = -71.604236;
const RADIO_TOLERANCIA_KM = 0.15;

const ZONAS_SECUNDARIAS = [
  { id: 'TALLER', nombre: 'Taller Principal (Demo)', lat: -16.360000, lon: -71.590000, color: '#a855f7', radioKm: 0.2 },
  { id: 'CLIENTE', nombre: 'Zona de Carga Cliente (Demo)', lat: -16.340000, lon: -71.620000, color: '#3b82f6', radioKm: 0.3 }
];

const beepSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

function MapFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 18, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

export function RadarDashboard({ navigate }) {
  const [logs, setLogs] = useState([]);
  const [targets, setTargets] = useState([]);
  const [vehiculosGps, setVehiculosGps] = useState({});
  const [dbState, setDbState] = useState({ registradas: [], inspeccionadasHoy: [], pendientes: [] });
  const [timeLeft, setTimeLeft] = useState(180);
  const [fitTrigger, setFitTrigger] = useState(0);

  const [isScanning, setIsScanning] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [flyCoords, setFlyCoords] = useState(null);
  const [lockedTarget, setLockedTarget] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Timer Effect
  useEffect(() => {
    if (isScanning) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

      useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const eventSource = new EventSource(`${BASE_API_URL}/radar/stream?token=${token}`);

    const checkQuickSearch = () => {
      const placaToSearch = localStorage.getItem('quick_search_radar');
      if (placaToSearch) {
        setMapSearch(placaToSearch);
        setTimeout(() => {
          const cleanSearch = placaToSearch.toUpperCase().replace(/[^A-Z0-9]/gi, '');
          const foundPlate = Object.keys(vehiculosGps).find(p => p.replace(/[^A-Z0-9]/gi, '') === cleanSearch);
          if (foundPlate) {
            setFlyCoords([vehiculosGps[foundPlate].lat, vehiculosGps[foundPlate].lon]);
          }
        }, 1000); // Dar un poco de tiempo para cargar los gps
        localStorage.removeItem('quick_search_radar');
      }
    };
    checkQuickSearch();

    eventSource.addEventListener('log', (e) => {
      const logData = JSON.parse(e.data);
      setLogs(prev => [...prev, logData].slice(-5000)); 
      
      if (logData.text.includes('BARRIDO TÁCTICO INICIADO')) {
        setIsScanning(true);
      }
      if (logData.text.includes('Barrido completado.')) {
        setIsScanning(false);
        setTimeLeft(180); 
      }
    });

    eventSource.addEventListener('targets', (e) => {
      setTargets(JSON.parse(e.data));
    });

    eventSource.addEventListener('db_state', (e) => {
      setDbState(JSON.parse(e.data));
    });

    eventSource.addEventListener('map_update', (e) => {
      setVehiculosGps(JSON.parse(e.data));
    });

    eventSource.addEventListener('alert', (e) => {
      const alertData = JSON.parse(e.data);
      beepSound.play().catch(e => console.log('Audio error:', e));
      if (Notification.permission === "granted") {
        new Notification("⚠️ ALERTA RADAR", { body: `Vehículo ${alertData.placa} llegó a base.` });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    });

    return () => eventSource.close();
  }, []);

  const forceScan = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      await fetch(`${BASE_API_URL}/radar/force`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const calcularDistancia = (lat2, lon2) => {
    const R = 6371.0; 
    const dLat = (lat2 - BASE_LAT) * Math.PI / 180;
    const dLon = (lon2 - BASE_LON) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(BASE_LAT * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  function MapFitBounds({ vehiculosGps, fitTrigger }) {
    const map = useMap();
    const hasFit = useRef(false);
    const lastTrigger = useRef(0);
    
    useEffect(() => {
      const isManualTrigger = fitTrigger > lastTrigger.current;
      
      if ((!hasFit.current || isManualTrigger) && Object.keys(vehiculosGps).length > 0) {
        const coords = Object.values(vehiculosGps).map(v => [v.lat, v.lon]);
        coords.push([BASE_LAT, BASE_LON]); // Incluir siempre la base
        try {
          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 16 });
          hasFit.current = true;
          lastTrigger.current = fitTrigger;
        } catch(e) {}
      }
    }, [vehiculosGps, map, fitTrigger]);
    
    return null;
  }

  const baseIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const grayIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const orangeIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

  const handleMapSearch = (e) => {
    e.preventDefault();
    const cleanSearch = mapSearch.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    const foundPlate = Object.keys(vehiculosGps).find(p => p.replace(/[^A-Z0-9]/gi, '') === cleanSearch);
    
    if (foundPlate) {
      const { lat, lon } = vehiculosGps[foundPlate];
      setMapSearch('');
      setFlyCoords([lat, lon]);
    } else {
      toast.error("Unidad no encontrada en el radar actual.", { id: 'search-radar' });
    }
  };

  // Lock-On Target
  useEffect(() => {
    if (lockedTarget && vehiculosGps[lockedTarget]) {
      setFlyCoords([vehiculosGps[lockedTarget].lat, vehiculosGps[lockedTarget].lon]);
    }
  }, [vehiculosGps, lockedTarget]);

  const handleSnapshot = async () => {
    const element = document.getElementById('radar-dashboard-container');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.text(`Captura generada el: ${new Date().toLocaleString()}`, 10, 20);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`JDCALI_RADAR_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      toast.error("Error al capturar PDF: " + e.message, { id: 'pdf-radar' });
    }
  };

  // Format Timer
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div id="radar-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 4rem)', minHeight: 0, overflow: 'hidden', backgroundColor: 'var(--bg-color)', padding: '0.5rem' }}>
      
      {/* SECCIÓN SUPERIOR: MAPA PANORÁMICO */}
      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '0.5rem', overflow: 'hidden', position: 'relative', minHeight: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        {/* BUSCADOR DEL MAPA */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'var(--card-bg)', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          <form onSubmit={handleMapSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Buscar en mapa..." 
              value={mapSearch}
              onChange={e => setMapSearch(e.target.value)}
              style={{ padding: '0.4rem 0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem', outline: 'none', width: '200px', fontSize: '1rem' }}
            />
            <button type="submit" style={{ backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
              🔍
            </button>
          </form>
        </div>

        <MapContainer center={[BASE_LAT, BASE_LON]} zoom={15} maxZoom={22} style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-color)' }}>
          {flyCoords && <MapFlyTo coords={flyCoords} />}
          <MapFitBounds vehiculosGps={vehiculosGps} fitTrigger={fitTrigger} />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Modo Táctico">
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                maxZoom={22}
                maxNativeZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Modo Satélite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                maxZoom={22}
                maxNativeZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <Marker position={[BASE_LAT, BASE_LON]} icon={baseIcon}>
            <Popup><strong>BASE ZERO</strong><br/>Transmédicas</Popup>
          </Marker>

          {/* Círculo de Tolerancia Base Zero */}
          <Circle 
            center={[BASE_LAT, BASE_LON]} 
            radius={RADIO_TOLERANCIA_KM * 1000} 
            pathOptions={{ color: '#ff003c', fillColor: '#ff003c', fillOpacity: 0.15, weight: 2 }} 
          />

          {/* Zonas Secundarias */}
          {ZONAS_SECUNDARIAS.map(zona => (
            <Circle 
              key={zona.id}
              center={[zona.lat, zona.lon]} 
              radius={zona.radioKm * 1000} 
              pathOptions={{ color: zona.color, fillColor: zona.color, fillOpacity: 0.15, weight: 2, dashArray: '4 4' }} 
            >
              <Popup><strong>{zona.nombre}</strong><br/>Geocerca Secundaria</Popup>
            </Circle>
          ))}

          {Object.keys(vehiculosGps).map(placaGps => {
            const { lat, lon, speed, history } = vehiculosGps[placaGps];
            const dist = calcularDistancia(lat, lon);
            const inside = dist <= RADIO_TOLERANCIA_KM;
            
            const cleanPlacaGps = placaGps.replace(/[^A-Z0-9]/gi, '');
            
            // Lógica de Clasificación y Categoría
            const vehiculoObj = dbState.registradas.find(t => t.placa.replace(/[^A-Z0-9]/gi, '') === cleanPlacaGps);
            const isRegistrada = !!vehiculoObj;
            const isInspeccionada = dbState.inspeccionadasHoy.some(t => t.replace(/[^A-Z0-9]/gi, '') === cleanPlacaGps);
            const isPending = isRegistrada && !isInspeccionada;
            const programa = vehiculoObj ? vehiculoObj.programa : 'N/A';

            let iconToUse;
            let statusText;
            let statusColor;

            if (!isRegistrada) {
              iconToUse = orangeIcon;
              statusText = 'DESCONOCIDA (No en BD)';
              statusColor = '#f97316'; // Naranja
            } else if (isInspeccionada) {
              iconToUse = grayIcon;
              statusText = 'INSPECCIONADA HOY';
              statusColor = '#6b7280'; // Gris
            } else {
              // Pendiente
              iconToUse = inside ? greenIcon : blueIcon;
              statusText = 'PENDIENTE';
              statusColor = '#eab308'; // Amarillo
            }

            return (
              <div key={placaGps}>
                <Marker position={[lat, lon]} icon={iconToUse}>
                  <Tooltip permanent direction="bottom" offset={[0, 10]} opacity={0.9}>
                    <strong style={{ fontSize: '10px' }}>{placaGps}</strong>
                  </Tooltip>
                  <Popup>
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <strong style={{fontSize:'1.1rem'}}>{placaGps}</strong><br/>
                      {isRegistrada && (
                        <span style={{ backgroundColor: 'var(--bg-color)', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'inline-block', margin: '4px 0' }}>
                          {programa}
                        </span>
                      )}
                      <br/>
                      <span style={{fontSize:'0.8rem', color: statusColor, fontWeight: 'bold'}}>
                        {statusText}
                      </span><br/>
                      {inside ? <span style={{color:'green', fontWeight:'bold'}}>EN BASE</span> : `A ${dist.toFixed(2)} km`}
                      
                      <div style={{ margin: '8px 0', fontSize: '0.85rem', color: '#555' }}>
                        Velocidad: <strong>{speed || 0} km/h</strong>
                      </div>

                      <div style={{ marginTop: '5px', paddingTop: '10px', borderTop: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        
                        {/* Botón de Fijar Objetivo */}
                        <button 
                          onClick={() => setLockedTarget(lockedTarget === placaGps ? null : placaGps)}
                          style={{ width: '100%', padding: '5px', backgroundColor: lockedTarget === placaGps ? '#ef4444' : '#111827', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                          {lockedTarget === placaGps ? '🛑 Quitar Fijación' : '🎯 Fijar Objetivo'}
                        </button>

                        {!isRegistrada ? (
                          <button 
                            onClick={() => {
                              localStorage.setItem('quick_search_placa', placaGps);
                              if (navigate) navigate('dashboard');
                            }}
                            style={{ width: '100%', padding: '5px', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            + Registrar Unidad
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              localStorage.setItem('quick_search_placa', placaGps);
                              if (navigate) navigate('dashboard');
                            }}
                            style={{ width: '100%', padding: '5px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            🔍 Ver Detalle
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Estela de Ruta (Snake Mode) */}
                {history && history.length > 1 && (
                  <Polyline 
                    positions={history.map(h => [h.lat, h.lon])} 
                    color={statusColor} 
                    weight={4} 
                    opacity={0.6} 
                    dashArray="5, 10"
                  />
                )}
                
                {/* Línea hacia la base si está pendiente y dentro */}
                {(inside && isPending) && <Polyline positions={[[BASE_LAT, BASE_LON], [lat, lon]]} color="green" dashArray="5, 5" weight={3} />}
              </div>
            );
          })}
        </MapContainer>
        
        {/* HUD TELEMETRÍA (Arriba a la Izquierda) */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, backgroundColor: 'rgba(10, 10, 10, 0.8)', color: '#00f3ff', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(5px)', border: '1px solid #00f3ff', fontFamily: 'Consolas, monospace', boxShadow: '0 0 15px rgba(0, 243, 255, 0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', borderBottom: '1px solid #00f3ff', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#00f3ff', borderRadius: '50%', animation: 'pulse 2s infinite'}}></span>
            HUD TELEMETRÍA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span>TOTAL UNIDADES:</span> <strong style={{color: 'white'}}>{Object.keys(vehiculosGps).length}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span>EN MOVIMIENTO:</span> <strong style={{color:'#00ff00'}}>{Object.values(vehiculosGps).filter(v => v.speed > 0).length}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span>DETENIDAS:</span> <strong style={{color:'#ff003c'}}>{Object.values(vehiculosGps).filter(v => v.speed === 0 || !v.speed).length}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span>PROM. VELOCIDAD:</span> <strong style={{color: '#eab308'}}>{Object.keys(vehiculosGps).length > 0 ? (Object.values(vehiculosGps).reduce((acc, v) => acc + (v.speed||0), 0) / Object.keys(vehiculosGps).length).toFixed(1) : 0} km/h</strong></div>
          </div>
        </div>

        {/* BOTÓN FOTOGRAFÍA y CENTRAR (Abajo a la Izquierda) */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000, display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setFitTrigger(t => t + 1)} style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(5px)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1E3A8A'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.8)'; }}
          >
            🌍 CENTRAR FLOTA
          </button>
          
          <button onClick={handleSnapshot} style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #555', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(5px)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = 'black'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(10, 10, 10, 0.8)'; e.currentTarget.style.color = 'white'; }}
          >
            📸 CAPTURAR RADAR
          </button>
        </div>
        
        {/* PANEL DERECHO: INDICADOR Y LEYENDA */}
        <div style={{ position: 'absolute', top: 60, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', pointerEvents: 'none' }}>
          
          <div style={{ backgroundColor: isScanning ? '#EF4444' : 'rgba(255,255,255,0.9)', color: isScanning ? 'white' : '#111827', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s' }}>
            {isScanning ? (
              <><span style={{display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--card-bg)', borderRadius: '50%', animation: 'pulse 1s infinite'}}></span> ESCANEANDO SECTOR...</>
            ) : (
              <>📡 RADAR EN VIVO</>
            )}
          </div>
          
          <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#1f2937' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></span>
              PENDIENTES (Lejos)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#16a34a' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></span>
              EN BASE (Alerta Telegram)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#9ca3af', borderRadius: '50%', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></span>
              INSPECCIONADAS HOY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#ea580c' }}>
              <span style={{ width: '14px', height: '14px', backgroundColor: '#f97316', borderRadius: '50%', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></span>
              DESCONOCIDAS (No en BD)
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: PANEL DE CONTROL Y CONSOLA */}
      <div style={{ height: '280px', display: 'flex', gap: '1rem', flexShrink: 0 }}>
        
        {/* PANEL DE MANDO E INFO */}
        <div style={{ width: '300px', backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', color: '#00f3ff', padding: '1rem', fontFamily: 'Consolas, monospace', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', borderBottom: '1px solid #1f1f1f', paddingBottom: '0.5rem' }}>C.O.R.E. RADAR v4.0</h2>
          
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '0.5rem', borderRadius: '0.3rem', border: '1px solid #222' }}>
            <span style={{color: '#888', fontSize: '0.85rem'}}>PRÓXIMO BARRIDO:</span>
            <span style={{color: isScanning ? '#00ff00' : '#ffb300', fontWeight: 'bold', fontSize: '1.2rem'}}>{isScanning ? '---' : timeStr}</span>
          </div>
          
          <button onClick={forceScan} disabled={isScanning} style={{ width: '100%', padding: '0.6rem', backgroundColor: isScanning ? '#333' : '#0a0a0a', color: isScanning ? '#555' : '#ff003c', border: `1px solid ${isScanning ? '#333' : '#ff003c'}`, cursor: isScanning ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginBottom: '1rem', transition: 'all 0.2s' }}
            onMouseEnter={(e)=>{if(!isScanning){e.target.style.backgroundColor='#ff003c'; e.target.style.color='black'}}}
            onMouseLeave={(e)=>{if(!isScanning){e.target.style.backgroundColor='#0a0a0a'; e.target.style.color='#ff003c'}}}
          >
            {isScanning ? '[ ESCANEANDO... ]' : '[ OVERRIDE: SCAN ]'}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ fontSize: '0.9rem', color: '#00f3ff', marginBottom: '0.5rem' }}>&gt; PENDIENTES ({dbState.pendientes.length})</h3>
            <div style={{ backgroundColor: '#000000', border: '1px solid #1f1f1f', padding: '0.5rem', flex: 1, overflowY: 'auto', color: '#888', fontSize: '0.8rem' }}>
              {dbState.pendientes.length === 0 ? '[!] 0 Targets Encontrados' : dbState.pendientes.map(t => <div key={t}>[ ] {t}</div>)}
            </div>
          </div>
        </div>

        {/* CONSOLA HACKER */}
        <div style={{ flex: 1, backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', color: '#00f3ff', padding: '1rem', fontFamily: 'Consolas, monospace', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
          <h3 style={{ fontSize: '1rem', color: '#00f3ff', marginBottom: '0.5rem', flexShrink: 0 }}>&gt; TERMINAL LOG:</h3>
          <div style={{ backgroundColor: '#050505', border: '1px solid #1f1f1f', padding: '0.5rem', flex: 1, overflowY: 'auto', fontSize: '0.85rem' }}>
            {logs.map((log, i) => {
              let color = '#aaaaaa';
              if (log.type === 'error') color = '#ff003c';
              if (log.type === 'success') color = '#00ff00';
              if (log.type === 'system') color = '#00f3ff';
              if (log.type === 'info_gps') color = '#ffffff';

              return <div key={i} style={{ color, marginBottom: '4px' }}>{log.text}</div>;
            })}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
