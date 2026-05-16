"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

const CONTACT_EMAIL = "info@hostexcel.es";

export default function HomePage() {
  const [form, setForm] = useState({
    nombre: "",
    restaurante: "",
    email: "",
    telefono: "",
    interes: "demo",
    mensaje: "",
  });
  const [showPopup, setShowPopup] = useState(false);

  const highlights = [
    { value: "3x", label: "menos trabajo manual" },
    { value: "24/7", label: "panel disponible" },
    { value: "1 clic", label: "de Excel a decisión" },
  ];

  const features = [
    {
      title: "Carga de Excel guiada",
      text: "Sube archivos y deja que la app detecte tipos, columnas y mapeos con menos fricción.",
    },
    {
      title: "Dashboard para restauración",
      text: "Ventas, inventario, escandallo y proveedores en una sola vista clara y ordenada.",
    },
    {
      title: "Control y seguimiento",
      text: "Historial de importaciones, validaciones y ajustes para mantener todo bajo control.",
    },
  ];

  const reasons = [
    "Diseño pensado para restaurantes y equipos pequeños",
    "Menos hojas dispersas, más foco en margen y stock",
    "Acceso rápido a los datos que importan cada semana",
  ];

  const steps = [
    {
      title: "Nos cuentas tu situación",
      text: "Déjanos tu correo y una idea de tu volumen de trabajo o del tipo de Excel que usas.",
    },
    {
      title: "Te enseñamos la app",
      text: "Te mostramos cómo funciona la importación, el mapeo y las vistas principales.",
    },
    {
      title: "Arrancas con tu equipo",
      text: "Configuramos la base para que empieces a controlar datos sin perder tiempo.",
    },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowPopup(true);
  };

  return (
    <main className="promo-shell">
      <header className="promo-topbar card">
        <div className="promo-brandline">
          <div className="logo-frame logo-frame--promo">
            <Image src="/images/hostexcel_logo_clean.png" alt="HostExcel" width={164} height={90} className="promo-logo promo-logo--wordmark" priority />
          </div>
          <div>
            <span className="promo-badge">HostExcel para restaurantes</span>
            <p className="promo-topbar-copy">Control de datos, márgenes y stock sin fricción.</p>
          </div>
        </div>
        <nav className="promo-topnav">
          <a href="#quienes-somos">Quiénes somos</a>
          <a href="#servicios">Servicios</a>
          <a href="#contacto">Contacto</a>
          <a href="/login">Acceder</a>
        </nav>
      </header>

      <section className="promo-hero card">
        <div className="promo-hero-copy">
          <span className="promo-badge">Bienvenido a HostExcel</span>
          <h1 className="promo-title">Convierte tus Excels en decisiones claras para sala y cocina.</h1>
          <p className="promo-text">
            Centraliza ventas, inventario, escandallos y proveedores en una herramienta visual, rápida y pensada para equipos de restauración.
          </p>
          <div className="promo-actions">
            <a className="btn-primary" href="#contacto">Pedir información</a>
            <a className="btn-secondary" href="/register">Crear cuenta</a>
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

      <section id="quienes-somos" className="promo-about card">
        <div>
          <span className="promo-section-label">Quiénes somos</span>
          <h2>Una herramienta creada para ordenar la operativa de restaurantes.</h2>
          <p>
            HostExcel nace para reducir el trabajo manual con Excels y dar una visión más clara de ventas, stock y rentabilidad.
            Pensada para gerentes, operaciones y equipos que necesitan datos útiles, no solo archivos.
          </p>
        </div>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section id="servicios" className="promo-features">
        {features.map((feature) => (
          <article key={feature.title} className="promo-feature card card-hover">
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="promo-process card">
        <div className="promo-process-header">
          <span className="promo-section-label">Cómo trabajamos</span>
          <h2>Queremos que te sea fácil pedir una demo y ver si encaja contigo.</h2>
        </div>
        <div className="promo-process-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="promo-process-step">
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="promo-cta card">
        <div>
          <span className="promo-section-label">¿Interesado?</span>
          <h2>Deja tu correo y te contactamos.</h2>
          <p>Si tu cliente está interesado, puede dejar aquí sus datos y pedir información o demo.</p>
        </div>
        <div className="promo-actions">
          <a className="btn-primary" href="#contacto">Quiero que me contacten</a>
          <a className="btn-secondary" href={`mailto:${CONTACT_EMAIL}`}>Escribir por correo</a>
        </div>
      </section>

      <section id="contacto" className="promo-contact card">
        <div className="promo-contact-copy">
          <span className="promo-section-label">Contacto</span>
          <h2>Déjanos tu correo y te enseñamos cómo puede ayudarte HostExcel.</h2>
          <p>
            Completa el formulario y te abrimos una conversación. También puedes escribirnos directamente a
            <a href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.
          </p>
          <p className="promo-success">Gracias por ponerte en contacto con nosotros.</p>
        </div>

        <form className="promo-form" onSubmit={handleSubmit}>
          <div className="promo-form-row">
            <label>
              Nombre
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Tu nombre"
              />
            </label>
            <label>
              Restaurante
              <input
                type="text"
                value={form.restaurante}
                onChange={(e) => setForm((prev) => ({ ...prev, restaurante: e.target.value }))}
                placeholder="Nombre del local"
              />
            </label>
          </div>

          <div className="promo-form-row">
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@empresa.com"
                required
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="+34 600 000 000"
              />
            </label>
          </div>

          <label>
            Qué te interesa
            <select
              value={form.interes}
              onChange={(e) => setForm((prev) => ({ ...prev, interes: e.target.value }))}
            >
              <option value="demo">Pedir demo</option>
              <option value="informacion">Más información</option>
              <option value="precios">Ver precios</option>
              <option value="soporte">Hablar de soporte/implantación</option>
            </select>
          </label>

          <label>
            Mensaje
            <textarea
              value={form.mensaje}
              onChange={(e) => setForm((prev) => ({ ...prev, mensaje: e.target.value }))}
              placeholder="Cuéntanos un poco sobre tu negocio o qué problema quieres resolver"
              rows={5}
            />
          </label>

          <button className="btn-primary promo-form-submit" type="submit">
            Enviar solicitud
          </button>
        </form>
      </section>

      {showPopup && (
        <div className="promo-popup-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) setShowPopup(false);
        }}>
          <div className="promo-popup card" role="dialog" aria-modal="true" aria-label="Confirmación de contacto">
            <div>
              <strong>Mensaje enviado</strong>
              <p>Gracias por ponerte en contacto con nosotros, recibirás respuesta lo antes posible.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowPopup(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="promo-footer card">
        <div>
          <strong>HostExcel</strong>
          <p>Gestión inteligente de Excels para restaurantes.</p>
        </div>
        <div className="promo-footer-links">
          <a href="/login">Acceder</a>
          <a href="/register">Crear cuenta</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>Contacto</a>
        </div>
      </footer>
    </main>
  );
}
