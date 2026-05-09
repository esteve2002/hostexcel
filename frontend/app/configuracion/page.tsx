"use client";
import { useState, useEffect, useRef } from "react";
import { extractErrorMessage } from "@/lib/errorHandler";
import {
  TPV_PRESETS,
  EXCEL_TYPE_LABELS,
  SYSTEM_COLUMN_LABELS,
  REQUIRED_COLUMNS,
  normalizeColumn,
  type ExcelType,
  type ColumnMapping,
} from "@/lib/columnMapper";
import * as XLSX from 'xlsx';

const EXCEL_TYPES: ExcelType[] = ['ventas', 'escandallo', 'inventario', 'proveedores'];

const TYPE_ICONS: Record<ExcelType, string> = {
  ventas: '📈',
  escandallo: '🧪',
  inventario: '📦',
  proveedores: '🏢',
};

export default function ConfiguracionPage() {
  const [mounted, setMounted] = useState(false);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [allMappings, setAllMappings] = useState<Record<ExcelType, ColumnMapping[]>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ExcelType>('ventas');
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'mappings' | 'tester' | 'account'>('mappings');

  const [testFile, setTestFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<{ before: string[]; after: string[]; data: any[] } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadAllMappings();
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (allMappings[activeType]) {
      setMappings(allMappings[activeType]);
    } else {
      setMappings([]);
    }
  }, [activeType, allMappings]);

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch {}
  };

  const loadAllMappings = async () => {
    setLoading(true);
    setError(null);
    try {
      const results: Record<string, ColumnMapping[]> = {};
      for (const type of EXCEL_TYPES) {
        const res = await fetch(`/api/excel/mapping?restaurante_id=${userId}&excel_type=${type}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          results[type] = data.mappings || [];
        } else {
          results[type] = [];
        }
      }
      setAllMappings(results as any);
      setMappings(results[activeType] || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar mappings');
    }
    setLoading(false);
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('¿Eliminar este mapeo?')) return;
    try {
      const res = await fetch(`/api/excel/mapping/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setError(msg);
      } else {
        setMappings(prev => prev.filter(m => m.id !== id));
        setSuccess('Mapeo eliminado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const handleAddMapping = async () => {
    const original = prompt('Nombre de la columna en tu Excel:');
    if (!original) return;
    const mapped = prompt('Campo del sistema al que mapear (ej: total, producto, fecha):');
    if (!mapped) return;

    try {
      const res = await fetch('/api/excel/mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          restaurante_id: userId,
          excel_type: activeType,
          original_column: original,
          mapped_column: mapped,
        }),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setError(msg);
      } else {
        setSuccess(`Mapeo añadido: "${original}" → "${mapped}"`);
        setTimeout(() => setSuccess(null), 3000);
        loadAllMappings();
      }
    } catch (err: any) {
      setError(err.message || 'Error al añadir mapping');
    }
  };

  const handleTestUpload = async (file: File | null) => {
    setTestFile(file);
    setTestResult(null);
    if (!file) return;

    setTestLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      const typeMappings = allMappings[activeType] || [];
      const mappingDict: Record<string, string> = {};
      for (const m of typeMappings) {
        mappingDict[m.original_column] = m.mapped_column;
      }

      const afterCols = columns.map(c => mappingDict[c] || c);
      setTestResult({ before: columns, after: afterCols, data });
    } catch (err: any) {
      setError('Error al leer el archivo de prueba: ' + err.message);
    }
    setTestLoading(false);
  };

  const exportMappings = () => {
    const exportData = JSON.stringify(allMappings, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hostexcel-mappings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Mappings exportados correctamente');
    setTimeout(() => setSuccess(null), 3000);
  };

  const importMappings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        let count = 0;
        for (const [type, mappings] of Object.entries(data)) {
          if (!EXCEL_TYPES.includes(type as ExcelType)) continue;
          for (const m of mappings as any[]) {
            await fetch('/api/excel/mapping', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`,
              },
              body: JSON.stringify({
                restaurante_id: userId,
                excel_type: type,
                original_column: m.original_column,
                mapped_column: m.mapped_column,
              }),
            });
            count++;
          }
        }
        setSuccess(`${count} mappings importados correctamente`);
        setTimeout(() => setSuccess(null), 3000);
        loadAllMappings();
      } catch (err: any) {
        setError('Error al importar: ' + err.message);
      }
    };
    input.click();
  };

  const getCoverage = (type: ExcelType): { mapped: number; total: number; percent: number } => {
    const required = REQUIRED_COLUMNS[type] as readonly string[];
    const typeMaps = allMappings[type] || [];
    const mappedFields = new Set(typeMaps.map(m => m.mapped_column));
    const mapped = required.filter(c => mappedFields.has(c)).length;
    return { mapped, total: required.length, percent: required.length > 0 ? Math.round((mapped / required.length) * 100) : 0 };
  };

  const presetsForType = TPV_PRESETS.filter(p => {
    if (p.name === 'custom') return false;
    const requiredCols = REQUIRED_COLUMNS[activeType] as readonly string[];
    return requiredCols.some(c => Object.values(p.mappings).includes(c));
  });

  if (!mounted) return null;

  return (
    <div className="page-shell-compact stack-lg">
      <div className="page-hero" style={{ marginBottom: 0 }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)",
            borderRadius: 12,
            fontSize: 24,
            boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)"
          }}>
            ⚙️
          </span>
          CONFIGURACIÓN
        </h1>
      </div>

      {error && (
        <div style={{
          marginBottom: 24, padding: "16px 20px", background: "rgba(188,75,47,0.08)",
          border: "1px solid rgba(188,75,47,0.18)", borderRadius: 12, color: "var(--primary)", fontSize: 14,
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: 24, padding: "16px 20px", background: "rgba(37,78,75,0.1)",
          border: "1px solid var(--secondary)", borderRadius: 12, color: "var(--secondary)", fontSize: 14, fontWeight: 600,
        }}>
          ✅ {success}
        </div>
      )}

      {/* Tabs principales */}
      <div className="pill-tabs">
        {([
          { key: 'mappings', label: 'Mappings', icon: '🗺️' },
          { key: 'tester', label: 'Probador', icon: '🧪' },
          { key: 'account', label: 'Mi cuenta', icon: '👤' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pill-tab ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'mappings' && (
        <>
          {/* Coverage cards */}
          <div className="metric-grid metric-grid-4">
            {EXCEL_TYPES.map(type => {
              const cov = getCoverage(type);
              return (
                <div
                  key={type}
                  onClick={() => setActiveType(type)}
                  className="section-card section-card--pad"
                  style={{ padding: 16, cursor: "pointer", borderColor: activeType === type ? "var(--primary)" : "var(--border-light)" }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{TYPE_ICONS[type]}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    {EXCEL_TYPE_LABELS[type]}
                  </div>
                  <div style={{
                    marginTop: 8, height: 6, background: "rgba(80,55,42,0.1)", borderRadius: 3, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${cov.percent}%`,
                      background: cov.percent === 100 ? "var(--secondary)" : cov.percent >= 60 ? "var(--accent)" : "var(--primary)",
                      borderRadius: 3, transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {cov.mapped}/{cov.total} campos
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mapping management */}
          <div className="section-card section-card--pad stack-lg">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  {TYPE_ICONS[activeType]} Mappings de {EXCEL_TYPE_LABELS[activeType]}
                </h2>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: 13 }}>
                  {mappings.length} mapeo{mappings.length !== 1 ? 's' : ''} guardado{mappings.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="page-toolbar">
                <button onClick={exportMappings}
                  className="ghost-button"
                >
                  📤 Exportar
                </button>
                <button onClick={importMappings}
                  className="ghost-button"
                >
                  📥 Importar
                </button>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cargando mappings...</p>
            ) : mappings.length === 0 ? (
              <div className="subtle-list" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{TYPE_ICONS[activeType]}</div>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 8 }}>
                  No tienes mappings guardados para {EXCEL_TYPE_LABELS[activeType].toLowerCase()}.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                  Los mappings se crean automáticamente cuando subes un Excel y configuras las columnas en el mapeo interactivo.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  También puedes subir un Excel en la pestaña <strong>Probador</strong> para generar mappings de prueba.
                </p>
              </div>
            ) : (
              <div>
                {mappings.map((m, idx) => (
                  <div key={m.id || idx} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px",
                    borderBottom: idx < mappings.length - 1 ? "1px solid rgba(80,55,42,0.08)" : "none",
                    transition: "background 0.2s ease",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,248,236,0.7)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{
                        background: "rgba(188,75,47,0.08)", color: "var(--primary)", padding: "6px 12px",
                        borderRadius: 8, fontWeight: 600, fontSize: 14, flexShrink: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {m.original_column}
                      </div>
                      <span style={{ color: "#ccc", fontSize: 18 }}>⟶</span>
                      <div style={{
                        background: "rgba(37,78,75,0.1)", color: "var(--secondary)", padding: "6px 12px",
                        borderRadius: 8, fontWeight: 600, fontSize: 14, flexShrink: 0,
                      }}>
                        {SYSTEM_COLUMN_LABELS[m.mapped_column] || m.mapped_column}
                      </div>
                      <span style={{ color: "#aaa", fontSize: 12 }}>
                        ({m.mapped_column})
                      </span>
                    </div>
                    <button
                      onClick={() => m.id && handleDeleteMapping(m.id)}
                      style={{
                        background: "none", border: "none", color: "#ccc", cursor: "pointer",
                        fontSize: 16, padding: "6px 10px", borderRadius: 6,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(192, 57, 43, 0.1)";
                        e.currentTarget.style.color = "#c0392b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#ccc";
                      }}
                      title="Eliminar mapping"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

              <button onClick={handleAddMapping} className="accent-button" style={{ marginTop: 16 }}>
                + Añadir mapping manual
              </button>
          </div>

          {/* TPV Presets */}
          <div className="section-card section-card--pad stack-lg">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              🏪 Presets para {EXCEL_TYPE_LABELS[activeType]}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
              Estos son los mapeos típicos para cada TPV. Selecciona tu TPV al subir un Excel y se aplicarán automáticamente.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {presetsForType.map(p => (
                <div key={p.name} style={{
                  flex: "1 1 240px", borderRadius: 18,
                  padding: 16, border: "1px solid var(--border-light)",
                  background: "rgba(255, 248, 236, 0.72)",
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 0, marginBottom: 12 }}>
                    {p.label}
                  </h3>
                  {Object.entries(p.mappings).map(([original, mapped]) => (
                    <div key={original} style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                      fontSize: 13,
                    }}>
                      <span style={{ color: "var(--primary)", fontWeight: 500, flex: 1 }}>{original}</span>
                      <span style={{ color: "var(--text-muted)" }}>→</span>
                      <span style={{ color: "var(--secondary)", fontWeight: 500, flex: 1 }}>
                        {SYSTEM_COLUMN_LABELS[mapped] || mapped}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", marginTop: 16 }}>
              ¿Tu TPV no aparece? Sube un Excel, usa el mapeo interactivo, y el sistema lo recordará automáticamente.
            </p>
          </div>
        </>
      )}

      {activeTab === 'tester' && (
        <div className="section-card section-card--pad stack-lg">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            🧪 Probador de mappings
          </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            Sube un Excel de prueba para ver cómo se transformarían sus columnas con tus mappings actuales.
            No se guarda ningún dato, solo es una previsualización.
          </p>

          <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Tipo de Excel a probar
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {EXCEL_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  style={{
                    padding: "8px 16px",
                    background: activeType === type ? "var(--primary)" : "rgba(255,252,246,0.85)",
                    color: activeType === type ? "white" : "var(--text-secondary)",
                    border: "none", borderRadius: 8, cursor: "pointer",
                    fontWeight: 600, fontSize: 13, transition: "all 0.2s ease",
                  }}
                >
                  {TYPE_ICONS[type]} {EXCEL_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

            <div className="upload-dropzone" style={{ marginBottom: 20, background: testFile ? "rgba(37,78,75,0.08)" : undefined }}
              onClick={() => fileInputRef.current?.click()}
            >
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {testLoading ? '⏳' : testFile ? '✅' : '📂'}
            </div>
            <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>
              {testFile ? testFile.name : 'Sube un Excel de prueba'}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {testFile ? `${(testFile.size / 1024).toFixed(1)} KB` : 'Solo se leerán las columnas, no se guarda nada'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => handleTestUpload(e.target.files?.[0] || null)}
            />
          </div>

          {testLoading && <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Analizando archivo...</p>}

          {testResult && (
            <div>
              <div className="section-card section-card--pad" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                  🔄 Transformación de columnas
                </h3>
                <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ddd" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--primary)" }}>
                        Tu columna
                      </th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "var(--text-muted)" }}>
                        
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--secondary)" }}>
                        Se transforma a
                      </th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "var(--text-muted)", width: 80 }}>
                        Mapping
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.before.map((col, i) => {
                      const after = testResult.after[i];
                      const changed = col !== after;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{
                            padding: "10px 12px", color: "#333", fontWeight: 500,
                            fontStyle: changed ? "normal" : "italic",
                          }}>
                            {col}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#ccc" }}>
                            {changed ? '→' : '='}
                          </td>
                          <td style={{
                            padding: "10px 12px",
                            color: changed ? "var(--secondary)" : "var(--text-muted)",
                            fontWeight: changed ? 600 : 400,
                          }}>
                            {after}
                            {after && SYSTEM_COLUMN_LABELS[after] && (
                              <span style={{ color: "#aaa", fontSize: 12, marginLeft: 6 }}>
                                ({SYSTEM_COLUMN_LABELS[after]})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            {changed ? (
                              <span style={{ color: "var(--secondary)", fontSize: 16 }}>✓</span>
                            ) : (
                              <span style={{ color: "#ccc", fontSize: 12 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

                <div className="section-card section-card--pad" style={{
                  padding: 16,
                  background: testResult.after.some((c, i) => c !== testResult.before[i])
                    ? "rgba(37,78,75,0.08)" : "rgba(255,252,246,0.85)",
                }}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)" }}>
                  {testResult.after.some((c, i) => c !== testResult.before[i])
                    ? '✅ Tus mappings transformarán las columnas correctamente.'
                    : 'ℹ️ Ninguna columna necesita transformación con tus mappings actuales.'}
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                  {testResult.data.length} filas leídas • {testResult.before.length} columnas detectadas
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'account' && (
        <div className="section-card section-card--pad stack-lg">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            👤 Mi cuenta
          </h2>

          <div className="section-card section-card--pad" style={{ marginBottom: 20, background: "rgba(255,248,236,0.82)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Restaurante
                </label>
                  <p style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {userData?.nombre_restaurante || '—'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Email
                </label>
                <p style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {userData?.email || '—'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Plan
                </label>
                <p style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {userData?.plan || 'Gratuito'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Miembro desde
                </label>
                <p style={{ margin: "4px 0 0 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="section-card section-card--pad">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 12, color: "var(--text-primary)" }}>
              📊 Resumen de mappings
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {EXCEL_TYPES.map(type => {
                const cov = getCoverage(type);
                return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,252,246,0.9)", borderRadius: 14, border: "1px solid var(--border-light)" }}>
                    <span style={{ fontSize: 20 }}>{TYPE_ICONS[type]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{EXCEL_TYPE_LABELS[type]}</div>
                      <div style={{ fontSize: 12, color: cov.percent === 100 ? "var(--secondary)" : "var(--text-muted)" }}>
                        {cov.mapped}/{cov.total} campos mapeados
                      </div>
                    </div>
                      <div style={{
                        background: cov.percent === 100 ? "var(--secondary)" : cov.percent >= 60 ? "var(--accent)" : "var(--primary)",
                      color: "white", borderRadius: 20, padding: "2px 10px",
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {cov.percent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
