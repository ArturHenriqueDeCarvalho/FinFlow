import React from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  RotateCw,
  ShieldCheck,
  Bell,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSyncingAll,
    syncAllAccounts,
    unreadAlertsCount,
    isDemoMode,
    setIsDemoMode,
  } = useFinance();

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'open-finance', label: 'Open Finance' },
    { id: 'statements', label: 'Importar Extratos' },
    { id: 'transactions', label: 'Transações' },
    { id: 'budgets', label: 'Orçamentos & Alertas' },
    { id: 'ai-insights', label: 'Inteligência IA' },
    { id: 'privacy', label: 'Privacidade LGPD' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Brand Wordmark (Clean single-element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
                FinPulse
              </span>
            </div>
          </button>

          {/* Sandbox Indicator (LGPD & Regulatory Requirement) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
            <span className="text-slate-400">Ambiente:</span>
            <span className="font-medium text-emerald-400">
              {isDemoMode ? 'Sandbox Open Finance' : 'Produção'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Clean single-line text links) */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Quick Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Alertas Badge Trigger */}
          <button
            onClick={() => setActiveTab('budgets')}
            title="Alertas do Sistema"
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 flex items-center justify-center tabular-nums">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Sincronização Geral Open Finance */}
          <button
            onClick={syncAllAccounts}
            disabled={isSyncingAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/40 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Bancos'}
            </span>
            <span className="sm:hidden">Sincronizar</span>
          </button>
        </div>

      </div>
    </header>
  );
};
