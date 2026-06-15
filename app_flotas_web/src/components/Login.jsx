import { useState } from 'react';

import { BASE_API_URL } from '../services/api';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token y datos del usuario en localStorage
      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', backgroundImage: 'radial-gradient(circle at 50% -20%, #1e3a8a, #0a0a0a 70%)' }}>
      <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.8)', padding: '3rem', borderRadius: '1rem', border: '1px solid #1f2937', boxShadow: '0 0 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', width: '400px', maxWidth: '90%', textAlign: 'center' }}>
        
        {/* LOGO */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#1e3a8a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 20px rgba(30, 58, 138, 0.5)' }}>
            <span style={{ fontSize: '2rem' }}>🔒</span>
          </div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem', letterSpacing: '2px' }}>JDCALI <span style={{ color: '#00f3ff' }}>OMNI O.S. 👑</span></h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>Autenticación Táctica Requerida</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Usuario / ID Operativo</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #374151', color: 'white', outline: 'none' }} 
              placeholder="Ej. admin"
            />
          </div>
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Contraseña de Seguridad</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #374151', color: 'white', outline: 'none' }} 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderRadius: '0.5rem', backgroundColor: '#1e3a8a', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(30,58,138,0.4)' }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.backgroundColor = '#2563eb' }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.backgroundColor = '#1e3a8a' }}
          >
            {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Sistema de Control de Flotas JDCALI OMNI O.S.<br/>Uso exclusivo de personal autorizado.
        </p>
      </div>
    </div>
  );
}
