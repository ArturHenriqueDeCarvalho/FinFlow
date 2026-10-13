/**
 * FinPulse - Tipos de Dados da Plataforma Financeira
 * Compatível com arquitetura Open Finance Brasil e LGPD
 */

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT';

export type AccountStatus = 'CONNECTED' | 'SYNCING' | 'REAUTH_REQUIRED' | 'DISCONNECTED';

export interface FinancialInstitution {
  id: string;
  name: string;
  code: string; // Código COMPE (ex: 260 para Nubank, 341 para Itaú)
  logoUrl?: string;
  color: string;
  isOpenFinanceParticipant: boolean;
  type: 'BANCO_MULTIPLO' | 'FINTECH' | 'COOPERATIVA' | 'CORRETORA';
}

export interface BankAccount {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionColor: string;
  type: AccountType;
  name: string; // Ex: "Conta Corrente", "Cartão Ultravioleta"
  accountNumberMasked: string; // Ex: "**** 4821"
  agency?: string;
  balance: number; // Saldo líquido atual em R$
  creditLimit?: number; // Para cartões de crédito
  availableCredit?: number; // Limite disponível
  invoiceClosingDate?: string; // Ex: "15/10"
  invoiceDueDate?: string; // Ex: "22/10"
  currentInvoiceAmount?: number; // Valor da fatura atual em aberto
  currency: 'BRL';
  status: AccountStatus;
  lastSyncAt: string;
  consentId?: string;
  errorReason?: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type TransactionSource = 'OPEN_FINANCE' | 'IMPORT_OFX' | 'IMPORT_CSV' | 'IMPORT_PDF' | 'MANUAL';

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  type: TransactionType;
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  institutionName: string;
  institutionColor: string;
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // Negativo para despesa, positivo para receita
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  source: TransactionSource;
  externalId?: string; // Ex: FITID do OFX ou ID da API Open Finance
  confidence: number; // 0 a 100% de confiança da IA
  isConfidenceLow: boolean; // Flag se < 70% requer revisão
  aiExplanation?: string;
  isRecurring?: boolean;
  recurrencePeriod?: 'MONTHLY' | 'WEEKLY' | 'ANNUAL';
  isInternalTransfer?: boolean;
  notes?: string;
  duplicateSuspectId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  monthlyLimit: number;
  alertThreshold: number; // Ex: 0.8 para alertar em 80%
  spent: number;
  periodMonth: string; // YYYY-MM
}

export type AlertType = 
  | 'BUDGET_OVERRUN' 
  | 'BUDGET_WARNING' 
  | 'ABNORMAL_SPIKE' 
  | 'CARD_DUE' 
  | 'DUPLICATE_SUSPECT' 
  | 'ZOMBIE_SUBSCRIPTION' 
  | 'DEFICIT_RISK' 
  | 'REAUTH_NEEDED';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AlertNotification {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  relatedCategoryId?: string;
  relatedAccountId?: string;
  relatedTransactionId?: string;
  amount?: number;
}

export interface OpenFinanceConsent {
  id: string;
  institutionId: string;
  institutionName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REAUTH_REQUIRED';
  scopes: string[]; // ['ACCOUNTS_READ', 'BALANCES_READ', 'TRANSACTIONS_READ', 'CREDIT_CARDS_READ']
  durationMonths: number;
  createdAt: string;
  expiresAt: string;
  lastSuccessfulSyncAt: string;
  dataShared: string[];
}

export interface ImportPreviewItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  fitId?: string;
  suggestedCategoryId: string;
  confidence: number;
  aiExplanation: string;
  isDuplicateSuspect: boolean;
  duplicateMatchedWith?: string;
  selected: boolean;
}

export interface ImportHistory {
  id: string;
  fileName: string;
  fileType: 'OFX' | 'CSV' | 'PDF';
  institutionName: string;
  totalTransactions: number;
  importedCount: number;
  duplicateCount: number;
  lowConfidenceCount: number;
  timestamp: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

export interface CategorizationRule {
  id: string;
  pattern: string; // Ex: "IFOOD", "UBER", "NETFLIX"
  categoryId: string;
  categoryName: string;
  createdAt: string;
  matchCount: number;
}

export interface CashFlowProjection {
  currentLiquidBalance: number;
  expectedReceivables: number;
  scheduledPayables: number;
  historicalBurnRateDaily: number;
  daysRemainingInMonth: number;
  projectedClosingBalance: number;
  riskStatus: 'COMFORTABLE' | 'MODERATE' | 'DEFICIT_RISK';
  recommendations: string[];
}
