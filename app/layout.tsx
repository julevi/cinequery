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

const SITE_URL = "https://cinequery-gamma.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CineQuery — Consulta de filmes em linguagem natural",
    template: "%s | CineQuery",
  },
  description:
    "Pergunte sobre filmes e avaliações como você falaria com alguém. A IA converte sua pergunta em SQL e consulta um catálogo real do IMDb.",
  keywords: [
    "text-to-sql",
    "IA generativa",
    "Gemini API",
    "IMDb",
    "SQL",
    "Next.js",
    "consulta de filmes",
  ],
  authors: [{ name: "Juliana Prado" }],
  creator: "Juliana Prado",

  openGraph: {
    title: "CineQuery — Consulta de filmes em linguagem natural",
    description:
      "Pergunte sobre filmes e avaliações como você falaria com alguém. A IA converte sua pergunta em SQL sobre um catálogo real do IMDb.",
    url: SITE_URL,
    siteName: "CineQuery",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "CineQuery — assistente de consulta de filmes com IA",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CineQuery — Consulta de filmes em linguagem natural",
    description:
      "Pergunte sobre filmes e avaliações em linguagem natural. IA + SQL + dados reais do IMDb.",
    images: ["/opengraph-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}