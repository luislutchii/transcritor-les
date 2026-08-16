import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'TranscritorLES - Transcrição de IA no Navegador',
  description: 'Transcrição completa de áudio e vídeo 100% no navegador usando Whisper via Transformers.js. Privacidade total, sem servidores.',
  keywords: ['transcrição', 'whisper', 'IA', 'áudio', 'vídeo', 'transformers.js', 'webgpu', 'privacidade'],
  authors: [{ name: 'Lutchi Enterprise Systems', url: 'https://lutchi.vercel.app' }],
  creator: 'Luís Lutchi',
  publisher: 'Lutchi Enterprise Systems',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://transcritor-les.vercel.app',
    siteName: 'TranscritorLES',
    title: 'TranscritorLES - Transcrição de IA no Navegador',
    description: 'Transcrição completa de áudio e vídeo 100% no navegador usando Whisper via Transformers.js.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TranscritorLES - Transcrição de IA no Navegador',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TranscritorLES',
    description: 'Transcrição de áudio/vídeo 100% no navegador com Whisper.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://huggingface.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://huggingface.co" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}