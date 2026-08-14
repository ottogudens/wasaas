'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export function BillingPanel() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, amount: number) => {
    setLoadingPlan(planName);
    setErrorMsg(null);
    try {
      const res = await api.createSubscription({ planName, amount });
      if (res.initPoint) {
        window.location.href = res.initPoint;
      }
    } catch (err: any) {
      setErrorMsg(`❌ Error iniciando suscripción: ${err.message}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Planes y Suscripciones</h2>
        <p className="text-slate-400 text-sm">Prueba gratuita activa por 7 días. Selecciona un plan recurrente para potenciar tus Agentes con MercadoPago.</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Banner de Estado de Suscripción */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">Tu Cuenta Incluye 7 Días Gratis de Prueba</h4>
            <p className="text-xs text-slate-400">Disfrutas de 1 Agente de WhatsApp activo durante el periodo de prueba.</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
          PRUEBA GRATUITA 7 DÍAS
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tarjeta Plan Trial */}
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-emerald-500/30 flex flex-col justify-between space-y-6 relative">
          <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase">INCLUIDO</div>
          <div>
            <h3 className="text-xl font-bold text-emerald-400">Prueba Gratuita</h3>
            <p className="text-3xl font-extrabold mt-2">$0 <span className="text-sm text-slate-400 font-normal">/ 7 días</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1 Agente de WhatsApp</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acceso por 7 Días completos</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> RAG + pgvector</li>
            </ul>
          </div>
          <button
            disabled
            className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs cursor-default"
          >
            Plan Actual (Prueba Gratuita)
          </button>
        </div>

        {/* Tarjeta Plan Starter */}
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
            disabled={loadingPlan === 'Starter'}
            className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-all text-sm text-white disabled:opacity-50"
          >
            {loadingPlan === 'Starter' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suscribirse con MercadoPago'}
          </button>
        </div>

        {/* Tarjeta Plan Pro */}
        <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-bl-xl">RECOMENDADO</div>
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
            disabled={loadingPlan === 'Pro'}
            className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all text-sm disabled:opacity-50"
          >
            {loadingPlan === 'Pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suscribirse con MercadoPago'}
          </button>
        </div>
      </div>
    </div>
  );
}
