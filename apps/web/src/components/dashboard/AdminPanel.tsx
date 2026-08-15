'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Pencil, Loader2, Check, X, AlertCircle,
  Bot, FileText, DollarSign, Package, Users, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Building2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

// ── Plan Form Modal ────────────────────────────────────────────────────────────

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
      features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">
            {initial ? 'Editar Plan' : 'Crear Plan de Servicio'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Nombre del Plan *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="Ej: Plan Starter, Plan Pro..."
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Descripción
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="Descripción breve del plan..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Precio (CLP/mes) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Máx. Bots
              </label>
              <div className="relative">
                <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="number"
                  min={1}
                  value={form.maxBots}
                  onChange={(e) => setForm({ ...form, maxBots: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Máx. Documentos RAG
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="number"
                  min={1}
                  value={form.maxDocs}
                  onChange={(e) => setForm({ ...form, maxDocs: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Características (una por línea)
              </label>
              <textarea
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                placeholder={"Mensajes ilimitados\nSoporte prioritario\nRAG avanzado"}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {initial ? 'Guardar Cambios' : 'Crear Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plans Tab ──────────────────────────────────────────────────────────────────

function PlansTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSalesPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setConfirmDelete(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updatePlan(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Planes de Servicio</h3>
          <p className="text-xs text-slate-500 mt-0.5">Estos planes son visibles para los clientes en su panel de facturación.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </button>
      </div>

      {plansQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No hay planes creados</p>
          <p className="text-slate-500 text-xs mt-1">Crea el primer plan para que los clientes puedan suscribirse.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => (
            <div
              key={plan.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                plan.isActive ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900/20 border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white">{plan.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    plan.isActive
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-slate-500 bg-slate-700/30 border-slate-700'
                  }`}>
                    {plan.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                {plan.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{plan.description}</p>}
                <div className="flex gap-4 mt-1.5">
                  <span className="text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">${plan.price.toLocaleString('es-CL')}</span> CLP/mes
                  </span>
                  <span className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{plan.maxBots}</span> bots
                  </span>
                  <span className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{plan.maxDocs}</span> docs
                  </span>
                  {plan.features?.length > 0 && (
                    <span className="text-xs text-slate-500">{plan.features.length} características</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle activo/inactivo */}
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: plan.id, isActive: !plan.isActive })}
                  disabled={toggleActiveMutation.isPending}
                  title={plan.isActive ? 'Desactivar plan' : 'Activar plan'}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  {plan.isActive
                    ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                    : <ToggleLeft className="w-5 h-5" />
                  }
                </button>

                <button
                  onClick={() => setEditingPlan(plan)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {confirmDelete === plan.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteMutation.mutate(plan.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(plan.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
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

// ── Tenants Tab ────────────────────────────────────────────────────────────────

function TenantsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'all'],
    queryFn: () => api.listTenants(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.toggleTenantStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = tenantsQuery.data ?? [];

  const planBadge = (sub: any) => {
    if (!sub) return <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Sin plan</span>;
    const statusColor: Record<string, string> = {
      ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      TRIAL: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      PENDING: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/30',
      TRIAL_EXPIRED: 'text-slate-400 bg-slate-700/30 border-slate-600',
    };
    const color = statusColor[sub.status] ?? statusColor['PENDING'];
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
        {sub.plan} · {sub.status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">Clientes / Tenants</h3>
        <p className="text-xs text-slate-500 mt-0.5">{tenants.length} organizaciones registradas</p>
      </div>

      {tenantsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No hay clientes registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant: any) => {
            const activeSub = tenant.subscriptions?.[0];
            const isExpanded = expandedId === tenant.id;
            return (
              <div key={tenant.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tenant.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white truncate">{tenant.name}</span>
                      {planBadge(activeSub)}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {tenant.users?.[0]?.email} · {tenant.bots?.length ?? 0} bots
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="p-3 rounded-lg bg-slate-800/50 text-xs">
                        <p className="text-slate-500 mb-1">Registrado</p>
                        <p className="text-slate-300 font-medium">{new Date(tenant.createdAt).toLocaleDateString('es-CL')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50 text-xs">
                        <p className="text-slate-500 mb-1">Estado</p>
                        <p className={`font-bold ${tenant.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tenant.isActive ? 'Activo' : 'Suspendido'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: tenant.id, isActive: !tenant.isActive })}
                        disabled={toggleStatusMutation.isPending}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          tenant.isActive
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {toggleStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {tenant.isActive ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────────

type Tab = 'plans' | 'tenants';

export function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('plans');

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-semibold">Acceso denegado</p>
        <p className="text-slate-500 text-xs mt-1">Esta sección requiere permisos de Super Administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-400" />
          Panel de Administración
        </h2>
        <p className="text-slate-400 text-sm mt-1">Gestión de planes de servicio y clientes.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit">
        {([ 
          { id: 'plans' as Tab, label: 'Planes de Servicio', icon: <Package className="w-4 h-4" /> },
          { id: 'tenants' as Tab, label: 'Clientes', icon: <Users className="w-4 h-4" /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'tenants' && <TenantsTab />}
    </div>
  );
}
