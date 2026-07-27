'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, QrCode, Sparkles, CreditCard, Shield, CheckCircle2, FileText, Send, RefreshCw, Loader2, Settings2, AlertTriangle, Terminal } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'qr' | 'prompt' | 'rag' | 'billing'>('qr');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'GENERATING' | 'CONNECTED'>('DISCONNECTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const tenantId = 'tenant-demo-01';
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'Eres un asistente virtual profesional especializado en atención al cliente. Responde de manera concisa y amable.'
  );

  // Endpoint configuration
  const [botEngineUrl, setBotEngineUrl] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // RAG document state
  const [documentText, setDocumentText] = useState<string>('');
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  // Detect endpoints (env variables > fallback automatico oficial de Railway > edicion manual)
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
        } else if (hostname.includes('frontend-production-e6e4d.up.railway.app') || hostname.includes('frontend')) {
          apiHost = `${protocol}//whatsapp-service-production-e6f2.up.railway.app`;
        } else {
          apiHost = `${protocol}//${hostname.replace('frontend', 'whatsapp-service').replace('web', 'whatsapp-service')}`;
        }
      }

      if (!websocketUrl) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          websocketUrl = 'ws://localhost:3005';
        } else if (hostname.includes('frontend-production-e6e4d.up.railway.app') || hostname.includes('frontend')) {
          websocketUrl = `${wsProtocol}//whatsapp-service-production-e6f2.up.railway.app`;
        } else {
          websocketUrl = `${wsProtocol}//${hostname.replace('frontend', 'whatsapp-service').replace('web', 'whatsapp-service')}`;
        }
      }
    }

    setBotEngineUrl(apiHost || '');
    setWsUrl(websocketUrl || '');
    addLog(`Configuración de URLs inicial: API=${apiHost} | WS=${websocketUrl}`);
  }, [addLog]);

  const fetchQrViaRest = useCallback(async (targetUrl: string, apiKey: string) => {
    try {
      const res = await fetch(`${targetUrl}/api/bots/${tenantId}/qr`, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.qr) {
          setQrCodeData(data.qr);
          setBotStatus('GENERATING');
          setErrorMessage(null);
          addLog(`⚡ Código QR obtenido exitosamente vía REST Polling.`);
          return true;
        } else if (data.status === 'connected') {
          setBotStatus('CONNECTED');
          setQrCodeData(null);
          addLog(`🎉 Bot ya está conectado a WhatsApp.`);
          return true;
        }
      }
    } catch (e) {
      console.warn('Error polling QR via REST:', e);
    }
    return false;
  }, [tenantId, addLog]);

  const handleRequestQr = useCallback(async (overrideUrl?: string) => {
    setBotStatus('GENERATING');
    setErrorMessage(null);
    const targetUrl = overrideUrl || botEngineUrl || process.env.NEXT_PUBLIC_BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

    addLog(`Iniciando solicitud de bot en ${targetUrl}/api/bots...`);

    try {
      const res = await fetch(`${targetUrl}/api/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId,
          name: `Bot Tenant ${tenantId}`,
          flowIds: ['default_ai_flow'],
        }),
      });

      if (!res.ok && res.status !== 409) {
        const errorText = await res.text();
        const errDetail = `HTTP ${res.status}: ${res.statusText} (${errorText || 'Sin detalle'})`;
        console.warn(`Respuesta ${res.status} al solicitar bot en ${targetUrl}`);
        setErrorMessage(`Falla HTTP al conectar con bot-engine: ${errDetail}`);
        addLog(`❌ Error HTTP en /api/bots: ${errDetail}`);
      } else {
        addLog(`✅ Instancia del bot creada/activa (${res.status === 409 ? 'Ya existía' : 'Nueva'}). Esperando emisión de evento QR...`);
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error solicitando QR automáticamente:', err);
      setErrorMessage(`Error de red al conectar con Bot Engine (${targetUrl}): ${err.message}`);
      addLog(`❌ Excepción de red fetch(): ${err.message}`);
    }
  }, [botEngineUrl, tenantId, addLog]);

  // Solicitud automática del código QR al tener la URL del motor
  useEffect(() => {
    if (botEngineUrl && botStatus === 'DISCONNECTED') {
      handleRequestQr(botEngineUrl);
    }
  }, [botEngineUrl, botStatus, handleRequestQr]);

  // Polling fallback vía REST en caso de que no haya WebSocket o mientras se genera
  useEffect(() => {
    if (!botEngineUrl || botStatus === 'CONNECTED') return;

    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';
    const interval = setInterval(() => {
      fetchQrViaRest(botEngineUrl, apiKey);
    }, 4000);

    return () => clearInterval(interval);
  }, [botEngineUrl, botStatus, fetchQrViaRest]);

  // Conectar con el Servidor WebSockets de bot-engine
  useEffect(() => {
    if (!wsUrl) return;

    let socket: WebSocket;
    addLog(`Intentando conexión WebSocket a ${wsUrl}...`);

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('📡 Conectado al WebSockets de Bot Engine en:', wsUrl);
        addLog(`📡 Canal WebSocket conectado exitosamente a ${wsUrl}`);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'bot:qr') {
            setQrCodeData(data.qr);
            setBotStatus('GENERATING');
            setErrorMessage(null);
            addLog(`⚡ Código QR recibido en tiempo real vía WebSocket.`);
          } else if (data.event === 'bot:connected') {
            setBotStatus('CONNECTED');
            setQrCodeData(null);
            setErrorMessage(null);
            addLog(`🎉 WhatsApp vinculado y conectado exitosamente.`);
          } else if (data.event === 'bot:disconnected') {
            setBotStatus('DISCONNECTED');
            addLog(`⚠️ Sesión de WhatsApp desconectada.`);
          } else if (data.event === 'bot:error') {
            setErrorMessage(`Error reportado por BotManager: ${data.error}`);
            addLog(`💥 Error servidor: ${data.error}`);
          }
        } catch (e) {
          console.error('Error parseando mensaje WS:', e);
          addLog(`❌ Error procesando mensaje WS recibido`);
        }
      };

      socket.onerror = (err) => {
        console.log('WS Connection error:', err);
        addLog(`❌ Fallo de conexión WebSocket en ${wsUrl}`);
      };

      socket.onclose = () => {
        addLog(`🔌 Conexión WebSocket cerrada.`);
      };
    } catch (e) {
      const err = e as Error;
      console.log('No se pudo establecer reconexión WS inmediata');
      addLog(`❌ Excepción al crear socket WS: ${err.message}`);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [wsUrl, addLog]);

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
              <p className="text-xs font-semibold text-slate-300">Servidores Bot Engine</p>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Ajustar URLs de Railway"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {showConfig ? (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">HTTP API URL:</label>
                  <input
                    type="text"
                    value={botEngineUrl}
                    onChange={(e) => setBotEngineUrl(e.target.value)}
                    placeholder="https://whatsapp-service-production-e6f2.up.railway.app"
                    className="w-full p-1.5 text-[11px] font-mono rounded bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">WebSocket WS URL:</label>
                  <input
                    type="text"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    placeholder="wss://whatsapp-service-production-e6f2.up.railway.app"
                    className="w-full p-1.5 text-[11px] font-mono rounded bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    handleRequestQr(botEngineUrl);
                    setShowConfig(false);
                  }}
                  className="w-full py-1 text-[11px] rounded bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
                >
                  Guardar y Reconnectar
                </button>
              </div>
            ) : (
              <>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  <span className="text-slate-500">API:</span> {botEngineUrl || 'Detectando...'}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  <span className="text-slate-500">WS:</span> {wsUrl || 'Detectando...'}
                </div>
              </>
            )}
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
          <div className="max-w-3xl mx-auto space-y-6">
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
                <div className="text-center space-y-4 w-full max-w-md">
                  <div className="relative inline-block">
                    <QrCode className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin absolute inset-0 m-auto" />
                  </div>
                  <p className="text-slate-300 text-sm font-medium">Generando código QR automáticamente...</p>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Error al generar QR</p>
                        <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => handleRequestQr()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reintentar Petición
                    </button>
                    <button
                      onClick={() => setShowConfig(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all flex items-center gap-2 border border-emerald-500/20"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Cambiar Servidor
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel de Logs en Tiempo Real */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Registro de Diagnóstico (Logs en Tiempo Real)</span>
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Limpiar Logs
                </button>
              </div>
              <div className="h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-2">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Esperando eventos de conexión...</p>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`text-[11px] ${
                        log.includes('❌') || log.includes('Error') || log.includes('Fallo')
                          ? 'text-red-400'
                          : log.includes('✅') || log.includes('🎉') || log.includes('📡')
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
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
