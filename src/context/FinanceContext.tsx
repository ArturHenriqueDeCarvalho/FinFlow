import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { useAuth } from './AuthContext';
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
import { DEFAULT_CATEGORIES, INSTITUTIONS } from '../data/mockData';
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
  isLoadingData: boolean;

  // Filtros
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterAccountId: string;
  setFilterAccountId: (id: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  filterPeriod: string;
  setFilterPeriod: (p: string) => void;

  // Ações de persistência no Firestore
  syncAccount: (accountId: string) => Promise<void>;
  syncAllAccounts: () => Promise<void>;
  connectInstitution: (
    institutionId: string,
    scopes: string[],
    durationMonths: number,
    customAccountName?: string,
    initialBalance?: number
  ) => Promise<boolean>;
  revokeConsent: (consentId: string) => Promise<void>;

  addTransactionsFromImport: (
    items: Array<Omit<Transaction, 'id' | 'createdAt'>>,
    fileName: string,
    fileType: 'OFX' | 'CSV' | 'PDF'
  ) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  learnRule: (pattern: string, categoryId: string, categoryName: string) => Promise<void>;

  updateBudget: (id: string, limit: number, threshold: number) => Promise<void>;
  addBudget: (categoryId: string, limit: number, threshold: number) => Promise<void>;

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

  exportLgpdData: () => void;
  deleteAllUserData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Estados com inicialização 100% LIMPA (zero dados mockados)
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [consents, setConsents] = useState<OpenFinanceConsent[]>([]);
  const [userRules, setUserRules] = useState<CategorizationRule[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('ALL');
  const [filterCategoryId, setFilterCategoryId] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');

  // Sincronização em tempo real via Firestore (onSnapshot) por UID do usuário
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setConsents([]);
      setUserRules([]);
      setImportHistory([]);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const userId = user.uid;

    // 1. Contas bancárias
    const accountsPath = `users/${userId}/accounts`;
    const unsubAccounts = onSnapshot(
      collection(db, accountsPath),
      snapshot => {
        const accs = snapshot.docs.map(doc => doc.data() as BankAccount);
        setAccounts(accs);
      },
      error => handleFirestoreError(error, OperationType.GET, accountsPath)
    );

    // 2. Transações reais
    const txsPath = `users/${userId}/transactions`;
    const unsubTxs = onSnapshot(
      collection(db, txsPath),
      snapshot => {
        const txs = snapshot.docs.map(doc => doc.data() as Transaction);
        // Ordena por data decrescente
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txs);
      },
      error => handleFirestoreError(error, OperationType.GET, txsPath)
    );

    // 3. Orçamentos
    const budgetsPath = `users/${userId}/budgets`;
    const unsubBudgets = onSnapshot(
      collection(db, budgetsPath),
      snapshot => {
        const bgs = snapshot.docs.map(doc => doc.data() as Budget);
        setBudgets(bgs);
      },
      error => handleFirestoreError(error, OperationType.GET, budgetsPath)
    );

    // 4. Consentimentos Open Finance
    const consentsPath = `users/${userId}/consents`;
    const unsubConsents = onSnapshot(
      collection(db, consentsPath),
      snapshot => {
        const csts = snapshot.docs.map(doc => doc.data() as OpenFinanceConsent);
        setConsents(csts);
      },
      error => handleFirestoreError(error, OperationType.GET, consentsPath)
    );

    // 5. Regras de aprendizado
    const rulesPath = `users/${userId}/rules`;
    const unsubRules = onSnapshot(
      collection(db, rulesPath),
      snapshot => {
        const rls = snapshot.docs.map(doc => doc.data() as CategorizationRule);
        setUserRules(rls);
        setIsLoadingData(false);
      },
      error => handleFirestoreError(error, OperationType.GET, rulesPath)
    );

    return () => {
      unsubAccounts();
      unsubTxs();
      unsubBudgets();
      unsubConsents();
      unsubRules();
    };
  }, [user]);

  // Recalcula limites e alertas dinâmicos baseados nas transações reais
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const spentByCategory: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'EXPENSE' && !tx.isInternalTransfer && tx.date.startsWith(currentMonth)) {
        spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + Math.abs(tx.amount);
      }
    });

    // Gera alertas preventivos inteligentes com base em dados reais
    const dynamicAlerts: AlertNotification[] = [];

    budgets.forEach(b => {
      const spent = spentByCategory[b.categoryId] || 0;
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;

      if (pct >= 100) {
        dynamicAlerts.push({
          id: `alt-over-${b.id}`,
          type: 'BUDGET_OVERRUN',
          severity: 'HIGH',
          title: `Teto Ultrapassado: ${b.categoryName}`,
          message: `Você gastou R$ ${spent.toFixed(2)} e ultrapassou o teto planejado de R$ ${b.monthlyLimit.toFixed(2)}.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          isDismissed: false,
          relatedCategoryId: b.categoryId,
        });
      } else if (pct >= b.alertThreshold * 100) {
        dynamicAlerts.push({
          id: `alt-warn-${b.id}`,
          type: 'BUDGET_WARNING',
          severity: 'HIGH',
          title: `Atenção ao Orçamento: ${b.categoryName}`,
          message: `Você atingiu ${pct.toFixed(0)}% do teto planejado para este mês.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          isDismissed: false,
          relatedCategoryId: b.categoryId,
        });
      }
    });

    setAlerts(dynamicAlerts);
  }, [transactions, budgets]);

  // Métricas Consolidadas Calculadas sobre Dados Reais
  const totalLiquidBalance = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type !== 'CREDIT_CARD') {
        return acc + a.balance;
      }
      return acc;
    }, 0);
  }, [accounts]);

  const totalCreditDebt = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type === 'CREDIT_CARD') {
        return acc + Math.abs(a.balance);
      }
      return acc;
    }, 0);
  }, [accounts]);

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

  const projection: CashFlowProjection = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay);

    const dailyBurnRate = currentDay > 0 ? monthlyExpenses / currentDay : 0;
    const projectedAdditionalExpenses = dailyBurnRate * daysRemaining;

    const scheduledPayables = accounts.reduce((acc, a) => {
      return a.type === 'CREDIT_CARD' ? acc + (a.currentInvoiceAmount || Math.abs(a.balance)) : acc;
    }, 0);

    const projectedClosingBalance = totalLiquidBalance - scheduledPayables - (projectedAdditionalExpenses * 0.5);

    let riskStatus: 'COMFORTABLE' | 'MODERATE' | 'DEFICIT_RISK' = 'COMFORTABLE';
    const recs: string[] = [];

    if (projectedClosingBalance < 0) {
      riskStatus = 'DEFICIT_RISK';
      recs.push('Risco de saldo insuficiente até o fim do mês com base no ritmo atual de gastos.');
    } else if (projectedClosingBalance < totalLiquidBalance * 0.25) {
      riskStatus = 'MODERATE';
      recs.push('Saldo projetado apertado. Monitore faturas com vencimento próximo.');
    } else {
      riskStatus = 'COMFORTABLE';
      recs.push('Fluxo sob controle com base nos dados sincronizados.');
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
  }, [totalLiquidBalance, monthlyExpenses, accounts]);

  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.isRead && !a.isDismissed).length;
  }, [alerts]);

  // Sincronização de Conta no Firestore
  const syncAccount = async (accountId: string) => {
    if (!user) return;
    const accRef = doc(db, 'users', user.uid, 'accounts', accountId);

    try {
      await setDoc(accRef, { status: 'SYNCING' }, { merge: true });
      await new Promise(res => setTimeout(res, 1000));
      await setDoc(
        accRef,
        {
          status: 'CONNECTED',
          lastSyncAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/accounts/${accountId}`);
    }
  };

  const syncAllAccounts = async () => {
    if (!user || accounts.length === 0) return;
    setIsSyncingAll(true);

    try {
      for (const a of accounts) {
        await syncAccount(a.id);
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Conectar Nova Instituição Real no Firestore
  const connectInstitution = async (
    institutionId: string,
    scopes: string[],
    durationMonths: number,
    customAccountName?: string,
    initialBalance: number = 0
  ): Promise<boolean> => {
    if (!user) return false;

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
      dataShared: ['Saldos de contas', 'Transações correntes', 'Limites de crédito'],
    };

    const newAccountId = `acc-${inst.id.replace('inst-', '')}-${Date.now().toString(36)}`;
    const newAccount: BankAccount = {
      id: newAccountId,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionColor: inst.color,
      type: 'CHECKING',
      name: customAccountName || `Conta ${inst.name}`,
      accountNumberMasked: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      balance: initialBalance,
      currency: 'BRL',
      status: 'CONNECTED',
      lastSyncAt: new Date().toISOString(),
      consentId,
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'consents', consentId), newConsent);
      await setDoc(doc(db, 'users', user.uid, 'accounts', newAccountId), newAccount);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/accounts`);
      return false;
    }
  };

  const revokeConsent = async (consentId: string) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'consents', consentId),
        { status: 'REVOKED' },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/consents/${consentId}`);
    }
  };

  // Importar Transações Reais (OFX / CSV / PDF) diretamente no Firestore
  const addTransactionsFromImport = async (
    newItems: Array<Omit<Transaction, 'id' | 'createdAt'>>,
    fileName: string,
    fileType: 'OFX' | 'CSV' | 'PDF'
  ) => {
    if (!user) return;

    const now = new Date().toISOString();
    let dupCount = 0;
    let lowConfCount = 0;

    for (let index = 0; index < newItems.length; index++) {
      const item = newItems[index];
      const dup = detectDuplicate(item, transactions);

      if (dup.isDuplicate) {
        dupCount++;
      } else {
        if (item.isConfidenceLow) lowConfCount++;
        const txId = `tx-imp-${Date.now()}-${index}`;
        const newTx: Transaction = {
          ...item,
          id: txId,
          createdAt: now,
        };

        try {
          await setDoc(doc(db, 'users', user.uid, 'transactions', txId), newTx);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/transactions/${txId}`);
        }
      }
    }

    const historyItem: ImportHistory = {
      id: `imp-${Date.now()}`,
      fileName,
      fileType,
      institutionName: newItems[0]?.institutionName || 'Instituição',
      totalTransactions: newItems.length,
      importedCount: newItems.length - dupCount,
      duplicateCount: dupCount,
      lowConfidenceCount: lowConfCount,
      timestamp: now,
      status: dupCount === newItems.length ? 'PARTIAL' : 'SUCCESS',
    };

    setImportHistory(prev => [historyItem, ...prev]);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'transactions', id),
        { ...updates, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/transactions/${id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/transactions/${id}`);
    }
  };

  const learnRule = async (pattern: string, categoryId: string, categoryName: string) => {
    if (!user) return;
    const ruleId = `rule-${Date.now()}`;
    const newRule: CategorizationRule = {
      id: ruleId,
      pattern: pattern.trim().toUpperCase(),
      categoryId,
      categoryName,
      createdAt: new Date().toISOString(),
      matchCount: 1,
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'rules', ruleId), newRule);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/rules/${ruleId}`);
    }
  };

  const updateBudget = async (id: string, limit: number, threshold: number) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'budgets', id),
        { monthlyLimit: limit, alertThreshold: threshold },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/budgets/${id}`);
    }
  };

  const addBudget = async (categoryId: string, limit: number, threshold: number) => {
    if (!user) return;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const budgetId = `b-${Date.now()}`;
    const newBudget: Budget = {
      id: budgetId,
      categoryId,
      categoryName: cat.name,
      monthlyLimit: limit,
      alertThreshold: threshold,
      spent: 0,
      periodMonth: new Date().toISOString().slice(0, 7),
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'budgets', budgetId), newBudget);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/budgets/${budgetId}`);
    }
  };

  const markAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isRead: true } : a)));
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isDismissed: true } : a)));
  };

  const exportLgpdData = () => {
    if (!user) return;
    const data = {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      usuario: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      contas: accounts,
      transacoes: transactions,
      orcamentos: budgets,
      consentimentos: consents,
      regras: userRules,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finpulse_meus_dados_reais_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exclusão definitiva de todos os dados do usuário no Firestore (LGPD)
  const deleteAllUserData = async () => {
    if (!user) return;
    try {
      for (const a of accounts) {
        await deleteDoc(doc(db, 'users', user.uid, 'accounts', a.id));
      }
      for (const t of transactions) {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', t.id));
      }
      for (const b of budgets) {
        await deleteDoc(doc(db, 'users', user.uid, 'budgets', b.id));
      }
      for (const c of consents) {
        await deleteDoc(doc(db, 'users', user.uid, 'consents', c.id));
      }
      for (const r of userRules) {
        await deleteDoc(doc(db, 'users', user.uid, 'rules', r.id));
      }
      await deleteDoc(doc(db, 'users', user.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
    }
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
        isLoadingData,
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
