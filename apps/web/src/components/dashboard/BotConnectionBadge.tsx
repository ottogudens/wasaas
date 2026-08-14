'use client';

import React from 'react';
import { useBotContext } from '../../lib/bot-context';
import { useBots } from '../../hooks/useBots';
import { useAuth } from '../../lib/auth-context';
import { CheckCircle2, X, Loader2, QrCode } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function BotConnectionBadge() {
  const { token } = useAuth();
  const { bots, isLoading } = useBots(token);
  const { selectedBotId } = useBotContext();

  if (isLoading) {
    return <Skeleton className="h-8 w-32 bg-slate-800 rounded-full" />;
  }

  // Si no hay bot seleccionado, intenta tomar el primero, o nada.
  const activeBot = bots?.find((b: any) => b.id === selectedBotId) || bots?.[0];

  if (!activeBot) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
        <span className="text-xs font-medium text-slate-400">Sin Bot</span>
      </div>
    );
  }

  let badge = { label: 'Desconectado', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dot: 'bg-slate-500', icon: <X className="w-3 h-3" /> };
  
  switch (activeBot.status) {
    case 'CONNECTED':
      badge = { label: 'Conectado', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500', icon: <CheckCircle2 className="w-3 h-3" /> };
      break;
    case 'QR_READY':
      badge = { label: 'QR Listo', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dot: 'bg-blue-500 animate-pulse', icon: <QrCode className="w-3 h-3" /> };
      break;
    case 'CONNECTING':
      badge = { label: 'Conectando...', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      break;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${badge.className} transition-all`}>
      <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
      <span className="text-xs font-bold tracking-wide truncate max-w-[120px]" title={activeBot.name}>
        {activeBot.name}
      </span>
      <div className="w-px h-3 bg-current opacity-20 mx-1" />
      <span className="text-[10px] font-medium uppercase tracking-wider">{badge.label}</span>
    </div>
  );
}
