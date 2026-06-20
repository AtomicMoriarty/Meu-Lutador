import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Lutador — Octógono dos Sonhos",
  description:
    "Monte um lutador de MMA herdando cada atributo de lendas reais do UFC e encare uma escadinha de 8 lutas, narrada round a round, até o cinturão.",
  openGraph: {
    title: "Meu Lutador — Octógono dos Sonhos",
    description:
      "Herde das feras, vença as 8 lutas e conquiste o cinturão. Carreira de MMA simulada e narrada, grátis no navegador.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
