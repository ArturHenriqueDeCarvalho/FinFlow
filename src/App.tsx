import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { OpenFinanceView } from './components/OpenFinanceView';
import { StatementsImportView } from './components/StatementsImportView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { AiInsightsView } from './components/AiInsightsView';
import { PrivacyLgpdView } from './components/PrivacyLgpdView';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab } = useFinance();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Barra de Navegação Superior (Top Bar Contract: 3 Zonas) */}
      <Navbar />

      {/* Conteúdo Principal Dinâmico por Aba */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'open-finance' && <OpenFinanceView />}
        {activeTab === 'statements' && <StatementsImportView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'budgets' && <BudgetsView />}
        {activeTab === 'ai-insights' && <AiInsightsView />}
        {activeTab === 'privacy' && <PrivacyLgpdView />}
      </main>

      {/* Navegação Inferior Mobile-First */}
      <MobileBottomNav />

      {/* Rodapé Institucional Discreto */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F19] py-6 px-4 lg:px-8 text-center text-xs text-slate-500 hidden sm:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>FinPulse · Plataforma de Gestão Financeira Pessoal com Open Finance & Inteligência Artificial</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Conformidade com a LGPD</span>
            <span aria-hidden="true">·</span>
            <span>Regulação Banco Central do Brasil</span>
            <span aria-hidden="true">·</span>
            <span>Criptografia mTLS & AES-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
