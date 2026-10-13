import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import {
  Search,
  Filter,
  Plus,
  Download,
  Sparkles,
  RotateCw,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  HelpCircle,
  Check,
  BrainCircuit,
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    accounts,
    categories,
    userRules,
    updateTransaction,
    deleteTransaction,
    learnRule,
    searchQuery,
    setSearchQuery,
    filterAccountId,
    setFilterAccountId,
    filterCategoryId,
    setFilterCategoryId,
    filterPeriod,
    setFilterPeriod,
  } = useFinance();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterOnlyLowConfidence, setFilterOnlyLowConfidence] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [ruleModalTx, setRuleModalTx] = useState<Transaction | null>(null);
  const [ruleKeyword, setRuleKeyword] = useState<string>('');

  // Form de nova transação
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<TransactionType>('EXPENSE');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newAccountId, setNewAccountId] = useState(accounts[0]?.id || '');
  const [newCatId, setNewCatId] = useState(categories[3]?.id || '');

  // Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Busca textual
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesCat = t.categoryName.toLowerCase().includes(q);
        const matchesInst = t.institutionName.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesInst) return false;
      }

      // 2. Filtro por Conta
      if (filterAccountId !== 'ALL' && t.accountId !== filterAccountId) {
        return false;
      }

      // 3. Filtro por Categoria
      if (filterCategoryId !== 'ALL' && t.categoryId !== filterCategoryId) {
        return false;
      }

      // 4. Filtro por Tipo
      if (filterType !== 'ALL') {
        if (filterType === 'INCOME' && t.amount <= 0) return false;
        if (filterType === 'EXPENSE' && (t.amount >= 0 || t.isInternalTransfer)) return false;
        if (filterType === 'TRANSFER' && !t.isInternalTransfer && t.categoryId !== 'cat-transferencia') return false;
      }

      // 5. Filtro de Baixa Confiança
      if (filterOnlyLowConfidence && !t.isConfidenceLow) {
        return false;
      }

      // 6. Filtro de Período
      if (filterPeriod === 'THIS_MONTH') {
        const curMonth = new Date().toISOString().slice(0, 7);
        if (!t.date.startsWith(curMonth)) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, filterAccountId, filterCategoryId, filterType, filterOnlyLowConfidence, filterPeriod]);

  const handleCategoryChange = (tx: Transaction, newCategoryId: string) => {
    const cat = categories.find(c => c.id === newCategoryId);
    if (!cat) return;

    updateTransaction(tx.id, {
      categoryId: newCategoryId,
      categoryName: cat.name,
      confidence: 100,
      isConfidenceLow: false,
      aiExplanation: `Classificação ajustada manualmente pelo usuário para ${cat.name}.`,
    });

    // Abre prompt para aprender regra automaticamente
    const firstWord = tx.description.split(/[\s\*]+/)[0].toUpperCase();
    if (firstWord.length >= 3) {
      setRuleKeyword(firstWord);
      setRuleModalTx({ ...tx, categoryId: newCategoryId, categoryName: cat.name });
    }
  };

  const handleSaveRule = () => {
    if (ruleModalTx && ruleKeyword) {
      learnRule(ruleKeyword, ruleModalTx.categoryId, ruleModalTx.categoryName);
      setRuleModalTx(null);
    }
  };

  const handleCreateManualTx = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(parsedAmt) || !newDesc) return;

    const acc = accounts.find(a => a.id === newAccountId) || accounts[0];
    const cat = categories.find(c => c.id === newCatId) || categories[0];
    const finalAmount = newType === 'EXPENSE' ? -Math.abs(parsedAmt) : Math.abs(parsedAmt);

    const manualTx: Transaction = {
      id: `tx-man-${Date.now()}`,
      accountId: acc.id,
      accountName: acc.name,
      institutionName: acc.institutionName,
      institutionColor: acc.institutionColor,
      date: newDate,
      description: newDesc,
      amount: finalAmount,
      categoryId: cat.id,
      categoryName: cat.name,
      type: newType,
      source: 'MANUAL',
      confidence: 100,
      isConfidenceLow: false,
      aiExplanation: 'Lançamento manual registrado pelo usuário.',
      createdAt: new Date().toISOString(),
    };

    updateTransaction(manualTx.id, manualTx); // Usa state updater ou similar
    setIsAddModalOpen(false);
    setNewDesc('');
    setNewAmount('');
  };

  // Exportar extrato filtrado em CSV
  const handleExportCSV = () => {
    const headers = 'Data;Descricao;Instituicao;Conta;Categoria;Tipo;Valor\n';
    const rows = filteredTransactions
      .map(t =>
        `${t.date};"${t.description.replace(/"/g, '""')}";${t.institutionName};${t.accountName};${t.categoryName};${t.type};${t.amount.toFixed(2).replace('.', ',')}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finpulse_extrato_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo com Barra de Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Extrato Consolidado de Transações</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredTransactions.length} movimentações encontradas · Inteligência de classificação com confiança auditável
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca textual */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por descrição, loja..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro por Instituição / Conta */}
          <select
            value={filterAccountId}
            onChange={e => setFilterAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas as Contas & Cartões</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.institutionName} - {a.name}
              </option>
            ))}
          </select>

          {/* Filtro por Categoria */}
          <select
            value={filterCategoryId}
            onChange={e => setFilterCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filtro por Tipo */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="EXPENSE">Apenas Despesas</option>
            <option value="INCOME">Apenas Receitas</option>
            <option value="TRANSFER">Transferências Entre Contas</option>
          </select>
        </div>

        {/* Linha secundária de filtros rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Período:</span>
            <button
              onClick={() => setFilterPeriod('THIS_MONTH')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterPeriod === 'THIS_MONTH' ? 'bg-slate-700 text-white font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setFilterPeriod('ALL')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterPeriod === 'ALL' ? 'bg-slate-700 text-white font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Todo o Histórico
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={filterOnlyLowConfidence}
              onChange={e => setFilterOnlyLowConfidence(e.target.checked)}
              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span className={filterOnlyLowConfidence ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
              Apenas Baixa Confiança (&lt; 70%) para revisão
            </span>
          </label>
        </div>
      </div>

      {/* 3. Tabela de Transações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Data</th>
              <th className="py-2.5 px-3">Instituição</th>
              <th className="py-2.5 px-3">Descrição / Estabelecimento</th>
              <th className="py-2.5 px-3">Categoria</th>
              <th className="py-2.5 px-3">Confiança IA</th>
              <th className="py-2.5 px-3 text-right">Valor</th>
              <th className="py-2.5 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredTransactions.map(tx => {
              const isIncome = tx.amount > 0;
              const isTransfer = tx.isInternalTransfer || tx.categoryId === 'cat-transferencia';

              return (
                <tr key={tx.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-400">
                    {tx.date.split('-').reverse().join('/')}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tx.institutionColor }}
                      />
                      <span className="text-slate-300 font-medium">{tx.institutionName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 min-w-[200px]">
                    <div className="font-semibold text-white">{tx.description}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span>Origem: {tx.source}</span>
                      {tx.isRecurring && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-cyan-400 font-medium">Recorrente Mensal</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={tx.categoryId}
                      onChange={e => handleCategoryChange(tx, e.target.value)}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                          tx.confidence >= 90
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.confidence >= 70
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.confidence}%
                      </span>
                      {tx.aiExplanation && (
                        <span title={tx.aiExplanation} className="text-slate-500 hover:text-slate-300 cursor-help">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold">
                    <span
                      className={
                        isTransfer
                          ? 'text-slate-300'
                          : isIncome
                          ? 'text-emerald-400'
                          : 'text-slate-100'
                      }
                    >
                      {isIncome ? '+' : ''}R${' '}
                      {Math.abs(tx.amount).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      title="Excluir movimentação"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Ensinar Regra de Aprendizado à IA */}
      {ruleModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Criar Regra de Aprendizado Contínuo</h3>
            </div>

            <p className="text-xs text-slate-300">
              Deseja que a plataforma classifique automaticamente todas as transações futuras contendo esta palavra-chave na categoria{' '}
              <strong className="text-emerald-400">{ruleModalTx.categoryName}</strong>?
            </p>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Palavra-chave a monitorar:</label>
              <input
                type="text"
                value={ruleKeyword}
                onChange={e => setRuleKeyword(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white uppercase font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setRuleModalTx(null)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                Apenas Esta Vez
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Salvar Regra para Sempre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
