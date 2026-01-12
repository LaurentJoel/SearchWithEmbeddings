import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CENADI - Recherche Documentaire",
  description: "Systeme de recherche documentaire intelligente avec recherche semantique et OCR",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-cream-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-800 text-cream-100 px-4 py-2 rounded z-50"
        >
          Aller au contenu principal
        </a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}