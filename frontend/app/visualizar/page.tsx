"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { extractErrorMessage, extractNetworkErrorMessage } from "@/lib/errorHandler";
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

type TabType = "ventas" | "inventario" | "escandallo" | "proveedores";

// Función para obtener el número de semana
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export default function VisualizarPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ventas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [escandallo, setEscandallo] = useState<Escandallo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [weekFilter, setWeekFilter] = useState<string>("all");

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
        const [ventasRes, inventarioRes, escandalloRes, proveedoresRes] = await Promise.all([
          fetch(`/api/datos/ventas`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/datos/inventario`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/datos/escandallo`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/datos/proveedores`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (ventasRes.status === 401 || inventarioRes.status === 401 || escandalloRes.status === 401 || proveedoresRes.status === 401) {
          document.cookie = "token=; path=/; max-age=0";
          router.push("/login");
          return;
        }

        if (!ventasRes.ok || !inventarioRes.ok || !escandalloRes.ok || !proveedoresRes.ok) {
          const failedRequests = [];
          if (!ventasRes.ok) {
            const msg = await extractErrorMessage(ventasRes);
            failedRequests.push(`Ventas: ${msg}`);
          }
          if (!inventarioRes.ok) {
            const msg = await extractErrorMessage(inventarioRes);
            failedRequests.push(`Inventario: ${msg}`);
          }
          if (!escandalloRes.ok) {
            const msg = await extractErrorMessage(escandalloRes);
            failedRequests.push(`Escandallo: ${msg}`);
          }
          if (!proveedoresRes.ok) {
            const msg = await extractErrorMessage(proveedoresRes);
            failedRequests.push(`Proveedores: ${msg}`);
          }
          setError(failedRequests.join(" | "));
          setLoading(false);
          return;
        }

        const [v, i, e, p] = await Promise.all([
          ventasRes.json(),
          inventarioRes.json(),
          escandalloRes.json(),
          proveedoresRes.json(),
        ]);

        setVentas(v || []);
        setInventario(i || []);
        setEscandallo(e || []);
        setProveedores(p || []);
        setLoading(false);
      } catch (err) {
        setError(extractNetworkErrorMessage(err));
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Calcular semanas disponibles
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    ventas.forEach((v) => {
      weeks.add(getWeekNumber(new Date(v.fecha)));
    });
    return Array.from(weeks).sort();
  }, [ventas]);

  // Filtrar ventas por semana
  const filteredVentas = useMemo(() => {
    if (weekFilter === "all") return ventas;
    return ventas.filter((v) => getWeekNumber(new Date(v.fecha)) === weekFilter);
  }, [ventas, weekFilter]);

  // Datos agrupados por semana para el gráfico
  const weeklyData = useMemo(() => {
    const grouped: { [key: string]: { week: string; total: number; count: number } } = {};

    const dataToUse = weekFilter === "all" ? ventas : filteredVentas;

    dataToUse.forEach((v) => {
      const week = getWeekNumber(new Date(v.fecha));
      if (!grouped[week]) {
        grouped[week] = { week, total: 0, count: 0 };
      }
      grouped[week].total += v.total || v.cantidad_vendida * v.precio_unitario;
      grouped[week].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week));
  }, [ventas, filteredVentas, weekFilter]);

  // Top 3 productos más vendidos (por cantidad)
  const top3ProductosVendidos = useMemo(() => {
    const productoVentas: { [key: string]: { total: number; cantidad: number } } = {};

    const dataToUse = weekFilter === "all" ? ventas : filteredVentas;

    dataToUse.forEach((v) => {
      const key = v.producto;
      if (!productoVentas[key]) {
        productoVentas[key] = { total: 0, cantidad: 0 };
      }
      productoVentas[key].total += v.total || v.cantidad_vendida * v.precio_unitario;
      productoVentas[key].cantidad += v.cantidad_vendida;
    });

    return Object.entries(productoVentas)
      .map(([producto, data]) => ({ producto, ...data }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3);
  }, [ventas, filteredVentas, weekFilter]);

  // Calcular costo por producto basado en escandallo
  const costoPorProducto = useMemo(() => {
    const costo: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      const key = item.producto;
      const itemCosto = (item.cantidad || 0) * (item.precio_unidad || 0);
      costo[key] = (costo[key] || 0) + itemCosto;
    });
    return costo;
  }, [escandallo]);

  // Calcular margen bruto por venta
  const ventasConMargen = useMemo(() => {
    return ventas.map((v) => {
      const revenue = v.total || v.cantidad_vendida * v.precio_unitario;
      const costoUnit = costoPorProducto[v.producto] || 0;
      const costoTotal = costoUnit * v.cantidad_vendida;
      const margen = revenue - costoTotal;
      return { ...v, revenue, costoTotal, margen };
    });
  }, [ventas, costoPorProducto]);

  // Filtrar ventas con margen por semana
  const filteredVentasConMargen = useMemo(() => {
    if (weekFilter === "all") return ventasConMargen;
    return ventasConMargen.filter(v => getWeekNumber(new Date(v.fecha)) === weekFilter);
  }, [ventasConMargen, weekFilter]);

  // Margen bruto total
  const margenBrutoTotal = useMemo(() => {
    const dataToUse = weekFilter === "all" ? ventasConMargen : filteredVentasConMargen;
    return dataToUse.reduce((sum, v) => sum + (v.margen || 0), 0);
  }, [ventasConMargen, filteredVentasConMargen, weekFilter]);

  // Ticket medio
  const ticketMedio = useMemo(() => {
    const dataToUse = weekFilter === "all" ? ventasConMargen : filteredVentasConMargen;
    if (dataToUse.length === 0) return 0;
    const totalRevenue = dataToUse.reduce((sum, v) => sum + (v.revenue || 0), 0);
    const fechas = new Set(dataToUse.map(v => v.fecha));
    const numTickets = fechas.size || 1;
    return totalRevenue / numTickets;
  }, [ventasConMargen, filteredVentasConMargen, weekFilter]);

  // Comparativa semanal
  const comparativaSemanal = useMemo(() => {
    if (availableWeeks.length < 2) return null;

    let currentWeek: string;
    let prevWeek: string;

    if (weekFilter === "all") {
      const sorted = [...availableWeeks].sort();
      currentWeek = sorted[sorted.length - 1];
      prevWeek = sorted[sorted.length - 2];
    } else {
      const idx = availableWeeks.indexOf(weekFilter);
      if (idx <= 0) return null;
      currentWeek = weekFilter;
      prevWeek = availableWeeks[idx - 1];
    }

    const currentData = ventasConMargen.filter(v => getWeekNumber(new Date(v.fecha)) === currentWeek);
    const prevData = ventasConMargen.filter(v => getWeekNumber(new Date(v.fecha)) === prevWeek);

    const currentTotal = currentData.reduce((sum, v) => sum + (v.revenue || 0), 0);
    const prevTotal = prevData.reduce((sum, v) => sum + (v.revenue || 0), 0);
    const change = prevTotal === 0 ? 0 : ((currentTotal - prevTotal) / prevTotal) * 100;

    const currentMargen = currentData.reduce((sum, v) => sum + (v.margen || 0), 0);
    const prevMargen = prevData.reduce((sum, v) => sum + (v.margen || 0), 0);

    return {
      currentWeek,
      prevWeek,
      currentTotal,
      prevTotal,
      change,
      currentMargen,
      prevMargen,
    };
  }, [ventasConMargen, weekFilter, availableWeeks]);

  // Peores 3 platos (menor margen)
  const peores3Platos = useMemo(() => {
    const productoMargen: { [key: string]: { revenue: number; costo: number; margen: number; cantidad: number } } = {};
    const dataToUse = weekFilter === "all" ? ventasConMargen : filteredVentasConMargen;

    dataToUse.forEach((v) => {
      const key = v.producto;
      if (!productoMargen[key]) {
        productoMargen[key] = { revenue: 0, costo: 0, margen: 0, cantidad: 0 };
      }
      productoMargen[key].revenue += v.revenue || 0;
      productoMargen[key].costo += v.costoTotal || 0;
      productoMargen[key].margen += v.margen || 0;
      productoMargen[key].cantidad += v.cantidad_vendida || 0;
    });

    return Object.entries(productoMargen)
      .map(([producto, data]) => ({ producto, ...data }))
      .sort((a, b) => a.margen - b.margen)
      .slice(0, 3);
  }, [ventasConMargen, filteredVentasConMargen, weekFilter]);

  // Ventas por día de la semana
  const ventasPorDiaSemana = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dataToUse = weekFilter === "all" ? ventasConMargen : filteredVentasConMargen;
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    dataToUse.forEach((v) => {
      const day = new Date(v.fecha).getDay();
      totals[day] += v.revenue || 0;
      counts[day] += 1;
    });

    return days.map((day, idx) => ({
      day,
      total: totals[idx],
      count: counts[idx],
      avg: counts[idx] > 0 ? totals[idx] / counts[idx] : 0,
    }));
  }, [ventasConMargen, filteredVentasConMargen, weekFilter]);

  // Calcular valor total del inventario (usando precios de escandallo)
  const valorTotalInventario = useMemo(() => {
    // Crear mapa de precios por producto/ingrediente desde escandallo
    const precios: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      precios[item.ingrediente] = (precios[item.ingrediente] || 0) + (item.precio_unidad || 0);
    });
    
    return inventario.reduce((sum, item) => {
      const precio = precios[item.producto] || 0;
      return sum + (item.stock_actual * precio);
    }, 0);
  }, [inventario, escandallo]);

  // Productos con más tiempo sin moverse (rotación lenta)
  const rotacionLenta = useMemo(() => {
    return [...inventario]
      .sort((a, b) => {
        const dateA = new Date(a.fecha_ultima_compra).getTime();
        const dateB = new Date(b.fecha_ultima_compra).getTime();
        return dateA - dateB; // Más antiguo primero
      })
      .slice(0, 5) // Top 5 productos más lentos
      .map(item => ({
        ...item,
        diasEnStock: Math.floor((new Date().getTime() - new Date(item.fecha_ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
      }));
  }, [inventario]);

  // Productos con stock bajo
  const productosBajoStock = useMemo(() => {
    return inventario
      .filter(item => item.stock_actual <= item.stock_minimo)
      .sort((a, b) => (a.stock_actual / a.stock_minimo) - (b.stock_actual / b.stock_minimo));
  }, [inventario]);

  // Calcular gasto y úlítimo pedido por proveedor
  const proveedorStats = useMemo(() => {
    // Crear mapa de producto → proveedor (asumiendo que "ingrediente" en escandallo es el proveedor)
    const productoAProveedor: { [key: string]: string } = {};
    escandallo.forEach((item) => {
      // Buscar si el ingrediente coincide con algún proveedor
      const proveedor = proveedores.find(p => 
        p.proveedor.toLowerCase() === item.ingrediente.toLowerCase()
      );
      if (proveedor && !productoAProveedor[item.producto]) {
        productoAProveedor[item.producto] = proveedor.proveedor;
      }
    });

    // Para cada proveedor, calcular:
    // 1. Última compra (desde inventario, buscando productos de ese proveedor)
    // 2. Gasto total (desde escandallo, sumando costos de ingredientes)
    return proveedores.map(p => {
      // Encontrar productos de este proveedor
      const productosDeProveedor = Object.keys(productoAProveedor).filter(
        key => productoAProveedor[key] === p.proveedor
      );

      // Gasto total: sumar costos de escandallo para ingredientes de este proveedor
      const gastoTotal = escandallo
        .filter(item => item.ingrediente.toLowerCase() === p.proveedor.toLowerCase())
        .reduce((sum, item) => sum + (item.cantidad || 0) * (item.precio_unidad || 0), 0);

      // Última compra: buscar en inventario la fecha más reciente de productos de este proveedor
      let ultimaCompra: Date | null = null;
      inventario.forEach(item => {
        if (productosDeProveedor.includes(item.producto)) {
          const fecha = new Date(item.fecha_ultima_compra);
          if (!ultimaCompra || fecha > ultimaCompra) {
            ultimaCompra = fecha;
          }
        }
      });

      // Si no hay productos directos, usar fecha_ultima_compra del producto más reciente en inventario
      if (!ultimaCompra && inventario.length > 0) {
        const masReciente = inventario.reduce((max, item) => {
          const fecha = new Date(item.fecha_ultima_compra);
          return fecha > max ? fecha : max;
        }, new Date(0));
        ultimaCompra = masReciente;
      }

      return {
        ...p,
        gastoTotal,
        ultimaCompra: ultimaCompra ? ultimaCompra.toISOString() : null,
      };
    });
  }, [proveedores, escandallo, inventario]);

  const rentabilidadProductos = useMemo(() => {
    // Mapa de precio de venta por producto (desde ventas)
    const preciosVenta: { [key: string]: number } = {};
    ventas.forEach((v) => {
      const precio = (v.total || v.cantidad_vendida * v.precio_unitario) / v.cantidad_vendida;
      if (precio) preciosVenta[v.producto] = precio;
    });

    // Calcular costo por producto (desde escandallo)
    const costoPorProducto: { [key: string]: number } = {};
    escandallo.forEach((item) => {
      const key = item.producto;
      const itemCosto = (item.cantidad || 0) * (item.precio_unidad || 0);
      costoPorProducto[key] = (costoPorProducto[key] || 0) + itemCosto;
    });

    // Crear lista con rentabilidad
    const productos = new Set([...Object.keys(preciosVenta), ...Object.keys(costoPorProducto)]);
    return Array.from(productos).map(producto => {
      const precioVenta = preciosVenta[producto] || 0;
      const costo = costoPorProducto[producto] || 0;
      const margen = precioVenta > 0 ? ((precioVenta - costo) / precioVenta) * 100 : 0;
      return { producto, precioVenta, costo, margen };
    }).sort((a, b) => b.margen - a.margen);
  }, [ventas, escandallo]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--text-muted)" }}>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="page-shell-compact stack-lg">
      <div className="page-hero" style={{ marginBottom: 0 }}>
      <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        📊 Visualizar Datos
      </h1>
      <p className="page-subtitle">
        Explora ventas, inventario, escandallo y proveedores con la misma identidad visual del resto de la app.
      </p>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(194, 76, 42, 0.08)",
            border: "1px solid rgba(194, 76, 42, 0.22)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            color: "var(--primary)",
          }}
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="pill-tabs">
        {(["ventas", "inventario", "escandallo", "proveedores"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pill-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === "ventas" && "📈 Ventas"}
            {tab === "inventario" && "📦 Inventario"}
            {tab === "escandallo" && "🔄 Escandallo"}
            {tab === "proveedores" && "🏢 Proveedores"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="section-card section-card--pad stack-lg">
        {activeTab === "ventas" && (
          <div>
            {/* Stats Cards */}
            <div className="metric-grid metric-grid-4">
              <StatCard label="Margen Bruto Total" value={`€${margenBrutoTotal.toFixed(2)}`} color="var(--secondary)" />
              <StatCard label="Ticket Medio" value={`€${ticketMedio.toFixed(2)}`} color="var(--primary)" />
              <StatCard label="Total Ventas" value={(weekFilter === "all" ? ventas : filteredVentas).reduce((sum, v) => sum + (v.total || v.cantidad_vendida * v.precio_unitario), 0).toFixed(2)} color="var(--secondary)" />
              <StatCard label="Nº Productos" value={new Set((weekFilter === "all" ? ventas : filteredVentas).map(v => v.producto)).size.toString()} color="var(--primary)" />
            </div>

            {/* Comparativa Semanal */}
            {comparativaSemanal && (
              <div className="section-card section-card--pad" style={{ background: comparativaSemanal.change >= 0 ? "rgba(31,91,87,0.08)" : "rgba(194,76,42,0.08)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 32 }}>
                  {comparativaSemanal.change >= 0 ? "📈" : "📉"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                    Comparativa: {comparativaSemanal.currentWeek} vs {comparativaSemanal.prevWeek}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 24, fontWeight: 700, color: comparativaSemanal.change >= 0 ? "var(--secondary)" : "var(--primary)" }}>
                    {comparativaSemanal.change >= 0 ? "+" : ""}{comparativaSemanal.change.toFixed(1)}%
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Esta semana</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                    €{comparativaSemanal.currentTotal.toFixed(2)}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    Margen: €{comparativaSemanal.currentMargen.toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Semana anterior</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                    €{comparativaSemanal.prevTotal.toFixed(2)}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    Margen: €{comparativaSemanal.prevMargen.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 8 }}>
              <div>
                <VentasTab data={filteredVentas} />
              </div>
              <div>
                {/* Evolución de Ventas */}
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
                  📈 Evolución de Ventas
                </h3>
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Filtrar por semana:</label>
                  <select
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="input-field"
                    style={{ marginTop: 0, maxWidth: 220 }}
                  >
                    <option value="all">Todas las semanas</option>
                    {availableWeeks.map((week) => (
                      <option key={week} value={week}>{week}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                      <Bar dataKey="total" fill="var(--secondary)" name="Total Ventas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ventas por día de la semana */}
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", marginTop: 32 }}>
                  📅 Ventas por Día de la Semana
                </h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={ventasPorDiaSemana}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                      <Bar dataKey="total" fill="var(--primary)" name="Total Ventas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top 3 Platos Más Vendidos */}
            <div style={{ marginTop: 48 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>
                🏆 Top 3 Platos Más Vendidos
              </h3>
              {top3ProductosVendidos.length > 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 28, height: 260, flexWrap: "wrap" }}>
                  {/* 2do lugar */}
                  {top3ProductosVendidos[1] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥈</div>
                      <div style={{ background: "linear-gradient(180deg, rgba(31,91,87,0.96) 0%, rgba(31,91,87,0.84) 100%)", color: "white", padding: "12px 8px", borderRadius: "12px 12px 0 0", height: 92, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, boxShadow: "0 12px 30px rgba(36,24,20,0.14)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        {top3ProductosVendidos[1].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>€{top3ProductosVendidos[1].total.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "var(--secondary)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        2°
                      </div>
                    </div>
                  )}

                  {/* 1er lugar */}
                  {top3ProductosVendidos[0] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥇</div>
                      <div style={{ background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)", color: "white", padding: "18px 8px", borderRadius: "12px 12px 0 0", height: 112, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, boxShadow: "0 16px 40px rgba(36,24,20,0.20)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        {top3ProductosVendidos[0].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>€{top3ProductosVendidos[0].total.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        1°
                      </div>
                    </div>
                  )}

                  {/* 3er lugar */}
                  {top3ProductosVendidos[2] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥉</div>
                      <div style={{ background: "linear-gradient(180deg, rgba(194,76,42,0.96) 0%, rgba(194,76,42,0.84) 100%)", color: "white", padding: "12px 8px", borderRadius: "12px 12px 0 0", height: 72, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, boxShadow: "0 12px 28px rgba(36,24,20,0.16)" }}>
                        {top3ProductosVendidos[2].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>€{top3ProductosVendidos[2].total.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "var(--primary)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        3°
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
                  No hay datos suficientes
                </div>
              )}
            </div>

            {/* Peores 3 Platos (Menor Margen) */}
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>
                ⚠️ Peores 3 Platos (Menor Margen)
              </h3>
              {peores3Platos.length > 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 28, height: 260, flexWrap: "wrap" }}>
                  {/* 2do peor */}
                  {peores3Platos[1] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥈</div>
                      <div style={{ background: "linear-gradient(180deg, rgba(197,139,40,0.96) 0%, rgba(197,139,40,0.84) 100%)", color: "white", padding: "12px 8px", borderRadius: "12px 12px 0 0", height: 92, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 30px rgba(36,24,20,0.14)" }}>
                        {peores3Platos[1].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>Margen: €{peores3Platos[1].margen.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "var(--accent)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        2°
                      </div>
                    </div>
                  )}

                  {/* 1er peor */}
                  {peores3Platos[0] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥇</div>
                      <div style={{ background: "linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)", color: "white", padding: "18px 8px", borderRadius: "12px 12px 0 0", height: 112, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, boxShadow: "0 16px 40px rgba(36,24,20,0.20)" }}>
                        {peores3Platos[0].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>Margen: €{peores3Platos[0].margen.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "var(--primary)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        1°
                      </div>
                    </div>
                  )}

                  {/* 3er peor */}
                  {peores3Platos[2] && (
                    <div style={{ textAlign: "center", width: 120 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🥉</div>
                      <div style={{ background: "linear-gradient(180deg, rgba(197,139,40,0.96) 0%, rgba(197,139,40,0.84) 100%)", color: "white", padding: "12px 8px", borderRadius: "12px 12px 0 0", height: 72, display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: 600, fontSize: 14, boxShadow: "0 12px 28px rgba(36,24,20,0.16)" }}>
                        {peores3Platos[2].producto}
                        <span style={{ fontSize: 12, opacity: 0.92 }}>Margen: €{peores3Platos[2].margen.toFixed(2)}</span>
                      </div>
                      <div style={{ background: "var(--accent)", color: "white", padding: "4px", borderRadius: "0 0 12px 12px", fontWeight: 700 }}>
                        3°
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>
                  No hay datos suficientes
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "inventario" && (
          <InventarioTab 
            data={inventario} 
            valorTotal={valorTotalInventario}
            rotacionLenta={rotacionLenta}
            productosBajoStock={productosBajoStock}
          />
        )}
        {activeTab === "escandallo" && (
          <EscandalloTab 
            data={escandallo} 
            rentabilidad={rentabilidadProductos}
          />
        )}
        {activeTab === "proveedores" && (
          <ProveedoresTab 
            data={proveedores} 
            stats={proveedorStats}
          />
        )}
      </div>
    </div>
  );
}

// ===== VENTAS TAB =====
function VentasTab({ data }: { data: Venta[] }) {
  if (data.length === 0) {
    return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No hay datos de ventas</div>;
  }

  const totalVentas = data.reduce((sum, v) => sum + (v.total || v.cantidad_vendida * v.precio_unitario), 0);
  const cantidadPromedio = (data.reduce((sum, v) => sum + v.cantidad_vendida, 0) / data.length).toFixed(2);
  const productos = new Set(data.map((v) => v.producto)).size;

  return (
    <div className="stack-lg">
      <div className="metric-grid metric-grid-3" style={{ marginBottom: 28 }}>
        <StatCard label="Total Ventas" value={totalVentas.toFixed(2)} color="var(--secondary)" />
        <StatCard label="Cantidad Promedio" value={cantidadPromedio} color="var(--primary)" />
        <StatCard label="Productos Vendidos" value={productos.toString()} color="var(--secondary)" />
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
        Detalle de Ventas
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 12,
        }}
      >
        <thead>
          <tr style={{ background: "rgba(255,248,236,0.72)", borderBottom: "2px solid var(--border-light)" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-muted)" }}>Fecha</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-muted)" }}>Producto</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-muted)" }}>Cantidad</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-muted)" }}>Precio</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-muted)" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((venta, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid rgba(56,41,31,0.08)" }}>
              <td style={{ padding: 12, color: "var(--text-secondary)" }}>
                {new Date(venta.fecha).toLocaleDateString("es-ES")}
              </td>
              <td style={{ padding: 12, color: "var(--text-primary)" }}>{venta.producto}</td>
              <td style={{ padding: 12, textAlign: "right", color: "var(--text-secondary)" }}>{venta.cantidad_vendida}</td>
              <td style={{ padding: 12, textAlign: "right", color: "var(--text-secondary)" }}>€{venta.precio_unitario.toFixed(2)}</td>
              <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--secondary)" }}>
                €{(venta.total || venta.cantidad_vendida * venta.precio_unitario).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== INVENTARIO TAB =====
function InventarioTab({ 
  data, 
  valorTotal, 
  rotacionLenta, 
  productosBajoStock 
}: { 
  data: InventarioItem[]; 
  valorTotal: number; 
  rotacionLenta: { producto: string; stock_actual: number; stock_minimo: number; fecha_ultima_compra: string; diasEnStock?: number }[]; 
  productosBajoStock: InventarioItem[] 
}) {
  if (data.length === 0) {
    return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No hay datos de inventario</div>;
  }

  const bajoStock = data.filter((i) => i.stock_actual <= i.stock_minimo).length;
  const totalProductos = data.length;
  const stockPromedio = (data.reduce((sum, i) => sum + i.stock_actual, 0) / data.length).toFixed(0);

  return (
    <div>
      {/* Stats Cards */}
      <div className="metric-grid metric-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Valor Total" value={`€${valorTotal.toFixed(2)}`} color="var(--primary)" />
        <StatCard label="Productos" value={totalProductos.toString()} color="var(--secondary)" />
        <StatCard label="Bajo Stock" value={bajoStock.toString()} color={bajoStock > 0 ? "var(--primary)" : "var(--secondary)"} />
        <StatCard label="Stock Promedio" value={stockPromedio} color="var(--primary)" />
      </div>

      {/* Alertas de Stock Mínimo */}
      {productosBajoStock.length > 0 && (
        <div style={{ 
          marginBottom: 24, 
          padding: "20px 24px", 
          background: "rgba(194, 76, 42, 0.06)", 
          border: "1px solid rgba(194, 76, 42, 0.22)", 
          borderRadius: 16 
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ Alertas de Stock Mínimo
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "rgba(194, 76, 42, 0.08)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Producto</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Stock Actual</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Mínimo</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Faltante</th>
                </tr>
              </thead>
              <tbody>
                {productosBajoStock.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(56,41,31,0.08)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{item.producto}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{item.stock_actual}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-secondary)" }}>{item.stock_minimo}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>{item.stock_minimo - item.stock_actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rotación - Productos con más tiempo sin moverse */}
      {rotacionLenta.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            🐌 Rotación - Productos Más Tiempo sin Moverse
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "rgba(255, 248, 236, 0.72)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>#</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Producto</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Stock Actual</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Última Compra</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Días en Stock</th>
                </tr>
              </thead>
              <tbody>
                {rotacionLenta.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{item.producto}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--secondary)", fontWeight: 600 }}>{item.stock_actual}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      {new Date(item.fecha_ultima_compra).toLocaleDateString("es-ES")}
                    </td>
                    <td style={{ 
                      padding: "12px 16px", 
                      textAlign: "right", 
                      color: (item.diasEnStock ?? 0) > 60 ? "var(--primary)" : (item.diasEnStock ?? 0) > 30 ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: 600 
                    }}>
                      {(item.diasEnStock ?? 0).toFixed(0)} días
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado del Inventario - Tabla completa */}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
        📦 Estado del Inventario
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 12,
        }}
      >
        <thead>
          <tr style={{ background: "rgba(255, 248, 236, 0.72)", borderBottom: "2px solid var(--border-light)" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Producto</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Stock Actual</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Stock Mínimo</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Estado</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Última Compra</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => {
            const estado = item.stock_actual <= item.stock_minimo ? "⚠️ Bajo Stock" : "✓ Normal";
            const statusColor = item.stock_actual <= item.stock_minimo ? "var(--primary)" : "var(--secondary)";

            return (
              <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 12, color: "var(--text-primary)", fontWeight: 600 }}>{item.producto}</td>
                <td style={{ padding: 12, textAlign: "right", color: statusColor, fontWeight: 600 }}>
                  {item.stock_actual}
                </td>
                <td style={{ padding: 12, textAlign: "right", color: "var(--text-secondary)" }}>{item.stock_minimo}</td>
                <td style={{ padding: 12, color: statusColor, fontWeight: 600 }}>{estado}</td>
                <td style={{ padding: 12, color: "var(--text-secondary)" }}>
                  {new Date(item.fecha_ultima_compra).toLocaleDateString("es-ES")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===== ESCANDALLO TAB =====
function EscandalloTab({ 
  data, 
  rentabilidad 
}: { 
  data: Escandallo[];
  rentabilidad: { producto: string; precioVenta: number; costo: number; margen: number }[] 
}) {
  if (data.length === 0) {
    return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No hay datos de escandallo</div>;
  }

  const productos = new Set(data.map((e) => e.producto)).size;
  const costoTotal = data.reduce((sum, e) => sum + e.precio_unidad * e.cantidad, 0);
  const costoPromedio = (costoTotal / data.length).toFixed(2);
  
  // Calcular promedio de margen
  const margenPromedio = rentabilidad.length > 0 
    ? rentabilidad.reduce((sum, r) => sum + r.margen, 0) / rentabilidad.length 
    : 0;

  return (
    <div>
      {/* Stats Cards */}
      <div className="metric-grid metric-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Productos" value={productos.toString()} color="var(--secondary)" />
        <StatCard label="Ingredientes" value={data.length.toString()} color="var(--primary)" />
        <StatCard label="Costo Promedio" value={`€${costoPromedio}`} color="var(--primary)" />
        <StatCard 
          label="Margen Promedio" 
          value={margenPromedio.toFixed(1) + "%"} 
          color={margenPromedio >= 30 ? "var(--secondary)" : margenPromedio >= 15 ? "var(--accent)" : "var(--primary)"} 
        />
      </div>

      {/* Semáforo de Rentabilidad */}
      <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            🚦 Semáforo de Rentabilidad
          </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
                <tr style={{ background: "rgba(255, 248, 236, 0.72)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>#</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Producto</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Precio Venta</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Costo</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Margen %</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "var(--text-primary)" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rentabilidad.map((r, idx) => {
                const color = r.margen >= 30 ? "var(--secondary)" : r.margen >= 15 ? "var(--accent)" : "var(--primary)";
                const icon = r.margen >= 30 ? "🟢" : r.margen >= 15 ? "🟡" : "🔴";
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{r.producto}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--secondary)", fontWeight: 600 }}>
                      €{r.precioVenta.toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--primary)" }}>
                      €{r.costo.toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color, fontWeight: 700 }}>
                      {r.margen.toFixed(1)}%
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 20 }}>
                      {icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Costo vs Precio Venta - Barra Visual */}
      <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📊 Costo Real vs Precio de Venta
          </h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={rentabilidad}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="producto" />
              <YAxis />
              <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
              <Bar dataKey="costo" fill="var(--primary)" name="Costo" />
              <Bar dataKey="precioVenta" fill="var(--secondary)" name="Precio Venta" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulador de Precio */}
      <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ⚙️ Simulador de Precio
          </h3>
        <SimuladorPrecio rentabilidad={rentabilidad} />
      </div>

      {/* Composición de Productos (Tabla Original) */}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
        🧪 Composición de Productos
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 12,
        }}
      >
        <thead>
          <tr style={{ background: "rgba(255, 248, 236, 0.72)", borderBottom: "2px solid var(--border-light)" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Producto</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Ingrediente</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Cantidad</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Unidad</th>
            <th style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Precio Unit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 12, color: "var(--text-primary)", fontWeight: 600 }}>{item.producto}</td>
              <td style={{ padding: 12, color: "var(--text-secondary)" }}>{item.ingrediente}</td>
              <td style={{ padding: 12, textAlign: "right", color: "var(--text-secondary)" }}>{item.cantidad}</td>
              <td style={{ padding: 12, color: "var(--text-secondary)" }}>{item.unidad}</td>
              <td style={{ padding: 12, textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>
                €{item.precio_unidad.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== PROVEEDORES TAB =====
function ProveedoresTab({ 
  data, 
  stats 
}: { 
  data: Proveedor[]; 
  stats: { proveedor: string; cif: string; email: string; telefono: string; direccion: string; gastoTotal: number; ultimaCompra: string | null }[] 
}) {
  if (data.length === 0) {
    return <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>No hay datos de proveedores</div>;
  }

  // Mapa de stats por proveedor
  const statsMap: { [key: string]: { gastoTotal: number; ultimaCompra: string | null } } = {};
  stats.forEach(s => {
    statsMap[s.proveedor] = { gastoTotal: s.gastoTotal, ultimaCompra: s.ultimaCompra };
  });

  // Combinar datos principales con stats
  const dataConStats = data.map(p => ({
    ...p,
    ...(statsMap[p.proveedor] || { gastoTotal: 0, ultimaCompra: null }),
  }));

  // Ordenar por última compra (más reciente primero)
  const sorted = [...dataConStats].sort((a, b) => {
    if (!a.ultimaCompra && !b.ultimaCompra) return 0;
    if (!a.ultimaCompra) return 1;
    if (!b.ultimaCompra) return -1;
    return new Date(b.ultimaCompra).getTime() - new Date(a.ultimaCompra).getTime();
  });

  const gastoTotalTodos = stats.reduce((sum, s) => sum + s.gastoTotal, 0);

  return (
    <div>
      {/* Stats Cards */}
      <div className="metric-grid metric-grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Total Proveedores" value={data.length.toString()} color="var(--secondary)" />
        <StatCard label="Emails" value={data.filter((p) => p.email).length.toString()} color="var(--primary)" />
        <StatCard label="Gasto Total" value={`€${gastoTotalTodos.toFixed(2)}`} color="var(--primary)" />
      </div>

      {/* Último Pedido por Proveedor */}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
        📦 Último Pedido por Proveedor
      </h3>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(255, 248, 236, 0.72)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>#</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Proveedor</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>CIF</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Email</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>Gasto Total</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Último Pedido</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => (
              <tr 
                key={idx} 
                style={{ 
                  borderBottom: "1px solid rgba(56,41,31,0.08)",
                  background: idx % 2 === 0 ? "rgba(255,252,246,0.94)" : "rgba(255,248,236,0.72)",
                }}
              >
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{idx + 1}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{item.proveedor}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-secondary)" }}>{item.cif}</td>
                <td style={{ padding: "12px 16px", color: "var(--primary)" }}>
                  {item.email ? (
                    <a href={`mailto:${item.email}`} style={{ textDecoration: "none" }}>
                      {item.email}
                    </a>
                  ) : "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>
                  €{(item.gastoTotal || 0).toFixed(2)}
                </td>
                <td style={{ padding: "12px 16px", color: item.ultimaCompra ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {item.ultimaCompra 
                    ? new Date(item.ultimaCompra).toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" })
                    : "Sin pedidos"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Listado Completo */}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
        📋 Listado de Proveedores
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 12,
        }}
      >
        <thead>
          <tr style={{ background: "rgba(255, 248, 236, 0.72)", borderBottom: "2px solid var(--border-light)" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Proveedor</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>CIF</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Email</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Teléfono</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "var(--text-primary)" }}>Dirección</th>
          </tr>
        </thead>
        <tbody>
          {data.map((proveedor, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 12, color: "var(--text-primary)", fontWeight: 600 }}>{proveedor.proveedor}</td>
              <td style={{ padding: 12, color: "var(--text-secondary)" }}>{proveedor.cif}</td>
              <td style={{ padding: 12, color: "var(--primary)" }}>
                <a href={`mailto:${proveedor.email}`} style={{ textDecoration: "none" }}>
                  {proveedor.email}
                </a>
              </td>
              <td style={{ padding: 12, color: "var(--text-secondary)" }}>{proveedor.telefono}</td>
              <td style={{ padding: 12, color: "var(--text-secondary)", fontSize: 13 }}>{proveedor.direccion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== STAT CARD COMPONENT =====
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const bgColor = color === "var(--secondary)"
    ? "rgba(31, 91, 87, 0.10)"
    : color === "var(--accent)"
      ? "rgba(197, 139, 40, 0.14)"
      : "rgba(194, 76, 42, 0.10)";
  return (
    <div
      style={{
        background: bgColor,
        border: `1.5px solid ${color}`,
        borderRadius: 16,
        padding: 22,
        textAlign: "center",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        boxShadow: "0 10px 28px rgba(36,24,20,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 16px 36px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(36,24,20,0.06)";
      }}
    >
      <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ===== SIMULADOR PRECIO COMPONENT =====
function SimuladorPrecio({ rentabilidad }: { rentabilidad: { producto: string; precioVenta: number; costo: number; margen: number }[] }) {
  const [selectedProducto, setSelectedProducto] = useState<string>("");
  const [priceChange, setPriceChange] = useState<number>(0);
  
  const selectedData = rentabilidad.find(r => r.producto === selectedProducto);
  
  const newPrice = selectedData ? selectedData.precioVenta + priceChange : 0;
  const newMargen = selectedData && newPrice > 0 ? (
    (newPrice - selectedData.costo) / newPrice
  ) * 100 : 0;
  
  const margenColor = newMargen >= 30 ? "var(--secondary)" : newMargen >= 15 ? "var(--accent)" : "var(--primary)";
  
  return (
    <div className="section-card section-card--pad">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Selecciona un plato:</label>
          <select
            value={selectedProducto}
            onChange={(e) => {
              setSelectedProducto(e.target.value);
              setPriceChange(0);
            }}
            className="input-field"
            style={{ marginTop: 0 }}
          >
            <option value="">-- Elige un plato --</option>
            {rentabilidad.map((r, i) => (
              <option key={i} value={r.producto}>{r.producto} {r.costo === 0 ? "⚠️" : ""}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
            {priceChange >= 0 ? "📈 Subir" : "📉 Bajar"} precio en:
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.5"
              value={priceChange}
              onChange={(e) => setPriceChange(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontWeight: 700, color: priceChange >= 0 ? "var(--secondary)" : "var(--primary)", minWidth: 60, textAlign: "right" }}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}€
            </span>
          </div>
        </div>
      </div>

      {selectedData && (
        <div>
            {selectedData.costo === 0 && (
            <div style={{ background: "rgba(197,139,40,0.14)", border: "1px solid rgba(197,139,40,0.3)", borderRadius: 12, padding: 12, marginBottom: 16, color: "#6F4C10" }}>
              ⚠️ <strong>{selectedData.producto}</strong> no tiene datos de escandallo. El margen mostrado no es real (costo = €0).
              <br />Sube un archivo de escandallo con este producto para ver márgenes reales.
            </div>
          )}
            <div className="metric-grid metric-grid-4" style={{ marginBottom: 20 }}>
            <div style={{ background: "rgba(31,91,87,0.10)", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Precio Actual</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--secondary)" }}>€{selectedData.precioVenta.toFixed(2)}</div>
            </div>
            <div style={{ background: newPrice > 0 ? "rgba(194,76,42,0.10)" : "rgba(194,76,42,0.08)", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Nuevo Precio</div>
              {newPrice > 0 ? (
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>€{newPrice.toFixed(2)}</div>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>Precio inválido (≤ €0)</div>
              )}
            </div>
            <div style={{ background: "rgba(31,91,87,0.10)", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Margen Actual</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--secondary)" }}>{selectedData.margen.toFixed(1)}%</div>
            </div>
            <div style={{ background: `${newPrice > 0 ? (newMargen >= 30 ? "rgba(31, 91, 87, 0.10)" : newMargen >= 15 ? "rgba(197, 139, 40, 0.12)" : "rgba(194, 76, 42, 0.10)") : "rgba(194, 76, 42, 0.08)"}`, padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Nuevo Margen</div>
              {newPrice > 0 ? (
                <div style={{ fontSize: 24, fontWeight: 700, color: margenColor }}>{newMargen.toFixed(1)}%</div>
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>N/A</div>
              )}
            </div>
          </div>

          {newPrice > 0 && selectedData.costo > 0 && (
            <div style={{ background: "linear-gradient(135deg, rgba(255,248,236,0.9) 0%, rgba(255,252,246,0.9) 100%)", borderRadius: 12, padding: 20 }}>
              <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)" }}>
                {priceChange >= 0 ? (
                  <>📈 Si subes <strong>{selectedData.producto}</strong> de <strong>€{selectedData.precioVenta.toFixed(2)}</strong> a <strong>€{newPrice.toFixed(2)}</strong>, tu margen pasa de <strong>{selectedData.margen.toFixed(1)}%</strong> a <strong style={{ color: margenColor }}>{newMargen.toFixed(1)}%</strong></>
                ) : (
                  <>📉 Si bajas <strong>{selectedData.producto}</strong> de <strong>€{selectedData.precioVenta.toFixed(2)}</strong> a <strong>€{newPrice.toFixed(2)}</strong>, tu margen baja de <strong>{selectedData.margen.toFixed(1)}%</strong> a <strong style={{ color: margenColor }}>{newMargen.toFixed(1)}%</strong></>
                )}
              </p>
            <div style={{ height: 8, background: "rgba(80,55,42,0.12)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ 
                width: `${Math.min(selectedData.margen, 100)}%`, 
                height: "100%", 
                background: selectedData.margen >= 30 ? "var(--secondary)" : selectedData.margen >= 15 ? "var(--accent)" : "var(--primary)",
                borderRadius: 4,
                transition: "all 0.3s ease"
              }}></div>
            </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
               <span>0%</span>
               <span>30% (Objetivo)</span>
               <span>50%+</span>
             </div>
           </div>
         )}
         </div>
       )}
     </div>
   );
 }
