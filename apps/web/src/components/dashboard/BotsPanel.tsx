'use client';

import React, { useState } from 'react';
import { Bot, Plus, Loader2, CheckCircle2, X, Pencil, Trash2, QrCode, Settings } from 'lucide-react';
import { useBotContext } from '../../lib/bot-context';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useBots } from '../../hooks/useBots';

export function BotsPanel() {
  const { token } = useAuth();
  const { bots, isLoading, isCreating, createBot, updateBot, deleteBot, isUpdating, startBot } = useBots(token);
  const { setSelectedBotId, setSelectedBot } = useBotContext();
  const router = useRouter();

  const [newBotName, setNewBotName] = useState('');
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  
  const [configBot, setConfigBot] = useState<any | null>(null);
  const [editBotName, setEditBotName] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editAiModel, setEditAiModel] = useState('gpt-4o-mini');
  
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    try {
      await createBot(newBotName);
      setNewBotName('');
    } catch (err) {
      console.error('Error creating bot', err);
    }
  };

  const handleEditBot = async (id: string) => {
    if (!editBotName.trim()) return;
    try {
      await updateBot({ id, data: { name: editBotName } });
      setEditingBotId(null);
    } catch (err) {
      console.error('Error editing bot', err);
    }
  };

  const handleSaveConfig = async (id: string) => {
    if (!editBotName.trim()) return;
    try {
      await updateBot({ 
        id, 
        data: { 
          name: editBotName,
          systemPrompt: editSystemPrompt,
          aiModel: editAiModel
        } 
      });
      setConfigBot(null);
    } catch (err) {
      console.error('Error saving bot config', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED': return { label: 'Conectado', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> };
      case 'QR_READY': return { label: 'QR Listo', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <QrCode className="w-3 h-3" /> };
      case 'CONNECTING': return { label: 'Conectando...', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      default: return { label: 'Desconectado', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <X className="w-3 h-3" /> };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mis Agentes de WhatsApp</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Gestiona y crea tus instancias de agentes IA (Powered by React Query).</p>
      </div>

      <form onSubmit={handleCreateBot} className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <input
          type="text"
          required
          value={newBotName}
          onChange={(e) => setNewBotName(e.target.value)}
          placeholder="Nombre del Agente (ej. Agente de Ventas)"
          className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="px-6 py-3 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Crear Agente
        </button>
      </form>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-12 p-8 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
          <Bot className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">No tienes agentes creados aún.</p>
          <p className="text-slate-500 text-xs mt-1">Crea tu primer agente para comenzar.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bots.map((b: any) => {
            const badge = getStatusBadge(b.status);
            return (
              <div
                key={b.id}
                className="p-6 rounded-2xl border transition-all bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 dark:hover:border-slate-700"
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
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" onClick={() => { setSelectedBot(b); router.push('/dashboard/chat'); }}>{b.name}</h3>
                  )}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${badge.className}`}>
                    {badge.icon} {badge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">Tenant: {b.tenantId}</p>
                <p className="text-xs text-slate-500 mb-3">Modelo: {b.aiModel || 'gpt-4o-mini'}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    disabled={b.status === 'CONNECTING'}
                    onClick={async () => {
                      setSelectedBot(b);
                      // Solo llamar startBot si NO está ya iniciándose (evita race condition)
                      if (b.status !== 'CONNECTED' && b.status !== 'CONNECTING') {
                        startBot(b.id).catch(() => {});
                      }
                      router.push('/dashboard/chat');
                    }}
                    className="text-xs px-3.5 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {b.status === 'CONNECTING'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                      : <><QrCode className="w-4 h-4" /> Vincular</>
                    }
                  </button>
                    <button
                      onClick={() => { setConfigBot(b); setEditBotName(b.name); setEditSystemPrompt(b.systemPrompt || ''); setEditAiModel(b.aiModel || 'gpt-4o-mini'); }}
                    className="text-xs px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" /> Configurar
                  </button>
                  {deletingBotId === b.id ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">¿Seguro?</span>
                      <button onClick={() => deleteBot(b.id)} className="text-xs px-3.5 py-2 rounded-lg bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30 transition-colors">Sí</button>
                      <button onClick={() => setDeletingBotId(null)} className="text-xs px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingBotId(b.id)}
                      className="text-xs px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {configBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Configurar Agente
              </h3>
              <button onClick={() => setConfigBot(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nombre del Agente</label>
                <input
                  type="text"
                  value={editBotName}
                  onChange={e => setEditBotName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Modelo de IA</label>
                <select
                  value={editAiModel}
                  onChange={e => setEditAiModel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                  <option value="gpt-4o">GPT-4o (Avanzado)</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Instrucciones del Sistema (Prompt)</label>
                <textarea
                  value={editSystemPrompt}
                  onChange={e => setEditSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder="Ej: Eres un asistente de ventas cordial..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 custom-scrollbar"
                />
                <p className="text-xs text-slate-500 mt-2">Define el comportamiento, tono y objetivo principal del agente.</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setConfigBot(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSaveConfig(configBot.id)}
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
