'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, QrCode, Sparkles, CreditCard, Shield, CheckCircle2, FileText, Send, Phone,
  RefreshCw, Loader2, Settings2, AlertTriangle, Terminal, LogOut, Plus, Trash2, User, Building, MessageSquare, Pencil, X, Wifi, WifiOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const { user, org, token, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'qr' | 'prompt' | 'rag' | 'billing' | 'bots' | 'chat'>('bots');
  // Chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bot instances state
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [newBotName, setNewBotName] = useState('');
  const [loadingBots, setLoadingBots] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);

  // Edit bot state
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editBotName, setEditBotName] = useState('');
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  // QR & Bot connection state
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'GENERATING' | 'CONNECTED' | 'QR_READY' | 'CONNECTING' | 'ERROR'>('DISCONNECTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Phone pairing state
  const [pairingMode, setPairingMode] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingPairing, setRequestingPairing] = useState(false);

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('gpt-4o-mini');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);

  // RAG state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [processingRag, setProcessingRag] = useState(false);
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  // Endpoint config
  const [botEngineUrl, setBotEngineUrl] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  // Protect route
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  // Load bots and documents
  const loadBots = useCallback(async () => {
    if (!token) return;
    setLoadingBots(true);
    try {
      const data = await api.listBots();
      setBots(data);
      if (data.length > 0 && !selectedBot) {
        const first = data[0];
        setSelectedBot(first);
        setSystemPrompt(first.systemPrompt || '');
        setAiModel(first.aiModel || 'gpt-4o-mini');
        setBotStatus(first.status || 'DISCONNECTED');
      }
      // Also update the selected bot's status if it still exists
      if (selectedBot) {
        const updated = data.find((b: any) => b.id === selectedBot.id);
        if (updated) {
          setBotStatus(updated.status || 'DISCONNECTED');
        }
      }
    } catch (err: any) {
      addLog(`❌ Error al cargar bots: ${err.message}`);
    } finally {
      setLoadingBots(false);
    }
  }, [token, selectedBot, addLog]);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.listDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      addLog(`❌ Error al cargar documentos RAG: ${err.message}`);
    }
  }, [token, addLog]);

  useEffect(() => {
    if (token) {
      loadBots();
      loadDocuments();
    }
  }, [token, loadBots, loadDocuments]);

  // Poll bot status every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) loadBots();
    }, 10000);
    return () => clearInterval(interval);
  }, [token, loadBots]);

  // Detect endpoints
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
  }, []);

  // Request QR Code from bot-engine
  const handleRequestQr = useCallback(async (overrideUrl?: string) => {
    if (!selectedBot) return;
    setBotStatus('GENERATING');
    setErrorMessage(null);
    setPairingCode(null);
    const targetUrl = overrideUrl || botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

    addLog(`Iniciando bot "${selectedBot.name}" (Tenant: ${selectedBot.tenantId})...`);

    try {
      const res = await fetch(`${targetUrl}/api/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          tenantId: selectedBot.tenantId,
          name: selectedBot.name,
          flowIds: ['default_ai_flow'],
        }),
      });

      if (!res.ok && res.status !== 409) {
        const errorText = await res.text();
        setErrorMessage(`Error HTTP ${res.status}: ${errorText}`);
        addLog(`❌ Error HTTP en bot-engine: ${res.status}`);
        setBotStatus('DISCONNECTED');
      } else {
        addLog(`✅ Instancia solicitada. Esperando QR...`);
      }
    } catch (error: any) {
      setErrorMessage(`Error de red con Bot Engine: ${error.message}`);
      addLog(`❌ Excepción de red: ${error.message}`);
      setBotStatus('DISCONNECTED');
    }
  }, [selectedBot, botEngineUrl, addLog]);

  // Phone pairing
  const handleRequestPairingCode = async () => {
    if (!selectedBot || !phoneNumber.trim()) return;
    setRequestingPairing(true);
    setPairingCode(null);
    setErrorMessage(null);
    const targetUrl = botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

    addLog(`📱 Solicitando código de vinculación para ${phoneNumber}...`);

    try {
      // Request pairing code directly
      const res = await fetch(`${targetUrl}/internal/pair-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId: selectedBot.tenantId,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          setPairingCode(data.code);
          addLog(`✅ Código de vinculación recibido: ${data.code}`);
        } else {
          addLog(`⏳ Solicitud enviada. Esperando código por WebSocket...`);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
        setErrorMessage(errorData.error || `Error HTTP ${res.status}`);
        addLog(`❌ Error: ${errorData.error}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRequestingPairing(false);
    }
  };

  const handleDisconnectBot = async () => {
    if (!selectedBot) return;
    try {
      const targetUrl = botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

      const res = await fetch(`${targetUrl}/internal/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId: selectedBot.tenantId }),
      });

      if (!res.ok) {
        throw new Error('Fallo al detener bot en el engine');
      }

      setBotStatus('DISCONNECTED');
      setQrCodeData(null);
      addLog(`✅ Agente desconectado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al desconectar: ${err.message}`);
    }
  };

  // WebSocket listener for QR
  useEffect(() => {
    if (!wsUrl || !selectedBot) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        addLog(`📡 Canal WebSocket activo con bot-engine`);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tenantId && data.tenantId !== selectedBot.tenantId) return;

          if (data.event === 'bot:qr') {
            setQrCodeData(data.qr);
            setBotStatus('QR_READY');
            setErrorMessage(null);
            addLog(`⚡ Código QR recibido para ${selectedBot.name}`);
          } else if (data.event === 'bot:code') {
            setPairingCode(data.code);
            setRequestingPairing(false);
            setErrorMessage(null);
            addLog(`📱 Código de vinculación recibido: ${data.code}`);
          } else if (data.event === 'bot:connected') {
            setBotStatus('CONNECTED');
            setQrCodeData(null);
            setPairingCode(null);
            setErrorMessage(null);
            addLog(`🎉 Bot "${selectedBot.name}" conectado a WhatsApp.`);
            loadBots(); // Refresh DB status
          } else if (data.event === 'bot:disconnected') {
            setBotStatus('DISCONNECTED');
            setQrCodeData(null);
            addLog(`⚠️ Bot "${selectedBot.name}" desconectado.`);
            loadBots();
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e: any) {
      console.error(e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [wsUrl, selectedBot, addLog]);

  // Chat methods
  const loadConversations = useCallback(async () => {
    if (!selectedBot || activeTab !== 'chat') return;
    try {
      const data = await api.listConversations(selectedBot.id);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedBot, activeTab]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversationId) return;
    try {
      const data = await api.getMessages(selectedConversationId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedConversationId]);

  // Polling chat
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConversationId) return;
    const msg = chatInput.trim();
    setChatInput('');
    try {
      setMessages(prev => [...prev, { content: msg, sender: 'AGENT', createdAt: new Date().toISOString() }]);
      await api.sendManualMessage(selectedConversationId, msg);
      await loadMessages();
    } catch (err: any) {
      addLog(`❌ Error enviando mensaje: ${err.message}`);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    setCreatingBot(true);
    try {
      const created = await api.createBot({ name: newBotName });
      setNewBotName('');
      addLog(`🤖 Bot "${created.name}" creado exitosamente.`);
      await loadBots();
      setSelectedBot(created);
      setBotStatus('DISCONNECTED');
    } catch (err: any) {
      addLog(`❌ Error al crear bot: ${err.message}`);
    } finally {
      setCreatingBot(false);
    }
  };

  const handleEditBot = async (botId: string) => {
    if (!editBotName.trim()) return;
    try {
      await api.updateBot(botId, { name: editBotName });
      setEditingBotId(null);
      setEditBotName('');
      addLog(`✏️ Bot renombrado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al editar: ${err.message}`);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      await api.deleteBot(botId);
      setDeletingBotId(null);
      if (selectedBot?.id === botId) {
        setSelectedBot(null);
        setBotStatus('DISCONNECTED');
      }
      addLog(`🗑️ Bot eliminado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al eliminar: ${err.message}`);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedBot) return;
    setSavingPrompt(true);
    setPromptMessage(null);
    try {
      const updated = await api.updateBot(selectedBot.id, {
        systemPrompt,
        aiModel,
      });
      setSelectedBot(updated);
      setPromptMessage('✅ Configuración guardada en la base de datos');
      addLog(`💾 System prompt actualizado para bot "${selectedBot.name}"`);
    } catch (err: any) {
      setPromptMessage(`❌ Error: ${err.message}`);
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleProcessRag = async () => {
    if (!documentTitle || !documentContent) return;
    setProcessingRag(true);
    setRagStatus('Procesando y generando embeddings vectoriales...');
    try {
      const res = await api.processDocument({ title: documentTitle, content: documentContent });
      setRagStatus(`✅ Documento procesado: ${res.totalChunksProcessed} vectores almacenados en pgvector`);
      setDocumentTitle('');
      setDocumentContent('');
      await loadDocuments();
    } catch (err: any) {
      setRagStatus(`❌ Error: ${err.message}`);
    } finally {
      setProcessingRag(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      await loadDocuments();
      addLog(`🗑️ Documento RAG eliminado`);
    } catch (err: any) {
      addLog(`❌ Error eliminando documento: ${err.message}`);
    }
  };

  const handleSubscribe = async (planName: string, amount: number) => {
    try {
      const res = await api.createSubscription({ planName, amount });
      if (res.initPoint) {
        window.location.href = res.initPoint;
      }
    } catch (err: any) {
      addLog(`❌ Error iniciando suscripción: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return { className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '● Conectado', icon: <Wifi className="w-3 h-3" /> };
      case 'QR_READY':
        return { className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '◌ QR Listo', icon: <QrCode className="w-3 h-3" /> };
      case 'CONNECTING':
      case 'GENERATING':
        return { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '◎ Vinculando...', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      case 'ERROR':
        return { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: '✕ Error', icon: <AlertTriangle className="w-3 h-3" /> };
      default:
        return { className: 'bg-slate-700/50 text-slate-400 border-slate-600/30', label: '○ Desconectado', icon: <WifiOff className="w-3 h-3" /> };
    }
  };

  if (authLoading || !user || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">WASaaS</h1>
              <span className="text-xs text-emerald-400 font-medium">AI Agents Suite</span>
            </div>
          </div>

          {/* Org & User card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">{org.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <User className="w-3 h-3 text-slate-500" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('bots')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'bots'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" /> Mis Agentes ({bots.length})
            </button>
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
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat en Vivo
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
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-red-400 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">
        {/* Bots Tab */}
        {activeTab === 'bots' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Mis Agentes de WhatsApp</h2>
              <p className="text-slate-400 text-sm">Gestiona y crea tus instancias de agentes IA.</p>
            </div>

            {/* Create Bot Form */}
            <form onSubmit={handleCreateBot} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex gap-4">
              <input
                type="text"
                required
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Nombre del Agente (ej. Agente de Ventas)"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
              />
              <button
                type="submit"
                disabled={creatingBot}
                className="px-6 py-3 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {creatingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Agente
              </button>
            </form>

            {/* Bot List */}
            {loadingBots ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              </div>
            ) : bots.length === 0 ? (
              <div className="text-center py-12 p-8 rounded-2xl bg-slate-900/30 border border-slate-800">
                <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No tienes agentes creados aún.</p>
                <p className="text-slate-500 text-xs mt-1">Crea tu primer agente para comenzar.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {bots.map((b) => {
                  const badge = getStatusBadge(b.status);
                  return (
                  <div
                    key={b.id}
                    className={`p-6 rounded-2xl border transition-all ${
                      selectedBot?.id === b.id
                        ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {editingBotId === b.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            value={editBotName}
                            onChange={(e) => setEditBotName(e.target.value)}
                            className="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleEditBot(b.id)}
                          />
                          <button onClick={() => handleEditBot(b.id)} className="text-emerald-400 hover:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingBotId(null)} className="text-slate-400 hover:text-slate-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-bold text-lg cursor-pointer" onClick={() => {
                          setSelectedBot(b);
                          setSystemPrompt(b.systemPrompt || '');
                          setAiModel(b.aiModel || 'gpt-4o-mini');
                          setBotStatus(b.status || 'DISCONNECTED');
                        }}>{b.name}</h3>
                      )}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${badge.className}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mb-2">Tenant: {b.tenantId}</p>
                    <p className="text-xs text-slate-500 mb-3">Modelo: {b.aiModel || 'gpt-4o-mini'}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setSelectedBot(b);
                          setSystemPrompt(b.systemPrompt || '');
                          setAiModel(b.aiModel || 'gpt-4o-mini');
                          setBotStatus(b.status || 'DISCONNECTED');
                          setActiveTab('qr');
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                      >
                        <QrCode className="w-3 h-3" /> Vincular
                      </button>
                      <button
                        onClick={() => { setEditingBotId(b.id); setEditBotName(b.name); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      {deletingBotId === b.id ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-red-400">¿Seguro?</span>
                          <button onClick={() => handleDeleteBot(b.id)} className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">Sí</button>
                          <button onClick={() => setDeletingBotId(null)} className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingBotId(b.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500 min-h-[600px] flex gap-6">
            
            {/* Lista de Conversaciones */}
            <div className="w-1/3 flex flex-col gap-4 border-r border-slate-800 pr-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-emerald-400" /> Conversaciones
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {conversations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No hay conversaciones</p>
                ) : (
                  conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`p-4 rounded-xl cursor-pointer border transition-all ${
                        selectedConversationId === conv.id 
                        ? 'bg-slate-800 border-emerald-500/50 shadow-md' 
                        : 'bg-slate-800/30 border-transparent hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-200">{conv.customerPhone}</span>
                        {conv.isHumanMode && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Handoff</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {conv.messages?.[0]?.content || 'Sin mensajes'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="w-2/3 flex flex-col bg-slate-950/50 rounded-2xl border border-slate-800 relative overflow-hidden">
              {!selectedConversationId ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-3">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>Selecciona una conversación</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {messages.map(msg => {
                      const isUser = msg.sender === 'USER';
                      const isAgent = msg.sender === 'AGENT';
                      return (
                        <div key={msg.id || Math.random()} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm shadow-sm ${
                            isUser ? 'bg-slate-800 text-slate-200 rounded-tl-sm' 
                            : isAgent ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-emerald-600 text-white rounded-tr-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[10px] opacity-50 mt-1 block text-right">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isAgent ? ' • Agente' : !isUser ? ' • IA' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Escribe un mensaje como agente (pausará la IA)..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      />
                      <button 
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl flex items-center justify-center transition-colors shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Vincular WhatsApp</h2>
              <p className="text-slate-400 text-sm">
                {selectedBot ? `Vincular agente "${selectedBot.name}"` : 'Selecciona o crea un agente para vincular.'}
              </p>
            </div>

            {/* Connection status banner */}
            {selectedBot && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                botStatus === 'CONNECTED' 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const badge = getStatusBadge(botStatus);
                    return (
                      <>
                        <div className={`p-2 rounded-lg ${badge.className}`}>{badge.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Estado: {badge.label}</p>
                          <p className="text-xs text-slate-400">{selectedBot.name} • {selectedBot.tenantId}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {botStatus === 'CONNECTED' && (
                  <button
                    onClick={handleDisconnectBot}
                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Desconectar
                  </button>
                )}
              </div>
            )}

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center min-h-[380px] shadow-2xl relative overflow-hidden">
              {botStatus === 'CONNECTED' ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-xl font-bold text-slate-100">¡WhatsApp Vinculado!</h3>
                  <p className="text-slate-400 text-sm">Tu agente de IA está activo y respondiendo mensajes en tiempo real.</p>
                  <p className="text-slate-500 text-xs">Si necesitas vincular a otro número, primero desconecta la sesión actual.</p>
                  <button
                    onClick={handleDisconnectBot}
                    className="mt-4 px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 mx-auto text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión de WhatsApp
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode toggle */}
                  {selectedBot && (
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        onClick={() => setPairingMode('qr')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          pairingMode === 'qr'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <QrCode className="w-4 h-4" /> Código QR
                      </button>
                      <button
                        onClick={() => setPairingMode('phone')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          pairingMode === 'phone'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Phone className="w-4 h-4" /> Número de Teléfono
                      </button>
                    </div>
                  )}

                  {pairingMode === 'qr' ? (
                    /* QR mode */
                    qrCodeData ? (
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-white rounded-2xl shadow-xl inline-block relative group">
                          {qrCodeData.startsWith('data:image') ? (
                            <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 border border-slate-200 rounded-lg shadow-inner" />
                          ) : (
                            <QRCodeSVG value={qrCodeData} size={256} className="w-64 h-64 border border-slate-200 rounded-lg shadow-inner" />
                          )}
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
                        <QrCode className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                        <p className="text-slate-300 text-sm font-medium">
                          {selectedBot ? `Presiona el botón para generar el código QR.` : 'Crea un agente para comenzar.'}
                        </p>

                        {errorMessage && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Error al generar QR</p>
                              <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
                            </div>
                          </div>
                        )}

                        {selectedBot && (
                          <button
                            onClick={() => handleRequestQr()}
                            disabled={botStatus === 'GENERATING'}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            {botStatus === 'GENERATING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                            Generar Código QR
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    /* Phone pairing mode */
                    <div className="text-center space-y-4 w-full max-w-md">
                      <Phone className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                      <p className="text-slate-300 text-sm font-medium">
                        Ingresa tu número de teléfono para recibir un código de vinculación.
                      </p>

                      <div className="flex gap-3">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Ej: 5491112345678 (sin +)"
                          className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleRequestPairingCode}
                          disabled={requestingPairing || !phoneNumber.trim()}
                          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {requestingPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Solicitar
                        </button>
                      </div>

                      {pairingCode && (
                        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm text-emerald-400 font-medium mb-2">Tu código de vinculación:</p>
                          <p className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{pairingCode}</p>
                          <p className="text-xs text-slate-400 mt-3">
                            Ingresa este código en WhatsApp → Dispositivos Vinculados → Vincular con número de teléfono
                          </p>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Error</p>
                            <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Diagnostic Logs */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Logs en Tiempo Real</span>
                </div>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300">
                  Limpiar
                </button>
              </div>
              <div className="h-32 overflow-y-auto space-y-1 scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Esperando eventos...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={`text-[11px] ${
                      log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('🎉') ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prompt Tab */}
        {activeTab === 'prompt' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Prompt y Personalidad del Agente</h2>
              <p className="text-slate-400 text-sm">
                {selectedBot ? `Configurando agente "${selectedBot.name}"` : 'Selecciona un agente primero.'}
              </p>
            </div>

            {selectedBot ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Modelo de IA</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Rápido y económico)</option>
                    <option value="gpt-4o">OpenAI GPT-4o (Avanzado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">System Prompt</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={8}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                    placeholder="Instrucciones específicas para el bot..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    className="px-6 py-3 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Guardar Configuración en BD
                  </button>
                  {promptMessage && (
                    <span className={`text-sm font-medium ${promptMessage.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {promptMessage}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Selecciona un agente en el menú de la izquierda.</p>
            )}
          </div>
        )}

        {/* RAG Tab */}
        {activeTab === 'rag' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Base de Conocimiento (RAG + pgvector)</h2>
              <p className="text-slate-400 text-sm">Almacena información que tus agentes consultarán en tiempo real.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Título del Documento</label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Ej. Precios y Servicios 2026"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Contenido / Texto Corporativo</label>
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Pega información del negocio, catálogo de productos, FAQ..."
                  rows={6}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleProcessRag}
                  disabled={processingRag}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {processingRag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Procesar y Almacenar Vectores
                </button>
                {ragStatus && <span className="text-xs font-medium text-emerald-400">{ragStatus}</span>}
              </div>
            </div>

            {/* Document list */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-slate-200">Documentos Almacenados ({documents.length})</h3>
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-200">{doc.title}</h4>
                    <span className="text-xs text-slate-500">{doc._count?.chunks || 0} fragmentos vectoriales</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Planes y Suscripciones</h2>
              <p className="text-slate-400 text-sm">Selecciona un plan recurrente para potenciar tus Agentes con MercadoPago.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-xl font-bold">Plan Starter</h3>
                  <p className="text-3xl font-extrabold mt-2">$29 <span className="text-sm text-slate-400 font-normal">/ mes</span></p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1 Agente de WhatsApp</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mensajes Ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> RAG de hasta 50 documentos</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSubscribe('Starter', 29)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-all text-sm"
                >
                  Suscribirse con MercadoPago
                </button>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">Plan Pro</h3>
                  <p className="text-3xl font-extrabold mt-2">$79 <span className="text-sm text-slate-400 font-normal">/ mes</span></p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 5 Agentes de WhatsApp</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mensajes Ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> RAG Ilimitado + pgvector</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSubscribe('Pro', 79)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all text-sm"
                >
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
