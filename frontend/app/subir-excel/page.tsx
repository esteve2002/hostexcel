"use client";
import { useState, useEffect } from "react";

export default function SubirExcelPage() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingInfo, setMappingInfo] = useState<{ original: string; mapeado: string }[]>([]);

  useEffect(() => setMounted(true), []);

  const hasContent = !!(file || result || error || duplicado);

  const COLUMN_LABELS: Record<string, string> = {
    proveedor: "Proveedor",
    cif: "CIF",
    email: "Email",
    telefono: "Teléfono",
    direccion: "Dirección",
    producto: "Producto",
    ingrediente: "Ingrediente",
    cantidad: "Cantidad",
    unidad: "Unidad",
    precio_unidad: "Precio/Unidad",
  };

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

  const cleanAll = () => {
    setError(null);
    setFile(null);
    setShowMappingModal(false);
    setResult(null);
    setDuplicado(null);
  };

  const handleUpload = async () => {
    if (!file) return setError("Necesitas proporcionar un Excel a la app");
    setLoading(true);
    setError(null);
    setResult(null);
    setDuplicado(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/excel/upload?save=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();

      if (res.status === 409) {
        setDuplicado(data.detail);
      } else if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Error desconocido");
      } else {
        setResult(data);
        if (data.data && data.data.length > 0) {
          const cols = Object.keys(data.data[0]);
          const mapeadas = cols
            .filter((col) => col.includes("_") || col !== col.toLowerCase())
            .map((col) => ({
              original: col.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
              mapeado: COLUMN_LABELS[col] || col,
            }));
          if (mapeadas.length > 0) {
            setMappingInfo(mapeadas);
            setShowMappingModal(true);
          }
        }
      }
    } catch {
      setError("Error de conexión con el servidor");
    }
    setLoading(false);
  };

  const handleForce = async () => {
    if (!file) return;
    setLoading(true);
    setDuplicado(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/excel/upload?force=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Error desconocido");
      } else {
        setResult(data);
      }
    } catch {
      setError("Error de conexión con el servidor");
    }
    setLoading(false);
  };

  const columns =
    result?.data && result.data.length > 0 ? Object.keys(result.data[0]) : [];

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1a1a2e", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: 48, 
            height: 48, 
            background: "linear-gradient(135deg, #008A0E 0%, #293AFF 100%)", 
            borderRadius: 12, 
            fontSize: 24,
            boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)" 
          }}>
            📤
          </span>
          SUBIDA DE EXCELS
        </h1>
        <p style={{ color: "#666", fontSize: 15, marginTop: 8, marginLeft: 60 }}>
          Sube tu archivo Excel para analizar y gestionar los datos de tu restaurante
        </p>
      </div>

      {/* Dropzone Card */}
      <div style={{ 
        background: "white", 
        borderRadius: 16, 
        padding: 40, 
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)", 
        marginBottom: 24,
        border: "1px solid #eee"
      }}>
        <label
          htmlFor="fileInput"
          style={{
            display: "block",
            padding: "60px 40px",
            border: `3px dashed ${file ? "#008A0E" : "#ddd"}`,
            borderRadius: 16,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            background: file ? "rgba(0, 138, 14, 0.05)" : "#fafafa",
          }}
          onMouseEnter={(e) => {
            if (!file) {
              (e.currentTarget as HTMLElement).style.borderColor = "#008A0E";
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 138, 14, 0.05)";
            }
          }}
          onMouseLeave={(e) => {
            if (!file) {
              (e.currentTarget as HTMLElement).style.borderColor = "#ddd";
              (e.currentTarget as HTMLElement).style.background = "#fafafa";
            }
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {file ? "✅" : "📂"}
          </div>
          <p style={{ fontSize: 18, color: "#333", fontWeight: 600, marginBottom: 8 }}>
            {file ? "Archivo seleccionado" : "Arrastra un archivo o haz clic aquí"}
          </p>
          <p style={{ fontSize: 14, color: "#888" }}>
            Formatos soportados: .xlsx, .xls
          </p>
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {file && (
          <div style={{
            marginTop: 20,
            padding: "16px 20px",
            background: "rgba(0, 138, 14, 0.1)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid rgba(0, 138, 14, 0.2)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: "#008A0E", fontSize: 15 }}>{file.name}</p>
                <p style={{ margin: 0, color: "#666", fontSize: 13, marginTop: 2 }}>
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: 20,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            flex: 1,
            padding: "14px 28px",
            background: loading || !file ? "#aaa" : "linear-gradient(135deg, #008A0E 0%, #006607 100%)",
            color: "white",
            borderRadius: 10,
            border: "none",
            cursor: loading || !file ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 600,
            transition: "all 0.2s ease",
            boxShadow: loading || !file ? "none" : "0 4px 12px rgba(0, 138, 14, 0.3)",
          }}
          onMouseEnter={(e) => {
            if (!loading && file) {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0, 138, 14, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && file) {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0, 138, 14, 0.3)";
            }
          }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ 
                display: "inline-block", 
                width: 20, 
                height: 20, 
                border: "3px solid rgba(255,255,255,0.3)", 
                borderTopColor: "white", 
                borderRadius: "50%", 
                animation: "spin 1s linear infinite" 
              }}></span>
              Procesando...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>🚀</span> SUBIR EXCEL
            </span>
          )}
        </button>

        <button
          onClick={cleanAll}
          disabled={!hasContent}
          style={{
            padding: "14px 28px",
            background: !hasContent ? "#aaa" : "white",
            color: !hasContent ? "white" : "#293AFF",
            borderRadius: 10,
            border: !hasContent ? "none" : "2px solid #293AFF",
            cursor: !hasContent ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 600,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (hasContent) {
              (e.currentTarget as HTMLElement).style.background = "rgba(41, 58, 255, 0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (hasContent) {
              (e.currentTarget as HTMLElement).style.background = "white";
            }
          }}
        >
          🧹 LIMPIAR
        </button>
      </div>

      {/* Banner duplicado */}
      {duplicado && (
        <div style={{
          marginBottom: 24,
          padding: "20px 24px",
          background: "#fff8e1",
          border: "1px solid #ffe082",
          borderRadius: 12,
          color: "#7a5a00",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: 600, fontSize: 15 }}>Datos existentes detectados</p>
              <p style={{ margin: "0 0 16px 0", fontSize: 14 }}>{duplicado}</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleForce}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #293AFF 0%, #1A28CC 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    boxShadow: "0 4px 12px rgba(41, 58, 255, 0.3)",
                  }}
                >
                  🔄 Sobreescribir
                </button>
                <button
                  onClick={() => setDuplicado(null)}
                  style={{
                    padding: "10px 24px",
                    background: "white",
                    color: "#666",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 24,
          padding: "20px 24px",
          background: "#fff0f0",
          border: "1px solid #f5c6c6",
          borderRadius: 12,
          color: "#c0392b",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>❌</span>
            <div>
              <strong style={{ fontSize: 15 }}>Error:</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: 14 }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner éxito */}
      {result && (
        <div style={{
          marginBottom: 24,
          padding: "20px 24px",
          background: "rgba(0, 138, 14, 0.1)",
          border: "1px solid #008A0E",
          borderRadius: 12,
          color: "#008A0E",
          fontWeight: 600,
          fontSize: 15,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              Archivo subido correctamente — Tipo detectado:{" "}
              <span style={{ textTransform: "capitalize", fontWeight: 700 }}>{result.tipo}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      {result?.data && result.data.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#1a1a2e" }}>
            📊 Datos procesados
          </h2>
          <div style={{ 
            overflowX: "auto", 
            borderRadius: 12, 
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  {columns.map((col) => (
                    <th key={col} style={{
                      padding: "14px 18px",
                      textAlign: "left",
                      fontWeight: 600,
                      borderBottom: "2px solid #e0e0e0",
                      whiteSpace: "nowrap",
                      color: "#333",
                    }}>
                      {COLUMN_LABELS[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row: any, i: number) => (
                  <tr key={i} style={{ 
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    transition: "background 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(0, 138, 14, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "white" : "#fafafa";
                  }}
                  >
                    {columns.map((col) => (
                      <td key={col} style={{
                        padding: "12px 18px",
                        borderBottom: "1px solid #f0f0f0",
                        color: "#444",
                      }}>
                        {row[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "#999" }}>
            {result.data.length} registros cargados
          </p>
        </div>
      )}

      {/* Modal mapping */}
      {showMappingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowMappingModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
              🔄 Columnas normalizadas automáticamente
            </h3>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
              Las siguientes columnas de tu Excel fueron renombradas para ser compatibles con el sistema:
            </p>
            <div style={{ 
              background: "#f5f5f5", 
              borderRadius: 12, 
              padding: 16,
              marginBottom: 20 
            }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 12, color: "#888", fontWeight: 600, fontSize: 13 }}>Tu Excel</th>
                    <th style={{ textAlign: "left", paddingBottom: 12, color: "#888", fontWeight: 600, fontSize: 13 }}>Sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingInfo.map((m, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 0", color: "#c0392b", fontSize: 14 }}>{m.original}</td>
                      <td style={{ padding: "8px 0", color: "#008A0E", fontWeight: 500, fontSize: 14 }}>→ {m.mapeado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: "#888", fontStyle: "italic" }}>
              Tus datos se han guardado correctamente.
            </p>
            <button
              onClick={() => setShowMappingModal(false)}
              style={{
                marginTop: 20,
                padding: "12px 32px",
                background: "linear-gradient(135deg, #008A0E 0%, #006607 100%)",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 15,
                width: "100%",
                boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)",
              }}
            >
              ✓ Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
