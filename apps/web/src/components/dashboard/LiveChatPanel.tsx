import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, User, Bot, Send } from 'lucide-react';
import { useBotContext } from '../../lib/bot-context';
import { useConversations } from '../../hooks/useConversations';

export function LiveChatPanel() {
  const { selectedBotId } = useBotContext();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    useMessages,
    sendMessage,
    toggleHumanMode,
    isSending
  } = useConversations(selectedBotId);

  const { data: messages = [] } = useMessages(selectedConversationId);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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

  if (!selectedBotId) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl h-[650px] flex items-center justify-center">
        <p className="text-slate-400">Selecciona un bot en el panel principal para ver sus conversaciones.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl transition-all duration-500 h-[650px] flex flex-col md:flex-row gap-6 overflow-hidden">
      
      {/* Lista de Conversaciones */}
      <div className="w-full md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-6 h-full overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" /> Conversaciones
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 font-mono font-semibold border border-slate-700">
            {conversations.length} activas
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm">No hay chats activos aún</p>
            </div>
          ) : (
            conversations.map((conv: any) => (
              <div 
                key={conv.id} 
                onClick={() => setSelectedConversationId(conv.id)}
                className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${
                  selectedConversationId === conv.id 
                  ? 'bg-slate-800/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
                  : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {conv.customerPhone}
                  </span>
                  {conv.isHumanMode ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      👤 Humano
                    </span>
                  ) : (
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20">
                      🤖 miBot IA
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate font-sans">
                  {conv.messages?.[0]?.content || 'Sin mensajes réplica'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Box Principal */}
      <div className="w-full md:w-2/3 flex flex-col bg-slate-950/60 rounded-2xl border border-slate-800 relative overflow-hidden h-full">
        {!selectedConversationId ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              <MessageSquare className="w-10 h-10 opacity-40 mx-auto mb-1" />
            </div>
            <p className="text-sm font-medium">Selecciona una conversación del panel izquierdo para chatear</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            {(() => {
              const activeConv = conversations.find((c: any) => c.id === selectedConversationId);
              const isHuman = activeConv?.isHumanMode || false;

              return (
                <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${
                      isHuman ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    }`}>
                      {isHuman ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        {activeConv?.customerPhone}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isHuman ? '🟢 Modo Agente Humano Activo (IA Pausada)' : '🤖 Modo IA Automática Activo'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleHumanMode}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                      isHuman
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    {isHuman ? 'Desactivar Modo Humano (Activar IA)' : 'Activar Modo Humano (Mensajes Manuales)'}
                  </button>
                </div>
              );
            })()}

            {/* Mensajes con Scroll Interno Exclusivo */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg: any) => {
                const isUser = msg.sender === 'USER';
                const isAgent = msg.sender === 'AGENT';
                return (
                  <div key={msg.id || Math.random()} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-5 py-3 text-sm shadow-md leading-relaxed ${
                      isUser 
                        ? 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60' 
                        : isAgent 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-500/10'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-emerald-500/10'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] opacity-75 mt-1.5 block text-right font-mono font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isAgent ? ' • Agente Humano' : !isUser ? ' • miBot IA' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Form de Envío */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Escribe un mensaje como agente..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isSending}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-3 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
