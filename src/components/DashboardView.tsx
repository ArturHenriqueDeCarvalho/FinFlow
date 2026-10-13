import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { CashflowChart } from './CashflowChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Building2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    accounts,
    transactions,
    budgets,
    alerts,
    totalLiquidBalance,
    totalCreditDebt,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    projection,
    setActiveTab,
    syncAccount,
    markAlertRead,
    setFilterCategoryId,
  } = useFinance();

  const recentTransactions = transactions.slice(0, 7);
  const urgentAlerts = alerts.filter(a => !a.isDismissed && a.severity === 'HIGH');

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Alertas Preventivos de Alta Prioridade (se houver) */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-2">
          {urgentAlerts.map(alert => (
            <div
              key={alert.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">{alert.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => {
                    markAlertRead(alert.id);
                    if (alert.relatedCategoryId) {
                      setFilterCategoryId(alert.relatedCategoryId);
                      setActiveTab('transactions');
                    } else if (alert.relatedAccountId) {
                      setActiveTab('open-finance');
                    } else {
                      setActiveTab('budgets');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {alert.actionLabel || 'Ver Detalhes'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Grid de Indicadores Financeiros Consolidados (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Saldo Líquido Total */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Saldo Líquido Disponível</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            R$ {totalLiquidBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>{accounts.filter(a => a.type !== 'CREDIT_CARD').length} contas conectadas</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">Open Finance BR</span>
          </div>
        </div>

        {/* KPI: Faturas de Cartão */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Faturas em Aberto</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            R$ {totalCreditDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>{accounts.filter(a => a.type === 'CREDIT_CARD').length} cartões</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-400 font-medium">Próx. venc: 18/10</span>
          </div>
        </div>

        {/* KPI: Economia Mensal / Resultado Operacional */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Resultado do Mês</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            R$ {monthlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Taxa de Poupança:</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI: Projeção de Fechamento do Mês */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Projeção Fim de Mês</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
            R$ {projection.projectedClosingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-400">Burn rate:</span>
            <span className="font-semibold text-slate-200 tabular-nums">R$ {projection.historicalBurnRateDaily}/dia</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">Seguro</span>
          </div>
        </div>
      </div>

      {/* 3. Strip de Contas Conectadas e Sincronização Open Finance */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Instituições Conectadas via Open Finance
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('open-finance')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>Gerenciar Conexões</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-800/30 border border-dashed border-slate-700 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Nenhuma conta bancária conectada ainda</h4>
              <p className="text-xs text-slate-400 max-w-md mt-0.5">
                Sua conta está limpa e pronta para receber seus dados reais. Conecte sua primeira instituição via Open Finance ou importe um extrato bancário.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                onClick={() => setActiveTab('open-finance')}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Conectar via Open Finance
              </button>
              <button
                onClick={() => setActiveTab('statements')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                Importar Extrato OFX/CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {accounts.map(acc => {
              const isSyncing = acc.status === 'SYNCING';
              const isCard = acc.type === 'CREDIT_CARD';

              return (
                <div
                  key={acc.id}
                  className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: acc.institutionColor }}
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {acc.institutionName}
                      </span>
                    </div>
                    <button
                      onClick={() => syncAccount(acc.id)}
                      disabled={isSyncing}
                      title="Sincronizar agora"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 truncate mb-0.5">
                      {acc.name} ({acc.accountNumberMasked})
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {isCard ? (
                        <span className="text-rose-400">
                          R$ {Math.abs(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{isCard ? 'Fatura em aberto' : 'Saldo atual'}</span>
                    <span className="text-emerald-400/90 font-medium">Sincronizado</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Gráficos Principais: Fluxo de Caixa Diário + Donut de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Evolução (8 colunas) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Evolução Mensal do Fluxo de Caixa</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Receitas e despesas diárias consolidadas com projeção preventiva
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs tabular-nums font-semibold">
              <span className="text-emerald-400">+ R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-rose-400">- R$ {monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <CashflowChart transactions={transactions} currentBalance={totalLiquidBalance} />
        </div>

        {/* Gráfico Donut de Despesas por Categoria (5 colunas) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Distribuição por Categorias</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gastos classificados por inteligência artificial e regras aprendidas
            </p>
          </div>

          <CategoryDonutChart />

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Clique em uma categoria para filtrar o extrato</span>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          </div>
        </div>
      </div>

      {/* 5. Orçamentos em Andamento & Transações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Acompanhamento de Orçamentos (5 colunas) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Orçamentos & Metas do Mês</h3>
              <p className="text-xs text-slate-400 mt-0.5">Controle preventivo por tetos de gastos</p>
            </div>
            <button
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              Ajustar
            </button>
          </div>

          <div className="space-y-3.5">
            {budgets.map(b => {
              const percentage = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
              const isOver = percentage >= 100;
              const isWarning = percentage >= b.alertThreshold * 100;

              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{b.categoryName}</span>
                    <span className="tabular-nums font-semibold text-slate-300">
                      R$ {b.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-slate-500 font-normal"> / R$ {b.monthlyLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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

                  <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                    <span>
                      {isOver ? (
                        <span className="text-rose-400 font-semibold">Teto ultrapassado</span>
                      ) : isWarning ? (
                        <span className="text-amber-400 font-semibold">Próximo do limite ({percentage.toFixed(0)}%)</span>
                      ) : (
                        <span>{percentage.toFixed(0)}% utilizado</span>
                      )}
                    </span>
                    <span>Restante: R$ {Math.max(0, b.monthlyLimit - b.spent).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lançamentos Recentes (7 colunas) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Últimas Movimentações Sincronizadas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Centralização automática com classificação por IA</p>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              Extrato Completo
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentTransactions.map(tx => {
              const isIncome = tx.amount > 0;
              const isTransfer = tx.isInternalTransfer || tx.categoryId === 'cat-transferencia';

              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isTransfer
                          ? 'bg-slate-800 text-slate-400'
                          : isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isTransfer ? (
                        <RotateCw className="w-3.5 h-3.5" />
                      ) : isIncome ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="font-semibold text-slate-200 truncate">{tx.description}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="truncate">{tx.institutionName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-300 font-medium">{tx.categoryName}</span>
                        {tx.isConfidenceLow && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400 font-medium">Revisar</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <div
                      className={`font-bold ${
                        isTransfer
                          ? 'text-slate-300'
                          : isIncome
                          ? 'text-emerald-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {isIncome ? '+' : ''}R${' '}
                      {Math.abs(tx.amount).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {tx.date.split('-').reverse().slice(0, 2).join('/')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
