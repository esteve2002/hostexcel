"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Venta {
  fecha: string;
  producto: string;
  cantidad_vendida: number;
  precio_unitario: number;
  total?: number;
}

interface InventarioItem {
  producto: string;
  stock_actual: number;
  stock_minimo: number;
  fecha_ultima_compra: string;
}

interface Escandallo {
  producto: string;
  ingrediente: string;
  cantidad: number;
  unidad: string;
  precio_unidad: number;
}

interface Proveedor {
  proveedor: string;
  cif: string;
  email: string;
  telefono: string;
  direccion: string;
}

// Función para obtener el número de semana
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export default function Home() {
  const router = useRouter();
  const [restaurante, setRestaurante] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [escandallo, setEscandallo] = useState<Escandallo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const meRes = await fetch("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const meData = await meRes.json();
        setRestaurante(meData.nombre_restaurante);

        const [v, i, e, p] = await Promise.all([
          fetch("http://localhost:8000/datos/ventas", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8000/datos/inventario", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8000/datos/escandallo", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8000/datos/proveedores", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (v.ok) {
          const data = await v.json();
          setVentas(data || []);
        }
        if (i.ok) {
          const data = await i.json();
          setInventario(data || []);
        }
        if (e.ok) {
          const data = await e.json();
          setEscandallo(data || []);
        }
        if (p.ok) {
          const data = await p.json();
          setProveedores(data || []);
        }

        setLoading(false);
      } catch (err) {
        setError("Error cargando datos");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular ventas esta semana
  const thisWeek = getWeekNumber(new Date());
  const ventasEstaSemana = useMemo(() => {
    return ventas.filter(v => getWeekNumber(new Date(v.fecha)) === thisWeek);
  }, [ventas, thisWeek]);

  const totalVentasSemana = ventasEstaSemana.reduce((sum, v) => sum + (v.total || v.cantidad_vendida * v.precio_unitario), 0);

  // Calcular margen promedio
  const margenPromedio = useMemo(() => {
    // Calcular costo por producto (desde escandallo)
    const costoPorProducto: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      const key = item.producto;
      const itemCosto = (item.cantidad || 0) * (item.precio_unidad || 0);
      costoPorProducto[key] = (costoPorProducto[key] || 0) + itemCosto;
    });

    // Calcular margen por venta
    const ventasConMargen = ventas.map(v => {
      const revenue = v.total || v.cantidad_vendida * v.precio_unitario;
      const costoUnit = costoPorProducto[v.producto] || 0;
      const costoTotal = costoUnit * v.cantidad_vendida;
      return { ...v, revenue, margen: revenue - costoTotal };
    });

    if (ventasConMargen.length === 0) return 0;
    const totalMargen = ventasConMargen.reduce((sum, v) => sum + (v.margen || 0), 0);
    const totalRevenue = ventasConMargen.reduce((sum, v) => sum + (v.revenue || 0), 0);
    return totalRevenue > 0 ? (totalMargen / totalRevenue) * 100 : 0;
  }, [ventas, escandallo]);

  // Plato más rentable
  const platoMasRentable = useMemo(() => {
    const costoPorProducto: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      const key = item.producto;
      const itemCosto = (item.cantidad || 0) * (item.precio_unidad || 0);
      costoPorProducto[key] = (costoPorProducto[key] || 0) + itemCosto;
    });

    const productoStats: { [key: string]: { revenue: number; costo: number; cantidad: number } } = {};

    ventas.forEach(v => {
      const key = v.producto;
      if (!productoStats[key]) {
        productoStats[key] = { revenue: 0, costo: 0, cantidad: 0 };
      }
      productoStats[key].revenue += v.total || v.cantidad_vendida * v.precio_unitario;
      productoStats[key].cantidad += v.cantidad_vendida;
    });

    Object.keys(productoStats).forEach(key => {
      productoStats[key].costo = (costoPorProducto[key] || 0) * productoStats[key].cantidad;
    });

    let mejorProducto = null;
    let mejorMargen = -Infinity;

    Object.entries(productoStats).forEach(([producto, stats]) => {
      const margen = stats.revenue - stats.costo;
      if (margen > mejorMargen) {
        mejorMargen = margen;
        mejorProducto = { producto, margen, revenue: stats.revenue };
      }
    });

    return mejorProducto;
  }, [ventas, escandallo]);

  // Alertas
  const alertas = useMemo(() => {
    const alertasList: { type: "warning" | "error" | "info"; message: string }[] = [];

    // Alertas de stock bajo
    const bajoStock = inventario.filter(i => i.stock_actual <= i.stock_minimo);
    if (bajoStock.length > 0) {
      alertasList.push({
        type: "error",
        message: `${bajoStock.length} producto(s) con stock bajo`
      });
    }

    // Alertas de sin ventas recientes (últimas 3 semanas)
    const weeksToCheck = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      weeksToCheck.push(getWeekNumber(d));
    }

    const ventasRecientes = ventas.filter(v => {
      const weekNum = getWeekNumber(new Date(v.fecha));
      return weeksToCheck.includes(weekNum);
    });

    if (ventasRecientes.length === 0 && ventas.length > 0) {
      alertasList.push({
        type: "warning",
        message: "No hay ventas en las últimas 3 semanas"
      });
    }

    // Alertas de productos sin rotación (más de 30 días)
    const hoy = new Date();
    inventario.forEach(item => {
      const dias = Math.floor((hoy.getTime() - new Date(item.fecha_ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
      if (dias > 30) {
        alertasList.push({
          type: "info",
          message: `${item.producto} lleva ${Math.floor(dias)} días sin movimiento`
        });
      }
    });

    return alertasList;
  }, [ventas, inventario]);

  // Ventas por día de esta semana
  const ventasPorDiaSemana = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    ventasEstaSemana.forEach(v => {
      const day = new Date(v.fecha).getDay();
      totals[day] += v.total || v.cantidad_vendida * v.precio_unitario;
      counts[day] += 1;
    });

    return days.map((day, idx) => ({
      day,
      total: totals[idx],
      count: counts[idx],
    }));
  }, [ventasEstaSemana]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#FAFAFA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "48px 56px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}>
          <div style={{
            width: 64,
            height: 64,
            border: "4px solid #E0E0E0",
            borderTopColor: "#008A0E",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}></div>
          <p style={{ color: "#666", fontSize: 16, margin: 0 }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px 0" }}>
            🏢 Bienvenido
          </h1>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#008A0E", margin: 0 }}>
            {restaurante}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/subir-excel")}
            style={{
              padding: "12px 28px",
              background: "#008A0E",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#006607"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#008A0E"; }}
          >
            📤 SUBIR EXCEL
          </button>
          <button
            onClick={() => router.push("/visualizar")}
            style={{
              padding: "12px 28px",
              background: "rgba(0, 138, 14, 0.1)",
              color: "#008A0E",
              border: "2px solid #008A0E",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(0, 138, 14, 0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(0, 138, 14, 0.1)"; }}
          >
            📊 Ver Datos
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fff0f0",
          border: "1px solid #f5c6c6",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
          color: "#c0392b",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>❌</span>
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* KPIs Principales */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 20,
        marginBottom: 32,
      }}>
        {/* Ventas esta semana */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e0e0e0",
          transition: "all 0.2s ease",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 138, 14, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
        >
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            📈 Ventas Esta Semana
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#008A0E" }}>
            €{totalVentasSemana.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            Semana {thisWeek}
          </div>
        </div>

        {/* Margen Promedio */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e0e0e0",
          transition: "all 0.2s ease",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(41, 58, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
        >
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            📉 Margen Promedio
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: margenPromedio >= 30 ? "#008A0E" : margenPromedio >= 15 ? "#FFA500" : "#f44",
          }}>
            {margenPromedio.toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            {margenPromedio >= 30 ? "🟢 Excelente" : margenPromedio >= 15 ? "🟡 Normal" : "🔴 Crítico"}
          </div>
        </div>

        {/* Plato más rentable */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e0e0e0",
          transition: "all 0.2s ease",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 138, 14, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
        >
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            🏆 Plato Más Rentable
          </div>
          {platoMasRentable ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
                {platoMasRentable.producto}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#008A0E", marginTop: 4 }}>
                €{platoMasRentable.margen.toFixed(2)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, color: "#888", fontStyle: "italic" }}>
              No hay datos suficientes
            </div>
          )}
        </div>

        {/* Total Proveedores */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e0e0e0",
          transition: "all 0.2s ease",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(41, 58, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
          }}
        >
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            🏢 Total Proveedores
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#293AFF" }}>
            {proveedores.length}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            {proveedores.filter(p => p.email).length} con email
          </div>
        </div>
      </div>

      {/* Gráfico de ventas por día */}
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        border: "1px solid #e0e0e0",
        marginBottom: 32,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
          📅 Ventas por Día - Esta Semana
        </h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
              <Bar dataKey="total" fill="#008A0E" name="Total Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e0e0e0",
          marginBottom: 32,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ Alertas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alertas.map((alerta, idx) => (
              <div
                key={idx}
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: alerta.type === "error" ? "rgba(255, 68, 68, 0.05)" : alerta.type === "warning" ? "rgba(255, 165, 0, 0.05)" : "rgba(0, 138, 14, 0.05)",
                  border: `1px solid ${alerta.type === "error" ? "#f44" : alerta.type === "warning" ? "#FFA500" : "#008A0E"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>
                  {alerta.type === "error" ? "🔴" : alerta.type === "warning" ? "⚠️" : "ℹ"}
                </span>
                <span style={{
                  fontSize: 14,
                  color: alerta.type === "error" ? "#c0392b" : alerta.type === "warning" ? "#666" : "#333",
                  fontWeight: 500,
                }}>
                  {alerta.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enlaces rápidos */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
      }}>
        <button
          onClick={() => router.push("/visualizar")}
          style={{
            padding: 24,
            background: "linear-gradient(135deg, rgba(0, 138, 14, 0.05) 0%, rgba(41, 58, 255, 0.05) 100%)",
            border: "2px solid #e0e0e0",
            borderRadius: 16,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#008A0E";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0e0e0";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
            Visualizar Datos
          </div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Gráficos y estadísticas detalladas
          </div>
        </button>

        <button
          onClick={() => router.push("/historial")}
          style={{
            padding: 24,
            background: "linear-gradient(135deg, rgba(0, 138, 14, 0.05) 0%, rgba(41, 58, 255, 0.05) 100%)",
            border: "2px solid #e0e0e0",
            borderRadius: 16,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#293AFF";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0e0e0";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
            Historial
          </div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Revisa tus subidas anteriores
          </div>
        </button>

        <button
          onClick={() => router.push("/configuracion")}
          style={{
            padding: 24,
            background: "linear-gradient(135deg, rgba(0, 138, 14, 0.05) 0%, rgba(41, 58, 255, 0.05) 100%)",
            border: "2px solid #e0e0e0",
            borderRadius: 16,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#293AFF";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0e0e0";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
            Configuración
          </div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Ajusta preferencias de tu cuenta
          </div>
        </button>
      </div>
    </div>
  );
}
