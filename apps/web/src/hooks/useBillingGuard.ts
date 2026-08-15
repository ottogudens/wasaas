'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

/**
 * useBillingGuard — Protege el acceso al dashboard si el trial ha expirado.
 * Redirige a /dashboard/billing para que el cliente elija un plan.
 * Las cuentas de Cortesía (CORTESIA), cuentas activas y SUPER_ADMIN nunca son bloqueadas.
 */
export function useBillingGuard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // SUPER_ADMIN nunca es bloqueado
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Ya está en billing — no redirigir para evitar bucles
  const isOnBilling = pathname === '/dashboard/billing';

  const billingQuery = useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => api.getBillingStatus(),
    enabled: !!token && !isSuperAdmin && !isOnBilling,
    staleTime: 60_000, // 1 minuto — no queremos consultar en cada navegación
  });

  useEffect(() => {
    if (isSuperAdmin || isOnBilling || billingQuery.isLoading || !billingQuery.data) return;

    const billing = billingQuery.data;

    // Cuentas de cortesía o con suscripción activa nunca son bloqueadas
    if (billing.plan === 'CORTESIA' || billing.isCourteous || billing.status === 'ACTIVE') {
      return;
    }

    const isBlocked =
      billing.status === 'TRIAL_EXPIRED' ||
      billing.status === 'CANCELLED' ||
      (billing.plan === 'TRIAL' && billing.trialDaysLeft === 0);

    if (isBlocked) {
      router.replace('/dashboard/billing');
    }
  }, [billingQuery.data, billingQuery.isLoading, isSuperAdmin, isOnBilling, router]);

  return {
    isCheckingBilling: billingQuery.isLoading,
    billing: billingQuery.data,
  };
}
