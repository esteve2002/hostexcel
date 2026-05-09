"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";
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
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const meData = await meRes.json();
        setRestaurante(meData.nombre_restaurante);

        const [v, i, e, p] = await Promise.all([
          fetch("/api/datos/ventas", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/datos/inventario", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/datos/escandallo", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/datos/proveedores", {
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
        setError(extractNetworkErrorMessage(err));
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

    let mejorProducto: { producto: string; margen: number; revenue: number } | null = null;
    let mejorMargen = -Infinity;

    Object.entries(productoStats).forEach(([producto, stats]) => {
      const margen = stats.revenue - stats.costo;
      if (margen > mejorMargen) {
        mejorMargen = margen;
        mejorProducto = { producto, margen, revenue: stats.revenue };
      }
    });

    return mejorProducto;
  }, [ventas, escandallo]) as { producto: string; margen: number; revenue: number } | null;

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
    const weeksToCheck: string[] = [];
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
        background: "var(--bg-warm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div className="card animate-scale-in" style={{
          padding: "48px 56px",
          textAlign: "center",
        }}>
          <div style={{
            width: 64,
            height: 64,
            border: "4px solid var(--border-light)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: 16, margin: 0 }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 36,
      }}>
        <div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 4px 0", fontWeight: 500, letterSpacing: "0.5px" }}>
            PANEL PRINCIPAL
          </p>
          <h1 style={{ fontSize: 28, margin: 0, color: "var(--text-primary)" }}>
            Bienvenido, {restaurante || "usuario"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/subir-excel")}
            className="btn-primary"
            style={{ padding: "11px 24px", fontSize: 14 }}
          >
            📤 SUBIR EXCEL
          </button>
          <button
            onClick={() => router.push("/visualizar")}
            className="btn-secondary"
            style={{ padding: "11px 24px", fontSize: 14 }}
          >
            📊 Ver Datos
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#FFF5F5",
          border: "1px solid #FFD7D7",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: 24,
          color: "#D94A4A",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span>❌</span>
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 20,
        marginBottom: 32,
      }}>
        {[
          {
            icon: "📈",
            label: "Ventas Esta Semana",
            value: `€${totalVentasSemana.toFixed(2)}`,
            sub: `Semana ${thisWeek}`,
            color: "var(--primary)",
            accent: "var(--primary-glow)",
          },
          {
            icon: "📉",
            label: "Margen Promedio",
            value: `${margenPromedio.toFixed(1)}%`,
            sub: margenPromedio >= 30 ? "Excelente" : margenPromedio >= 15 ? "Normal" : "Crítico",
            color: margenPromedio >= 30 ? "var(--primary)" : margenPromedio >= 15 ? "var(--accent)" : "#D94A4A",
            accent: "transparent",
          },
          {
            icon: "🏆",
            label: "Plato Más Rentable",
            value: platoMasRentable ? platoMasRentable.producto : "—",
            sub: platoMasRentable ? `€${platoMasRentable.margen.toFixed(2)}` : "Sin datos",
            color: "var(--text-primary)",
            accent: "transparent",
          },
          {
            icon: "🏢",
            label: "Total Proveedores",
            value: String(proveedores.length),
            sub: `${proveedores.filter(p => p.email).length} con email`,
            color: "var(--primary)",
            accent: "var(--primary-glow)",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="card card-hover animate-fade-in-up"
            style={{
              padding: 24,
              animationDelay: `${idx * 0.08}s`,
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              {kpi.icon} {kpi.label}
            </div>
            <div style={{
              fontSize: kpi.value.length > 12 ? 20 : 28,
              fontWeight: 700,
              color: kpi.color,
              fontFamily: "var(--font-display)",
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              {kpi.sub}
            </div>
            <div style={{
              marginTop: 16,
              height: 3,
              background: "var(--border-light)",
              borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, idx === 1 ? margenPromedio : idx === 3 ? (proveedores.length / 10) * 100 : 70)}%`,
                background: kpi.color,
                borderRadius: 2,
                transition: "width 1s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          📅 Ventas por Día - Esta Semana
        </h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="day" tick={{ fontSize: 13, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 13, fill: "var(--text-muted)" }} />
              <Tooltip
                formatter={(value) => [`€${Number(value).toFixed(2)}`, "Total"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border-light)",
                  boxShadow: "var(--shadow-md)",
                }}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Total Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ Alertas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertas.map((alerta, idx) => (
              <div
                key={idx}
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: alerta.type === "error" ? "#FFF5F5" : alerta.type === "warning" ? "#FFFBF0" : "rgba(91, 123, 58, 0.06)",
                  border: `1px solid ${alerta.type === "error" ? "#FFD7D7" : alerta.type === "warning" ? "#FFEBB5" : "rgba(91, 123, 58, 0.15)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {alerta.type === "error" ? "🔴" : alerta.type === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <span style={{
                  fontSize: 14,
                  color: alerta.type === "error" ? "#D94A4A" : "var(--text-primary)",
                  fontWeight: 500,
                }}>
                  {alerta.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
      }}>
        {[
          { icon: "📊", title: "Visualizar Datos", desc: "Gráficos y estadísticas detalladas", path: "/visualizar" },
          { icon: "📋", title: "Historial", desc: "Revisa tus subidas anteriores", path: "/historial" },
          { icon: "⚙️", title: "Configuración", desc: "Ajusta preferencias de tu cuenta", path: "/configuracion" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => router.push(item.path)}
            className="card card-hover animate-fade-in-up"
            style={{
              padding: 24,
              cursor: "pointer",
              textAlign: "left",
              border: "1px solid var(--border-light)",
              animationDelay: `${0.3 + idx * 0.1}s`,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {item.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
