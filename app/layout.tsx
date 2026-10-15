import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import DialogProvider from "@/components/providers/DialogProvider";
import ToastProvider from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: "SISTEMA AMEX COURIER",
  description: "Plataforma Logística para Gestión de Paquetes, Almacén Central Lince y Despachos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SmoothScrollProvider>
          <DialogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DialogProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}

