'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, QrCode, FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useBots } from '../../hooks/useBots';
import { useDocuments } from '../../hooks/useDocuments';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { createBot, bots } = useBots(token);
  const { processDocument } = useDocuments(token);
  
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState('Mi Primer Bot');
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);

  const [documentContent, setDocumentContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateBot = async () => {
    setIsCreatingBot(true);
    try {
      const newBot = await createBot(botName);
      setCreatedBotId(newBot.id); // Guardamos para la siguiente fase
      setStep(3); // Pasar directamente al step 3, omitiendo el escaneo real del QR para simplificar el onboarding
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingBot(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!documentContent.trim()) return;
    setIsUploading(true);
    try {
      await processDocument({
        title: 'Documento Inicial',
        content: documentContent,
        botId: createdBotId || undefined
      });
      router.push('/dashboard/bots'); // Terminado! Redirigir al dashboard
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Bienvenida', icon: <Bot /> },
    { id: 2, title: 'Conectar Bot', icon: <QrCode /> },
    { id: 3, title: 'Dar Conocimiento', icon: <FileText /> }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Stepper Header */}
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }} />
        
        {steps.map(s => (
          <div key={s.id} className="flex flex-col items-center gap-2 bg-slate-950 px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${step >= s.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
              {s.icon}
            </div>
            <span className={`text-xs font-medium ${step >= s.id ? 'text-emerald-400' : 'text-slate-500'}`}>{s.title}</span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        {step === 1 && (
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold text-white">¡Bienvenido a miBot! 🚀</h1>
            <p className="text-slate-400">Estás a solo 3 pasos de tener tu asistente de WhatsApp con Inteligencia Artificial atendiendo a tus clientes 24/7.</p>
            <button 
              onClick={() => setStep(2)}
              className="mt-6 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all"
            >
              Comenzar Configuración
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Nombre de tu Asistente</h2>
              <p className="text-sm text-slate-400">Dale una identidad a tu nuevo bot.</p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">Nombre del Bot</label>
              <input 
                value={botName}
                onChange={e => setBotName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ej. Asistente Ventas"
              />
            </div>

            <button 
              onClick={handleCreateBot}
              disabled={isCreatingBot || !botName.trim()}
              className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all"
            >
              {isCreatingBot ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              Siguiente Paso
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Entrena a tu Bot 🧠</h2>
              <p className="text-sm text-slate-400">Escribe información básica sobre tu negocio (horarios, precios, dirección).</p>
            </div>
            
            <textarea 
              value={documentContent}
              onChange={e => setDocumentContent(e.target.value)}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="Ej. Nuestro horario de atención es de Lunes a Viernes de 9am a 6pm..."
            />

            <button 
              onClick={handleUploadDocument}
              disabled={isUploading || !documentContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Finalizar y Entrar al Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
