export const dynamic = "force-static";

import "./globals.css";
import AppShell from "./AppShell";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata = {
  title: "HostExcel",
  description: "Gestión inteligente de Excels para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${ibmPlexSans.variable}`}>
      <body style={{ margin: 0, backgroundColor: "var(--bg-warm)" }}>
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
