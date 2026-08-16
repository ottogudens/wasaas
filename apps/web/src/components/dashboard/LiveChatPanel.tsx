'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  User,
  Bot,
  Send,
  Loader2,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FlaskConical,
  ChevronDown,
  Trash2,
  Database,
  ArrowRight,
  Zap,
  X,
} from 'lucide-react';
import { useBotContext } from '../../lib/bot-context';
import { useConversations } from '../../hooks/useConversations';
import { useBots } from '../../hooks/useBots';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

export function LiveChatPanel() {
  const { selectedBotId, setSelectedBotId } = useBotContext();
  const { token } = useAuth();
  const { bots, isLoading: isLoadingBots, useBotStatus, requestPairingCode, isRequestingPairing } = useBots(token);

  // Active view: 'live' (WhatsApp real conversations) or 'simulator' (In-app sandbox test)
  const [activeTab, setActiveTab] = useState<'live' | 'simulator'>('live');

  // Live Chat state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [pairingPhone, setPairingPhone] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Simulator state
  const [simulatorMessages, setSimulatorMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: string[]; time?: string }>>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu agente virtual. Hazme preguntas para poner a prueba mi prompt y base de conocimiento RAG.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const simulatorContainerRef = useRef<HTMLDivElement>(null);

  // ── Auto-selection logic ────────────────────────────────────────────────
  useEffect(() => {
    if (isLoadingBots || !bots || bots.length === 0) return;

    // If no bot is selected currently:
    if (!selectedBotId) {
      const connectedBots = bots.filter((b: any) => b.status === 'CONNECTED');
      if (connectedBots.length === 1) {
        // If exactly 1 connected bot exists, pick it immediately
        setSelectedBotId(connectedBots[0].id);
      } else if (bots.length === 1) {
        // If exactly 1 bot exists in total, pick it
        setSelectedBotId(bots[0].id);
      }
    }
  }, [bots, selectedBotId, isLoadingBots, setSelectedBotId]);

  const activeBot = bots?.find((b: any) => b.id === selectedBotId) || null;
  const { data: botStatusData } = useBotStatus(selectedBotId || '');

  const {
    conversations,
    refetchConversations,
    isRefetching,
    useMessages,
    sendMessage,
    toggleHumanMode,
    isSending,
    clearConversations,
    deleteConversation,
  } = useConversations(selectedBotId);

  const { data: messages = [] } = useMessages(selectedConversationId);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (simulatorContainerRef.current) {
      simulatorContainerRef.current.scrollTop = simulatorContainerRef.current.scrollHeight;
    }
  }, [simulatorMessages, isSimulating]);

  // Reset selected conversation if the bot changes
  useEffect(() => {
    setSelectedConversationId(null);
    setChatInput('');
  }, [selectedBotId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConversationId) return;
    const msg = chatInput.trim();
    setChatInput('');
    try {
      await sendMessage({ conversationId: selectedConversationId, content: msg });
    } catch (err: any) {
      console.error('Error enviando mensaje manual:', err);
    }
  };

  const handleToggleHumanMode = async () => {
    if (!selectedConversationId) return;
    const currentConv = conversations.find((c: any) => c.id === selectedConversationId);
    const newMode = !currentConv?.isHumanMode;
    try {
      await toggleHumanMode({ conversationId: selectedConversationId, isHumanMode: newMode });
    } catch (err: any) {
      console.error('Error cambiando modo humano:', err);
    }
  };

  const handleClearAllConversations = async () => {
    if (!selectedBotId || conversations.length === 0) return;
    if (!window.confirm('¿Estás seguro de que deseas vaciar todos los chats de este agente? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      setIsClearingAll(true);
      await clearConversations();
      setSelectedConversationId(null);
    } catch (err: any) {
      console.error('Error vaciando conversaciones:', err);
      alert('Error al vaciar chats: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleDeleteSingleConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Deseas eliminar este chat y su historial?')) return;
    try {
      await deleteConversation(conversationId);
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
    } catch (err: any) {
      console.error('Error eliminando conversación:', err);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhone || !selectedBotId) return;
    try {
      await requestPairingCode({ id: selectedBotId, phoneNumber: pairingPhone });
    } catch (err) {
      console.error('Error requesting pairing code:', err);
    }
  };

  // ── Simulator handler ───────────────────────────────────────────────────
  const handleSendSimulatorMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = (customText || simulatorInput).trim();
    if (!text || !selectedBotId || isSimulating) return;

    const userMsg = {
      role: 'user' as const,
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSimulatorMessages((prev) => [...prev, userMsg]);
    setSimulatorInput('');
    setIsSimulating(true);

    try {
      const history = simulatorMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.simulateBot(selectedBotId, text, history);

      const botReply = {
        role: 'assistant' as const,
        content: res.reply,
        sources: res.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSimulatorMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      setSimulatorMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error de simulación: ${err.message || 'No se pudo conectar con el motor de IA.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearSimulator = () => {
    setSimulatorMessages([
      {
        role: 'assistant',
        content: '¡Conversación de prueba reiniciada! Hazme cualquier consulta para evaluar mis respuestas.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // ── 1. LOADING STATE ────────────────────────────────────────────────────
  if (isLoadingBots) {
    return (
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-12 shadow-2xl h-[calc(100vh-12rem)] min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargando tus agentes...</p>
      </div>
    );
  }

  // ── 2. NO BOTS CREATED STATE ────────────────────────────────────────────
  if (!bots || bots.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl h-[calc(100vh-12rem)] min-h-[500px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aún no tienes ningún agente creado</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
          Crea tu primer bot de WhatsApp para empezar a monitorear conversaciones y probar la inteligencia artificial.
        </p>
        <a
          href="/dashboard/bots"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all"
        >
          Crear mi primer Agente
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // ── 3. BOT SELECTION SCREEN (When user has multiple bots and none is selected) ──
  if (!selectedBotId) {
    return (
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl h-[calc(100vh-12rem)] min-h-[500px] flex flex-col overflow-y-auto">
        <div className="mb-6 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Selecciona un Agente</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tienes {bots.length} agentes disponibles. Elige cuál deseas gestionar en el Chat en Vivo o probar en el simulador.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
          {bots.map((bot: any) => {
            const isConnected = bot.status === 'CONNECTED';
            return (
              <div
                key={bot.id}
                onClick={() => setSelectedBotId(bot.id)}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Bot className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isConnected ? '● CONECTADO' : '○ NO VINCULADO'}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {bot.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {bot.phoneNumber || 'Sin número asignado'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Abrir Chat & Simulador</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 4. MAIN CHAT & SIMULATOR WORKSPACE ────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Top Bar: Bot Switcher Dropdown & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm backdrop-blur-md">
        {/* Bot Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Agente:</span>
          <div className="relative">
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-2 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              {bots.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.status === 'CONNECTED' ? '🟢' : '⚪'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border hidden md:inline-block ${
              botStatusData?.status === 'CONNECTED'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {botStatusData?.status === 'CONNECTED' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </span>
        </div>

        {/* Tab Buttons (Live WhatsApp vs Simulator) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp en Vivo
            {conversations.length > 0 && (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                {conversations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'simulator'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Simulador / Chat de Pruebas
          </button>
        </div>
      </div>

      {/* ── TAB 1: WHATSAPP EN VIVO ────────────────────────────────────────── */}
      {activeTab === 'live' && (
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl h-[calc(100vh-12rem)] min-h-[500px] flex flex-col md:flex-row gap-6 overflow-hidden transition-colors">
          {/* Lista de Conversaciones */}
          <div className="w-full md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-4 md:pb-0 md:pr-6 h-full overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Chats en Vivo
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-semibold border border-slate-200 dark:border-slate-700">
                  {conversations.length}
                </span>
              </div>

              {/* Botones de Actualizar y Vaciar Chats */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => refetchConversations()}
                  className="p-2.5 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Actualizar lista de chats"
                >
                  <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isRefetching ? 'animate-spin text-emerald-500' : ''}`} />
                </button>

                {conversations.length > 0 && (
                  <button
                    onClick={handleClearAllConversations}
                    disabled={isClearingAll}
                    className="p-2.5 sm:p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors disabled:opacity-50"
                    title="Vaciar todos los chats"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {botStatusData && botStatusData.status !== 'CONNECTED' && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp no vinculado</span>
                </div>
                <button onClick={() => setShowConnectionModal(true)} className="font-bold underline text-amber-700 dark:text-amber-400 hover:opacity-80">
                  Vincular (QR/Código)
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">No hay mensajes de clientes aún</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Cuando un cliente escriba a tu WhatsApp, aparecerá aquí en tiempo real.
                  </p>
                </div>
              ) : (
                conversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 relative group ${
                      selectedConversationId === conv.id
                        ? 'bg-emerald-50 dark:bg-slate-800/90 border-emerald-400 dark:border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        {conv.customerPhone}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {conv.isHumanMode ? (
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                            👤 Humano
                          </span>
                        ) : (
                          <span className="text-[9px] bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 font-bold px-1.5 py-0.2 rounded-full border border-cyan-300 dark:border-cyan-500/20">
                            🤖 IA
                          </span>
                        )}

                        <button
                          onClick={(e) => handleDeleteSingleConversation(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 rounded-md transition-all"
                          title="Eliminar este chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {conv.messages?.[0]?.content || 'Sin mensajes'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Box Principal */}
          <div className="w-full md:w-2/3 flex flex-col bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden h-full">
            {!selectedConversationId ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-col gap-3 p-6 text-center">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
                  <MessageSquare className="w-10 h-10 opacity-40 mx-auto mb-1" />
                </div>
                <p className="text-sm font-medium">Selecciona una conversación del panel izquierdo</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  O usa la pestaña <strong>Simulador / Chat de Pruebas</strong> arriba para interactuar con tu bot ahora mismo sin WhatsApp.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                {(() => {
                  const activeConv = conversations.find((c: any) => c.id === selectedConversationId);
                  const isHuman = activeConv?.isHumanMode || false;

                  return (
                    <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border ${
                            isHuman
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30'
                          }`}
                        >
                          {isHuman ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {activeConv?.customerPhone}
                          </h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {isHuman ? '🟢 Modo Humano (IA Pausada)' : '🤖 Modo IA Automática'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleHumanMode}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                            isHuman
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          {isHuman ? 'Desactivar Modo Humano' : 'Tomar Control (Handoff)'}
                        </button>

                        <button
                          onClick={(e) => handleDeleteSingleConversation(e, selectedConversationId)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-500 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition-colors"
                          title="Eliminar este chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Mensajes */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                  {messages.map((msg: any) => {
                    const isUser = msg.sender === 'USER';
                    const isAgent = msg.sender === 'AGENT';
                    return (
                      <div key={msg.id || Math.random()} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-5 py-3 text-sm shadow-md leading-relaxed ${
                            isUser
                              ? 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-slate-700/60'
                              : isAgent
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <span className="text-[11px] opacity-75 mt-1.5 block text-right font-mono font-medium">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isAgent ? ' • Agente Humano' : !isUser ? ' • miBot IA' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input Form */}
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
                  <form onSubmit={handleSendMessage} className="flex gap-2.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Escribe una respuesta como agente..."
                      className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isSending}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-3 rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-500/20"
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

      {/* ── TAB 2: SIMULADOR DE PRUEBAS / WEB SANDBOX ─────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl h-[calc(100vh-12rem)] min-h-[500px] flex flex-col overflow-hidden transition-colors">
          {/* Simulator Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Simulador de IA: {activeBot?.name}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {activeBot?.aiModel || 'gpt-4o-mini'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prueba respuestas, evalúa el prompt del sistema y verifica el RAG sin enviar mensajes por WhatsApp.
                </p>
              </div>
            </div>

            <button
              onClick={handleClearSimulator}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              title="Reiniciar chat de pruebas"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar Chat
            </button>
          </div>

          {/* Quick prompt test chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs text-slate-600 dark:text-slate-400">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Preguntas sugeridas:</span>
            {[
              '¿Cuáles son sus horarios y formas de contacto?',
              '¿Qué productos o servicios ofrecen y qué precios tienen?',
              '¿Tienen garantía o políticas de devolución?',
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendSimulatorMessage(undefined, q)}
                disabled={isSimulating}
                className="shrink-0 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div
            ref={simulatorContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 my-2 custom-scrollbar"
          >
            {simulatorMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-5 py-3 text-sm shadow-md leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{activeBot?.name || 'Agente miBot'}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Sources badge if RAG was used */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[11px] text-slate-500">
                        <Database className="w-3 h-3 text-cyan-500" />
                        <span>RAG: {msg.sources.length} fragmento(s) documental(es) consultado(s)</span>
                      </div>
                    )}

                    <span className="text-[11px] opacity-70 mt-1 block text-right font-mono">
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isSimulating && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-5 py-3 text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 shadow-md">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span className="text-xs font-medium">El agente está pensando su respuesta con RAG...</span>
                </div>
              </div>
            )}
          </div>

          {/* Simulator Input Form */}
          <div className="pt-2">
            <form onSubmit={handleSendSimulatorMessage} className="flex gap-3">
              <input
                type="text"
                value={simulatorInput}
                onChange={(e) => setSimulatorInput(e.target.value)}
                placeholder={`Escribe un mensaje de prueba para ${activeBot?.name || 'tu bot'}...`}
                disabled={isSimulating}
                className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!simulatorInput.trim() || isSimulating}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-500/20"
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Conexión */}
      {showConnectionModal && botStatusData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-500" />
                Vincular WhatsApp
              </h3>
              <button onClick={() => setShowConnectionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
              {botStatusData.status === 'CONNECTED' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">WhatsApp Conectado</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">El agente ya está vinculado y listo para responder.</p>
                  </div>
                </div>
              ) : botStatusData.status === 'CONNECTING' ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Generando código de vinculación...</p>
                </div>
              ) : (
                <>
                  <div className="w-full">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Opción 1: Escanear Código QR</h4>
                    {botStatusData.qrCode ? (
                      <div className="bg-white p-4 rounded-xl inline-block border border-slate-200 shadow-sm">
                        <img src={botStatusData.qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                      Abre WhatsApp {'>'} Dispositivos Vinculados {'>'} Vincular un dispositivo.
                    </p>
                  </div>
                  
                  <div className="w-full relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-500 font-medium">O</span>
                    </div>
                  </div>

                  <div className="w-full text-left">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Opción 2: Código de 8 Dígitos (Pairing Code)</h4>
                    {botStatusData.pairingCode ? (
                      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-3xl font-mono font-bold tracking-[0.2em] text-slate-900 dark:text-white">
                          {botStatusData.pairingCode}
                        </span>
                        <p className="text-xs text-slate-500 mt-2">Ingresa este código en la notificación de WhatsApp de tu celular.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestPairingCode} className="flex gap-2">
                        <input
                          type="text"
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                          placeholder="Ej: 5215512345678"
                          className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!pairingPhone || isRequestingPairing}
                          className="px-4 py-2 bg-emerald-500 text-slate-950 text-sm font-bold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isRequestingPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Solicitar
                        </button>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setShowConnectionModal(false)}
                className="px-5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
