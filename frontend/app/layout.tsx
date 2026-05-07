export const dynamic = "force-static";

import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "HostExcel",
  description: "Gestión inteligente de Excels para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", backgroundColor: "var(--gray-50)" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside
            style={{
              backgroundColor: "#1a1a2e",
              color: "#ffffff",
              width: "260px",
              minHeight: "100vh",
              boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 100,
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  background: "linear-gradient(135deg, #008A0E 0%, #293AFF 100%)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "20px",
                  boxShadow: "0 4px 12px rgba(0, 138, 14, 0.3)",
                }}
              >
                H
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", margin: 0, letterSpacing: "0.5px" }}>
                HostExcel
              </h1>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <Link
                href="/subir-excel"
                prefetch={false}
                className="sidebar-link sidebar-link-green"
                style={{
                  color: "#b0b0b0",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "18px" }}>📤</span>
                SUBIR EXCEL
              </Link>

              <Link
                href="/historial"
                prefetch={false}
                className="sidebar-link sidebar-link-blue"
                style={{
                  color: "#b0b0b0",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "18px" }}>📁</span>
                HISTORIAL
              </Link>

              <Link
                href="/visualizar"
                prefetch={false}
                className="sidebar-link sidebar-link-blue"
                style={{
                  color: "#b0b0b0",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "18px" }}>📊</span>
                VISUALIZAR DATOS
              </Link>

              <Link
                href="/configuracion"
                prefetch={false}
                className="sidebar-link sidebar-link-green"
                style={{
                  color: "#b0b0b0",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "18px" }}>⚙️</span>
                CONFIGURACIÓN
              </Link>
            </nav>

            {/* Footer */}
            <div style={{ color: "#666", fontSize: "12px", textAlign: "center", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              © {new Date().getFullYear()} HostExcel
            </div>
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, marginLeft: "260px", padding: "40px" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
