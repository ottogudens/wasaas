'use client';

import { useState } from 'react';
import { 
  Bot, 
  QrCode, 
  Sparkles, 
  CreditCard, 
  BrainCircuit, 
  MessageSquare, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'prompt' | 'billing'>('qr');
  const [systemPrompt, setSystemPrompt] = useState(
    'Eres un asistente virtual profesional y amable para la clínica dental "Sonrisas Saludables". Tu objetivo es orientar a los pacientes, brindar información sobre servicios de limpieza y ortodoncia, y agendar citas evaluando la disponibilidad.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [botStatus, setBotStatus] = useState<'CONNECTED' | 'QR_READY' | 'DISCONNECTED'>('QR_READY');

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800/60 bg-[#0c121e]/80 p-5 flex flex-col justify-between backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-8 border-b border-slate-800/60">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">WASaaS</h1>
              <p className="text-xs text-slate-400">Agentes IA WhatsApp</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('qr')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'qr'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Conectar WhatsApp
            </button>

            <button
              onClick={() => setActiveTab('prompt')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'prompt'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              Entrenar Agente IA
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'billing'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Planes & MercadoPago
            </button>
          </nav>
        </div>

        {/* Footer Tenant Info */}
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Organización</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">PLAN PRO</span>
          </div>
          <p className="text-sm font-semibold text-slate-200 truncate">Clínica Sonrisas</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-[#090d16] via-[#0d1424] to-[#090d16]">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 mb-8 border-b border-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Panel de Control de Agente</h2>
            <p className="text-sm text-slate-400 mt-1">Configura el comportamiento de tu bot y gestiona su conexión.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${botStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {botStatus === 'CONNECTED' ? 'Bot En Línea' : 'Esperando Escaneo QR'}
            </span>
          </div>
        </header>

        {/* Tab 1: Conectar WhatsApp con QR */}
        {activeTab === 'qr' && (
          <div className="max-w-4xl space-y-6">
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    Vincular Número de WhatsApp mediante Código QR
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Abre WhatsApp en tu teléfono inteligente, dirígete a <strong className="text-slate-200">Dispositivos vinculados</strong> y escanea el código a continuación.
                  </p>
                </div>
                <button 
                  onClick={() => setBotStatus(botStatus === 'CONNECTED' ? 'QR_READY' : 'CONNECTED')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Simular Escaneo
                </button>
              </div>

              <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-8 p-8 rounded-xl bg-slate-900/60 border border-slate-800/80">
                {botStatus === 'CONNECTED' ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-bold text-white">¡Dispositivo Conectado Exitosamente!</h4>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Tu bot de WhatsApp está actualmente activo y respondiendo consultas según las instrucciones del Agente IA.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-emerald-500/10 border-4 border-emerald-500/30">
                      {/* Simulación del código QR generado dinámicamente */}
                      <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-center p-2 rounded-lg border border-slate-300 text-slate-800 text-xs font-mono">
                        [ CÓDIGO QR EN VIVO DE BAILEYS PROVIDER ]
                      </div>
                    </div>
                    <div className="space-y-4 max-w-sm text-sm text-slate-300">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">1</span>
                        <span>Abre WhatsApp en tu teléfono.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">2</span>
                        <span>Toca Menú (3 puntos) o Configuración y selecciona <strong>Dispositivos vinculados</strong>.</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">3</span>
                        <span>Apunta tu cámara hacia esta pantalla para escanear.</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Entrenar Agente IA */}
        {activeTab === 'prompt' && (
          <div className="max-w-4xl space-y-6">
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Prompt del Sistema y Personalidad del Agente
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Define cómo responderá el modelo GPT-4o a tus clientes por WhatsApp. Sé específico en las instrucciones de servicio.
              </p>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="w-full p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm font-mono leading-relaxed"
                placeholder="Escribe las instrucciones del bot..."
              />

              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => alert('¡Prompt actualizado en la base de datos!')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  Guardar y Aplicar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: MercadoPago Checkout */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl space-y-6">
            <div className="p-6 rounded-2xl glass-panel border border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Suscripción Recurrente con MercadoPago
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Selecciona el plan que se adecúe a las necesidades de tu empresa. Procesamiento seguro en CLP / USD.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan 1 */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 relative">
                  <h4 className="text-xl font-bold text-white">Plan Starter</h4>
                  <div className="text-3xl font-extrabold text-emerald-400 my-3">$29.990 <span className="text-xs text-slate-400 font-normal">/mes</span></div>
                  <ul className="space-y-2.5 text-sm text-slate-300 my-6">
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 1 Instancia de WhatsApp</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Hasta 1.000 chats mensuales</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Modelo GPT-4o-mini</li>
                  </ul>
                  <button 
                    onClick={() => alert('Redirigiendo a checkout de MercadoPago...')}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    Suscribirse con MercadoPago
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan 2 */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-950/20 to-slate-900/80 border border-emerald-500/30 relative">
                  <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider">Más Popular</span>
                  <h4 className="text-xl font-bold text-white">Plan Pro</h4>
                  <div className="text-3xl font-extrabold text-emerald-400 my-3">$59.990 <span className="text-xs text-slate-400 font-normal">/mes</span></div>
                  <ul className="space-y-2.5 text-sm text-slate-300 my-6">
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 3 Instancias de WhatsApp</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Conversaciones ilimitadas</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Modelo GPT-4o + RAG (Base de Datos Vectorial)</li>
                  </ul>
                  <button 
                    onClick={() => alert('Redirigiendo a checkout de MercadoPago...')}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Suscribirse con MercadoPago
                    <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
