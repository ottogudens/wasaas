'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { AgentLivePanel } from '../../../components/dashboard/AgentLivePanel';
import { Loader2 } from 'lucide-react';

export default function ChatStandalonePage({ params }: { params: { botId: string } }) {
  const { botId } = params;
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !token)) {
      // Guardar a dónde iba para redireccionar después del login
      localStorage.setItem('redirectAfterLogin', `/chat/${botId}`);
      router.push('/login');
    }
  }, [user, token, loading, router, botId]);

  if (loading || !user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return <AgentLivePanel standaloneBotId={botId} isStandalone={true} />;
}
