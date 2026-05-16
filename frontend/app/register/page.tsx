"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";
import { useLanguage } from "../LanguageProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; nombre?: string; general?: string }>({});

  const copy = language === 'en'
    ? {
        title: 'Create account',
        subtitle: 'Turn scattered sheets into service decisions',
        restaurant: 'Restaurant',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm password',
        button: 'Create account',
        loading: 'Creating account...',
        loginPrompt: 'Already have an account?',
        login: 'Sign in',
      }
    : {
        title: 'Crear cuenta',
        subtitle: 'Convierte hojas dispersas en decisiones de sala',
        restaurant: 'Restaurante',
        email: 'Email',
        password: 'Contraseña',
        confirmPassword: 'Confirmar contraseña',
        button: 'Crear cuenta',
        loading: 'Creando cuenta...',
        loginPrompt: '¿Ya tienes cuenta?',
        login: 'Inicia sesión',
      };

  const handleRegister = async () => {
    setErrors({});
    const newErrors: typeof errors = {};
    if (!nombre.trim()) newErrors.nombre = "El nombre del restaurante es obligatorio";
    if (!email.trim()) newErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido";
    if (!password) newErrors.password = "La contraseña es obligatoria";
    else if (password.length < 6) newErrors.password = "Mínimo 6 caracteres";
    if (password !== confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, nombre_restaurante: nombre.trim() }),
      });
      if (!res.ok) {
        setErrors({ general: await extractErrorMessage(res) });
      } else {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        window.location.assign("/dashboard");
      }
    } catch (err) {
      setErrors({ general: extractNetworkErrorMessage(err) });
    }
    setLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="logo-frame logo-frame--hero">
          <Image src="/images/hostexcel_logo_clean.png" alt="HostExcel" width={240} height={132} className="brand-logo-wordmark brand-logo-wordmark--hero" priority />
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 850, margin: 0, letterSpacing: "-1px", color: "var(--text-primary)" }}>{copy.title}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 8, marginBottom: 32 }}>
          {copy.subtitle}
        </p>

        <div className="auth-card" style={{
          padding: 36,
          borderRadius: "var(--radius-xl)",
          width: "100%", maxWidth: 410,
        }}>
          {errors.general && (
            <div style={{
              marginBottom: 16, padding: "12px 16px",
              background: "#FFF5F5", border: "1px solid #FFD7D7",
              borderRadius: "var(--radius-sm)", color: "#D94A4A",
              fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>❌</span> {errors.general}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              {copy.restaurant}
            </label>
            <input type="text" value={nombre}
              onChange={(e) => { setNombre(e.target.value); if (errors.nombre) setErrors({ ...errors, nombre: undefined }); }}
              placeholder="Nombre del restaurante"
              className={`input-field ${errors.nombre ? 'error' : ''}`}
            />
            {errors.nombre && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.nombre}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              {copy.email}
            </label>
            <input type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              placeholder="tu@restaurante.com"
              className={`input-field ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              {copy.password}
            </label>
            <input type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              placeholder="Mínimo 6 caracteres"
              className={`input-field ${errors.password ? 'error' : ''}`}
            />
            {errors.password && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.password}</p>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              {copy.confirmPassword}
            </label>
            <input type="password" value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
              placeholder="Repite la contraseña"
              className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            />
            {errors.confirmPassword && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.confirmPassword}</p>}
          </div>

          <button
            onClick={handleRegister} disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: 15, justifyContent: "center" }}
          >
            {loading ? copy.loading : copy.button}
          </button>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
            {copy.loginPrompt}{" "}
            <a href="/login" style={{
              color: "var(--primary)", fontWeight: 600, textDecoration: "none",
              borderBottom: "1px solid transparent", transition: "border-color 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = "var(--primary)"}
              onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
            >
              {copy.login}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
