'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  MessageSquare,
  Database,
  CreditCard,
  Menu,
  FlaskConical,
  LogOut,
  ChevronDown,
  Building2,
  UserCircle,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BotConnectionBadge } from '../../components/dashboard/BotConnectionBadge';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useFeatureFlag } from '../../lib/feature-flags-context';
import { useAuth } from '../../lib/auth-context';
import { useBillingGuard } from '../../hooks/useBillingGuard';
import { InteractiveHelpModal } from '../../components/InteractiveHelpModal';

function UserMenu({ onOpenHelp }: { onOpenHelp: () => void }) {
  const { user, org, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{initials}</span>
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
            {user?.name || user?.email || 'Usuario'}
          </span>
          <span className="text-[11px] text-slate-500 truncate w-full">
            {org?.name || user?.email}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {org && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <p className="text-[11px] text-slate-500 truncate">{org.name}</p>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onOpenHelp();
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Guía Interactiva
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-slate-200 dark:border-slate-700/60"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isBetaDashboardEnabled = useFeatureFlag('BETA_DASHBOARD');
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  useBillingGuard();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Bots', href: '/dashboard/bots', icon: <Bot className="w-5 h-5" /> },
    { label: 'Agente Directo', href: '/dashboard/agent-live', icon: <Zap className="w-5 h-5 text-emerald-500" /> },
    { label: 'Live Chat', href: '/dashboard/chat', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Conocimiento', href: '/dashboard/knowledge', icon: <Database className="w-5 h-5" /> },
    { label: 'Facturación', href: '/dashboard/billing', icon: <CreditCard className="w-5 h-5" /> },
  ];

  if (isBetaDashboardEnabled) {
    navItems.push({ label: 'Beta Funcs', href: '/dashboard', icon: <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> });
  }

  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({ label: 'Admin', href: '/dashboard/admin', icon: <ShieldCheck className="w-5 h-5 text-amber-500 dark:text-amber-400" /> });
  }

  const handleNavigateTab = (tab: 'bots' | 'qr' | 'prompt' | 'rag' | 'chat') => {
    switch (tab) {
      case 'bots':
      case 'qr':
      case 'prompt':
        router.push('/dashboard/bots');
        break;
      case 'rag':
        router.push('/dashboard/knowledge');
        break;
      case 'chat':
        router.push('/dashboard/chat');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 transition-colors duration-200">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 transition-colors duration-200">
        <div className="flex items-center gap-3 px-2 py-4 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Bot className="text-white dark:text-slate-950 w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">miBot SaaS</span>
        </div>

        {/* Guía Interactiva Button in Sidebar */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="mb-4 flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-gradient-to-r dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform animate-pulse" />
            <span className="font-bold text-xs">Guía Interactiva</span>
          </div>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
            5 Pasos
          </span>
        </button>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-emerald-500/10'
                }`}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Menu (Bottom Sidebar) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <UserMenu onOpenHelp={() => setIsHelpOpen(true)} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Panel de Control</h1>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ver Guía Rápida</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <BotConnectionBadge />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <Bot className="text-emerald-500 w-6 h-6" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">miBot</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Guía Interactiva"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pb-4 z-10">
            <MobileUserMenu
              onClose={() => setMobileMenuOpen(false)}
              onOpenHelp={() => {
                setMobileMenuOpen(false);
                setIsHelpOpen(true);
              }}
            />
          </div>
        )}

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (TabBar) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around pb-safe z-20 transition-colors duration-200 overflow-x-auto">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 min-w-[3rem] p-3 transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {item.icon}
              <span className="text-[11px] font-medium hidden xs:block sm:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Interactive Guide Modal */}
      <InteractiveHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onNavigateTab={handleNavigateTab}
      />
    </div>
  );
}

function MobileUserMenu({
  onClose,
  onOpenHelp,
}: {
  onClose: () => void;
  onOpenHelp: () => void;
}) {
  const { user, org, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{user?.name || 'Usuario'}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          {org && <p className="text-[11px] text-slate-500 mt-0.5">{org.name}</p>}
        </div>
      </div>
      <button
        onClick={onOpenHelp}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        Guía Interactiva (5 Pasos)
      </button>
      <button
        onClick={() => {
          onClose();
          logout();
        }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-slate-200 dark:border-slate-700"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
