import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  BankAccount,
  Category,
  Transaction,
  Budget,
  AlertNotification,
  OpenFinanceConsent,
  ImportHistory,
  CategorizationRule,
  CashFlowProjection,
} from '../types/finance';
import {
  INITIAL_ACCOUNTS,
  DEFAULT_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_ALERTS,
  INITIAL_CONSENTS,
  INITIAL_RULES,
  INSTITUTIONS,
} from '../data/mockData';
import { detectDuplicate } from '../utils/reconciliation';

interface FinanceContextType {
  accounts: BankAccount[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  alerts: AlertNotification[];
  consents: OpenFinanceConsent[];
  importHistory: ImportHistory[];
  userRules: CategorizationRule[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSyncingAll: boolean;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  
  // Filtros globais
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterAccountId: string;
  setFilterAccountId: (id: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  filterPeriod: string;
  setFilterPeriod: (p: string) => void;

  // Ações Open Finance
  syncAccount: (accountId: string) => Promise<void>;
  syncAllAccounts: () => Promise<void>;
  connectInstitution: (institutionId: string, scopes: string[], durationMonths: number) => Promise<boolean>;
  revokeConsent: (consentId: string) => void;

  // Ações de Transação & Categorização
  addTransactionsFromImport: (
    items: Array<Omit<Transaction, 'id' | 'createdAt'>>,
    fileName: string,
    fileType: 'OFX' | 'CSV' | 'PDF'
  ) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  learnRule: (pattern: string, categoryId: string, categoryName: string) => void;

  // Ações de Orçamentos
  updateBudget: (id: string, limit: number, threshold: number) => void;
  addBudget: (categoryId: string, limit: number, threshold: number) => void;

  // Ações de Alertas
  markAlertRead: (id: string) => void;
  dismissAlert: (id: string) => void;

  // Métricas calculadas
  totalLiquidBalance: number;
  totalCreditDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  projection: CashFlowProjection;
  categorySpending: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    total: number;
    percentage: number;
  }>;
  unreadAlertsCount: number;

  // LGPD & Gestão de Dados
  exportLgpdData: () => void;
  resetToDefaults: () => void;
  deleteAllUserData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY = 'finpulse_app_state_v1';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialização com dados do localStorage ou defaults
  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_budgets`);
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  const [alerts, setAlerts] = useState<AlertNotification[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_alerts`);
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [consents, setConsents] = useState<OpenFinanceConsent[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_consents`);
    return saved ? JSON.parse(saved) : INITIAL_CONSENTS;
  });

  const [importHistory, setImportHistory] = useState<ImportHistory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_importHistory`);
    return saved ? JSON.parse(saved) : [];
  });

  const [userRules, setUserRules] = useState<CategorizationRule[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rules`);
    return saved ? JSON.parse(saved) : INITIAL_RULES;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('ALL');
  const [filterCategoryId, setFilterCategoryId] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');

  // Persistência automática
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_budgets`, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_alerts`, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_consents`, JSON.stringify(consents));
  }, [consents]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_importHistory`, JSON.stringify(importHistory));
  }, [importHistory]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rules`, JSON.stringify(userRules));
  }, [userRules]);

  // Recalcula orçamentos com base nas despesas reais do mês corrente
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // Ex: '2026-10'
    const spentByCategory: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'EXPENSE' && !tx.isInternalTransfer && tx.date.startsWith(currentMonth)) {
        spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + Math.abs(tx.amount);
      }
    });

    setBudgets(prevBudgets =>
      prevBudgets.map(b => {
        const actualSpent = spentByCategory[b.categoryId] || 0;
        return { ...b, spent: actualSpent };
      })
    );
  }, [transactions]);

  // Total de saldos líquidos em contas e investimentos
  const totalLiquidBalance = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type !== 'CREDIT_CARD') {
        return acc + a.balance;
      }
      return acc;
    }, 0);
  }, [accounts]);

  // Total de faturas em aberto
  const totalCreditDebt = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type === 'CREDIT_CARD') {
        return acc + Math.abs(a.balance);
      }
      return acc;
    }, 0);
  }, [accounts]);

  // Receitas e Despesas do mês corrente (excluindo transferências internas entre contas próprias)
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let inc = 0;
    let exp = 0;

    transactions.forEach(t => {
      if (t.isInternalTransfer || t.categoryId === 'cat-transferencia') return;
      if (t.date.startsWith(currentMonth)) {
        if (t.amount > 0) {
          inc += t.amount;
        } else {
          exp += Math.abs(t.amount);
        }
      }
    });

    return { monthlyIncome: inc, monthlyExpenses: exp };
  }, [transactions]);

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Gastos por categoria no mês atual
  const categorySpending = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const categoryTotals: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'EXPENSE' && !t.isInternalTransfer && t.date.startsWith(currentMonth)) {
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + Math.abs(t.amount);
      }
    });

    const totalExp = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return categories
      .filter(c => c.type === 'EXPENSE' && (categoryTotals[c.id] || 0) > 0)
      .map(c => {
        const total = categoryTotals[c.id] || 0;
        return {
          categoryId: c.id,
          categoryName: c.name,
          color: c.color,
          total,
          percentage: totalExp > 0 ? (total / totalExp) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  // Projeção Preventiva de Fluxo de Caixa até o Fim do Mês
  const projection: CashFlowProjection = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay);

    const dailyBurnRate = currentDay > 0 ? monthlyExpenses / currentDay : 0;
    const projectedAdditionalExpenses = dailyBurnRate * daysRemaining;

    // Faturas de cartão com vencimento até o fim do mês
    const scheduledPayables = accounts.reduce((acc, a) => {
      return a.type === 'CREDIT_CARD' ? acc + (a.currentInvoiceAmount || 0) : acc;
    }, 0);

    const projectedClosingBalance = totalLiquidBalance - scheduledPayables - (projectedAdditionalExpenses * 0.5);

    let riskStatus: 'COMFORTABLE' | 'MODERATE' | 'DEFICIT_RISK' = 'COMFORTABLE';
    const recs: string[] = [];

    if (projectedClosingBalance < 0) {
      riskStatus = 'DEFICIT_RISK';
      recs.push('Risco de saldo insuficiente no fechamento do mês. Reduza compras não essenciais no cartão.');
    } else if (projectedClosingBalance < totalLiquidBalance * 0.25) {
      riskStatus = 'MODERATE';
      recs.push('Saldo projetado apertado. Atenção aos vencimentos de faturas nos próximos dias.');
    } else {
      riskStatus = 'COMFORTABLE';
      recs.push('Ritmo financeiro sob controle. Potencial para aportar R$ ' + Math.round(monthlySavings * 0.4) + ' em investimentos.');
    }

    return {
      currentLiquidBalance: totalLiquidBalance,
      expectedReceivables: 0,
      scheduledPayables,
      historicalBurnRateDaily: Math.round(dailyBurnRate),
      daysRemainingInMonth: daysRemaining,
      projectedClosingBalance: Math.round(projectedClosingBalance),
      riskStatus,
      recommendations: recs,
    };
  }, [totalLiquidBalance, monthlyExpenses, monthlySavings, accounts]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.isRead && !a.isDismissed).length;
  }, [alerts]);

  // Sincronização individual de instituição bancária
  const syncAccount = async (accountId: string) => {
    setAccounts(prev =>
      prev.map(a => (a.id === accountId ? { ...a, status: 'SYNCING' } : a))
    );

    // Simula tempo de rede e validação mTLS do Open Finance Brasil
    await new Promise(res => setTimeout(res, 1200));

    setAccounts(prev =>
      prev.map(a =>
        a.id === accountId
          ? {
              ...a,
              status: 'CONNECTED',
              lastSyncAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  // Sincronização em lote de todas as contas conectadas
  const syncAllAccounts = async () => {
    setIsSyncingAll(true);
    setAccounts(prev => prev.map(a => ({ ...a, status: 'SYNCING' })));

    await new Promise(res => setTimeout(res, 1800));

    setAccounts(prev =>
      prev.map(a => ({
        ...a,
        status: 'CONNECTED',
        lastSyncAt: new Date().toISOString(),
      }))
    );
    setIsSyncingAll(false);
  };

  // Conexão e Consentimento via Open Finance Brasil
  const connectInstitution = async (
    institutionId: string,
    scopes: string[],
    durationMonths: number
  ): Promise<boolean> => {
    const inst = INSTITUTIONS.find(i => i.id === institutionId);
    if (!inst) return false;

    const consentId = `consent-${inst.id.replace('inst-', '')}-${Date.now().toString(36)}`;
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + durationMonths);

    const newConsent: OpenFinanceConsent = {
      id: consentId,
      institutionId: inst.id,
      institutionName: inst.name,
      status: 'ACTIVE',
      scopes,
      durationMonths,
      createdAt: new Date().toISOString(),
      expiresAt: expiresDate.toISOString(),
      lastSuccessfulSyncAt: new Date().toISOString(),
      dataShared: ['Saldos de contas', 'Transações correntes', 'Limites e faturas de cartão'],
    };

    // Cria conta vinculada à instituição conectada
    const newAccount: BankAccount = {
      id: `acc-${inst.id.replace('inst-', '')}-${Date.now().toString(36)}`,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionColor: inst.color,
      type: 'CHECKING',
      name: `Conta ${inst.name}`,
      accountNumberMasked: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      balance: Math.round(1500 + Math.random() * 6000),
      currency: 'BRL',
      status: 'CONNECTED',
      lastSyncAt: new Date().toISOString(),
      consentId,
    };

    setConsents(prev => [newConsent, ...prev]);
    setAccounts(prev => [...prev, newAccount]);

    return true;
  };

  // Revogação imediata de consentimento Open Finance (LGPD)
  const revokeConsent = (consentId: string) => {
    setConsents(prev =>
      prev.map(c => (c.id === consentId ? { ...c, status: 'REVOKED' } : c))
    );
    // Atualiza status das contas vinculadas para desconectado
    setAccounts(prev =>
      prev.map(a =>
        a.consentId === consentId
          ? { ...a, status: 'DISCONNECTED', errorReason: 'Consentimento revogado pelo usuário.' }
          : a
      )
    );
  };

  // Adição de transações oriundas da importação com histórico
  const addTransactionsFromImport = (
    newItems: Array<Omit<Transaction, 'id' | 'createdAt'>>,
    fileName: string,
    fileType: 'OFX' | 'CSV' | 'PDF'
  ) => {
    const now = new Date().toISOString();
    let dupCount = 0;
    let lowConfCount = 0;

    const toInsert: Transaction[] = [];

    newItems.forEach((item, index) => {
      // Checa duplicidade
      const dup = detectDuplicate(item, transactions);
      if (dup.isDuplicate) {
        dupCount++;
      } else {
        if (item.isConfidenceLow) lowConfCount++;
        toInsert.push({
          ...item,
          id: `tx-imp-${Date.now()}-${index}`,
          createdAt: now,
        });
      }
    });

    if (toInsert.length > 0) {
      setTransactions(prev => [...toInsert, ...prev]);
    }

    const historyItem: ImportHistory = {
      id: `imp-${Date.now()}`,
      fileName,
      fileType,
      institutionName: newItems[0]?.institutionName || 'Instituição',
      totalTransactions: newItems.length,
      importedCount: toInsert.length,
      duplicateCount: dupCount,
      lowConfidenceCount: lowConfCount,
      timestamp: now,
      status: dupCount === newItems.length ? 'PARTIAL' : 'SUCCESS',
    };

    setImportHistory(prev => [historyItem, ...prev]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Aprendizado de regra pelo usuário
  const learnRule = (pattern: string, categoryId: string, categoryName: string) => {
    const cleanPattern = pattern.trim().toUpperCase();
    if (!cleanPattern) return;

    const newRule: CategorizationRule = {
      id: `rule-${Date.now()}`,
      pattern: cleanPattern,
      categoryId,
      categoryName,
      createdAt: new Date().toISOString(),
      matchCount: 1,
    };

    setUserRules(prev => [newRule, ...prev]);

    // Aplica a regra a transações existentes com a mesma descrição
    setTransactions(prev =>
      prev.map(t => {
        if (t.description.toUpperCase().includes(cleanPattern)) {
          return {
            ...t,
            categoryId,
            categoryName,
            confidence: 100,
            isConfidenceLow: false,
            aiExplanation: `Regra personalizada aprendida: "${cleanPattern}".`,
          };
        }
        return t;
      })
    );
  };

  const updateBudget = (id: string, limit: number, threshold: number) => {
    setBudgets(prev =>
      prev.map(b => (b.id === id ? { ...b, monthlyLimit: limit, alertThreshold: threshold } : b))
    );
  };

  const addBudget = (categoryId: string, limit: number, threshold: number) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const newBudget: Budget = {
      id: `b-${Date.now()}`,
      categoryId,
      categoryName: cat.name,
      monthlyLimit: limit,
      alertThreshold: threshold,
      spent: 0,
      periodMonth: new Date().toISOString().slice(0, 7),
    };

    setBudgets(prev => [...prev, newBudget]);
  };

  const markAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isRead: true } : a)));
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isDismissed: true } : a)));
  };

  // Exportação LGPD de dados do usuário
  const exportLgpdData = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      plataforma: 'FinPulse Open Finance & IA',
      perfil: {
        totalContasConectadas: accounts.length,
        totalTransacoes: transactions.length,
        consentimentosRegistrados: consents.length,
      },
      contas: accounts,
      transacoes: transactions,
      orcamentos: budgets,
      consentimentos: consents,
      regrasCategorizacao: userRules,
      historicoImportacoes: importHistory,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finpulse_lgpd_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resetar para dados de demonstração
  const resetToDefaults = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setAlerts(INITIAL_ALERTS);
    setConsents(INITIAL_CONSENTS);
    setUserRules(INITIAL_RULES);
    setImportHistory([]);
    localStorage.clear();
  };

  // Exclusão definitiva de todos os dados (Direito ao esquecimento LGPD)
  const deleteAllUserData = () => {
    setAccounts([]);
    setTransactions([]);
    setBudgets([]);
    setAlerts([]);
    setConsents([]);
    setUserRules([]);
    setImportHistory([]);
    localStorage.clear();
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        categories,
        budgets,
        alerts,
        consents,
        importHistory,
        userRules,
        activeTab,
        setActiveTab,
        isSyncingAll,
        isDemoMode,
        setIsDemoMode,
        searchQuery,
        setSearchQuery,
        filterAccountId,
        setFilterAccountId,
        filterCategoryId,
        setFilterCategoryId,
        filterPeriod,
        setFilterPeriod,
        syncAccount,
        syncAllAccounts,
        connectInstitution,
        revokeConsent,
        addTransactionsFromImport,
        updateTransaction,
        deleteTransaction,
        learnRule,
        updateBudget,
        addBudget,
        markAlertRead,
        dismissAlert,
        totalLiquidBalance,
        totalCreditDebt,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        savingsRate,
        projection,
        categorySpending,
        unreadAlertsCount,
        exportLgpdData,
        resetToDefaults,
        deleteAllUserData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser utilizado dentro de FinanceProvider');
  }
  return context;
};
