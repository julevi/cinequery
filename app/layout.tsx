import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CineQuery — Consulta de filmes em linguagem natural",
  description: "Pergunte sobre filmes e avaliações como você falaria com alguém. A IA converte sua pergunta em SQL e consulta um catálogo real do IMDb.",
  openGraph: {
    title: "CineQuery",
    description: "Assistente de consulta a filmes com IA generativa e SQL.",
    url: "https://cinequery-gamma.vercel.app",
    siteName: "CineQuery",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
