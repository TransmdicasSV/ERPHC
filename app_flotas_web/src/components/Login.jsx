import { useEffect, useState } from "react";
import { BASE_API_URL } from "../services/api";
import transmdicasLogo from "../assets/transmdicas-logo.png";

const LoginIcon = ({ name, size = 18 }) => {
  const paths = {
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4.5M12 17h.01"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const CompanyBrand = ({ mobile = false }) => (
  <div className={mobile ? "erphc-login-mobile-brand" : "erphc-login-brand"}>
    <span className="company-logo-crop"><img src={transmdicasLogo} alt="Transmdicas S.R.L." /></span>
    <span><strong>ERPHSE</strong><small>Gestión operativa</small></span>
  </div>
);

export function Login({ onLoginSuccess, onPublicClick }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [stats, setStats] = useState({ totalFlota: "—", inspeccionesHoy: "—" });

  useEffect(() => {
    const rememberedUser = localStorage.getItem("erphc_remembered_user");
    if (rememberedUser) {
      setUsername(rememberedUser);
      setRemember(true);
    }

    const controller = new AbortController();
    fetch(`${BASE_API_URL}/api/public/stats`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setStats({
            totalFlota: data.totalFlota ?? "—",
            inspeccionesHoy: data.inspeccionesHoy ?? "—",
          });
        }
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") console.warn("No se pudieron cargar las métricas públicas", requestError);
      });

    return () => controller.abort();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${BASE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión");

      localStorage.setItem("nexus_token", data.token);
      localStorage.setItem("nexus_user", JSON.stringify(data.user));
      if (remember) localStorage.setItem("erphc_remembered_user", username.trim());
      else localStorage.removeItem("erphc_remembered_user");
      onLoginSuccess(data.user);
    } catch (requestError) {
      setError(requestError.message || "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="erphc-login-screen">
      <section className="erphc-login-visual" aria-label="Presentación de ERPHSE">
        <svg className="erphc-route-art" viewBox="0 0 600 760" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-20 700C140 635 118 460 265 408C405 358 385 176 575 86" />
          <circle cx="265" cy="408" r="5" />
          <circle cx="575" cy="86" r="5" />
        </svg>
        <CompanyBrand />
        <div className="erphc-login-hero">
          <span className="erphc-login-badge">Acceso corporativo</span>
          <h1>Supervisa tu flota, la seguridad y el soporte TI desde un solo panel.</h1>
          <div className="erphc-login-main-stat">{stats.totalFlota}</div>
          <p>unidades registradas en la flota</p>
          <div className="erphc-login-stats">
            <div><strong>{stats.inspeccionesHoy}</strong><span>Inspecciones de hoy</span></div>
            <div><strong>24/7</strong><span>Portal de incidencias</span></div>
            <div><strong>100%</strong><span>Gestión centralizada</span></div>
          </div>
        </div>
      </section>

      <section className="erphc-login-form-panel">
        <div className="erphc-login-form-card">
          <CompanyBrand mobile />
          <h2>Inicia sesión</h2>
          <p className="erphc-login-subtitle">Ingresa tus credenciales corporativas para continuar.</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="erphc-login-error" role="alert">{error}</div>}
            <label className="erphc-login-field">
              <span>Usuario</span>
              <span className="erphc-login-input-wrap">
                <LoginIcon name="user" />
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="DNI o usuario" autoComplete="username" required />
              </span>
            </label>
            <label className="erphc-login-field">
              <span>Contraseña</span>
              <span className="erphc-login-input-wrap">
                <LoginIcon name="lock" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" required />
              </span>
            </label>
            <div className="erphc-login-options">
              <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Recordarme</label>
              <button type="button" onClick={() => setError("Si olvidaste tu contraseña, solicita el restablecimiento al área de TI.")}>¿Olvidaste tu contraseña?</button>
            </div>
            <button className="erphc-login-submit" type="submit" disabled={loading}>
              <span>{loading ? "Verificando…" : "Ingresar al sistema"}</span>
              {!loading && <LoginIcon name="arrow" />}
            </button>
          </form>
          <p className="erphc-login-foot">Acceso exclusivo para personal autorizado de Transmdicas.</p>
        </div>
      </section>

      <button className="erphc-public-report-button" type="button" onClick={onPublicClick}>
        <LoginIcon name="alert" />
        <span>Reportar falla en mi unidad</span>
      </button>
    </main>
  );
}
