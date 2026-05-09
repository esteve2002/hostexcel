"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";

type ValidationErrors = {
  email?: string;
  password?: string;
  nombre?: string;
  general?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "El formato del email no es válido (ej: usuario@dominio.com)";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    } else if (password.length > 50) {
      newErrors.password = "La contraseña no puede superar los 50 caracteres";
    }

    if (!nombre.trim()) {
      newErrors.nombre = "El nombre del restaurante es obligatorio";
    } else if (nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = "El nombre no puede superar los 100 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          nombre_restaurante: nombre.trim(),
          telefono: telefono.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        
        if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("ya existe")) {
          setErrors({ email: errorMessage });
        } else if (errorMessage.toLowerCase().includes("contraseña") || errorMessage.toLowerCase().includes("password")) {
          setErrors({ password: errorMessage });
        } else if (errorMessage.toLowerCase().includes("nombre") || errorMessage.toLowerCase().includes("restaurante")) {
          setErrors({ nombre: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setErrors({ general: extractNetworkErrorMessage(err) });
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAFA",
      }}>
        <div style={{
          background: "white",
          padding: "40px 48px",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          textAlign: "center",
          maxWidth: 400,
        }}>
          <div style={{
            width: 64,
            height: 64,
            background: "linear-gradient(135deg, #008A0E 0%, #293AFF 100%)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 32,
            boxShadow: "0 4px 16px rgba(0, 138, 14, 0.3)",
          }}>
            ✅
          </div>
          <h2 style={{ color: "#008A0E", marginBottom: 8 }}>¡Registro exitoso!</h2>
          <p style={{ color: "#666", fontSize: 14 }}>
            Tu cuenta ha sido creada. Redirigiendo al login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#FAFAFA",
      padding: 20,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
        <div
          style={{
            width: 80,
            height: 80,
            background: "linear-gradient(135deg, #008A0E 0%, #293AFF 100%)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 40,
            boxShadow: "0 8px 32px rgba(0, 138, 14, 0.3)",
            marginBottom: 16,
          }}
        >
          H
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a2e", margin: 0, letterSpacing: "0.5px" }}>
          HostExcel
        </h1>
        <p style={{ color: "#888", fontSize: 15, marginTop: 8 }}>
          Crea tu cuenta de restaurante
        </p>
      </div>

      <div style={{
        background: "white",
        padding: 40,
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        width: "100%",
        maxWidth: 400,
      }}>
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
          <label style={{ fontSize: 13, fontWeight: 600, color: errors.nombre ? "#c0392b" : "#444" }}>
            Nombre del Restaurante *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (errors.nombre) setErrors({ ...errors, nombre: undefined });
            }}
            onBlur={() => {
              if (nombre && nombre.trim().length < 2) {
                setErrors({ ...errors, nombre: "El nombre debe tener al menos 2 caracteres" });
              }
            }}
            placeholder="Mi Restaurante"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              marginBottom: 4,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${errors.nombre ? "#f5c6c6" : "#ddd"}`,
              fontSize: 14,
              boxSizing: "border-box",
              background: errors.nombre ? "#fff0f0" : "white",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />
          {errors.nombre && (
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#c0392b" }}>{errors.nombre}</p>
          )}
        </div>

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
          />
          {errors.email && (
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#c0392b" }}>{errors.email}</p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
            Contraseña * (mínimo 6 caracteres)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            placeholder="••••••••"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              marginBottom: 4,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={handleRegister}
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
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>

        <p style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 14,
          color: "#666",
        }}>
          ¿Ya tienes cuenta?{" "}
          <a
            href="/login"
            style={{ color: "#008A0E", fontWeight: 600, textDecoration: "none" }}
          >
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
