'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Gift,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Check,
  Send,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

// ── Courtesy Plan Banner ───────────────────────────────────────────────────────
function CourtesyBanner({ billing }: { billing: any }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/5">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Gift className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
              {billing?.customPlanName || 'Cuenta de Cortesía (Plan Gratuito VIP)'}
            </h4>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wide">
              Vitalicio / Activo
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Esta organización cuenta con una membresía de cortesía. Disfrutas de acceso total a todos los módulos y bots sin costo mensual.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-900/60 px-3.5 py-2 rounded-xl border border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>Sin cobros pendientes</span>
      </div>
    </div>
  );
}

// ── Trial Banner ───────────────────────────────────────────────────────────────
function TrialBanner({ billing }: { billing: any }) {
  const daysLeft = billing?.trialDaysLeft ?? 0;
  const totalDays = 7;
  const progress = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
  const trialEnd = billing?.trialEndsAt ? new Date(billing.trialEndsAt).toLocaleDateString('es-CL') : '';

  const colorClass =
    daysLeft > 3
      ? 'from-emerald-500/10 to-cyan-500/5 border-emerald-500/20'
      : daysLeft > 1
      ? 'from-amber-500/10 to-orange-500/5 border-amber-500/20'
      : 'from-red-500/10 to-rose-500/5 border-red-500/20';

  const barColor = daysLeft > 3 ? 'bg-emerald-500' : daysLeft > 1 ? 'bg-amber-500' : 'bg-red-500';

  const textColor =
    daysLeft > 3
      ? 'text-emerald-600 dark:text-emerald-400'
      : daysLeft > 1
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-r border flex flex-col sm:flex-row sm:items-center gap-4 ${colorClass}`}>
      <div className="flex items-center gap-3 flex-1">
        <div
          className={`p-2.5 rounded-xl ${
            daysLeft > 3
              ? 'bg-emerald-500/20'
              : daysLeft > 1
              ? 'bg-amber-500/20'
              : 'bg-red-500/20'
          }`}
        >
          <Clock className={`w-5 h-5 ${textColor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Período de Prueba Gratuita</h4>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${textColor} ${
                daysLeft > 3
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : daysLeft > 1
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {daysLeft > 0 ? `${daysLeft} DÍA${daysLeft !== 1 ? 'S' : ''} RESTANTES` : 'EXPIRADO'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {daysLeft > 0
              ? `Tu prueba gratuita termina el ${trialEnd}. Suscríbete para continuar sin interrupciones.`
              : 'Tu prueba gratuita ha terminado. Elige un plan para continuar usando tus agentes.'}
          </p>
          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Current Plan Banner ────────────────────────────────────────────────────────
function CurrentPlanBanner({ billing }: { billing: any }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'ACTIVO', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30' },
    PENDING: { label: 'PENDIENTE', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30' },
    CANCELLED: { label: 'CANCELADO', color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30' },
    TRIAL_EXPIRED: { label: 'EXPIRADO', color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/30' },
  };

  const s = statusMap[billing?.status] ?? statusMap['PENDING'];
  const planName = billing?.customPlanName || billing?.plan || '—';

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Plan Actual</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{planName}</p>
        </div>
      </div>
      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span>
    </div>
  );
}

// ── Plan Card Component ────────────────────────────────────────────────────────
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
  return (
    <div
      className={`relative p-7 rounded-2xl border flex flex-col justify-between gap-6 transition-all duration-200 ${
        isCurrentPlan
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 ring-1 ring-emerald-500/20'
          : isRecommended
          ? 'bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border-emerald-400 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/5'
          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wide">
          Plan Activo
        </div>
      )}
      {isRecommended && !isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wide">
          Recomendado
        </div>
      )}

      <div>
        <h3 className={`text-xl font-bold ${isCurrentPlan || isRecommended ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
          {plan.name}
        </h3>
        {plan.description && <p className="text-xs text-slate-500 mt-1">{plan.description}</p>}
        <p className="text-4xl font-extrabold mt-4 text-slate-900 dark:text-white">
          ${plan.price.toLocaleString('es-CL')}
          <span className="text-sm text-slate-500 font-normal ml-1">/ mes</span>
        </p>

        {/* Límites */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Bot className="w-3.5 h-3.5 text-slate-500" />
            {plan.maxBots === -1 ? 'Ilimitados' : `${plan.maxBots} bot${plan.maxBots !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {plan.maxDocs === -1 ? 'Docs ilimitados' : `${plan.maxDocs} documentos`}
          </div>
        </div>

        {/* Features */}
        {plan.features?.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {plan.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => onSubscribe(plan.id)}
        disabled={isCurrentPlan || isLoading}
        className={`w-full flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
          isCurrentPlan
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 cursor-default'
            : isRecommended
            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90'
            : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700'
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

// ── Client MercadoPago Integration Box ─────────────────────────────────────────
function ClientMercadoPagoIntegration() {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  const clientMpQuery = useQuery({
    queryKey: ['mercadopago', 'client-config'],
    queryFn: () => api.getClientMpConfig(),
  });

  const saveClientMpMutation = useMutation({
    mutationFn: (body: { accessToken: string; publicKey?: string }) => api.saveClientMpConfig(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mercadopago', 'client-config'] });
      setAccessToken('');
      setStatusMsg({
        success: true,
        text: `¡Mercado Pago Conectado con Éxito! Cuenta: ${data.accountInfo?.nickname || data.accountInfo?.email || 'Verificada'}. Tus bots ya pueden cobrar directamente a tu cuenta.`,
      });
    },
    onError: (err: any) => {
      setStatusMsg({ success: false, text: err.message || 'Error al validar credenciales de Mercado Pago' });
    },
  });

  const config = clientMpQuery.data;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) return;
    setStatusMsg(null);
    saveClientMpMutation.mutate({
      accessToken: accessToken.trim(),
      publicKey: publicKey.trim() || undefined,
    });
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              Cobros por WhatsApp con tu Mercado Pago
              {config?.isConfigured && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ● CONECTADO
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conecta tu cuenta personal o comercial de Mercado Pago para que tu bot genere links de cobro directos para tus clientes.
            </p>
          </div>
        </div>
      </div>

      {config?.isConfigured && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs text-emerald-900 dark:text-emerald-300">
            <span className="font-bold">Cuenta vinculada:</span> {config.accountInfo?.nickname || config.accountInfo?.email || 'Activa'} ({config.maskedToken})
          </div>
        </div>
      )}

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            statusMsg.success
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
              : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20'
          }`}
        >
          {statusMsg.success ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Access Token de tu Mercado Pago *
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={config?.maskedToken ? `Actual: ${config.maskedToken}` : 'APP_USR-XXXXXX-XXXXXX...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Encuéntralo en: <strong>Mercado Pago Desarrolladores &gt; Tus Integraciones &gt; Credenciales de Producción</strong>.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Public Key (Opcional)
          </label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder={config?.publicKey || 'APP_USR-XXXXXX-XXXXXX...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={saveClientMpMutation.isPending || !accessToken.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saveClientMpMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {config?.isConfigured ? 'Actualizar Credenciales de Mercado Pago' : 'Vincular mi Cuenta de Mercado Pago'}
        </button>
      </form>
    </div>
  );
}

// ── Main Billing Panel ─────────────────────────────────────────────────────────
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
  const isCourteous = billing?.isCourteous || billing?.plan === 'CORTESIA';
  const isTrial = billing?.plan === 'TRIAL' && !isCourteous;
  const currentPlanName = billing?.customPlanName || billing?.plan;

  // Determinar el plan "recomendado"
  const recommendedPlanId = plans.length >= 2 ? plans[Math.floor(plans.length / 2)]?.id : plans[1]?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Facturación y Pasarelas de Pago</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gestiona tu plan de suscripción y configura tu cuenta de Mercado Pago para procesar ventas por WhatsApp.
        </p>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">
              ¡Suscripción procesada! Tu plan se actualizará en unos momentos.
            </p>
          </div>
          <button onClick={() => setSuccessBanner(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status banners */}
      {billingQuery.isLoading ? (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          <span className="text-slate-600 dark:text-slate-400 text-sm">Cargando información de suscripción...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {isCourteous ? (
            <CourtesyBanner billing={billing} />
          ) : isTrial ? (
            <TrialBanner billing={billing} />
          ) : (
            <CurrentPlanBanner billing={billing} />
          )}
        </div>
      )}

      {/* Mercado Pago Integration for Client */}
      <ClientMercadoPagoIntegration />

      {/* Plans Grid (If not in courtesy or if user wants to change plan) */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-emerald-500" />
          Planes Disponibles
        </h3>

        {plansQuery.isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-400 text-sm">No hay planes disponibles por el momento.</p>
            <p className="text-slate-500 text-xs mt-1">Contacta al administrador para más información.</p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              plans.length === 1 ? 'md:grid-cols-1 max-w-sm mx-auto' : plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={
                  !isTrial &&
                  !isCourteous &&
                  (currentPlanName?.toLowerCase() === plan.name.toLowerCase() ||
                    billing?.customPlanName?.toLowerCase() === plan.name.toLowerCase())
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
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sky-600 dark:text-sky-400 text-[11px] font-bold">MP</span>
        </div>
        <div>
          <p>
            <span className="font-bold text-slate-900 dark:text-slate-200">Pagos seguros con Mercado Pago.</span> Al suscribirte serás
            redirigido a Mercado Pago para completar el pago. Las suscripciones se renuevan automáticamente cada mes. Puedes
            cancelar en cualquier momento desde tu cuenta de Mercado Pago.
          </p>
        </div>
      </div>
    </div>
  );
}
