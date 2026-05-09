"use client";
import { useState, useEffect, useRef } from "react";
import * as XLSX from 'xlsx';
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";
import {
  previewExcel,
  processExcel,
  type ExcelType,
  normalizeColumn,
  REQUIRED_COLUMNS,
  EXCEL_TYPE_LABELS,
  SYSTEM_COLUMN_LABELS,
} from "@/lib/excel";
import {
  TPV_PRESETS,
  fetchMappings,
  saveMappingsBatch,
  suggestColumnMapping,
  type TpvPreset,
} from "@/lib/columnMapper";

export default function SubirExcelPage() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<string | null>(null);

  const [preview, setPreview] = useState<{
    columns: string[];
    data: any[];
    suggestedType: ExcelType | null;
    missingColumns: string[];
  } | null>(null);

  const [showMapping, setShowMapping] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedTpv, setSelectedTpv] = useState<string>('');

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub);
      } catch {}
    }
  }, []);

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
    fecha: "Fecha",
    cantidad_vendida: "Cantidad Vendida",
    precio_unitario: "Precio Unitario",
    total: "Total",
    stock_actual: "Stock Actual",
    stock_minimo: "Stock Mínimo",
    fecha_ultima_compra: "Última Compra",
  };

  const cleanAll = () => {
    setError(null);
    setFile(null);
    setResult(null);
    setDuplicado(null);
    setPreview(null);
    setShowMapping(false);
    setMapping({});
    setSelectedTpv('');
  };

  const handleFileSelect = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setDuplicado(null);
    setShowMapping(false);
    setMapping({});
    setPreview(null);
    setSelectedTpv('');

    if (!selectedFile) return;

    try {
      const buffer = await selectedFile.arrayBuffer();
      const { columns, data, suggestedType, suggestedMapping, missingColumns } = previewExcel(buffer);

      const userId_ = userId;
      if (suggestedType && userId_) {
        const existingMappings = await fetchMappings(userId_, suggestedType);
        if (existingMappings.length > 0) {
          const savedMapping: Record<string, string> = {};
          for (const m of existingMappings) {
            savedMapping[m.original_column] = m.mapped_column;
          }
          const mappedCols = columns.map(c => savedMapping[c] || c);
          try {
            const tipo = detectTypeFromColumns(mappedCols);
            if (tipo) {
              setPreview({ columns, data, suggestedType: tipo, missingColumns: [] });
              setMapping(savedMapping);
              return;
            }
          } catch {}
        }
      }

      setPreview({ columns, data, suggestedType, missingColumns });

      if (suggestedType && missingColumns.length > 0) {
        setMapping(suggestedMapping);
        setShowMapping(true);
      } else if (!suggestedType) {
        setMapping(suggestedMapping);
        setShowMapping(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al leer el archivo');
    }
  };

  const detectTypeFromColumns = (cols: string[]): ExcelType | null => {
    const norm = cols.map(normalizeColumn);
    const s = (v: string) => norm.includes(v);
    if (s('producto') && s('ingrediente') && s('cantidad') && s('unidad') && s('precio_unidad')) return 'escandallo';
    if (s('proveedor') && s('cif') && s('email') && s('telefono') && s('direccion')) return 'proveedores';
    if (s('fecha') && s('producto') && s('cantidad_vendida') && s('precio_unitario') && s('total')) return 'ventas';
    if (s('producto') && s('stock_actual') && s('stock_minimo') && s('fecha_ultima_compra')) return 'inventario';
    return null;
  };

  const handleTpvChange = (tpvName: string) => {
    setSelectedTpv(tpvName);
    if (!tpvName || !preview) return;

    const preset = TPV_PRESETS.find(p => p.name === tpvName);
    if (!preset) return;

    const newMapping: Record<string, string> = {};
    const required = preview.suggestedType ? REQUIRED_COLUMNS[preview.suggestedType] : [];

    for (const col of preview.columns) {
      const norm = normalizeColumn(col);
      let mapped = preset.mappings[norm] || '';
      if (!mapped) {
        for (const [key, val] of Object.entries(preset.mappings)) {
          if (norm.includes(key) || key.includes(norm)) {
            mapped = val;
            break;
          }
        }
      }
      if (mapped && required.includes(mapped as any)) {
        newMapping[col] = mapped;
      }
    }

    const autoSuggest = suggestColumnMapping(preview.columns, preview.suggestedType || 'ventas');
    for (const [col, mapped] of Object.entries(autoSuggest)) {
      if (!newMapping[col]) {
        newMapping[col] = mapped;
      }
    }

    setMapping(newMapping);
  };

  const handleMappingChange = (originalCol: string, mappedCol: string) => {
    setMapping(prev => {
      const next = { ...prev };
      if (mappedCol) {
        next[originalCol] = mappedCol;
      } else {
        delete next[originalCol];
      }
      return next;
    });
  };

  const handleStartUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDuplicado(null);
    setShowMapping(false);

    const formData = new FormData();
    formData.append("file", file);

    if (Object.keys(mapping).length > 0) {
      formData.append("mapping", JSON.stringify(mapping));
    }

    try {
      const res = await fetch(`/api/excel/upload?save=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (res.status === 409) {
        const data = await res.json();
        setDuplicado(data.detail || data.error || "Este archivo ya fue subido anteriormente");
      } else if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setError(errorMessage);
      } else {
        const data = await res.json();
        setResult(data);

        if (userId && preview?.suggestedType && Object.keys(mapping).length > 0) {
          try {
            await saveMappingsBatch(userId, preview.suggestedType, mapping);
          } catch {}
        }
      }
    } catch (err) {
      setError(extractNetworkErrorMessage(err));
    }
    setLoading(false);
  };

  const handleForce = async () => {
    if (!file) return;
    setLoading(true);
    setDuplicado(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("force", "true");

    if (Object.keys(mapping).length > 0) {
      formData.append("mapping", JSON.stringify(mapping));
    }

    try {
      const res = await fetch(`/api/excel/upload?force=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        setError(errorMessage);
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      setError(extractNetworkErrorMessage(err));
    }
    setLoading(false);
  };

  const columns =
    result?.data && result.data.length > 0 ? Object.keys(result.data[0]) : [];

  const requiredCols = preview?.suggestedType
    ? [...REQUIRED_COLUMNS[preview.suggestedType]]
    : [];

  const unmappedCols = preview
    ? preview.columns.filter(c => !mapping[c])
    : [];

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 0" }}>
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
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
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

        {preview && !showMapping && (
          <div style={{
            marginTop: 16,
            padding: "16px 20px",
            background: preview.missingColumns.length === 0 && preview.suggestedType ? "rgba(0, 138, 14, 0.05)" : "#fff8e1",
            borderRadius: 12,
            border: `1px solid ${preview.missingColumns.length === 0 && preview.suggestedType ? "#008A0E" : "#ffe082"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#333" }}>
                  {preview.suggestedType
                    ? `Tipo detectado: ${EXCEL_TYPE_LABELS[preview.suggestedType]}`
                    : "No se pudo detectar automáticamente el tipo de Excel"}
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#666" }}>
                  Columnas: {preview.columns.join(", ")}
                </p>
                {preview.missingColumns.length > 0 && preview.suggestedType && (
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#c0392b" }}>
                    Faltan: {preview.missingColumns.join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowMapping(true)}
                style={{
                  padding: "8px 16px",
                  background: preview.missingColumns.length > 0 ? "linear-gradient(135deg, #293AFF 0%, #1A28CC 100%)" : "transparent",
                  color: preview.missingColumns.length > 0 ? "white" : "#293AFF",
                  border: preview.missingColumns.length > 0 ? "none" : "1px solid #293AFF",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {preview.missingColumns.length > 0 ? "Mapear columnas" : "Ajustar mapping"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button
          onClick={handleStartUpload}
          disabled={loading || !file || (showMapping && unmappedCols.length > 0)}
          style={{
            flex: 1,
            padding: "14px 28px",
            background: loading || !file || (showMapping && unmappedCols.length > 0)
              ? "#aaa"
              : "linear-gradient(135deg, #008A0E 0%, #006607 100%)",
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
              Subiendo...
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

      {error && (
        <div style={{
          marginBottom: 24,
          padding: "20px 24px",
          background: "#fff0f0",
          border: "1px solid #f5c6c6",
          borderRadius: 12,
          color: "#c0392b",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>❌</span>
            <div>
              <strong style={{ fontSize: 15 }}>Error:</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

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

      {showMapping && preview && (
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
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 32,
              maxWidth: 640,
              width: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
              🔄 Mapear columnas
            </h3>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>
              Asigna las columnas de tu Excel a los campos del sistema.
              {preview.suggestedType && (
                <> Tipo detectado: <strong>{EXCEL_TYPE_LABELS[preview.suggestedType]}</strong></>
              )}
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>
                TPV / Software de gestión
              </label>
              <select
                value={selectedTpv}
                onChange={(e) => handleTpvChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 14,
                  background: "white",
                }}
              >
                <option value="">Sin TPV específico (detección automática)</option>
                {TPV_PRESETS.filter(p => p.name !== 'custom').map(p => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#888" }}>
                Selecciona tu TPV para rellenar automáticamente el mapeo
              </p>
            </div>

            <div style={{ background: "#f5f5f5", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 12, color: "#888", fontWeight: 600, fontSize: 13, width: "40%" }}>Tu Excel</th>
                    <th style={{ textAlign: "left", paddingBottom: 12, color: "#888", fontWeight: 600, fontSize: 13, width: "40%" }}>Campo del sistema</th>
                    <th style={{ textAlign: "center", paddingBottom: 12, color: "#888", fontWeight: 600, fontSize: 13, width: "20%" }}>Obligatorio</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((col) => {
                    const mapped = mapping[col] || '';
                    const isRequired = requiredCols.includes(mapped);
                    const isMissing = requiredCols.includes(mapped);
                    return (
                      <tr key={col}>
                        <td style={{ padding: "6px 8px", color: "#333", fontWeight: 500 }}>
                          {col}
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <select
                            value={mapped}
                            onChange={(e) => handleMappingChange(col, e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: 6,
                              border: `1px solid ${mapped ? "#008A0E" : "#ddd"}`,
                              fontSize: 13,
                              background: mapped ? "rgba(0, 138, 14, 0.05)" : "white",
                            }}
                          >
                            <option value="">— No usar —</option>
                            {requiredCols.map((rc) => (
                              <option key={rc} value={rc}>
                                {SYSTEM_COLUMN_LABELS[rc] || rc}
                              </option>
                            ))}
                            {mapped && !requiredCols.includes(mapped) && (
                              <option value={mapped}>{SYSTEM_COLUMN_LABELS[mapped] || mapped}</option>
                            )}
                          </select>
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>
                          {requiredCols.includes(mapped) ? (
                            <span style={{ color: "#008A0E", fontSize: 16 }}>✓</span>
                          ) : requiredCols.includes(col) || preview.missingColumns.includes(normalizeColumn(col)) ? (
                            <span style={{ color: "#c0392b", fontSize: 13 }}>⚠️</span>
                          ) : (
                            <span style={{ color: "#ccc" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              padding: 12,
              background: unmappedCols.length > 5 ? "#fff8e1" : "rgba(0, 138, 14, 0.05)",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              color: unmappedCols.length > 5 ? "#7a5a00" : "#008A0E",
            }}>
              {unmappedCols.length > 0
                ? `${unmappedCols.length} columna(s) sin mapear: ${unmappedCols.join(", ")}`
                : "Todas las columnas están mapeadas correctamente"}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowMapping(false)}
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
              <button
                onClick={() => setShowMapping(false)}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #008A0E 0%, #006607 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)",
                }}
              >
                ✓ Confirmar mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
