import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';

export const metadata: Metadata = {
  title: 'miBot - Plataforma de Agentes IA de WhatsApp',
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
