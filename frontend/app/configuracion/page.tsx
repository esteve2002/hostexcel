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
      <div className="page-hero stack">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="code-pill status-soft" style={{ fontSize: 18 }}>⚙️</div>
          <div>
            <h1 className="page-title">Configuración</h1>
            <p className="page-subtitle">Gestiona mappings, prueba archivos y revisa tu cuenta desde una sola pantalla.</p>
          </div>
        </div>
        <div className="pill-tabs">
          {([
            { key: 'mappings', label: 'Mappings', icon: '🗺️' },
            { key: 'tester', label: 'Probador', icon: '🧪' },
            { key: 'account', label: 'Mi cuenta', icon: '👤' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pill-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="section-card section-card--pad status-error">❌ {error}</div>}
      {success && <div className="section-card section-card--pad status-soft">✅ {success}</div>}

      {activeTab === 'mappings' && (
        <div className="stack-lg">
          <div className="metric-grid metric-grid-4">
            {EXCEL_TYPES.map((type) => {
              const cov = getCoverage(type);
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className="section-card section-card--pad card-hover"
                  style={{ textAlign: 'left', cursor: 'pointer', borderColor: activeType === type ? 'var(--primary)' : 'var(--border-light)' }}
                >
                  <div className="code-pill status-soft" style={{ marginBottom: 10 }}>{TYPE_ICONS[type]}</div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{EXCEL_TYPE_LABELS[type]}</div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(80,55,42,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cov.percent}%`, background: cov.percent === 100 ? 'var(--secondary)' : cov.percent >= 60 ? 'var(--accent)' : 'var(--primary)' }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>{cov.mapped}/{cov.total} campos</div>
                </button>
              );
            })}
          </div>

          <div className="section-card section-card--pad stack-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>{TYPE_ICONS[activeType]} Mappings de {EXCEL_TYPE_LABELS[activeType]}</h2>
                <p className="page-subtitle" style={{ marginTop: 6 }}>{mappings.length} mapping{mappings.length !== 1 ? 's' : ''} guardado{mappings.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="page-toolbar">
                <button onClick={exportMappings} className="ghost-button">📤 Exportar</button>
                <button onClick={importMappings} className="ghost-button">📥 Importar</button>
              </div>
            </div>

            {loading ? (
              <p className="page-subtitle" style={{ margin: 0 }}>Cargando mappings...</p>
            ) : mappings.length === 0 ? (
              <div className="subtle-list" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{TYPE_ICONS[activeType]}</div>
                <p style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No tienes mappings guardados para {EXCEL_TYPE_LABELS[activeType].toLowerCase()}.</p>
                <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>Los mappings se crean automáticamente al subir archivos y configurar columnas.</p>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>También puedes usar la pestaña <strong>Probador</strong>.</p>
              </div>
            ) : (
              <div className="stack">
                {mappings.map((m, idx) => (
                  <div key={m.id || idx} className="section-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                      <span className="code-pill status-error" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.original_column}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span className="code-pill status-soft">{SYSTEM_COLUMN_LABELS[m.mapped_column] || m.mapped_column}</span>
                      <span className="page-subtitle" style={{ margin: 0, fontSize: 12 }}>({m.mapped_column})</span>
                    </div>
                    <button onClick={() => m.id && handleDeleteMapping(m.id)} className="ghost-button" title="Eliminar mapping">🗑️</button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleAddMapping} className="accent-button" style={{ alignSelf: 'flex-start' }}>+ Añadir mapping manual</button>
          </div>

          <div className="section-card section-card--pad stack-lg">
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>🏪 Presets para {EXCEL_TYPE_LABELS[activeType]}</h2>
              <p className="page-subtitle">Mapeos típicos por TPV. Se aplican como base antes del ajuste manual.</p>
            </div>

            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {presetsForType.map((p) => (
                <div key={p.name} className="section-card section-card--pad" style={{ background: 'rgba(255,248,236,0.72)' }}>
                  <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>{p.label}</h3>
                  <div className="stack" style={{ gap: 8 }}>
                    {Object.entries(p.mappings).map(([original, mapped]) => (
                      <div key={original} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600, flex: 1 }}>{original}</span>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <span style={{ color: 'var(--secondary)', fontWeight: 600, flex: 1 }}>{SYSTEM_COLUMN_LABELS[mapped] || mapped}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tester' && (
        <div className="section-card section-card--pad stack-lg">
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>🧪 Probador de mappings</h2>
            <p className="page-subtitle">Sube un Excel de prueba para ver cómo se transformarían sus columnas sin guardar datos.</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Tipo de Excel a probar</label>
            <div className="page-toolbar">
              {EXCEL_TYPES.map((type) => (
                <button key={type} onClick={() => setActiveType(type)} className={activeType === type ? 'btn-primary' : 'ghost-button'}>
                  {TYPE_ICONS[type]} {EXCEL_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="upload-dropzone" style={{ background: testFile ? 'rgba(31,91,87,0.08)' : undefined }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{testLoading ? '⏳' : testFile ? '✅' : '📂'}</div>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{testFile ? testFile.name : 'Sube un Excel de prueba'}</p>
            <p className="page-subtitle" style={{ margin: 0 }}>{testFile ? `${(testFile.size / 1024).toFixed(1)} KB` : 'Solo se leerán las columnas, no se guarda nada'}</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleTestUpload(e.target.files?.[0] || null)} />
          </div>

          {testLoading && <p className="page-subtitle" style={{ margin: 0, textAlign: 'center' }}>Analizando archivo...</p>}

          {testResult && (
            <div className="stack-lg">
              <div className="section-card section-card--pad">
                <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>🔄 Transformación de columnas</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Tu columna</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}></th>
                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>Se transforma a</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', width: 80 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResult.before.map((col, i) => {
                        const after = testResult.after[i];
                        const changed = col !== after;
                        return (
                          <tr key={i}>
                            <td style={{ padding: '12px 14px', fontStyle: changed ? 'normal' : 'italic' }}>{col}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>{changed ? '→' : '='}</td>
                            <td style={{ padding: '12px 14px', color: changed ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: changed ? 700 : 400 }}>
                              {after}{after && SYSTEM_COLUMN_LABELS[after] ? <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>({SYSTEM_COLUMN_LABELS[after]})</span> : null}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>{changed ? '✓' : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`section-card section-card--pad ${testResult.after.some((c, i) => c !== testResult.before[i]) ? 'status-soft' : ''}`}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {testResult.after.some((c, i) => c !== testResult.before[i])
                    ? '✅ Tus mappings transformarán las columnas correctamente.'
                    : 'ℹ️ Ninguna columna necesita transformación con tus mappings actuales.'}
                </p>
                <p className="page-subtitle" style={{ marginBottom: 0 }}>{testResult.data.length} filas leídas • {testResult.before.length} columnas detectadas</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'account' && (
        <div className="section-card section-card--pad stack-lg">
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>👤 Mi cuenta</h2>
            <p className="page-subtitle">Datos de acceso y estado de tu cuenta.</p>
          </div>

          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {[
              ['Restaurante', userData?.nombre_restaurante || '—'],
              ['Email', userData?.email || '—'],
              ['Plan', userData?.plan || 'Gratuito'],
              ['Miembro desde', userData?.created_at ? new Date(userData.created_at).toLocaleDateString('es-ES') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="section-card section-card--pad">
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="section-card section-card--pad">
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>📊 Resumen de mappings</h3>
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {EXCEL_TYPES.map((type) => {
                const cov = getCoverage(type);
                return (
                  <div key={type} className="section-card section-card--pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="code-pill status-soft">{TYPE_ICONS[type]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{EXCEL_TYPE_LABELS[type]}</div>
                      <div className="page-subtitle" style={{ margin: '2px 0 0', fontSize: 12 }}>{cov.mapped}/{cov.total} campos mapeados</div>
                    </div>
                    <div className="code-pill status-soft">{cov.percent}%</div>
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
