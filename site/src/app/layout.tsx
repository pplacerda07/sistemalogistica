import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RotaFácil — Sistema de Logística Inteligente",
  description: "Sistema de roteirização para vendedores de rua. Cadastre clientes, otimize rotas e acompanhe entregas em tempo real.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
        />
      </body>
    </html>
  );
}
