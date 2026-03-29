import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bling × Suri — Painel de Integração",
  description: "Dashboard de sincronização entre Bling ERP e Suri Atendimento",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
