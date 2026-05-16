"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const handleLogin = async () => {
    setErrors({});
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido";
    if (!password) newErrors.password = "La contraseña es obligatoria";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
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
        <div
          className="app-logo-shell app-logo-shell--hero"
          style={{
            marginBottom: 20,
          }}
        >
          <Image src="/images/hostexcel_logo.png" alt="HostExcel" width={96} height={96} className="app-logo" priority />
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 850, margin: 0, letterSpacing: "-1px", color: "var(--text-primary)" }}>
          HostExcel
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginTop: 8, marginBottom: 34 }}>
          El pase de cocina para tus Excels de restaurante
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              placeholder="tu@restaurante.com"
              className={`input-field ${errors.email ? 'error' : ''}`}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {errors.email && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
              Contraseña
            </label>
            <input
              type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              placeholder="••••••••"
              className={`input-field ${errors.password ? 'error' : ''}`}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {errors.password && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.password}</p>}
          </div>

          <button
            onClick={handleLogin} disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: 15, justifyContent: "center" }}
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
            ¿No tienes cuenta?{" "}
            <a href="/register" style={{
              color: "var(--primary)", fontWeight: 600, textDecoration: "none",
              borderBottom: "1px solid transparent", transition: "border-color 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = "var(--primary)"}
              onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
            >
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
