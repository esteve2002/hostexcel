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
    { href: '/', label: 'Inicio', icon: '📊' },
    { href: '/subir-excel', label: 'Subir Excel', icon: '📤' },
    { href: '/historial', label: 'Historial', icon: '📁' },
    { href: '/visualizar', label: 'Visualizar', icon: '📈' },
    { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="brand-area" style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "4px 12px 0",
          marginBottom: "36px",
        }}>
          <div
            className="brand-mark"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "18px",
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            H
          </div>
          <div>
            <div style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "white",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.3px",
              lineHeight: 1.2,
            }}>
              HostExcel
            </div>
            <div style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              fontWeight: 500,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginTop: 1,
            }}>
              Restaurantes
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`nav-link ${active ? 'active' : ''}`}
              >
                <span style={{ fontSize: "16px", opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footnote" style={{
          padding: "12px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.25)",
          textAlign: "center",
        }}>
          © {new Date().getFullYear()} HostExcel
        </div>
      </aside>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
