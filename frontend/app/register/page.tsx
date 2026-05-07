"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !nombre) {
      return setError("Email, contraseña y nombre son obligatorios");
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nombre_restaurante: nombre,
          telefono,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Error al registrarse");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch {
      setError("Error de conexión con el servidor");
    }

    setLoading(false);
  };

  if (success) {
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
          padding: "40px 48px",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          textAlign: "center",
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: "#008A0E", marginBottom: 8 }}>¡Registro exitoso!</h2>
          <p style={{ color: "#666", fontSize: 14 }}>
            Redirigiendo al login...
          </p>
        </div>
      </div>
    );
  }

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
          Registro - HostExcel
        </h1>
        <p style={{ marginBottom: 28, color: "#888", fontSize: 14 }}>
          Crea tu cuenta de restaurante
        </p>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Nombre del Restaurante</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Mi Restaurante"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 16,
            padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
            fontSize: 14, boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@restaurante.com"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 16,
            padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
            fontSize: 14, boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 16,
            padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
            fontSize: 14, boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Teléfono (opcional)</label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+34 600 000 000"
          style={{
            display: "block", width: "100%", marginTop: 6, marginBottom: 24,
            padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
            fontSize: 14, boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{
            marginBottom: 16, padding: "10px 14px",
            background: "#fff0f0", border: "1px solid #f5c6c6",
            borderRadius: 8, color: "#c0392b", fontSize: 13,
          }}>
            ❌ {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: loading ? "#aaa" : "#008A0E",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>

        <p style={{
          textAlign: "center", marginTop: 20, fontSize: 14, color: "#666"
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
