import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WASaaS - Plataforma de Agentes IA de WhatsApp',
  description: 'Crea, entrena y gestiona tus bots inteligentes de WhatsApp para tu negocio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
