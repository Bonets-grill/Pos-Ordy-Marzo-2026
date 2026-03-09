import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n-provider";

export const metadata: Metadata = {
  title: "Ordy POS",
  description: "Sistema POS para restaurantes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
