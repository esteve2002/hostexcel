"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";

type ValidationErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "El formato del email no es válido";
    }
    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setErrors({ general: errorMessage });
      } else {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        router.push("/");
      }
    } catch (err) {
      setErrors({ general: extractNetworkErrorMessage(err) });
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-warm)",
      padding: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: "-40%",
        right: "-20%",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(91,123,58,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-30%",
        left: "-15%",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(196,149,62,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "fadeInUp 0.6s ease both",
      }}>
        <div
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(135deg, #7A9E56 0%, #C4953E 100%)",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 36,
            fontFamily: "var(--font-display)",
            boxShadow: "0 8px 32px rgba(196, 149, 62, 0.3)",
            marginBottom: 20,
          }}
        >
          H
        </div>
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: 0,
          letterSpacing: "0.3px",
        }}>
          HostExcel
        </h1>
        <p style={{
          color: "var(--text-muted)",
          fontSize: 15,
          marginTop: 6,
          marginBottom: 36,
        }}>
          Gestión inteligente de Excels para restaurantes
        </p>

        <div style={{
          background: "var(--bg-card)",
          padding: 36,
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: 400,
          border: "1px solid var(--border-light)",
        }}>
          {errors.general && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#FFF5F5",
              border: "1px solid #FFD7D7",
              borderRadius: "var(--radius-sm)",
              color: "#D94A4A",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>❌</span> {errors.general}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 13,
              fontWeight: 600,
              color: errors.email ? "#D94A4A" : "var(--text-primary)",
              display: "block",
              marginBottom: 4,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              placeholder="tu@restaurante.com"
              className={`input-field ${errors.email ? 'error' : ''}`}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {errors.email && (
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.email}</p>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontSize: 13,
              fontWeight: 600,
              color: errors.password ? "#D94A4A" : "var(--text-primary)",
              display: "block",
              marginBottom: 4,
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              placeholder="••••••••"
              className={`input-field ${errors.password ? 'error' : ''}`}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {errors.password && (
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#D94A4A" }}>{errors.password}</p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "13px",
              fontSize: 15,
            }}
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>

          <p style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 14,
            color: "var(--text-muted)",
          }}>
            ¿No tienes cuenta?{" "}
            <a
              href="/register"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
                borderBottom: "1px solid transparent",
                transition: "border-color 0.2s ease",
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
