import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-provider";
import MonitorInit from "@/lib/monitor-init";

export const metadata: Metadata = {
  title: "Ordy POS",
  description: "Sistema POS para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <MonitorInit />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
