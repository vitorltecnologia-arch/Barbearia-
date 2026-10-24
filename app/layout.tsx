import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Barber Pro — Gestão de barbearias",
  description: "Gestão profissional para barbearias."
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
