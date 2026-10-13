import React from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  ArrowUpDown,
  Sliders,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, unreadAlertsCount } = useFinance();

  const tabs = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'open-finance', label: 'Bancos', icon: Building2 },
    { id: 'statements', label: 'Extratos', icon: FileSpreadsheet },
    { id: 'transactions', label: 'Transações', icon: ArrowUpDown },
    { id: 'budgets', label: 'Orçamentos', icon: Sliders, badge: unreadAlertsCount },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors relative cursor-pointer ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center tabular-nums">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
