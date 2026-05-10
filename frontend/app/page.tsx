"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { extractNetworkErrorMessage } from "@/lib/errorHandler";
import { formatSpanishDate, getWeekNumber, parseFlexibleDate } from "@/lib/date";
import {
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
          fetch("/api/datos/ventas", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/datos/inventario", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/datos/escandallo", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/datos/proveedores", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (v.ok) { const data = await v.json(); setVentas(data || []); }
        if (i.ok) { const data = await i.json(); setInventario(data || []); }
        if (e.ok) { const data = await e.json(); setEscandallo(data || []); }
        if (p.ok) { const data = await p.json(); setProveedores(data || []); }

        setLoading(false);
      } catch (err) {
        setError(extractNetworkErrorMessage(err));
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const thisWeek = getWeekNumber(new Date());
  const ventasEstaSemana = useMemo(() => {
    return ventas.filter(v => {
      const fecha = parseFlexibleDate(v.fecha);
      return fecha ? getWeekNumber(fecha) === thisWeek : false;
    });
  }, [ventas, thisWeek]);

  const totalVentasSemana = ventasEstaSemana.reduce((sum, v) => sum + (v.total || v.cantidad_vendida * v.precio_unitario), 0);

  const margenPromedio = useMemo(() => {
    const costoPorProducto: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      const key = item.producto;
      const itemCosto = (item.cantidad || 0) * (item.precio_unidad || 0);
      costoPorProducto[key] = (costoPorProducto[key] || 0) + itemCosto;
    });

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
      if (!productoStats[key]) productoStats[key] = { revenue: 0, costo: 0, cantidad: 0 };
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
      if (margen > mejorMargen) { mejorMargen = margen; mejorProducto = { producto, margen, revenue: stats.revenue }; }
    });
    return mejorProducto;
  }, [ventas, escandallo]) as { producto: string; margen: number; revenue: number } | null;

  const alertas = useMemo(() => {
    const alertasList: { type: "warning" | "error" | "info"; message: string }[] = [];
    const bajoStock = inventario.filter(i => i.stock_actual <= i.stock_minimo);
    if (bajoStock.length > 0) alertasList.push({ type: "error", message: `${bajoStock.length} producto(s) con stock bajo` });

    const weeksToCheck: string[] = [];
    for (let i = 0; i < 3; i++) { const d = new Date(); d.setDate(d.getDate() - (i * 7)); weeksToCheck.push(getWeekNumber(d)); }
    const ventasRecientes = ventas.filter(v => {
      const fecha = parseFlexibleDate(v.fecha);
      return fecha ? weeksToCheck.includes(getWeekNumber(fecha)) : false;
    });
    if (ventasRecientes.length === 0 && ventas.length > 0) alertasList.push({ type: "warning", message: "No hay ventas en las últimas 3 semanas" });

    const hoy = new Date();
    inventario.forEach(item => {
      const fechaCompra = parseFlexibleDate(item.fecha_ultima_compra);
      if (fechaCompra) {
        const dias = Math.floor((hoy.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));
        if (dias > 30) alertasList.push({ type: "info", message: `${item.producto} lleva ${Math.floor(dias)} días sin movimiento` });
      }
    });

    return alertasList;
  }, [ventas, inventario]);

  const ventasPorDiaSemana = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    ventasEstaSemana.forEach(v => {
      const fecha = parseFlexibleDate(v.fecha);
      if (fecha) {
        const day = fecha.getUTCDay();
        totals[day] += v.total || v.cantidad_vendida * v.precio_unitario;
        counts[day] += 1;
      }
    });
    return days.map((day, idx) => ({ day, total: totals[idx], count: counts[idx] }));
  }, [ventasEstaSemana]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="animate-scale-in" style={{ textAlign: "center" }}>
          <div style={{
            width: 44, height: 44,
            border: "3px solid var(--border-light)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      icon: "📈", label: "Ventas esta semana",
      value: `€${totalVentasSemana.toFixed(2)}`,
      sub: formatSpanishDate(new Date()),
      trend: ventasEstaSemana.length > 0 ? "up" : null,
    },
    {
      icon: "📊", label: "Margen promedio",
      value: `${margenPromedio.toFixed(1)}%`,
      sub: margenPromedio >= 30 ? "Excelente" : margenPromedio >= 15 ? "Normal" : "Crítico",
      trend: margenPromedio >= 15 ? "up" : "down",
    },
    {
      icon: "🏆", label: "Plato más rentable",
      value: platoMasRentable ? platoMasRentable.producto : "—",
      sub: platoMasRentable ? `€${platoMasRentable.margen.toFixed(2)} de margen` : "Sin datos",
      trend: null,
    },
    {
      icon: "🤝", label: "Proveedores",
      value: String(proveedores.length),
      sub: `${proveedores.filter(p => p.email).length} con email registrado`,
      trend: null,
    },
  ];

  const heroSales = ventasEstaSemana.reduce((sum, v) => sum + (v.total || v.cantidad_vendida * v.precio_unitario), 0);
  const heroAlerts = alertas.length;

  return (
    <div className="page-shell">
      <div className="dashboard-hero" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "stretch",
        gap: 24,
        marginBottom: 28,
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 220 }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 4px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Dashboard operativo
            </p>
            <h1 style={{ fontSize: 42, margin: 0, letterSpacing: "-1px" }}>
              Bienvenido, {restaurante || "usuario"}
            </h1>
            <p style={{ margin: "12px 0 0", color: "var(--text-secondary)", maxWidth: 560 }}>
              Resumen operativo para controlar ventas, margen, stock y proveedores antes del siguiente servicio.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            <button onClick={() => router.push("/subir-excel")} className="btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>
              📤 Subir Excel
            </button>
            <button onClick={() => router.push("/visualizar")} className="btn-secondary" style={{ padding: "10px 22px", fontSize: 13 }}>
              📊 Ver datos
            </button>
            <span className="filter-chip" style={{ background: "rgba(31,91,87,0.08)", color: "var(--secondary)" }}>
              Semana actual
            </span>
          </div>
        </div>

        <aside className="hero-side-panel">
          <p className="hero-side-panel__eyebrow">Lectura rápida</p>
          <p className="hero-side-panel__value">€{heroSales.toFixed(2)}</p>
          <p className="hero-side-panel__text">Ventas acumuladas en la semana actual, con el mismo corte que la vista de análisis.</p>

          <div className="hero-mini-grid">
            <div className="hero-mini-card">
              <p className="hero-mini-label">Top plato</p>
              <p className="hero-mini-value">{platoMasRentable ? platoMasRentable.producto : "—"}</p>
            </div>
            <div className="hero-mini-card">
              <p className="hero-mini-label">Alertas</p>
              <p className="hero-mini-value">{heroAlerts}</p>
            </div>
          </div>
        </aside>
      </div>

      {error && (
        <div style={{
          background: "#FFF5F5", border: "1px solid #FFD7D7",
          borderRadius: "var(--radius-md)", padding: "14px 18px",
          marginBottom: 24, color: "#D94A4A", fontSize: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>❌</span> {error}
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="card card-hover animate-fade-in-up kpi-card"
            style={{ padding: "22px 24px", animationDelay: `${idx * 0.07}s` }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{kpi.label}</span>
              <span style={{ fontSize: 20, opacity: 0.7 }}>{kpi.icon}</span>
            </div>
            <div style={{
              fontSize: kpi.value.length > 12 ? 20 : 28,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.3px",
              color: "var(--text-primary)",
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}>
              {kpi.value}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              {kpi.trend === "up" && <span style={{ fontSize: 11 }}>📈</span>}
              {kpi.trend === "down" && <span style={{ fontSize: 11 }}>📉</span>}
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📅</span> Ventas por día — esta semana
          </h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {ventasPorDiaSemana.filter(d => d.total > 0).length} días con ventas
          </span>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 13, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`€${Number(value).toFixed(2)}`, "Total"]}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid var(--border-light)",
                  boxShadow: "var(--shadow-md)",
                  padding: "10px 14px",
                }}
                cursor={{ fill: "rgba(224, 122, 95, 0.06)" }}
              />
              <Bar
                dataKey="total"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
                name="Total Ventas"
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span> Alertas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alertas.map((alerta, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: alerta.type === "error" ? "#FFF5F5"
                    : alerta.type === "warning" ? "#FFFBF0"
                    : "rgba(61, 90, 128, 0.04)",
                  border: `1px solid ${
                    alerta.type === "error" ? "#FFD7D7"
                    : alerta.type === "warning" ? "#FFEBB5"
                    : "rgba(61, 90, 128, 0.12)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  color: alerta.type === "error" ? "#D94A4A" : "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {alerta.type === "error" ? "🔴" : alerta.type === "warning" ? "⚠️" : "💡"}
                </span>
                {alerta.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="quick-action-grid">
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
              padding: 24, cursor: "pointer", textAlign: "left",
              border: "1px solid var(--border-light)",
              animationDelay: `${0.3 + idx * 0.1}s`,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
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
