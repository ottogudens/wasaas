'use client';

import React, { useState } from 'react';
import { 
  Bot, QrCode, Sparkles, FileText, CheckCircle2, ChevronRight, ChevronLeft, 
  Play, Smartphone, ArrowRight, HelpCircle, Lightbulb, MessageSquare, Zap, ShieldCheck
} from 'lucide-react';

interface InteractiveHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'bots' | 'qr' | 'prompt' | 'rag' | 'chat') => void;
}

const STEPS = [
  {
    id: 1,
    title: '1. Crear tu Agente de WhatsApp',
    badge: 'Paso Inicial',
    icon: <Bot className="w-6 h-6 text-emerald-400" />,
    targetTab: 'bots' as const,
    description: 'El primer paso para automatizar la atención de tu empresa es darle una identidad a tu bot.',
    details: [
      'Ve a la pestaña "Mis Agentes" en el menú principal.',
      'Escribe el nombre de tu agente (ej. "Agente de Ventas" o "Soporte Técnico").',
      'Haz clic en "Crear Agente" para generar tu instancia inteligente.'
    ],
    tip: '💡 Puedes crear múltiples agentes para distintas áreas de tu empresa según tu plan.',
    interactiveActionText: 'Ir a "Mis Agentes"'
  },
  {
    id: 2,
    title: '2. Vincular con WhatsApp por QR o Código',
    badge: 'Conexión',
    icon: <QrCode className="w-6 h-6 text-amber-400" />,
    targetTab: 'qr' as const,
    description: 'Conecta tu agente a tu número de WhatsApp de empresa en segundos.',
    details: [
      'Entra a la pestaña "Vincular WhatsApp".',
      'Presiona "Solicitar Código QR" para escanearlo desde WhatsApp → Dispositivos Vinculados.',
      'O selecciona "Vinculación por Número" e ingresa tu teléfono para recibir un código corto de 8 dígitos.'
    ],
    tip: '⚡ Recomendamos usar WhatsApp Business para una presencia profesional.',
    interactiveActionText: 'Ir a "Vincular WhatsApp"'
  },
  {
    id: 3,
    title: '3. Personalizar el Prompt e Instrucciones (IA)',
    badge: 'Comportamiento',
    icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    targetTab: 'prompt' as const,
    description: 'Define la personalidad, el tono de voz y las reglas que el bot seguirá al responder.',
    details: [
      'Navega a la pestaña "Prompt y Personalidad".',
      'Describe el rol del bot (ej. "Eres un asistente amable de Soporte de miBot. Tu objetivo es agendar citas...").',
      'Define horarios de atención, precios de tus productos y reglas de trato.',
      'Haz clic en "Guardar Configuración en BD".'
    ],
    tip: '🎯 Sé explícito con lo que el bot NO debe hacer, como inventar precios o datos que no estén confirmados.',
    interactiveActionText: 'Ir a "Prompt y Personalidad"'
  },
  {
    id: 4,
    title: '4. Cargar Base de Conocimiento (RAG)',
    badge: 'Inteligencia Avanzada',
    icon: <FileText className="w-6 h-6 text-purple-400" />,
    targetTab: 'rag' as const,
    description: 'Capacita al bot con tus catálogos, manuales PDF o preguntas frecuentes en tiempo real.',
    details: [
      'Dirígete a la pestaña "Base de Conocimiento (RAG)".',
      'Arrastra un archivo de texto/PDF o escribe la información de tu catálogo.',
      'Presiona "Procesar y Guardar Documento". Nuestro motor convertirá el contenido en memoria vectorial pgvector.',
      'A partir de ese momento, el bot responderá consultas basándose exactamente en tu documentación.'
    ],
    tip: '📚 Sube listas de precios, políticas de garantía y preguntas frecuentes para evitar respuestas genéricas.',
    interactiveActionText: 'Ir a "Base de Conocimiento (RAG)"'
  },
  {
    id: 5,
    title: '5. Monitoreo y Chat en Vivo (Modo Humano)',
    badge: 'Supervisión',
    icon: <MessageSquare className="w-6 h-6 text-teal-400" />,
    targetTab: 'chat' as const,
    description: 'Toma el control de las conversaciones cuando un cliente requiera atención humana directa.',
    details: [
      'Ve a "Chat en Vivo" para revisar las conversaciones activas.',
      'Si deseas intervenir en un chat, escribe un mensaje directo o activa el conmutador "Modo Agente Humano".',
      'La IA se pausará automáticamente para que puedas atender personalmente al cliente.'
    ],
    tip: '👤 Cuando termines de hablar con el cliente, desactiva el modo humano para que la IA continúe atendiendo.',
    interactiveActionText: 'Ir a "Chat en Vivo"'
  }
];

export const InteractiveHelpModal: React.FC<InteractiveHelpModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
                Guía Interactiva miBot AI
              </h3>
              <p className="text-xs text-slate-400">Paso {currentStep + 1} de {STEPS.length} — Aprende a desplegar tus agentes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>

        {/* Indicador de Pasos (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`flex-1 min-w-[36px] py-1.5 rounded-full text-xs font-bold transition-all border text-center ${
                currentStep === idx
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : idx < currentStep
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Contenido del Paso */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              {step.badge}
            </span>
            <div className="flex items-center gap-2">
              {step.icon}
            </div>
          </div>

          <h4 className="text-xl font-bold text-slate-100">{step.title}</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Instrucciones Paso a Paso:
            </div>
            <ul className="space-y-2 pl-4 list-disc text-slate-300 leading-relaxed">
              {step.details.map((detail, dIdx) => (
                <li key={dIdx}>{detail}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{step.tip}</span>
          </div>
        </div>

        {/* Botón de Acción Interactiva (Lleva directamente a la pestaña correspondiente) */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <button
            onClick={() => {
              onNavigateTab(step.targetTab);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {step.interactiveActionText}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Navegación Anterior / Siguiente */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            <button
              onClick={() => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={currentStep === STEPS.length - 1}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-300 flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
