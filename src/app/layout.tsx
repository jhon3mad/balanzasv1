import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Sistema de Ventas",
    default: "Sistema de Ventas",
  },
  description: "Sistema de ventas, compras e inventario para tiendas de balanzas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={cn("h-full antialiased font-sans", inter.variable, geistMono.variable)}>
      <body className="flex min-h-full flex-col">
        <Toaster>
          <TooltipProvider>{children}</TooltipProvider>
        </Toaster>
      </body>
    </html>
  );
}
