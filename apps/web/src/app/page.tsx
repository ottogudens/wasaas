'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, QrCode, Sparkles, CreditCard, Shield, CheckCircle2, FileText, Send, RefreshCw, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'qr' | 'prompt' | 'rag' | 'billing'>('qr');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'GENERATING' | 'CONNECTED'>('DISCONNECTED');
  const tenantId = 'tenant-demo-01';
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'Eres un asistente virtual profesional especializado en atención al cliente. Responde de manera concisa y amable.'
  );

  // Endpoint configuration (auto-detected dynamically)
  const [botEngineUrl, setBotEngineUrl] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  // RAG document state
  const [documentText, setDocumentText] = useState<string>('');
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  // Auto-detect dynamic endpoints based on environment or browser location
  useEffect(() => {
    let apiHost = process.env.NEXT_PUBLIC_BOT_ENGINE_URL;
    let websocketUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      if (!apiHost) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiHost = 'http://localhost:3005';
        } else {
          // Si estamos en Railway o producción
          apiHost = `${protocol}//${hostname.replace('web', 'bot-engine')}`;
        }
      }

      if (!websocketUrl) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          websocketUrl = 'ws://localhost:3006';
        } else {
          websocketUrl = `${wsProtocol}//${hostname.replace('web', 'bot-engine')}`;
        }
      }
    }

    setBotEngineUrl(apiHost || '');
    setWsUrl(websocketUrl || '');
  }, []);

  const handleRequestQr = useCallback(async (overrideUrl?: string) => {
    setBotStatus('GENERATING');
    try {
      const targetUrl = overrideUrl || botEngineUrl || process.env.NEXT_PUBLIC_BOT_ENGINE_URL || 'http://localhost:3005';
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

      // Petición al BotManagerApi para inicializar automáticamente la instancia del tenant
      await fetch(`${targetUrl}/bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId }),
      });
    } catch (error) {
      console.error('Error solicitando QR automáticamente:', error);
    }
  }, [botEngineUrl, tenantId]);

  // Solicitud automática del código QR al tener la URL del motor
  useEffect(() => {
    if (botEngineUrl && botStatus === 'DISCONNECTED') {
      handleRequestQr(botEngineUrl);
    }
  }, [botEngineUrl, botStatus, handleRequestQr]);

  // Conectar con el Servidor WebSockets de bot-engine
  useEffect(() => {
    if (!wsUrl) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('📡 Conectado al WebSockets de Bot Engine en:', wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'bot:qr') {
            setQrCodeData(data.qr);
            setBotStatus('GENERATING');
          } else if (data.event === 'bot:connected') {
            setBotStatus('CONNECTED');
            setQrCodeData(null);
          } else if (data.event === 'bot:disconnected') {
            setBotStatus('DISCONNECTED');
          }
        } catch (e) {
          console.error('Error parseando mensaje WS:', e);
        }
      };

      socket.onerror = (err) => {
        console.log('WS Connection error:', err);
      };
    } catch (e) {
      console.log('No se pudo establecer reconexión WS inmediata');
    }

    return () => {
      if (socket) socket.close();
    };
  }, [wsUrl]);

  const handleProcessRag = async () => {
    if (!documentText) return;
    setRagStatus('Procesando vectores...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/rag/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText, documentName: 'BaseConocimiento.txt' }),
      });
      const data = await res.json();
      setRagStatus(`✅ Procesado con éxito: ${data.chunksCount} vectores generados`);
      setDocumentText('');
    } catch (e) {
      setRagStatus('❌ Error procesando documento');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">WASaaS</h1>
              <span className="text-xs text-emerald-400 font-medium">AI Agents Suite</span>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('qr')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'qr'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" /> Vincular WhatsApp
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'prompt'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Prompt y Personalidad
            </button>
            <button
              onClick={() => setActiveTab('rag')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'rag'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Base de Conocimiento (RAG)
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'billing'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Planes y Suscripción
            </button>
          </nav>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">Estado de Servidores</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Auto Detectado
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              <span className="text-slate-500">API:</span> {botEngineUrl || 'Detectando...'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              <span className="text-slate-500">WS:</span> {wsUrl || 'Detectando...'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Tenant Activo</p>
              <p className="text-slate-500">{tenantId}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">
        {activeTab === 'qr' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Vincular WhatsApp</h2>
              <p className="text-slate-400 text-sm">Escanea el código QR generado automáticamente para conectar tu bot a WhatsApp Web.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center min-h-[380px] shadow-2xl relative overflow-hidden">
              {botStatus === 'CONNECTED' ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-xl font-bold text-slate-100">¡WhatsApp Conectado!</h3>
                  <p className="text-slate-400 text-sm">Tu agente de IA está activo y respondiendo mensajes en tiempo real.</p>
                </div>
              ) : qrCodeData ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-white rounded-2xl shadow-xl inline-block relative group">
                    <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 border border-slate-200 rounded-lg shadow-inner" />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Escanea desde WhatsApp -&gt; Dispositivos Vinculados</span>
                  </div>
                  <button
                    onClick={() => handleRequestQr()}
                    className="mt-2 text-xs text-slate-400 hover:text-emerald-400 underline transition-colors"
                  >
                    Regenerar Código QR
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <QrCode className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin absolute inset-0 m-auto" />
                  </div>
                  <p className="text-slate-300 text-sm font-medium">Generando código QR automáticamente...</p>
                  <p className="text-xs text-slate-500 max-w-sm">Inicializando la sesión de WhatsApp para la empresa. No necesitas presionar ningún botón.</p>
                  <button
                    onClick={() => handleRequestQr()}
                    className="px-4 py-2 mt-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Forzar Reintento
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Prompt y Personalidad del Agente</h2>
              <p className="text-slate-400 text-sm">Define cómo debe comportarse tu bot e instrucciones específicas.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <label className="block text-sm font-medium text-slate-300">System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
              />
              <button className="px-6 py-3 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 transition-all">
                Guardar Configuración
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rag' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Base de Conocimiento (RAG)</h2>
              <p className="text-slate-400 text-sm">Ingresa información corporativa, preguntas frecuentes o catálogos para que el bot responda con contexto.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <label className="block text-sm font-medium text-slate-300">Texto / Información del Negocio</label>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Pega aquí los precios, servicios, horarios o información relevante..."
                rows={8}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition-all text-sm"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleProcessRag}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Procesar con pgvector
                </button>
                {ragStatus && <span className="text-sm font-medium text-emerald-400">{ragStatus}</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Planes de Suscripción</h2>
              <p className="text-slate-400 text-sm">Selecciona un plan para potenciar tus Agentes de IA en WhatsApp.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-xl font-bold">Plan Starter</h3>
                  <p className="text-3xl font-extrabold mt-2">$29 <span className="text-sm text-slate-400 font-normal">/ mes</span></p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1 Número de WhatsApp</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1,000 Mensajes / mes</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> RAG de hasta 50 documentos</li>
                  </ul>
                </div>
                <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-all">
                  Suscribirse con MercadoPago
                </button>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">Plan Pro Pro</h3>
                  <p className="text-3xl font-extrabold mt-2">$79 <span className="text-sm text-slate-400 font-normal">/ mes</span></p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3 Números de WhatsApp</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mensajes Ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> RAG Ilimitado + pgvector</li>
                  </ul>
                </div>
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all">
                  Suscribirse con MercadoPago
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
