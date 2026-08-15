'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, MessageSquare, Database, CreditCard, Menu, FlaskConical, LogOut, ChevronDown, Building2, UserCircle, ShieldCheck } from 'lucide-react';
import { BotConnectionBadge } from '../../components/dashboard/BotConnectionBadge';
import { useFeatureFlag } from '../../lib/feature-flags-context';
import { useAuth } from '../../lib/auth-context';
import { useBillingGuard } from '../../hooks/useBillingGuard';

function UserMenu() {
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
        className="flex items-center gap-2 w-full px-2 py-2 rounded-xl hover:bg-slate-800 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-emerald-400">{initials}</span>
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-200 truncate w-full">
            {user?.name || user?.email || 'Usuario'}
          </span>
          <span className="text-[10px] text-slate-500 truncate w-full">
            {org?.name || user?.email}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {org && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                <p className="text-[10px] text-slate-500 truncate">{org.name}</p>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <UserCircle className="w-4 h-4 text-slate-400" />
              Ver perfil
            </button>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
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
  const { user } = useAuth();
  useBillingGuard();

  const navItems = [
    { label: 'Bots', href: '/dashboard/bots', icon: <Bot className="w-5 h-5" /> },
    { label: 'Live Chat', href: '/dashboard/chat', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Conocimiento', href: '/dashboard/knowledge', icon: <Database className="w-5 h-5" /> },
    { label: 'Facturación', href: '/dashboard/billing', icon: <CreditCard className="w-5 h-5" /> },
  ];

  if (isBetaDashboardEnabled) {
    navItems.push({ label: 'Beta Funcs', href: '/dashboard', icon: <FlaskConical className="w-5 h-5 text-emerald-400" /> });
  }

  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({ label: 'Admin', href: '/dashboard/admin', icon: <ShieldCheck className="w-5 h-5 text-amber-400" /> });
  }

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4">
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Bot className="text-slate-950 w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">miBot SaaS</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Menu (Bottom Sidebar) */}
        <div className="pt-4 border-t border-slate-800 mt-auto">
          <UserMenu />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <h1 className="text-xl font-semibold text-slate-200">Panel de Control</h1>
          <BotConnectionBadge />
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bot className="text-emerald-500 w-6 h-6" />
            <span className="font-bold text-lg text-white">miBot</span>
          </div>
          <button
            className="p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pb-4 z-10">
            <MobileUserMenu onClose={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (TabBar) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex items-center justify-around pb-safe z-20">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-3 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
    </div>
  );
}

function MobileUserMenu({ onClose }: { onClose: () => void }) {
  const { user, org, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="mt-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-emerald-400">{initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{user?.name || 'Usuario'}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
          {org && <p className="text-[10px] text-slate-500 mt-0.5">{org.name}</p>}
        </div>
      </div>
      <button
        onClick={() => { onClose(); }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
      >
        <UserCircle className="w-4 h-4 text-slate-400" />
        Ver perfil
      </button>
      <button
        onClick={() => { onClose(); logout(); }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-slate-700"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
