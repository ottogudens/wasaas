'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
  Star,
  Building2,
  AlertCircle,
  ExternalLink,
  Bot,
  FileText,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

// ── Helpers ────────────────────────────────────────────────────────────────────

function TrialBanner({ billing }: { billing: any }) {
  const daysLeft = billing?.trialDaysLeft ?? 0;
  const totalDays = 7;
  const progress = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
  const trialEnd = billing?.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString('es-CL') : '';

  const colorClass =
    daysLeft > 3 ? 'from-emerald-500/10 to-cyan-500/5 border-emerald-500/20' :
    daysLeft > 1 ? 'from-amber-500/10 to-orange-500/5 border-amber-500/20' :
    'from-red-500/10 to-rose-500/5 border-red-500/20';

  const barColor =
    daysLeft > 3 ? 'bg-emerald-500' :
    daysLeft > 1 ? 'bg-amber-500' :
    'bg-red-500';

  const textColor =
    daysLeft > 3 ? 'text-emerald-400' :
    daysLeft > 1 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-r border flex flex-col sm:flex-row sm:items-center gap-4 ${colorClass}`}>
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-2 rounded-xl ${daysLeft > 3 ? 'bg-emerald-500/20' : daysLeft > 1 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
          <Clock className={`w-5 h-5 ${textColor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-100 text-sm">Período de Prueba Gratuita</h4>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${textColor} ${daysLeft > 3 ? 'bg-emerald-500/10 border-emerald-500/30' : daysLeft > 1 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {daysLeft > 0 ? `${daysLeft} DÍA${daysLeft !== 1 ? 'S' : ''} RESTANTES` : 'EXPIRADO'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {daysLeft > 0 ? `Tu prueba gratuita termina el ${trialEnd}. Suscríbete para continuar.` : 'Tu prueba gratuita ha terminado. Elige un plan para continuar.'}
          </p>
          {/* Progress bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentPlanBanner({ billing }: { billing: any }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'ACTIVO', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    PENDING: { label: 'PENDIENTE', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    CANCELLED: { label: 'CANCELADO', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    TRIAL_EXPIRED: { label: 'EXPIRADO', color: 'text-slate-400 bg-slate-700/30 border-slate-600/30' },
  };

  const s = statusMap[billing?.status] ?? statusMap['PENDING'];
  const planName = billing?.customPlanName || billing?.plan || '—';

  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-800">
          <Zap className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h4 className="font-bold text-slate-100 text-sm">Plan Actual</h4>
          <p className="text-xs text-slate-400">{planName}</p>
        </div>
      </div>
      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${s.color}`}>
        {s.label}
      </span>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
  isRecommended,
  onSubscribe,
  isLoading,
}: {
  plan: any;
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  onSubscribe: (planId: string) => void;
  isLoading: boolean;
}) {
  const featureIcons: Record<string, React.ReactNode> = {
    'Bot': <Bot className="w-4 h-4 text-emerald-400" />,
    'bots': <Bot className="w-4 h-4 text-emerald-400" />,
    'default': <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div
      className={`relative p-7 rounded-2xl border flex flex-col justify-between gap-6 transition-all duration-200 ${
        isCurrentPlan
          ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
          : isRecommended
          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Badge */}
      {isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wide">
          Plan Actual
        </div>
      )}
      {isRecommended && !isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wide">
          Recomendado
        </div>
      )}

      <div>
        <h3 className={`text-xl font-bold ${isCurrentPlan || isRecommended ? 'text-emerald-400' : 'text-white'}`}>
          {plan.name}
        </h3>
        {plan.description && (
          <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
        )}
        <p className="text-4xl font-extrabold mt-4 text-white">
          ${plan.price.toLocaleString('es-CL')}
          <span className="text-sm text-slate-400 font-normal ml-1">/ mes</span>
        </p>

        {/* Límites */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Bot className="w-3.5 h-3.5 text-slate-500" />
            {plan.maxBots === -1 ? 'Ilimitados' : `${plan.maxBots} bot${plan.maxBots !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {plan.maxDocs === -1 ? 'Docs ilimitados' : `${plan.maxDocs} documentos`}
          </div>
        </div>

        {/* Features */}
        {plan.features?.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {plan.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => onSubscribe(plan.id)}
        disabled={isCurrentPlan || isLoading}
        className={`w-full flex justify-center items-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
          isCurrentPlan
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default'
            : isRecommended
            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90'
            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isCurrentPlan ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Plan Activo
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            Suscribirse con MercadoPago
          </>
        )}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BillingPanel() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [successBanner, setSuccessBanner] = useState(searchParams?.get('status') === 'success');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Limpiar ?status=success de la URL
  useEffect(() => {
    if (successBanner) {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
  }, [successBanner]);

  const billingQuery = useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => api.getBillingStatus(),
    refetchInterval: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ['plans', 'public'],
    queryFn: () => api.getPublicPlans(),
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => api.subscribeToPlan(planId),
    onSuccess: (data) => {
      if (data.initPoint) {
        window.location.href = data.initPoint;
      }
    },
    onError: (err: any) => {
      setErrorMsg(`Error iniciando suscripción: ${err.message}`);
      setSubscribingPlanId(null);
    },
  });

  const handleSubscribe = (planId: string) => {
    setErrorMsg(null);
    setSubscribingPlanId(planId);
    subscribeMutation.mutate(planId);
  };

  const billing = billingQuery.data;
  const plans = plansQuery.data ?? [];
  const isTrial = billing?.plan === 'TRIAL';
  const currentPlanName = billing?.customPlanName || billing?.plan;

  // Determinar el plan "recomendado" como el segundo (precio medio)
  const recommendedPlanId = plans.length >= 2 ? plans[Math.floor(plans.length / 2)]?.id : plans[1]?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Planes y Suscripciones</h2>
        <p className="text-slate-400 text-sm mt-1">
          Gestiona tu suscripción y método de pago. Pagos procesados de forma segura con MercadoPago.
        </p>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300 font-semibold">
              ¡Suscripción procesada! Tu plan se actualizará en unos momentos.
            </p>
          </div>
          <button onClick={() => setSuccessBanner(false)} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status banners */}
      {billingQuery.isLoading ? (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          <span className="text-slate-400 text-sm">Cargando información de suscripción...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {isTrial && <TrialBanner billing={billing} />}
          {!isTrial && <CurrentPlanBanner billing={billing} />}
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-emerald-400" />
          Planes Disponibles
        </h3>

        {plansQuery.isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay planes disponibles por el momento.</p>
            <p className="text-slate-500 text-xs mt-1">Contacta al administrador para más información.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${plans.length === 1 ? 'md:grid-cols-1 max-w-sm mx-auto' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={
                  !isTrial && (
                    currentPlanName?.toLowerCase() === plan.name.toLowerCase() ||
                    billing?.customPlanName?.toLowerCase() === plan.name.toLowerCase()
                  )
                }
                isRecommended={plan.id === recommendedPlanId}
                onSubscribe={handleSubscribe}
                isLoading={subscribingPlanId === plan.id && subscribeMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* MercadoPago note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sky-400 text-xs font-bold">MP</span>
        </div>
        <div>
          <p className="text-xs text-slate-400">
            <span className="text-slate-300 font-semibold">Pagos seguros con MercadoPago.</span>{' '}
            Al suscribirte serás redirigido a MercadoPago para completar el pago. Las suscripciones se renuevan automáticamente cada mes. Puedes cancelar en cualquier momento desde tu cuenta de MercadoPago.
          </p>
        </div>
      </div>
    </div>
  );
}
