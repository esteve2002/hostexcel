'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/', label: 'INICIO', icon: '📊' },
    { href: '/subir-excel', label: 'SUBIR EXCEL', icon: '📤' },
    { href: '/historial', label: 'HISTORIAL', icon: '📁' },
    { href: '/visualizar', label: 'VISUALIZAR', icon: '📈' },
    { href: '/configuracion', label: 'CONFIGURACIÓN', icon: '⚙️' },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          backgroundColor: "var(--sidebar-bg)",
          width: "240px",
          minHeight: "100vh",
          padding: "28px 12px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "0 12px",
          marginBottom: "44px",
        }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #7A9E56 0%, #C4953E 100%)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "20px",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.5px",
              boxShadow: "0 4px 16px rgba(196, 149, 62, 0.25)",
            }}
          >
            H
          </div>
          <div>
            <div style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "white",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.5px",
              lineHeight: 1.2,
            }}>
              HostExcel
            </div>
            <div style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 500,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}>
              Restaurantes
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                style={{
                  color: active ? "white" : "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  fontWeight: active ? 600 : 500,
                  fontSize: "13px",
                  letterSpacing: "0.3px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s ease",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  }
                }}
              >
                {active && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 20,
                    borderRadius: "0 3px 3px 0",
                    background: "linear-gradient(180deg, #7A9E56, #C4953E)",
                  }} />
                )}
                <span style={{ fontSize: "16px", opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{
          padding: "16px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 500, letterSpacing: "0.5px" }}>
            © {new Date().getFullYear()} HostExcel
          </div>
        </div>
      </aside>

      <main style={{
        flex: 1,
        marginLeft: "240px",
        padding: "32px 40px",
        minHeight: "100vh",
      }}>
        {children}
      </main>
    </div>
  );
}
