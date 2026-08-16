'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Check,
  X,
  AlertCircle,
  Package,
  Users,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Building2,
  CreditCard,
  Gift,
  ShieldCheck,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

// ── 1. Plan Form Modal ────────────────────────────────────────────────────────
type PlanFormData = {
  name: string;
  description: string;
  price: number | '';
  maxBots: number | '';
  maxDocs: number | '';
  features: string;
};

function PlanModal({
  initial,
  onSave,
  onClose,
  isSaving,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PlanFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? '',
    maxBots: initial?.maxBots ?? 1,
    maxDocs: initial?.maxDocs ?? 50,
    features: (initial?.features ?? []).join('\n'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      maxBots: Number(form.maxBots),
      maxDocs: Number(form.maxDocs),
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial ? 'Editar Plan de Servicio' : 'Crear Plan de Servicio'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Nombre del Plan *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                placeholder="Ej: Plan Starter, Plan Pro..."
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Descripción
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                placeholder="Descripción breve del plan..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Precio (CLP/mes) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                placeholder="29000"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Máx. Bots *
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.maxBots}
                onChange={(e) => setForm({ ...form, maxBots: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                placeholder="1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Máx. Documentos RAG *
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.maxDocs}
                onChange={(e) => setForm({ ...form, maxDocs: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                placeholder="50"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Características (una por línea)
              </label>
              <textarea
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-mono text-xs"
                placeholder={'Mensajes ilimitados\nRAG hasta 50 documentos\nSoporte prioritario'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 2. Modal para Editar Suscripción / Plan de un Cliente (Cortesía / Planes) ──
function EditSubscriptionModal({
  tenant,
  onClose,
  onSave,
  isSaving,
}: {
  tenant: any;
  onClose: () => void;
  onSave: (data: { plan: string; customPlanName?: string; status: string }) => void;
  isSaving: boolean;
}) {
  const currentSub = tenant.subscriptions?.[0];
  const [selectedPlan, setSelectedPlan] = useState<string>(currentSub?.plan || 'TRIAL');
  const [customPlanName, setCustomPlanName] = useState<string>(currentSub?.customPlanName || '');
  const [status, setStatus] = useState<string>(currentSub?.status || 'ACTIVE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      plan: selectedPlan,
      customPlanName: customPlanName.trim() || undefined,
      status: selectedPlan === 'CORTESIA' ? 'ACTIVE' : status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Gestionar Plan del Cliente</h3>
            <p className="text-xs text-slate-500">{tenant.name} ({tenant.slug})</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Preset Buttons for Quick Courtesy Activation */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> Cuenta de Cortesía (Free VIP)
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('CORTESIA');
                  setStatus('ACTIVE');
                  setCustomPlanName('Cuenta de Cortesía Vitalicia');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition-all shadow-sm"
              >
                Activar Cortesía
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Las cuentas de cortesía tienen acceso completo vitalicio sin fecha de expiración ni cobros.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Tipo de Plan *
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="CORTESIA">🎁 CORTESIA (Cortesía / Gratuito Vitalicio)</option>
              <option value="STARTER">STARTER (Plan Básico 1 Bot)</option>
              <option value="PRO">PRO (Plan Pro 5 Bots)</option>
              <option value="ENTERPRISE">ENTERPRISE (Plan Corporativo 20 Bots)</option>
              <option value="TRIAL">TRIAL (Prueba Gratuita 7 Días)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Nombre personalizado del plan (Opcional)
            </label>
            <input
              value={customPlanName}
              onChange={(e) => setCustomPlanName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Socio Estratégico, VIP Fibrapucon"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Estado de Suscripción *
            </label>
            <select
              value={status}
              disabled={selectedPlan === 'CORTESIA'}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60 font-medium"
            >
              <option value="ACTIVE">ACTIVE (Activo - Acceso Permitido)</option>
              <option value="PENDING">PENDING (Pendiente de Pago)</option>
              <option value="CANCELLED">CANCELLED (Cancelado)</option>
              <option value="TRIAL_EXPIRED">TRIAL_EXPIRED (Prueba Expirada - Bloqueado)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm hover:opacity-90 disabled:opacity-50 shadow-md"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar Suscripción
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 3. Tab de Planes de Servicio ──────────────────────────────────────────────
function PlansTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => api.listSalesPlans(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createSalesPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setEditingPlan(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.updatePlan(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSalesPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setConfirmDelete(null);
    },
  });

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Planes de Servicio</h3>
          <p className="text-xs text-slate-500 mt-0.5">Configura los precios, cuotas y límites para tus clientes.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-md hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </button>
      </div>

      {plansQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 dark:text-slate-400 font-semibold">No hay planes creados</p>
          <p className="text-slate-500 text-xs mt-1">Crea el primer plan para que los clientes puedan suscribirse.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => (
            <div
              key={plan.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                plan.isActive
                  ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{plan.name}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      plan.isActive
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                        : 'text-slate-500 bg-slate-200 dark:bg-slate-700/30 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {plan.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                {plan.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{plan.description}</p>}
                <div className="flex gap-4 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">${plan.price.toLocaleString('es-CL')}</span> CLP/mes
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-300">{plan.maxBots}</span> bots
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-300">{plan.maxDocs}</span> docs
                  </span>
                  {plan.features?.length > 0 && (
                    <span className="text-xs text-slate-500">{plan.features.length} características</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: plan.id, isActive: !plan.isActive })}
                  disabled={toggleActiveMutation.isPending}
                  title={plan.isActive ? 'Desactivar plan' : 'Activar plan'}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {plan.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setEditingPlan(plan)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Editar plan"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {confirmDelete === plan.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteMutation.mutate(plan.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(plan.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Eliminar plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PlanModal
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setShowModal(false)}
          isSaving={createMutation.isPending}
        />
      )}
      {editingPlan && (
        <PlanModal
          initial={editingPlan}
          onSave={(data) => updateMutation.mutate({ id: editingPlan.id, data })}
          onClose={() => setEditingPlan(null)}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ── 4. Tab de Clientes & Edición Manual de Planes ─────────────────────────────
function TenantsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSubTenant, setEditingSubTenant] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: () => api.listTenants(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.toggleTenantStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.refetchQueries({ queryKey: ['tenants', 'all'] });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => api.deleteTenant(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      await queryClient.refetchQueries({ queryKey: ['tenants', 'all'] });
    },
    onError: (err: any) => {
      alert(`Error al eliminar cliente: ${err.message || 'Error desconocido'}`);
    },
  });

  const updateSubMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateTenantSubscription(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      await queryClient.refetchQueries({ queryKey: ['tenants', 'all'] });
      setEditingSubTenant(null);
    },
    onError: (err: any) => {
      alert(`Error al guardar suscripción: ${err.message || 'Error desconocido'}`);
    },
  });

  const tenants = tenantsQuery.data ?? [];

  const planBadge = (sub: any) => {
    if (!sub) return <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Sin plan</span>;

    if (sub.plan === 'CORTESIA') {
      return (
        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1">
          <Gift className="w-3 h-3" /> CORTESÍA (VITALICIO)
        </span>
      );
    }

    const statusColor: Record<string, string> = {
      ACTIVE: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30',
      TRIAL: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/30',
      PENDING: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30',
      CANCELLED: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30',
      TRIAL_EXPIRED: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600',
    };
    const color = statusColor[sub.status] ?? statusColor['PENDING'];
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
        {sub.customPlanName || sub.plan} · {sub.status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Clientes / Organizaciones</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tenants.length} organizaciones registradas</p>
        </div>
        <button
          onClick={() => tenantsQuery.refetch()}
          disabled={tenantsQuery.isRefetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${tenantsQuery.isRefetching ? 'animate-spin text-emerald-500' : ''}`} />
          Actualizar
        </button>
      </div>

      {tenantsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 dark:text-slate-400">No hay clientes registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant: any) => {
            const activeSub = tenant.subscriptions?.[0];
            const isExpanded = expandedId === tenant.id;
            const isCourteous = activeSub?.plan === 'CORTESIA';

            return (
              <div
                key={tenant.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm transition-colors"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${tenant.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{tenant.name}</span>
                      {planBadge(activeSub)}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {tenant.users?.[0]?.email} · {tenant.bots?.length ?? 0} bots
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-200 dark:border-slate-700/50">
                        <p className="text-slate-500 mb-1">Registrado</p>
                        <p className="text-slate-900 dark:text-slate-300 font-medium">
                          {new Date(tenant.createdAt).toLocaleDateString('es-CL')}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-200 dark:border-slate-700/50">
                        <p className="text-slate-500 mb-1">Estado de Acceso</p>
                        <p className={`font-bold ${tenant.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tenant.isActive ? 'Activo' : 'Suspendido'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-200 dark:border-slate-700/50">
                        <p className="text-slate-500 mb-1">Plan & Facturación</p>
                        <p className="text-slate-900 dark:text-slate-200 font-bold">
                          {isCourteous ? '🎁 Cortesía Gratuita' : activeSub ? `${activeSub.customPlanName || activeSub.plan} (${activeSub.status})` : 'Sin Plan'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* Botón para editar plan / cortesía */}
                      <button
                        onClick={() => setEditingSubTenant(tenant)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar Plan / Cuenta Cortesía
                      </button>

                      {/* Botón de suspender/activar acceso */}
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: tenant.id, isActive: !tenant.isActive })}
                        disabled={toggleStatusMutation.isPending}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          tenant.isActive
                            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                        }`}
                      >
                        {toggleStatusMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {tenant.isActive ? 'Suspender Acceso' : 'Activar Acceso'}
                      </button>

                      {/* Botón de eliminar cliente */}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar el cliente "${tenant.name}"? Esto eliminará todos sus bots, documentos y datos. Esta acción no se puede deshacer.`)) {
                            deleteTenantMutation.mutate(tenant.id);
                          }
                        }}
                        disabled={deleteTenantMutation.isPending}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
                      >
                        {deleteTenantMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Eliminar Cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingSubTenant && (
        <EditSubscriptionModal
          tenant={editingSubTenant}
          onClose={() => setEditingSubTenant(null)}
          onSave={(data) => updateSubMutation.mutate({ id: editingSubTenant.id, data })}
          isSaving={updateSubMutation.isPending}
        />
      )}
    </div>
  );
}

// ── 5. Tab de Integración de Mercado Pago (Plataforma Super Admin) ─────────────
function MercadoPagoPlatformTab() {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const mpQuery = useQuery({
    queryKey: ['mercadopago', 'platform-config'],
    queryFn: () => api.getPlatformMpConfig(),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.savePlatformMpConfig(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mercadopago', 'platform-config'] });
      setAccessToken('');
      setTestResult({ success: true, message: 'Credenciales de Mercado Pago guardadas con éxito.' });
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: err.message || 'Error al guardar credenciales' });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.testPlatformMpConnection(accessToken || undefined),
    onSuccess: (res) => {
      if (res.success) {
        setTestResult({
          success: true,
          message: `¡Conexión Exitosa con Mercado Pago! Cuenta: ${res.data?.nickname || res.data?.email || 'Válida'} (ID: ${res.data?.id || 'OK'})`,
        });
      } else {
        setTestResult({ success: false, message: `Fallo de conexión: ${res.error || 'Token inválido'}` });
      }
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: `Error probando conexión: ${err.message}` });
    },
  });

  const config = mpQuery.data;

  const handleCopyWebhook = () => {
    if (!config?.webhookUrl) return;
    navigator.clipboard.writeText(config.webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      accessToken: accessToken.trim() || undefined,
      publicKey: publicKey.trim() || undefined,
      webhookSecret: webhookSecret.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Integración de Mercado Pago (Plataforma)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura las credenciales maestras para recibir los pagos y suscripciones de tus clientes SaaS.
          </p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                config?.connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Estado de la Pasarela Mercado Pago</h4>
              <p className="text-xs text-slate-500">
                {config?.connectionStatus === 'CONNECTED'
                  ? `Conectado · Cuenta: ${config.accountInfo?.nickname || config.accountInfo?.email || 'Producción'}`
                  : 'Sin credenciales activas o pendientes de validación'}
              </p>
            </div>
          </div>

          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
          >
            {testMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Probar Conexión
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20'
            }`}
          >
            {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Formulario de Credenciales */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Access Token de Mercado Pago (Production o Sandbox) *
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={config?.maskedToken ? `Actual: ${config.maskedToken}` : 'APP_USR-XXXXXX-XXXXXX...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Obtén tu Access Token en el panel de desarrolladores de Mercado Pago (Tus integraciones &gt; Credenciales).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Public Key (Clave Pública)
            </label>
            <input
              type="text"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder={config?.publicKey || 'APP_USR-XXXXXX-XXXXXX...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              URL del Webhook Oficial (Notificaciones IPN / Preapproval)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={config?.webhookUrl || 'https://wasaas-production.up.railway.app/mercadopago/webhook'}
                className="flex-1 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {isCopied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pega esta URL en tu panel de Mercado Pago (Notificaciones Webhook) para activar la confirmación automática de pagos.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending || (!accessToken && !publicKey && !webhookSecret)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar Credenciales de Mercado Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 6. Admin Panel Main Component ────────────────────────────────────────────
type Tab = 'plans' | 'tenants' | 'mercadopago';

export function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tenants');

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-500 font-semibold">Acceso denegado</p>
        <p className="text-slate-500 text-xs mt-1">Esta sección requiere permisos de Super Administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Panel de Super Administración
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gestión de planes de servicio, organizaciones, suscripciones y pasarelas de pago.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl w-fit flex-wrap">
        {[
          { id: 'tenants' as Tab, label: 'Clientes & Cortesías', icon: <Users className="w-4 h-4" /> },
          { id: 'plans' as Tab, label: 'Planes de Servicio', icon: <Package className="w-4 h-4" /> },
          { id: 'mercadopago' as Tab, label: 'Mercado Pago Plataforma', icon: <CreditCard className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-transparent'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tenants' && <TenantsTab />}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'mercadopago' && <MercadoPagoPlatformTab />}
    </div>
  );
}
