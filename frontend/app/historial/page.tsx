"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";

interface Upload {
  id: string;
  filename: string;
  excel_type: "escandallo" | "inventario" | "proveedores" | "ventas";
  uploaded_at: string;
  success: boolean;
  error_message: string | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
   ventas: { label: "Ventas", icon: "📈", color: "var(--secondary)" },
   inventario: { label: "Inventario", icon: "📦", color: "var(--primary)" },
   escandallo: { label: "Escandallo", icon: "🔄", color: "var(--secondary)" },
   proveedores: { label: "Proveedores", icon: "🏢", color: "var(--primary)" },
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

    const fetchUploads = async () => {
      try {
        const res = await fetch(`/api/historial/uploads`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
          } else {
            const errorMessage = await extractErrorMessage(res);
            setError(errorMessage);
          }
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        setUploads(data || []);
        setLoading(false);
      } catch (err) {
        setError(extractNetworkErrorMessage(err));
        setLoading(false);
      }
    };

    fetchUploads();
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
            border: "4px solid var(--border-light)",
            borderTopColor: "var(--secondary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: 16, margin: 0 }}>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell-compact stack-lg">
      <div className="page-hero" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-primary)" }}>
              <span style={{ 
                fontSize: 36,
                color: "var(--primary)",
              }}>📋</span>
              Historial de Subidas
            </h1>
            <p className="page-subtitle" style={{ marginLeft: 48 }}>
              Gestiona y revisa todas tus subidas de archivos Excel
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="ghost-button"
          >
            ← Volver
          </button>
        </div>

        {error && (
          <div className="section-card section-card--pad" style={{ marginBottom: 0, color: "var(--primary)", display: "flex", alignItems: "center", gap: 12, background: "rgba(188,75,47,0.08)" }}>
            <span style={{ fontSize: 24 }}>❌</span>
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="metric-grid metric-grid-3">
          <div className="section-card section-card--pad metric-card">
            <div className="metric-card__label">Total Subidas</div>
            <div className="metric-card__value" style={{ fontSize: 32 }}>{stats.total}</div>
          </div>

          <div className="section-card section-card--pad metric-card"
          >
            <div className="metric-card__label">Exitosas</div>
            <div className="metric-card__value" style={{ fontSize: 32, color: "var(--secondary)" }}>{stats.successful}</div>
          </div>

          <div className="section-card section-card--pad metric-card"
          >
            <div className="metric-card__label">Fallidas</div>
            <div className="metric-card__value" style={{ fontSize: 32, color: "var(--primary)" }}>{stats.failed}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="section-card section-card--pad stack-lg">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            Filtros
          </h2>

          {/* Filtro por tipo */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
              Tipo de Excel:
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(TYPE_LABELS).map(([type, config]) => (
                <label
                  key={type}
                  className="filter-chip"
                  style={{
                    cursor: "pointer",
                    borderColor: selectedTypes.includes(type) ? config.color : "var(--border-light)",
                    background: selectedTypes.includes(type) ? `${config.color}12` : undefined,
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
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                📅 Desde:
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 0 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#008A0E"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
                📅 Hasta:
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 0 }}
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
        <div className="section-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-light)", background: "rgba(255,248,236,0.7)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              Resultados ({filteredUploads.length})
            </h2>
          </div>

          {filteredUploads.length === 0 ? (
              <div className="subtle-list" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📭</div>
                <p style={{ fontSize: 16, margin: 0, fontWeight: 500, color: "var(--text-secondary)" }}>
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
                  <tr style={{ background: "rgba(255,248,236,0.7)" }}>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Archivo
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Tipo
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Fecha
                    </th>
                    <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
                        background: index % 2 === 0 ? "rgba(255,252,246,0.9)" : "rgba(255,248,236,0.7)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(37,78,75,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = index % 2 === 0 ? "rgba(255,252,246,0.9)" : "rgba(255,248,236,0.7)";
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
                          <td style={{ padding: "16px 20px", fontSize: 14, color: "var(--text-secondary)" }}>
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
                                background: "var(--secondary)",
                                  borderRadius: "50%",
                                boxShadow: "0 0 8px rgba(37, 78, 75, 0.35)",
                                }} />
                                <span style={{ color: "var(--secondary)", fontWeight: 600, fontSize: 13 }}>
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
                                    background: "var(--primary)",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 8px rgba(188, 75, 47, 0.28)",
                                  }}
                                />
                                <span
                                  style={{
                                    color: "var(--primary)",
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
