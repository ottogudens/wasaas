import React from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Database, CreditCard, Menu } from 'lucide-react';
import { BotConnectionBadge } from '../../components/dashboard/BotConnectionBadge';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { label: 'Bots', href: '/dashboard/bots', icon: <Bot className="w-5 h-5" /> },
    { label: 'Live Chat', href: '/dashboard/chat', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Conocimiento', href: '/dashboard/knowledge', icon: <Database className="w-5 h-5" /> },
    { label: 'Facturación', href: '/dashboard/billing', icon: <CreditCard className="w-5 h-5" /> },
  ];

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
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* User Info (Bottom Sidebar) */}
        <div className="pt-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-400">ADM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-300">Admin</span>
              <span className="text-[10px] text-slate-500">admin@mibot.com</span>
            </div>
          </div>
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
          <button className="p-2 text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (TabBar) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex items-center justify-around pb-safe z-20">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center gap-1 p-3 text-slate-500 hover:text-emerald-400 transition-colors"
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      
    </div>
  );
}
