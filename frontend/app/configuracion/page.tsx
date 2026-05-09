"use client";
import { useState, useEffect } from "react";
import { extractErrorMessage } from "@/lib/errorHandler";
import {
  TPV_PRESETS,
  EXCEL_TYPE_LABELS,
  SYSTEM_COLUMN_LABELS,
  type ExcelType,
  type ColumnMapping,
} from "@/lib/columnMapper";

const EXCEL_TYPES: ExcelType[] = ['ventas', 'escandallo', 'inventario', 'proveedores'];

export default function ConfiguracionPage() {
  const [mounted, setMounted] = useState(false);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ExcelType>('ventas');
  const [userId, setUserId] = useState<string | null>(null);

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
    loadMappings();
  }, [userId]);

  const loadMappings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/excel/mapping?restaurante_id=${userId}&excel_type=${activeType}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setError(msg);
        setMappings([]);
      } else {
        const data = await res.json();
        setMappings(data.mappings || []);
      }
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
        loadMappings();
      }
    } catch (err: any) {
      setError(err.message || 'Error al añadir mapping');
    }
  };

  const presetsForType = TPV_PRESETS.filter(p => {
    if (p.name === 'custom') return false;
    const keys = Object.keys(p.mappings);
    const requiredCols = activeType === 'ventas'
      ? ['fecha', 'producto', 'cantidad_vendida', 'precio_unitario', 'total']
      : activeType === 'escandallo'
        ? ['producto', 'ingrediente', 'cantidad', 'unidad', 'precio_unidad']
        : activeType === 'inventario'
          ? ['producto', 'stock_actual', 'stock_minimo', 'fecha_ultima_compra']
          : ['proveedor', 'cif', 'email', 'telefono', 'direccion'];
    return requiredCols.some(c => Object.values(p.mappings).includes(c));
  });

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
            ⚙️
          </span>
          CONFIGURACIÓN
        </h1>
        <p style={{ color: "#666", fontSize: 15, marginTop: 8, marginLeft: 60 }}>
          Gestiona el mapeo de columnas de tus Excels y la configuración de tu cuenta
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: 24,
          padding: "16px 20px",
          background: "#fff0f0",
          border: "1px solid #f5c6c6",
          borderRadius: 12,
          color: "#c0392b",
          fontSize: 14,
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: 24,
          padding: "16px 20px",
          background: "rgba(0, 138, 14, 0.1)",
          border: "1px solid #008A0E",
          borderRadius: 12,
          color: "#008A0E",
          fontSize: 14,
          fontWeight: 600,
        }}>
          ✅ {success}
        </div>
      )}

      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        marginBottom: 24,
        border: "1px solid #eee"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
          📋 Mis columnas
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>
          Define cómo se llaman las columnas en tus Excels para que el sistema las reconozca automáticamente.
          El mapeo se guarda y se aplica en futuras subidas.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "2px solid #eee", paddingBottom: 0 }}>
          {EXCEL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setError(null); }}
              style={{
                padding: "10px 20px",
                background: activeType === type ? "#008A0E" : "transparent",
                color: activeType === type ? "white" : "#666",
                border: "none",
                borderRadius: "8px 8px 0 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textTransform: "capitalize",
              }}
              onMouseEnter={(e) => {
                if (activeType !== type) {
                  e.currentTarget.style.background = "rgba(0, 138, 14, 0.1)";
                  e.currentTarget.style.color = "#008A0E";
                }
              }}
              onMouseLeave={(e) => {
                if (activeType !== type) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#666";
                }
              }}
            >
              {EXCEL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#888", fontSize: 14 }}>Cargando mappings...</p>
        ) : mappings.length === 0 ? (
          <div style={{
            padding: 24,
            background: "#fafafa",
            borderRadius: 12,
            border: "1px dashed #ddd",
            textAlign: "center",
          }}>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
              No tienes mappings guardados para {EXCEL_TYPE_LABELS[activeType].toLowerCase()}.
            </p>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16 }}>
              Los mappings se crean automáticamente cuando subes un Excel y configuras las columnas.
            </p>
            <p style={{ color: "#aaa", fontSize: 13 }}>
              También puedes consultar los presets de TPV más abajo para ver ejemplos.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e0e0e0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#333", borderBottom: "2px solid #e0e0e0" }}>
                    Tu columna
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#333", borderBottom: "2px solid #e0e0e0" }}>
                    Campo del sistema
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#333", borderBottom: "2px solid #e0e0e0", width: 80 }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, idx) => (
                  <tr key={m.id || idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px 16px", color: "#c0392b", fontWeight: 500 }}>
                      {m.original_column}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#008A0E", fontWeight: 500 }}>
                      {SYSTEM_COLUMN_LABELS[m.mapped_column] || m.mapped_column}
                      <span style={{ color: "#aaa", fontSize: 12, marginLeft: 6 }}>
                        ({m.mapped_column})
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        onClick={() => m.id && handleDeleteMapping(m.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#c0392b",
                          cursor: "pointer",
                          fontSize: 18,
                          padding: "4px 8px",
                          borderRadius: 6,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(192, 57, 43, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Eliminar mapping"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={handleAddMapping}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            background: "white",
            color: "#008A0E",
            border: "1px solid #008A0E",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 138, 14, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
          }}
        >
          + Añadir mapping manual
        </button>
      </div>

      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #eee"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
          🏪 Presets por TPV
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>
          Estos son los mapeos típicos para cada software de gestión. Cuando subes un Excel y seleccionas tu TPV,
          el sistema aplica automáticamente estas equivalencias.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {presetsForType.map(p => (
            <div key={p.name} style={{
              flex: "1 1 280px",
              background: "#fafafa",
              borderRadius: 12,
              padding: 20,
              border: "1px solid #eee",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginTop: 0, marginBottom: 12 }}>
                {p.label}
              </h3>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {Object.entries(p.mappings).map(([original, mapped]) => (
                    <tr key={original}>
                      <td style={{ padding: "4px 8px", color: "#c0392b" }}>{original}</td>
                      <td style={{ padding: "4px 8px", color: "#666" }}>→</td>
                      <td style={{ padding: "4px 8px", color: "#008A0E", fontWeight: 500 }}>
                        {SYSTEM_COLUMN_LABELS[mapped] || mapped}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p style={{ color: "#888", fontSize: 13, fontStyle: "italic", marginTop: 16 }}>
          ¿Usas un TPV que no está en la lista? Cuando subas tu Excel por primera vez, usa el mapeo manual
          y el sistema lo recordará para la próxima vez.
        </p>
      </div>
    </div>
  );
}
