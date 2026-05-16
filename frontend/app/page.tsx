export default function HomePage() {
  const highlights = [
    { value: '3x', label: 'menos trabajo manual' },
    { value: '24/7', label: 'panel disponible' },
    { value: '1 clic', label: 'de Excel a decisión' },
  ];

  const features = [
    {
      title: 'Carga de Excel guiada',
      text: 'Sube archivos y deja que la app detecte tipos, columnas y mapeos con menos fricción.',
    },
    {
      title: 'Dashboard para restauración',
      text: 'Ventas, inventario, escandallo y proveedores en una sola vista clara y ordenada.',
    },
    {
      title: 'Control y seguimiento',
      text: 'Historial de importaciones, validaciones y ajustes para mantener todo bajo control.',
    },
  ];

  return (
    <main className="promo-shell">
      <section className="promo-hero card">
        <div className="promo-hero-copy">
          <span className="promo-badge">HostExcel para restaurantes</span>
          <h1 className="promo-title">Convierte tus Excels en decisiones claras para sala y cocina.</h1>
          <p className="promo-text">
            Centraliza ventas, inventario, escandallos y proveedores en una herramienta visual, rápida y pensada para equipos de restauración.
          </p>
          <div className="promo-actions">
            <a className="btn-primary" href="/register">Empezar gratis</a>
            <a className="btn-secondary" href="/login">Entrar a la app</a>
          </div>
        </div>

        <div className="promo-hero-panel card">
          <div className="promo-panel-top">
            <span className="promo-panel-label">Resumen rápido</span>
            <span className="promo-panel-chip">En vivo</span>
          </div>
          <div className="promo-metrics">
            {highlights.map((item) => (
              <div key={item.label} className="promo-metric">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="promo-steps">
            <div>
              <span>1</span>
              <p>Sube tu archivo</p>
            </div>
            <div>
              <span>2</span>
              <p>La app mapea columnas</p>
            </div>
            <div>
              <span>3</span>
              <p>Visualiza y actúa</p>
            </div>
          </div>
        </div>
      </section>

      <section className="promo-features">
        {features.map((feature) => (
          <article key={feature.title} className="promo-feature card card-hover">
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="promo-cta card">
        <div>
          <h2>¿Listo para ordenar tus datos?</h2>
          <p>Empieza por la landing o entra directamente al panel si ya tienes cuenta.</p>
        </div>
        <div className="promo-actions">
          <a className="btn-primary" href="/register">Crear cuenta</a>
          <a className="btn-secondary" href="/login">Iniciar sesión</a>
        </div>
      </section>
    </main>
  );
}
