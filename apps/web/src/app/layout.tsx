import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '../components/Providers';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'miBot - Plataforma de Agentes IA de WhatsApp',
  description: 'Crea, entrena y gestiona tus bots inteligentes de WhatsApp para tu negocio.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'miBot',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("dark", "font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-black min-h-screen transition-colors duration-200">
        <Providers>
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // Desregistrar SWs obsoletos primero para evitar caché corrupta
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.update().catch(function() {
                        registration.unregister();
                      });
                    });
                  }).catch(function(err) {
                    console.warn('SW cleanup failed:', err);
                  }).finally(function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
