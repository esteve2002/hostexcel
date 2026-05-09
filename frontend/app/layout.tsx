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
      <body style={{ margin: 0, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", backgroundColor: "var(--gray-50)" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
