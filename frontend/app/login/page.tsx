"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const mensaje = typeof data.detail === "string"
            ? data.detail
            : "Error al iniciar sesión";
        setError(mensaje);
        }else {
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        router.push("/");
      }
    } catch {
      setError("Error de conexión con el servidor");
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
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "12px",
            background: loading ? "#aaa" : "#008A0E",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#006607"; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#008A0E"; }}
        >
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </div>
    </div>
  );
}