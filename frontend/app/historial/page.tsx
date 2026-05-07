"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Upload {
  id: string;
  filename: string;
  excel_type: "escandallo" | "inventario" | "proveedores" | "ventas";
  uploaded_at: string;
  success: boolean;
  error_message: string | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ventas: { label: "Ventas", icon: "📈", color: "#008A0E" },
  inventario: { label: "Inventario", icon: "📦", color: "#293AFF" },
  escandallo: { label: "Escandallo", icon: "🔄", color: "#008A0E" },
  proveedores: { label: "Proveedores", icon: "🏢", color: "#293AFF" },
};

export default function HistorialPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "escandallo",
    "inventario",
    "proveedores",
    "ventas",
  ]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:8000/historial/uploads", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUploads(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Error cargando el historial");
        setLoading(false);
      });
  }, []);

  // Filtrar uploads
  const filteredUploads = uploads.filter((upload) => {
    // Filtro por tipo
    if (!selectedTypes.includes(upload.excel_type)) {
      return false;
    }

    // Filtro por fecha
    const uploadDate = new Date(upload.uploaded_at);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (uploadDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (uploadDate > toDate) return false;
    }

    return true;
  });

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes(["escandallo", "inventario", "proveedores", "ventas"]);
    setDateFrom("");
    setDateTo("");
  };

  const getStats = () => {
    const total = filteredUploads.length;
    const successful = filteredUploads.filter(u => u.success).length;
    const failed = total - successful;
    return { total, successful, failed };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FAFAFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: "48px 56px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            border: "4px solid #E0E0E0",
            borderTopColor: "#008A0E",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}></div>
          <p style={{ color: "#666", fontSize: 16, margin: 0 }}>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAFA",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Header con gradiente */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%)",
            borderRadius: 16,
            padding: "32px 40px",
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div>
            <h1 style={{ 
              fontSize: 32, 
              fontWeight: 700, 
              color: "white", 
              margin: 0, 
              display: "flex", 
              alignItems: "center", 
              gap: 12 
            }}>
              <span style={{ 
                fontSize: 36,
                background: "linear-gradient(135deg, #008A0E 0%, #293AFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>📋</span>
              Historial de Subidas
            </h1>
            <p style={{ color: "#b0b0b0", fontSize: 14, margin: "8px 0 0 48px" }}>
              Gestiona y revisa todas tus subidas de archivos Excel
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 24px",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 138, 14, 0.2)";
              e.currentTarget.style.borderColor = "#008A0E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            ← Volver
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #f5c6c6",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              color: "#c0392b",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>❌</span>
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, 1fr)", 
          gap: 20, 
          marginBottom: 32 
        }}>
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e0e0e0",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 138, 14, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
          >
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500 }}>Total Subidas</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#1a1a2e" }}>{stats.total}</div>
          </div>

          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e0e0e0",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 138, 14, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
          >
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500 }}>Exitosas</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#008A0E" }}>{stats.successful}</div>
          </div>

          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e0e0e0",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(41, 58, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
          >
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500 }}>Fallidas</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#293AFF" }}>{stats.failed}</div>
          </div>
        </div>

        {/* Filtros */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "28px 32px",
            marginBottom: 32,
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            border: "1px solid #e0e0e0",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            Filtros
          </h2>

          {/* Filtro por tipo */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#333" }}>
              Tipo de Excel:
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(TYPE_LABELS).map(([type, config]) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: `2px solid ${selectedTypes.includes(type) ? config.color : "#e0e0e0"}`,
                    background: selectedTypes.includes(type) ? `${config.color}15` : "white",
                    transition: "all 0.2s ease",
                    fontWeight: selectedTypes.includes(type) ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedTypes.includes(type)) {
                      e.currentTarget.style.borderColor = config.color;
                      e.currentTarget.style.background = `${config.color}08`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedTypes.includes(type)) {
                      e.currentTarget.style.borderColor = "#e0e0e0";
                      e.currentTarget.style.background = "white";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    style={{ cursor: "pointer", accentColor: config.color }}
                  />
                  <span style={{ fontSize: 16 }}>{config.icon}</span>
                  <span style={{ fontSize: 14, color: "#333" }}>{config.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtro por fecha */}
          <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>
                📅 Desde:
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#008A0E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#333" }}>
                📅 Hasta:
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#293AFF"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; }}
              />
            </div>
          </div>

          {/* Botón limpiar */}
          <button
            onClick={clearFilters}
            style={{
              padding: "10px 20px",
              background: "white",
              border: "2px solid #e0e0e0",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
              color: "#666",
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#293AFF";
              e.currentTarget.style.color = "#293AFF";
              e.currentTarget.style.background = "rgba(41, 58, 255, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.color = "#666";
              e.currentTarget.style.background = "white";
            }}
          >
            🧹 Limpiar filtros
          </button>
        </div>

        {/* Tabla de resultados */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            border: "1px solid #e0e0e0",
          }}
        >
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e0e0e0", background: "#fafafa" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              Resultados ({filteredUploads.length})
            </h2>
          </div>

          {filteredUploads.length === 0 ? (
            <div
              style={{
                padding: "60px 40px",
                textAlign: "center",
                color: "#888",
              }}
            >
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📭</div>
              <p style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>
                {uploads.length === 0
                  ? "No hay subidas registradas"
                  : "No hay subidas que coincidan con los filtros"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Archivo
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Tipo
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Fecha
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUploads.map((upload, index) => {
                    const typeConfig = TYPE_LABELS[upload.excel_type] || TYPE_LABELS.ventas;
                    return (
                      <tr
                        key={upload.id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                          background: index % 2 === 0 ? "white" : "#fafafa",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0, 138, 14, 0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = index % 2 === 0 ? "white" : "#fafafa";
                        }}
                      >
                        <td style={{ padding: "16px 20px", fontSize: 14, color: "#333", fontWeight: 500 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>📄</span>
                            <span>{upload.filename}</span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px", fontSize: 14, color: "#333" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: `${typeConfig.color}15`,
                            color: typeConfig.color,
                            fontWeight: 600,
                            fontSize: 13,
                          }}>
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", fontSize: 14, color: "#666" }}>
                          {new Date(upload.uploaded_at).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "16px 20px", fontSize: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {upload.success ? (
                              <>
                                <span style={{
                                  display: "inline-block",
                                  width: 10,
                                  height: 10,
                                  background: "#008A0E",
                                  borderRadius: "50%",
                                  boxShadow: "0 0 8px rgba(0, 138, 14, 0.4)",
                                }} />
                                <span style={{ color: "#008A0E", fontWeight: 600, fontSize: 13 }}>
                                  ✓ Éxito
                                </span>
                              </>
                            ) : (
                              <>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 10,
                                    height: 10,
                                    background: "#f44",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 8px rgba(255, 68, 68, 0.4)",
                                  }}
                                />
                                <span
                                  style={{
                                    color: "#f44",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "help",
                                    textDecoration: "underline",
                                  }}
                                  title={upload.error_message || "Error desconocido"}
                                >
                                  ✕ Error
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
