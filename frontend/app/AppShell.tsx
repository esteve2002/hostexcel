'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type SessionUser = {
  email: string;
  nombre_restaurante: string;
  plan?: string | null;
};

function getTokenFromCookie() {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('token='))
    ?.split('=')[1] ?? null;
}

function getSessionInitials(sessionUser: SessionUser | null) {
  const source = sessionUser?.nombre_restaurante?.trim() || sessionUser?.email?.trim() || 'HX';
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return 'HX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPublicRoot = pathname === '/';
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthPage) return;

    const token = getTokenFromCookie();
    setSessionToken(token);

    if (!token) {
      if (isPublicRoot) {
        return;
      }

      router.replace('/login');
      return;
    }

    let active = true;

    const loadSession = async () => {
      setSessionLoading(true);
      setSessionUser(null);

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 404) {
          document.cookie = 'token=; path=/; max-age=0';
          setSessionToken(null);
          router.replace('/login');
          return;
        }

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        if (active) {
          setSessionUser(data);
        }
      } finally {
        if (active) {
          setSessionLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      active = false;
    };
  }, [isAuthPage, router]);

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    setSessionToken(null);
    setSessionUser(null);
    router.replace('/');
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isPublicRoot) {
    return <>{children}</>;
  }

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/dashboard', label: 'Inicio', icon: '📊' },
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

        <div className="sidebar-session card" style={{ marginBottom: 18 }}>
          <div className="sidebar-session-row">
            <div className="sidebar-session-avatar">
              {sessionLoading ? '…' : getSessionInitials(sessionUser)}
            </div>
            <span className="session-status-pill">
              <span className="session-status-dot" />
              {sessionLoading ? 'Verificando' : 'Sesión activa'}
            </span>
          </div>
          <div className="sidebar-session-name">
            {sessionUser?.nombre_restaurante || 'HostExcel'}
          </div>
          <div className="sidebar-session-email">
            {sessionUser?.email || 'Preparando tu espacio de trabajo'}
          </div>
          {sessionUser?.plan && (
            <div className="sidebar-session-plan">Plan {sessionUser.plan}</div>
          )}
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

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <span aria-hidden="true">⟲</span>
          Cerrar sesión
        </button>

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
