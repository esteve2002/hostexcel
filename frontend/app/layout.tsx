export const dynamic = "force-static";

import "./globals.css";
import AppShell from "./AppShell";

export const metadata = {
  title: "HostExcel",
  description: "Gestión inteligente de Excels para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: "var(--bg-warm)" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
