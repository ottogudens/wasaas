'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Paperclip,
  FileText,
  Loader2,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  Smartphone,
  QrCode,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  Share2,
  Download,
  Info,
} from 'lucide-react';
import { useBotContext } from '../../lib/bot-context';
import { useAuth } from '../../lib/auth-context';
import { useBots } from '../../hooks/useBots';
import { api } from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  transcribedText?: string;
  documentName?: string;
  sources?: string[];
  provider?: string;
  model?: string;
  time: string;
}

const PROVIDER_MODELS: Record<string, { label: string; models: { id: string; name: string }[] }> = {
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Rápido)' },
      { id: 'gpt-4o', name: 'GPT-4o (Avanzado)' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Gratuito / Rápido)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Avanzado)' },
    ],
  },
  anthropic: {
    label: 'Anthropic Claude',
    models: [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
  },
  deepseek: {
    label: 'DeepSeek AI',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    ],
  },
};

export function AgentLivePanel() {
  const { selectedBotId, setSelectedBotId } = useBotContext();
  const { token } = useAuth();
  const { bots } = useBots(token);
  const activeBot = bots?.find((b: any) => b.id === selectedBotId);

  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');

  // Auto-seleccionar primer bot disponible si no hay bot activo elegido
  useEffect(() => {
    if (bots && bots.length > 0 && !selectedBotId) {
      setSelectedBotId(bots[0].id);
    }
  }, [bots, selectedBotId, setSelectedBotId]);

  // Cargar proveedor y modelo por defecto globales de la plataforma
  useEffect(() => {
    api.getAiPublicConfig()
      .then((cfg) => {
        if (cfg?.defaultProvider && PROVIDER_MODELS[cfg.defaultProvider]) {
          setSelectedProvider(cfg.defaultProvider);
          const availableModels = PROVIDER_MODELS[cfg.defaultProvider].models;
          if (cfg.defaultModel && availableModels.some((m) => m.id === cfg.defaultModel)) {
            setSelectedModel(cfg.defaultModel);
          } else if (availableModels.length > 0) {
            setSelectedModel(availableModels[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu agente virtual directo. Puedes escribirme, enviarme documentos o hablarme por nota de voz. ¿En qué te puedo ayudar hoy?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Document attachment state
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Speech synthesis state
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Shortcut / PWA modal
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  // Handle File Upload & Extract Text
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setAttachedDoc({
        name: file.name,
        content: text || `[Archivo: ${file.name}]`,
      });
    };
    reader.readAsText(file);
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos en tu navegador.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Process Recorded Audio via Whisper API
  const processAudioMessage = async (audioBlob: Blob) => {
    if (!selectedBotId) return;
    setIsProcessing(true);

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // 1. Transcribir audio
        const transRes = await api.transcribeDirectAudio(base64Audio, 'audio/webm');
        const transcribedText = transRes?.transcribedText || '';

        if (!transcribedText.trim()) {
          setIsProcessing(false);
          alert('No se pudo entender la nota de voz. Intenta nuevamente.');
          return;
        }

        // Agregar mensaje de voz del usuario
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `🎤 [Nota de voz]: "${transcribedText}"`,
          transcribedText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);

        // 2. Enviar a la IA del bot
        const historyForAi = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
        const aiRes = await api.interactDirectAgent(
          selectedBotId,
          transcribedText,
          attachedDoc ? { documentName: attachedDoc.name, documentContent: attachedDoc.content } : undefined,
          historyForAi,
          { provider: selectedProvider, model: selectedModel }
        );

        setAttachedDoc(null);

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiRes.reply,
          sources: aiRes.sources,
          provider: aiRes.provider || PROVIDER_MODELS[selectedProvider]?.label || selectedProvider,
          model: aiRes.model || selectedModel,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsProcessing(false);
      };
    } catch (err) {
      console.error('Error procesando nota de voz:', err);
      setIsProcessing(false);
    }
  };

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetBotId = selectedBotId || (bots && bots.length > 0 ? bots[0].id : null);
    if ((!inputText.trim() && !attachedDoc) || !targetBotId || isProcessing) return;

    const userText = inputText.trim();
    const currentDoc = attachedDoc;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText || `[Documento adjunto: ${currentDoc?.name}]`,
      documentName: currentDoc?.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAttachedDoc(null);
    setIsProcessing(true);

    try {
      const historyForAi = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const aiRes = await api.interactDirectAgent(
        targetBotId,
        userText,
        currentDoc ? { documentName: currentDoc.name, documentContent: currentDoc.content } : undefined,
        historyForAi,
        { provider: selectedProvider, model: selectedModel }
      );

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiRes.reply,
        sources: aiRes.sources,
        provider: aiRes.provider || PROVIDER_MODELS[selectedProvider]?.label || selectedProvider,
        model: aiRes.model || selectedModel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error al comunicarse con el agente:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ocurrió un inconveniente al comunicarse con el agente. Verifica que la API key seleccionada esté activa.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Play Text to Speech
  const togglePlayAudio = (msgId: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio === msgId) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(null);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.onend = () => setIsPlayingAudio(null);
        utterance.onerror = () => setIsPlayingAudio(null);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(msgId);
      }
    } else {
      alert('Tu navegador no soporta lectura de texto por voz.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Agente Directo en Vivo (Sin WhatsApp)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                PWA / App Móvil
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Procesa documentos, transcribe notas de voz y responde consultas con RAG nativo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bot selector */}
          {bots && bots.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1.5">Bot:</span>
              <select
                value={selectedBotId || ''}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:border-emerald-500"
              >
                {bots.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AI Provider selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Proveedor:
            </span>
            <select
              value={selectedProvider}
              onChange={(e) => {
                const newProv = e.target.value;
                setSelectedProvider(newProv);
                setSelectedModel(PROVIDER_MODELS[newProv]?.models[0]?.id || '');
              }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:border-emerald-500"
            >
              {Object.entries(PROVIDER_MODELS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Model selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1.5">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:border-emerald-500"
            >
              {PROVIDER_MODELS[selectedProvider]?.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add shortcut button */}
          <button
            onClick={() => setShowShortcutModal(true)}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Smartphone className="w-4 h-4" />
            Acceso Directo
          </button>
        </div>
      </div>

      {/* Main Live Chat Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm min-h-[500px]">
        {/* Messages Scroll Area */}
        <div ref={chatContainerRef} className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-emerald-500 text-slate-950 font-bold'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[80%] md:max-w-[70%] space-y-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {/* AI Provider & Model Tag for Assistant Messages */}
                {msg.role === 'assistant' && msg.provider && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span>{msg.provider}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">{msg.model}</span>
                  </div>
                )}

                <div
                  className={`inline-block p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {/* Document badge if attached */}
                  {msg.documentName && (
                    <div className="mb-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 flex items-center gap-2 text-xs font-semibold">
                      <FileText className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="truncate">{msg.documentName}</span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Sources badge if RAG was used */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                        <Database className="w-3 h-3" />
                        <span>Base de Conocimiento Consultada ({msg.sources.length})</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-2 text-[11px] text-slate-400 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.time}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => togglePlayAudio(msg.id, msg.content)}
                      className="hover:text-emerald-500 transition-colors p-0.5 rounded"
                      title="Escuchar respuesta hablada"
                    >
                      {isPlayingAudio === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Processing / Thinking Loader */}
          {isProcessing && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span>El agente está analizando tu consulta y generando respuesta...</span>
              </div>
            </div>
          )}
        </div>

        {/* Attachment preview bar */}
        {attachedDoc && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="truncate">Documento cargado: <strong>{attachedDoc.name}</strong></span>
            </div>
            <button
              onClick={() => setAttachedDoc(null)}
              className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 rounded-md transition-colors text-slate-500 hover:text-rose-500"
              title="Quitar adjunto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {isRecording ? (
            <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  Grabando nota de voz ({formatTime(recordingTime)})
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MicOff className="w-4 h-4" />
                Detener y Enviar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.csv,.doc,.docx"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Adjuntar Documento para análisis"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Grabar nota de voz con micrófono"
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe tu mensaje o adjunta un documento..."
                disabled={isProcessing}
                className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedDoc) || isProcessing}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal Acceso Directo en Teléfono (PWA Shortcut) */}
      {showShortcutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-500" />
                Acceso Directo en Celular
              </h3>
              <button onClick={() => setShowShortcutModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Puedes instalar este agente directamente en la pantalla de inicio de tu teléfono inteligente como si fuera una aplicación nativa.
            </p>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Abre este enlace desde el navegador Safari (iOS) o Chrome (Android) en tu smartphone.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Toca el icono de <strong>Compartir / Menú (⋮)</strong> y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>¡Listo! Tendrás un icono de acceso directo 1-Tap en tu celular sin requerir WhatsApp.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowShortcutModal(false)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
