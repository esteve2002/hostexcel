"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.detail) {
          if (typeof data.detail === "string") {
            if (data.detail.includes("Credenciales")) {
              setErrors({ general: "Email o contraseña incorrectos. Verifica tus datos." });
            } else {
              setErrors({ general: data.detail });
            }
          } else {
            setErrors({ general: "Error al iniciar sesión" });
          }
        } else {
          setErrors({ general: "Error al iniciar sesión. Inténtalo de nuevo." });
        }
      } else {
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        router.push("/");
      }
    } catch (err) {
      setErrors({ general: "Error de conexión. Verifica tu internet e inténtalo de nuevo." });
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FAFAFA",
    }}>
      <div style={{
        background: "white",
        padding: 40,
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        width: "100%",
        maxWidth: 400,
      }}>
        <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>
          Bienvenido a HostExcel
        </h1>
        <p style={{ marginBottom: 28, color: "#888", fontSize: 14 }}>
          Inicia sesión para continuar
        </p>

        {errors.general && (
          <div style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "#fff0f0",
            border: "1px solid #f5c6c6",
            borderRadius: 8,
            color: "#c0392b",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            ❌ {errors.general}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: errors.email ? "#c0392b" : "#444" }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            onBlur={() => {
              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setErrors({ ...errors, email: "Formato inválido" });
              }
            }}
            placeholder="tu@restaurante.com"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              marginBottom: 4,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${errors.email ? "#f5c6c6" : "#ddd"}`,
              fontSize: 14,
              boxSizing: "border-box",
              background: errors.email ? "#fff0f0" : "white",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {errors.email && (
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#c0392b" }}>{errors.email}</p>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: errors.password ? "#c0392b" : "#444" }}>
            Contraseña *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            placeholder="••••••••"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              marginBottom: 4,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${errors.password ? "#f5c6c6" : "#ddd"}`,
              fontSize: 14,
              boxSizing: "border-box",
              background: errors.password ? "#fff0f0" : "white",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {errors.password && (
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#c0392b" }}>{errors.password}</p>
          )}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#aaa" : "#008A0E",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>

        <p style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 14,
          color: "#666",
        }}>
          ¿No tienes cuenta?{" "}
          <a
            href="/register"
            style={{ color: "#008A0E", fontWeight: 600, textDecoration: "none" }}
          >
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
