"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";

const CONTACT_EMAIL = "info@hostexcel.es";
const LANGUAGE_STORAGE_KEY = "hostexcel_language";

type Lang = "es" | "en";

const COPY: Record<Lang, {
  nav: { who: string; services: string; contact: string; login: string };
  languageLabel: string;
  toggleTo: string;
  badge: string;
  topbarCopy: string;
  heroBadge: string;
  heroTitle: string;
  heroText: string;
  primaryCta: string;
  secondaryCta: string;
  panelLabel: string;
  panelChip: string;
  stepsPreview: [string, string, string];
  highlights: { value: string; label: string }[];
  aboutLabel: string;
  aboutTitle: string;
  aboutText: string;
  reasons: string[];
  featureLabel: string;
  features: { title: string; text: string }[];
  processLabel: string;
  processTitle: string;
  steps: { title: string; text: string }[];
  ctaLabel: string;
  ctaTitle: string;
  ctaText: string;
  ctaPrimary: string;
  ctaSecondary: string;
  contactLabel: string;
  contactTitle: string;
  contactText: string;
  contactSuccess: string;
  contactError: string;
  form: {
    name: string;
    restaurant: string;
    email: string;
    phone: string;
    interest: string;
    message: string;
    submit: string;
    sending: string;
    options: { value: string; label: string }[];
  };
  popupTitle: string;
  popupText: string;
  popupClose: string;
  footerText: string;
  footerLinks: { login: string; register: string; contact: string };
  errorFallback: string;
}> = {
  es: {
    nav: { who: "Quiénes somos", services: "Servicios", contact: "Contacto", login: "Acceder" },
    languageLabel: "Español",
    toggleTo: "English",
    badge: "HostExcel para restaurantes",
    topbarCopy: "Control de datos, márgenes y stock sin fricción.",
    heroBadge: "Bienvenido a HostExcel",
    heroTitle: "Convierte tus Excels en decisiones claras para sala y cocina.",
    heroText: "Centraliza ventas, inventario, escandallos y proveedores en una herramienta visual, rápida y pensada para equipos de restauración.",
    primaryCta: "Pedir información",
    secondaryCta: "Crear cuenta",
    panelLabel: "Resumen rápido",
    panelChip: "En vivo",
    stepsPreview: ["Sube tu archivo", "La app mapea columnas", "Visualiza y actúa"],
    highlights: [
      { value: "3x", label: "menos trabajo manual" },
      { value: "24/7", label: "panel disponible" },
      { value: "1 clic", label: "de Excel a decisión" },
    ],
    aboutLabel: "Quiénes somos",
    aboutTitle: "Una herramienta creada para ordenar la operativa de restaurantes.",
    aboutText: "HostExcel nace para reducir el trabajo manual con Excels y dar una visión más clara de ventas, stock y rentabilidad. Pensada para gerentes, operaciones y equipos que necesitan datos útiles, no solo archivos.",
    reasons: [
      "Diseño pensado para restaurantes y equipos pequeños",
      "Menos hojas dispersas, más foco en margen y stock",
      "Acceso rápido a los datos que importan cada semana",
    ],
    featureLabel: "Servicios",
    features: [
      { title: "Carga de Excel guiada", text: "Sube archivos y deja que la app detecte tipos, columnas y mapeos con menos fricción." },
      { title: "Dashboard para restauración", text: "Ventas, inventario, escandallo y proveedores en una sola vista clara y ordenada." },
      { title: "Control y seguimiento", text: "Historial de importaciones, validaciones y ajustes para mantener todo bajo control." },
    ],
    processLabel: "Cómo trabajamos",
    processTitle: "Queremos que te sea fácil pedir una demo y ver si encaja contigo.",
    steps: [
      { title: "Nos cuentas tu situación", text: "Déjanos tu correo y una idea de tu volumen de trabajo o del tipo de Excel que usas." },
      { title: "Te enseñamos la app", text: "Te mostramos cómo funciona la importación, el mapeo y las vistas principales." },
      { title: "Arrancas con tu equipo", text: "Configuramos la base para que empieces a controlar datos sin perder tiempo." },
    ],
    ctaLabel: "¿Interesado?",
    ctaTitle: "Deja tu correo y te contactamos.",
    ctaText: "Si tu cliente está interesado, puede dejar aquí sus datos y pedir información o demo.",
    ctaPrimary: "Quiero que me contacten",
    ctaSecondary: "Escribir por correo",
    contactLabel: "Contacto",
    contactTitle: "Déjanos tu correo y te enseñamos cómo puede ayudarte HostExcel.",
    contactText: "Completa el formulario y te abrimos una conversación. También puedes escribirnos directamente a",
    contactSuccess: "Te responderemos lo antes posible.",
    contactError: "No se pudo enviar el mensaje",
    form: {
      name: "Nombre",
      restaurant: "Restaurante",
      email: "Email",
      phone: "Teléfono",
      interest: "Qué te interesa",
      message: "Mensaje",
      submit: "Enviar solicitud",
      sending: "Enviando...",
      options: [
        { value: "demo", label: "Pedir demo" },
        { value: "informacion", label: "Más información" },
        { value: "precios", label: "Ver precios" },
        { value: "soporte", label: "Hablar de soporte/implantación" },
      ],
    },
    popupTitle: "Mensaje enviado",
    popupText: "Gracias por ponerte en contacto con nosotros, recibirás respuesta lo antes posible.",
    popupClose: "Cerrar",
    footerText: "Gestión inteligente de Excels para restaurantes.",
    footerLinks: { login: "Acceder", register: "Crear cuenta", contact: "Contacto" },
    errorFallback: "No se pudo enviar el mensaje",
  },
  en: {
    nav: { who: "About us", services: "Services", contact: "Contact", login: "Sign in" },
    languageLabel: "English",
    toggleTo: "Español",
    badge: "HostExcel for restaurants",
    topbarCopy: "Keep data, margins, and stock under control without friction.",
    heroBadge: "Welcome to HostExcel",
    heroTitle: "Turn your spreadsheets into clear decisions for front and kitchen.",
    heroText: "Centralize sales, inventory, cost breakdowns, and suppliers in a fast, visual tool made for restaurant teams.",
    primaryCta: "Request info",
    secondaryCta: "Create account",
    panelLabel: "Quick summary",
    panelChip: "Live",
    stepsPreview: ["Upload your file", "The app maps columns", "Review and act"],
    highlights: [
      { value: "3x", label: "less manual work" },
      { value: "24/7", label: "dashboard access" },
      { value: "1 click", label: "from Excel to action" },
    ],
    aboutLabel: "About us",
    aboutTitle: "A tool built to organize restaurant operations.",
    aboutText: "HostExcel was created to reduce manual spreadsheet work and give a clearer view of sales, stock, and profitability. Designed for managers, operations, and teams that need useful data, not just files.",
    reasons: [
      "Designed for restaurants and small teams",
      "Less scattered sheets, more focus on margin and stock",
      "Fast access to the data that matters every week",
    ],
    featureLabel: "Services",
    features: [
      { title: "Guided Excel upload", text: "Upload files and let the app detect types, columns, and mappings with less friction." },
      { title: "Restaurant dashboard", text: "Sales, inventory, cost breakdowns, and suppliers in one clear, organized view." },
      { title: "Control and tracking", text: "Import history, validations, and adjustments to keep everything under control." },
    ],
    processLabel: "How we work",
    processTitle: "We want it to be easy to request a demo and see if it fits your team.",
    steps: [
      { title: "Tell us your situation", text: "Leave your email and a bit of context about your workload or the spreadsheets you use." },
      { title: "We show you the app", text: "We walk you through the import flow, mapping, and the main screens." },
      { title: "You get started with your team", text: "We set up the basics so you can start controlling data without wasting time." },
    ],
    ctaLabel: "Interested?",
    ctaTitle: "Leave your email and we will reach out.",
    ctaText: "If you’re interested, leave your details here and request info or a demo.",
    ctaPrimary: "I want to be contacted",
    ctaSecondary: "Write an email",
    contactLabel: "Contact",
    contactTitle: "Leave your email and we’ll show you how HostExcel can help.",
    contactText: "Fill in the form and we’ll start a conversation. You can also write us directly at",
    contactSuccess: "We’ll get back to you as soon as possible.",
    contactError: "Could not send the message",
    form: {
      name: "Name",
      restaurant: "Restaurant",
      email: "Email",
      phone: "Phone",
      interest: "What are you interested in",
      message: "Message",
      submit: "Send request",
      sending: "Sending...",
      options: [
        { value: "demo", label: "Request a demo" },
        { value: "informacion", label: "More information" },
        { value: "precios", label: "See pricing" },
        { value: "soporte", label: "Talk about support/setup" },
      ],
    },
    popupTitle: "Message sent",
    popupText: "Thanks for contacting us, we’ll reply as soon as possible.",
    popupClose: "Close",
    footerText: "Smart Excel management for restaurants.",
    footerLinks: { login: "Sign in", register: "Create account", contact: "Contact" },
    errorFallback: "Could not send the message",
  },
};

export default function HomePage() {
  const [language, setLanguage] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'es';
  });
  const [form, setForm] = useState({
    nombre: "",
    restaurante: "",
    email: "",
    telefono: "",
    interes: "demo",
    mensaje: "",
  });
  const [showPopup, setShowPopup] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const copy = COPY[language];

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
    setSending(true);
    setSubmitError(null);

    void (async () => {
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, language }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || copy.contactError);
        }

        setShowPopup(true);
        setForm({ nombre: '', restaurante: '', email: '', telefono: '', interes: 'demo', mensaje: '' });
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : copy.contactError);
      } finally {
        setSending(false);
      }
    })();
  };

  return (
    <main className="promo-shell">
      <header className="promo-topbar card">
        <div className="promo-brandline">
          <div className="logo-frame logo-frame--promo">
            <Image src="/images/hostexcel_logo_clean.png" alt="HostExcel" width={164} height={90} className="promo-logo promo-logo--wordmark" priority />
          </div>
          <div>
            <span className="promo-badge">{copy.badge}</span>
            <p className="promo-topbar-copy">{copy.topbarCopy}</p>
          </div>
        </div>
        <nav className="promo-topnav">
          <a href="#quienes-somos">{copy.nav.who}</a>
          <a href="#servicios">{copy.nav.services}</a>
          <a href="#contacto">{copy.nav.contact}</a>
          <a href="/login">{copy.nav.login}</a>
          <button type="button" className="btn-secondary promo-lang-toggle" onClick={() => setLanguage((current) => (current === 'es' ? 'en' : 'es'))}>
            {copy.toggleTo}
          </button>
        </nav>
      </header>

      <section className="promo-hero card">
        <div className="promo-hero-copy">
          <span className="promo-badge">{copy.heroBadge}</span>
          <h1 className="promo-title">{copy.heroTitle}</h1>
          <p className="promo-text">{copy.heroText}</p>
          <div className="promo-actions">
            <a className="btn-primary" href="#contacto">{copy.primaryCta}</a>
            <a className="btn-secondary" href="/register">{copy.secondaryCta}</a>
          </div>
        </div>

        <div className="promo-hero-panel card">
          <div className="promo-panel-top">
            <span className="promo-panel-label">{copy.panelLabel}</span>
            <span className="promo-panel-chip">{copy.panelChip}</span>
          </div>
          <div className="promo-metrics">
            {copy.highlights.map((item) => (
              <div key={item.label} className="promo-metric">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="promo-steps">
            <div>
              <span>1</span>
              <p>{copy.stepsPreview[0]}</p>
            </div>
            <div>
              <span>2</span>
              <p>{copy.stepsPreview[1]}</p>
            </div>
            <div>
              <span>3</span>
              <p>{copy.stepsPreview[2]}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="quienes-somos" className="promo-about card">
        <div>
          <span className="promo-section-label">{copy.aboutLabel}</span>
          <h2>{copy.aboutTitle}</h2>
          <p>{copy.aboutText}</p>
        </div>
        <ul>
          {copy.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section id="servicios" className="promo-features">
        {copy.features.map((feature) => (
          <article key={feature.title} className="promo-feature card card-hover">
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="promo-process card">
        <div className="promo-process-header">
          <span className="promo-section-label">{copy.processLabel}</span>
          <h2>{copy.processTitle}</h2>
        </div>
        <div className="promo-process-grid">
          {copy.steps.map((step, index) => (
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
          <span className="promo-section-label">{copy.ctaLabel}</span>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaText}</p>
        </div>
        <div className="promo-actions">
          <a className="btn-primary" href="#contacto">{copy.ctaPrimary}</a>
          <a className="btn-secondary" href={`mailto:${CONTACT_EMAIL}`}>{copy.ctaSecondary}</a>
        </div>
      </section>

      <section id="contacto" className="promo-contact card">
        <div className="promo-contact-copy">
          <span className="promo-section-label">{copy.contactLabel}</span>
          <h2>{copy.contactTitle}</h2>
          <p>
            {copy.contactText}
            <a href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.
          </p>
          <p className="promo-success">{copy.contactSuccess}</p>
          {submitError && <p className="promo-error">{submitError}</p>}
        </div>

        <form className="promo-form" onSubmit={handleSubmit}>
          <div className="promo-form-row">
            <label>
              {copy.form.name}
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Tu nombre"
              />
            </label>
            <label>
              {copy.form.restaurant}
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
              {copy.form.email}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@empresa.com"
                required
              />
            </label>
            <label>
              {copy.form.phone}
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="+34 600 000 000"
              />
            </label>
          </div>

          <label>
            {copy.form.interest}
            <select
              value={form.interes}
              onChange={(e) => setForm((prev) => ({ ...prev, interes: e.target.value }))}
            >
              {copy.form.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            {copy.form.message}
            <textarea
              value={form.mensaje}
              onChange={(e) => setForm((prev) => ({ ...prev, mensaje: e.target.value }))}
              placeholder={language === 'es' ? 'Cuéntanos un poco sobre tu negocio o qué problema quieres resolver' : 'Tell us a bit about your business or the problem you want to solve'}
              rows={5}
            />
          </label>

          <button className="btn-primary promo-form-submit" type="submit" disabled={sending}>
            {sending ? copy.form.sending : copy.form.submit}
          </button>
        </form>
      </section>

      {showPopup && (
        <div className="promo-popup-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) setShowPopup(false);
        }}>
          <div className="promo-popup card" role="dialog" aria-modal="true" aria-label="Confirmación de contacto">
          <div>
              <strong>{copy.popupTitle}</strong>
              <p>{copy.popupText}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowPopup(false)}>
              {copy.popupClose}
            </button>
          </div>
        </div>
      )}

      <footer className="promo-footer card">
        <div>
          <strong>HostExcel</strong>
          <p>{copy.footerText}</p>
        </div>
        <div className="promo-footer-links">
          <a href="/login">{copy.footerLinks.login}</a>
          <a href="/register">{copy.footerLinks.register}</a>
          <a href={`mailto:${CONTACT_EMAIL}`}>{copy.footerLinks.contact}</a>
        </div>
      </footer>
    </main>
  );
}
