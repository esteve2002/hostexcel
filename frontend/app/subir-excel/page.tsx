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

const TRIAL_LIMIT = 2;

type UploadRecord = {
  success: boolean;
};

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
  const [uploadCount, setUploadCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(true);

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

  useEffect(() => {
    const loadUsage = async () => {
      setUsageLoading(true);
      try {
        const res = await fetch('/api/historial/uploads', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (res.ok) {
          const data = (await res.json()) as UploadRecord[];
          setUploadCount(data.filter((item) => item.success).length);
        }
      } finally {
        setUsageLoading(false);
      }
    };

    loadUsage();
  }, []);

  const hasContent = !!(file || result || error || duplicado);
  const trialLimitReached = uploadCount >= TRIAL_LIMIT;

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
    if (trialLimitReached) {
      setError(`Has alcanzado el límite de ${TRIAL_LIMIT} subidas de prueba. Contacta con nosotros para seguir usando la app.`);
      return;
    }
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
    if (trialLimitReached) {
      setError(`Has alcanzado el límite de ${TRIAL_LIMIT} subidas de prueba. Contacta con nosotros para seguir usando la app.`);
      return;
    }
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

  const allRequiredMapped = preview && preview.suggestedType
    ? REQUIRED_COLUMNS[preview.suggestedType].every(c => Object.values(mapping).includes(c))
    : true;

  if (!mounted) return null;

  return (
    <div className="page-shell-compact stack-lg">
      <div className="page-hero stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="code-pill status-soft" style={{ fontSize: 18 }}>📤</div>
          <div>
            <h1 className="page-title">Subida de Excels</h1>
            <p className="page-subtitle">Sube tu archivo para analizarlo, mapearlo y guardarlo sin fricción.</p>
          </div>
        </div>
      </div>

      <div className="section-card section-card--pad status-soft stack-sm">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Prueba la app con 2 Excels</p>
            <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {usageLoading ? 'Comprobando tu uso...' : `Usos de prueba: ${uploadCount}/${TRIAL_LIMIT}`}
            </p>
          </div>
          <a className="btn-secondary" href="mailto:info@hostexcel.es">Contactar para seguir</a>
        </div>
        <p className="page-subtitle" style={{ margin: 0, fontSize: 13 }}>
          Puedes subir hasta 2 Excels de prueba desde aquí. Cuando llegues al límite, tendrás que ponerte en contacto con nosotros.
        </p>
      </div>

      <div className="section-card section-card--pad stack-lg">
        <label
          htmlFor="fileInput"
          className="upload-dropzone"
          style={{
            borderColor: trialLimitReached ? 'var(--primary)' : file ? 'var(--secondary)' : undefined,
            background: trialLimitReached ? 'rgba(34,91,140,0.08)' : file ? 'rgba(31,91,87,0.08)' : undefined,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>{file ? '✅' : '📂'}</div>
          <p style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
            {trialLimitReached ? 'Límite de prueba alcanzado' : file ? 'Archivo seleccionado' : 'Arrastra un archivo o haz clic aquí'}
          </p>
          <p className="page-subtitle" style={{ margin: 0 }}>Formatos soportados: .xlsx, .xls</p>
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (trialLimitReached) {
              setError(`Has alcanzado el límite de ${TRIAL_LIMIT} subidas de prueba. Contacta con nosotros para seguir usando la app.`);
              return;
            }
            handleFileSelect(e.target.files?.[0] || null);
          }}
          disabled={trialLimitReached}
        />

        {file && (
          <div className="section-card section-card--pad status-soft" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--secondary)', fontSize: 15 }}>{file.name}</p>
                <p className="page-subtitle" style={{ margin: '2px 0 0', fontSize: 13 }}>
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="ghost-button">✕</button>
          </div>
        )}

        {preview && !showMapping && (
          <div className={`section-card section-card--pad ${preview.missingColumns.length === 0 && preview.suggestedType ? 'status-soft' : 'status-warn'}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  {preview.suggestedType
                    ? `Tipo detectado: ${EXCEL_TYPE_LABELS[preview.suggestedType]}`
                  : "No se pudo detectar automáticamente el tipo de Excel"}
                </p>
                <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Columnas: {preview.columns.join(", ")}
                </p>
                {preview.missingColumns.length > 0 && preview.suggestedType && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--primary)' }}>
                    Faltan: {preview.missingColumns.join(", ")}
                  </p>
                )}
              </div>
              <button onClick={() => setShowMapping(true)} className={preview.missingColumns.length > 0 ? 'btn-primary' : 'ghost-button'}>
                {preview.missingColumns.length > 0 ? 'Mapear columnas' : 'Ajustar mapping'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="page-toolbar">
        <button onClick={handleStartUpload} disabled={loading || !file || (showMapping && !allRequiredMapped) || trialLimitReached} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Subiendo...</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{trialLimitReached ? '🔒 LÍMITE ALCANZADO' : '🚀 SUBIR EXCEL'}</span>
          )}
        </button>

        <button onClick={cleanAll} disabled={!hasContent} className="ghost-button" style={{ paddingInline: 24 }}>🧹 LIMPIAR</button>
      </div>

      {duplicado && (
        <div className="section-card section-card--pad status-warn">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 15 }}>Datos existentes detectados</p>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>{duplicado}</p>
              <div className="page-toolbar">
                <button onClick={handleForce} className="btn-primary" disabled={trialLimitReached}>🔄 Sobreescribir</button>
                <button onClick={() => setDuplicado(null)} className="ghost-button">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="section-card section-card--pad status-error">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>❌</span>
            <div>
              <strong style={{ fontSize: 15 }}>Error:</strong>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="section-card section-card--pad status-soft">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              Archivo subido correctamente — Tipo detectado:{' '}
              <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{result.tipo}</span>
            </div>
          </div>
        </div>
      )}

      {result?.data && result.data.length > 0 && (
        <div className="section-card section-card--pad stack">
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📊 Datos procesados</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{COLUMN_LABELS[col] || col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row: any, i: number) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col} style={{ padding: '12px 18px' }}>{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>{result.data.length} registros cargados</p>
        </div>
      )}

      {showMapping && preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 18 }}>
          <div className="section-card section-card--pad stack-lg" style={{ maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22 }}>🔄 Mapear columnas</h3>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                Indica qué columna de tu Excel corresponde a cada campo del sistema.
                {preview.suggestedType && <> Tipo: <strong>{EXCEL_TYPE_LABELS[preview.suggestedType]}</strong></>}
              </p>
            </div>

            <div className="stack">
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>TPV / Software de gestión</label>
              <select value={selectedTpv} onChange={(e) => handleTpvChange(e.target.value)} className="input-field" style={{ maxWidth: 340, marginTop: 0 }}>
                <option value="">Sin TPV específico</option>
                {TPV_PRESETS.filter(p => p.name !== 'custom').map(p => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="stack">
              {requiredCols.map((sysCol) => {
                const mappedCol = Object.entries(mapping).find(([_, v]) => v === sysCol)?.[0] || '';
                const label = SYSTEM_COLUMN_LABELS[sysCol] || sysCol;
                return (
                  <div key={sysCol} className="section-card" style={{ padding: 14, background: mappedCol ? 'rgba(31,91,87,0.06)' : 'rgba(230,177,93,0.12)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div className="page-subtitle" style={{ margin: '2px 0 0', fontSize: 11 }}>{sysCol}</div>
                    </div>
                    <div style={{ color: mappedCol ? 'var(--secondary)' : 'var(--text-muted)', fontSize: 20 }}>{mappedCol ? '⟶' : '···'}</div>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <select
                        value={mappedCol}
                        onChange={(e) => {
                          const newMapping = { ...mapping };
                          const prevCol = Object.entries(newMapping).find(([_, v]) => v === sysCol)?.[0];
                          if (prevCol) delete newMapping[prevCol];
                          if (e.target.value) newMapping[e.target.value] = sysCol;
                          setMapping(newMapping);
                        }}
                        className="input-field"
                        style={{ marginTop: 0 }}
                      >
                        <option value="">— Selecciona columna —</option>
                        {preview.columns.map((col) => {
                          const alreadyUsed = Object.values(mapping).includes(sysCol) ? false : Object.values(mapping).includes(col);
                          return (
                            <option key={col} value={col} disabled={alreadyUsed}>
                              {col} {alreadyUsed ? '(ya asignada)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {mappedCol && <div className="code-pill status-soft">✓</div>}
                  </div>
                );
              })}
            </div>

            <div className={`section-card section-card--pad ${requiredCols.every(c => Object.values(mapping).includes(c)) ? 'status-soft' : 'status-warn'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{requiredCols.every(c => Object.values(mapping).includes(c)) ? '✅' : '⚠️'}</span>
                <span style={{ fontWeight: 700 }}>
                  {requiredCols.every(c => Object.values(mapping).includes(c)) ? 'Todos los campos obligatorios están mapeados' : 'Faltan campos obligatorios por mapear'}
                </span>
              </div>
              <div className="page-subtitle" style={{ marginBottom: 0, marginTop: 4 }}>
                Columnas de tu Excel sin usar: {preview.columns.filter(c => !Object.values(mapping).includes(c)).join(', ') || 'ninguna'}
              </div>
            </div>

            <div className="page-toolbar" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMapping(false)} className="ghost-button">Cancelar</button>
              <button onClick={() => setShowMapping(false)} className="btn-primary" style={{ opacity: requiredCols.every(c => Object.values(mapping).includes(c)) ? 1 : 0.6 }}>
                ✓ Confirmar mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
