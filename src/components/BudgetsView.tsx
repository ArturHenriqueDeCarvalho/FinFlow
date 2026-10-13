import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  Sliders,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const {
    budgets,
    categories,
    alerts,
    transactions,
    projection,
    updateBudget,
    addBudget,
    markAlertRead,
    dismissAlert,
    setFilterCategoryId,
    setActiveTab,
  } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(categories[3]?.id || '');
  const [newLimit, setNewLimit] = useState('1000');
  const [newThreshold, setNewThreshold] = useState('80');

  // Identifica assinaturas e despesas recorrentes
  const recurringSubscriptions = transactions.filter(t => t.isRecurring);
  const totalMonthlySubscriptions = recurringSubscriptions.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const handleAddBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(newLimit);
    const threshNum = parseFloat(newThreshold) / 100;
    if (isNaN(limitNum) || isNaN(threshNum)) return;

    addBudget(selectedCatId, limitNum, threshNum);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo de Orçamentos & Alertas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Rastreamento Preventivo de Gastos
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Orçamentos, Tetos & Monitoramento de Riscos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina limites por categoria para receber avisos antes de estourar seu planejamento financeiro.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* 2. Grid de Orçamentos com Tetos e Barras de Progresso */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Tetos Mensais Definidos ({budgets.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const percentage = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
            const isOver = percentage >= 100;
            const isWarning = percentage >= b.alertThreshold * 100;

            return (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.categoryName}</h4>
                    <span className="text-[11px] text-slate-400">
                      Alerta configurado em {(b.alertThreshold * 100).toFixed(0)}% do teto
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                      isOver
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {percentage.toFixed(1)}% atingido
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs tabular-nums">
                  <div className="text-slate-300">
                    Gasto: <span className="font-bold text-white">R$ {b.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-slate-400">
                    Teto: <span className="font-medium text-slate-200">R$ {b.monthlyLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => {
                      setFilterCategoryId(b.categoryId);
                      setActiveTab('transactions');
                    }}
                    className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Ver lançamentos da categoria
                  </button>

                  <span className="text-slate-400">
                    {isOver ? (
                      <span className="text-rose-400">Excedente: R$ {(b.spent - b.monthlyLimit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span>Disponível: R$ {(b.monthlyLimit - b.spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Painel de Alertas Preventivos do Sistema */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Central de Alertas Preventivos do Sistema
        </h3>

        <div className="space-y-2.5">
          {alerts.filter(a => !a.isDismissed).map(a => {
            const isHigh = a.severity === 'HIGH';

            return (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isHigh
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isHigh ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold">{a.title}</h4>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{a.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Gerado em {new Date(a.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(a.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => dismissAlert(a.id)}
                    className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Dispensar
                  </button>
                  <button
                    onClick={() => {
                      markAlertRead(a.id);
                      if (a.relatedCategoryId) {
                        setFilterCategoryId(a.relatedCategoryId);
                        setActiveTab('transactions');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
                  >
                    {a.actionLabel || 'Verificar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Auditoria de Assinaturas e Recorrências ("Zombie Subscriptions") */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Auditoria de Assinaturas & Recorrências</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificação automática de débitos periódicos com cálculo de impacto anual acumulado
            </p>
          </div>
          <div className="text-right text-xs tabular-nums">
            <span className="text-slate-400">Total mensal: </span>
            <span className="font-bold text-cyan-400">
              R$ {totalMonthlySubscriptions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </span>
            <div className="text-[10px] text-slate-500">
              (R$ {(totalMonthlySubscriptions * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano)
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Serviço / Assinatura</th>
                <th className="py-2.5 px-3">Conta de Cobrança</th>
                <th className="py-2.5 px-3">Periodicidade</th>
                <th className="py-2.5 px-3 text-right">Valor Mensal</th>
                <th className="py-2.5 px-3 text-right">Impacto Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recurringSubscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {sub.description}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {sub.accountName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Mensal
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-200">
                    R$ {Math.abs(sub.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                    R$ {(Math.abs(sub.amount) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Orçamento */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Cadastrar Teto de Orçamento</h3>
            </div>

            <form onSubmit={handleAddBudgetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Categoria:</label>
                <select
                  value={selectedCatId}
                  onChange={e => setSelectedCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {categories.filter(c => c.type === 'EXPENSE').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Limite Mensal Máximo (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Alertar quando atingir (%):</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={newThreshold}
                  onChange={e => setNewThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Salvar Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
