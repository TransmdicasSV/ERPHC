import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie } from 'recharts';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function ResumenDashboard() {
  const [data, setData] = useState({
    total: 0,
    inspecciones: 0,
    operativas: 0,
    observadas: 0,
    faltaRevision: 0,
    trend: [],
    fallos: [],
    programasBarras: [],
    soporte: [],
    inventario: []
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');
  const dashboardRef = useRef(null);

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('es-ES', options));

    const loadData = async () => {
      try {
        const [vResponse, sData, cData] = await Promise.all([
          api.getVehiculos(1, 10000),
          api.getStats(),
          api.getChartStats()
        ]);

        const vData = vResponse.data || [];
        const operativas = vData.filter(v => v.estado === 'Operativa').length;
        const observadas = vData.filter(v => v.estado === 'Observada').length;
        const faltaRevision = vData.filter(v => v.estado === 'Falta de revisión').length;

        const progMap = {};
        vData.forEach(v => {
          let p = v.programa || 'Sin Categoría';
          if (p.toLowerCase().includes('industria')) p = 'Industrias';
          if (!progMap[p]) progMap[p] = { name: p, Operativa: 0, Observada: 0, 'Falta de revisión': 0 };
          progMap[p][v.estado] = (progMap[p][v.estado] || 0) + 1;
        });

        setData({
          total: vData.length,
          inspecciones: sData.totalInspecciones,
          operativas,
          observadas,
          faltaRevision,
          trend: cData.trend,
          fallos: cData.fallos,
          programasBarras: Object.values(progMap),
          soporte: cData.soporte || [],
          inventario: cData.inventario || []
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      Inicializando Centro de Control...
    </div>
  );

  const porcentajeSalud = data.total > 0 ? Math.round((data.operativas / data.total) * 100) : 0;
  
  const handleExportPDF = () => {
    const element = dashboardRef.current;
    
    // Ocultar UI e inyectar layout formal
    const noPrintEls = element.querySelectorAll('.no-print');
    noPrintEls.forEach(el => el.style.display = 'none');
    
    const printOnlyEls = element.querySelectorAll('.print-header, .print-only');
    printOnlyEls.forEach(el => el.style.display = 'block');

    // Forzar modo claro para el PDF para que se vea formal y limpio
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }

    const opt = {
      margin:       10,
      filename:     'Reporte_Grafico_Centro_Control.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1200 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restaurar estilos y modo oscuro
      noPrintEls.forEach(el => el.style.display = '');
      printOnlyEls.forEach(el => el.style.display = 'none');
      if (isDark) document.documentElement.classList.add('dark');
    });
  };

  const Needle = ({ value, color }) => {
    const angle = 180 - (value / 100) * 180;
    const rad = Math.PI / 180 * angle;
    const cx = 50, cy = 80;
    const length = 35;
    const x = cx + length * Math.cos(rad);
    const y = cy - length * Math.sin(rad);

    return (
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
        <circle cx={cx} cy={cy} r="3" fill="var(--text-primary)" />
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  };

  const Custom3DBar = (props) => {
    const { fill, x, y, width, height } = props;
    const depth = 8;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} />
        <path d={`M${x},${y} L${x + depth},${y - depth} L${x + width + depth},${y - depth} L${x + width},${y} Z`} fill={fill} filter="brightness(1.2)" />
        <path d={`M${x + width},${y} L${x + width + depth},${y - depth} L${x + width + depth},${y + height - depth} L${x + width},${y + height} Z`} fill={fill} filter="brightness(0.8)" />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.75rem', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill, margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const cardStyle = {
    backgroundColor: 'var(--card-bg)', 
    borderRadius: '1.25rem', 
    padding: '1.5rem', 
    boxShadow: 'var(--shadow-sm)', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1.25rem', 
    border: '1px solid var(--border-color)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }} ref={dashboardRef}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); border-color: var(--accent-hover); }
        .neon-glow { position: absolute; width: 100px; height: 100px; background: var(--accent-color); filter: blur(50px); opacity: 0.15; top: -50px; right: -50px; border-radius: 50%; pointer-events: none; }
        .print-only { display: none; }
        @media print {
          .print-only { display: block !important; margin-bottom: 1rem; color: #333; font-size: 16pt; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
          .page-break { page-break-after: always; padding-top: 2rem; }
        }
      `}</style>

      <div className="print-header" style={{display: 'none'}}>
        <h1>REPORTE GRÁFICO - JDCALI FLOTAS</h1>
        <p>Generado el: {currentDate}</p>
        <p><strong>Eficiencia Global de la Flota: {porcentajeSalud}%</strong></p>
      </div>

      <div className="no-print" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
            Centro de Control
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0, fontWeight: '500' }}>
            {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)} — {porcentajeSalud > 80 ? '🟢 La flota opera a máxima capacidad.' : '🟡 Se requiere atención en algunas unidades.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={handleExportPDF} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1.5rem', borderRadius: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar PDF
          </button>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '0.75rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ position: 'relative', display: 'flex', width: '12px', height: '12px' }}>
              <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: 'var(--green-text)', opacity: 0.7 }}></span>
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '12px', width: '12px', backgroundColor: 'var(--green-text)' }}></span>
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.875rem' }}>Sistema En Línea</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={cardStyle}>
          <div className="neon-glow" style={{ background: 'var(--blue-text)' }}></div>
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--blue-bg)', borderRadius: '1rem', color: 'var(--blue-text)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div style={{ zIndex: 1 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Unidades</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', lineHeight: '1' }}>{data.total}</h3>
          </div>
        </div>
        <div className="glass-card" style={cardStyle}>
          <div className="neon-glow" style={{ background: 'var(--green-text)' }}></div>
           <div style={{ padding: '1.25rem', backgroundColor: 'var(--green-bg)', borderRadius: '1rem', color: 'var(--green-text)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div style={{ zIndex: 1 }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operativas</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', lineHeight: '1' }}>{data.operativas}</h3>
          </div>
        </div>
        <div className="glass-card" style={cardStyle}>
          <div className="neon-glow" style={{ background: 'var(--red-text)' }}></div>
           <div style={{ padding: '1.25rem', backgroundColor: 'var(--red-bg)', borderRadius: '1rem', color: 'var(--red-text)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div style={{ zIndex: 1 }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Taller / Obs.</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', lineHeight: '1' }}>{data.observadas}</h3>
          </div>
        </div>
        <div className="glass-card" style={cardStyle}>
          <div className="neon-glow" style={{ background: 'var(--yellow-text)' }}></div>
           <div style={{ padding: '1.25rem', backgroundColor: 'var(--yellow-bg)', borderRadius: '1rem', color: 'var(--yellow-text)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div style={{ zIndex: 1 }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', lineHeight: '1' }}>{data.faltaRevision}</h3>
          </div>
        </div>
      </div>

      <div className="page-break">
        <h2 className="print-only">1. Rendimiento de Inspecciones (Últimos 14 días)</h2>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Rendimiento de Inspecciones</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Volumen de actividad en los últimos 7 días</p>
            </div>
          </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInsp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} tickFormatter={(val) => { if(!val) return ''; const [y,m,d] = val.split('-'); return `${d}-${m}-${y}`; }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="inspecciones" name="Inspecciones" stroke="var(--accent-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorInsp)" activeDot={{ r: 8, strokeWidth: 0, fill: 'var(--accent-hover)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="page-break">
        <h2 className="print-only">2. Salud de Flota e Incidencias Técnicas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div className="neon-glow" style={{ background: porcentajeSalud > 80 ? 'var(--green-text)' : 'var(--red-text)', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', opacity: 0.1 }}></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2rem 0', color: 'var(--text-primary)', alignSelf: 'flex-start' }}>Índice de Salud Global</h3>
            <div style={{ width: '100%', height: 280, position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" startAngle={180} endAngle={0} data={[{value: porcentajeSalud}, {value: 100 - porcentajeSalud}]} cx="50%" cy="80%" innerRadius="65%" outerRadius="90%" stroke="none">
                    <Cell fill={porcentajeSalud > 80 ? 'var(--green-text)' : (porcentajeSalud > 50 ? 'var(--yellow-text)' : 'var(--red-text)')} />
                    <Cell fill="var(--chart-grid)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <Needle value={porcentajeSalud} color={porcentajeSalud > 80 ? 'var(--green-text)' : 'var(--red-text)'} />
              <div style={{ position: 'absolute', top: '80%', left: '50%', transform: 'translate(-50%, -10%)', textAlign: 'center', width: '100%' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: '900', color: porcentajeSalud > 80 ? 'var(--green-text)' : 'var(--red-text)' }}>{porcentajeSalud}%</span>
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--text-primary)' }}>Distribución Operativa</h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={data.programasBarras} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-primary)', fontWeight: '600', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--chart-grid)', opacity: 0.5}} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Operativa" stackId="a" fill="var(--green-text)" shape={<Custom3DBar />} maxBarSize={40} />
                  <Bar dataKey="Observada" stackId="a" fill="var(--red-text)" shape={<Custom3DBar />} maxBarSize={40} />
                  <Bar dataKey="Falta de revisión" stackId="a" fill="var(--yellow-text)" shape={<Custom3DBar />} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '2rem', color: 'var(--text-primary)' }}>Análisis de Incidencias</h3>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data.fallos} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontWeight: '600', fill: 'var(--text-primary)', fontSize: 13}} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--chart-grid)', opacity: 0.5}} />
                <Bar dataKey="errores" name="Casos Reportados" fill="var(--accent-color)" radius={[0, 6, 6, 0]} barSize={28}>
                  {data.fallos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['var(--red-text)', 'var(--yellow-text)', 'var(--blue-text)'][index % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="page-break">
        <h2 className="print-only">3. Resumen de Módulos TI (Soporte e Inventario)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2rem 0', color: 'var(--text-primary)' }}>Soporte TI (Tickets)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.soporte} cx="50%" cy="50%" outerRadius={100} innerRadius={60} dataKey="value" stroke="none" label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {data.soporte.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Resuelto' ? 'var(--green-text)' : entry.name === 'Pendiente' ? 'var(--red-text)' : 'var(--yellow-text)'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2rem 0', color: 'var(--text-primary)' }}>Inventario TI (Movimientos)</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={data.inventario} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-primary)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--chart-grid)', opacity: 0.5}} />
                  <Bar dataKey="value" name="Equipos" fill="var(--accent-color)" shape={<Custom3DBar />} maxBarSize={40}>
                    {data.inventario.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent-color)' : 'var(--accent-hover)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
