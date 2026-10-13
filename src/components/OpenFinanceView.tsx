import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { INSTITUTIONS } from '../data/mockData';
import {
  Building2,
  Plus,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  Lock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const OpenFinanceView: React.FC = () => {
  const {
    accounts,
    consents,
    syncAccount,
    connectInstitution,
    revokeConsent,
  } = useFinance();

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<string>('inst-bb');
  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'ACCOUNTS_READ',
    'BALANCES_READ',
    'TRANSACTIONS_READ',
    'CREDIT_CARDS_READ',
  ]);
  const [connectingStep, setConnectingStep] = useState<'SELECT' | 'TERMS' | 'REDIRECT' | 'SUCCESS'>('SELECT');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableInstitutionsToConnect = INSTITUTIONS.filter(
    inst => !accounts.some(a => a.institutionId === inst.id)
  );

  const handleOpenConnect = () => {
    if (availableInstitutionsToConnect.length > 0) {
      setSelectedInstId(availableInstitutionsToConnect[0].id);
    }
    setConnectingStep('SELECT');
    setIsConnectModalOpen(true);
  };

  const handleStartConnection = () => {
    setConnectingStep('TERMS');
  };

  const handleConfirmConsent = async () => {
    setConnectingStep('REDIRECT');
    setIsProcessing(true);

    // Simula tempo de redirecionamento mTLS seguro e autenticação no banco
    await new Promise(r => setTimeout(r, 2200));

    await connectInstitution(selectedInstId, selectedScopes, selectedDuration);
    setIsProcessing(false);
    setConnectingStep('SUCCESS');
  };

  const handleCloseModal = () => {
    setIsConnectModalOpen(false);
    setConnectingStep('SELECT');
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const selectedInstObj = INSTITUTIONS.find(i => i.id === selectedInstId);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho do Hub Open Finance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Ecossistema Regulado pelo Banco Central do Brasil
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Conectividade & Centralização Open Finance
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Conecte suas contas, cartões e investimentos em instituições autorizadas.
            Nenhuma senha bancária é armazenada; o acesso é intermediado por tokens criptografados e consentimentos explícitos.
          </p>
        </div>

        <button
          onClick={handleOpenConnect}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition-colors whitespace-nowrap cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar Instituição</span>
        </button>
      </div>

      {/* Grid de Contas & Instituições Conectadas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Suas Instituições Conectadas ({accounts.length})
          </h3>
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Open Finance Brasil · Conexão Ativa</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const isSyncing = acc.status === 'SYNCING';
            const isCard = acc.type === 'CREDIT_CARD';
            const consent = consents.find(c => c.id === acc.consentId);

            return (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: acc.institutionColor }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">{acc.institutionName}</h4>
                        <span className="text-[11px] text-slate-400">{acc.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Ativo
                      </span>
                    </div>
                  </div>

                  {/* Informações de Saldo ou Limite */}
                  <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="text-[11px] text-slate-400 mb-0.5">
                      {isCard ? 'Fatura Atual em Aberto' : 'Saldo em Conta Corrente'}
                    </div>
                    <div className="text-lg font-bold text-white tabular-nums">
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
                    {isCard && acc.creditLimit && (
                      <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                        Limite Total: R$ {acc.creditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card com Sincronização e Consentimento */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Última Sincronização:
                    </span>
                    <span className="text-slate-300 font-medium">
                      {new Date(acc.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {consent && (
                    <div className="flex items-center justify-between">
                      <span>Validade Consentimento:</span>
                      <span className="text-slate-300 font-medium">
                        {new Date(consent.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => syncAccount(acc.id)}
                      disabled={isSyncing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>

                    {consent && (
                      <button
                        onClick={() => revokeConsent(consent.id)}
                        title="Revogar Consentimento Open Finance (LGPD)"
                        className="py-1.5 px-2.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Gerenciamento Formal de Consentimentos (LGPD Art. 18) */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Registro de Consentimentos Open Finance (LGPD)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Controle rigoroso das autorizações ativas, dados compartilhados e possibilidade de revogação a qualquer momento.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Instituição</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Escopos Autorizados</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {consents.map(c => {
                const isActive = c.status === 'ACTIVE';

                return (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-white">
                      {c.institutionName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Revogado'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {c.scopes.join(', ')}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isActive ? (
                        <button
                          onClick={() => revokeConsent(c.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Revogar Acesso
                        </button>
                      ) : (
                        <span className="text-slate-500">Revogado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Multi-Etapa de Conexão Open Finance Brasil */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B0F19] border border-slate-700 shadow-2xl p-6 relative">
            
            {/* Etapa 1: Seleção de Instituição */}
            {connectingStep === 'SELECT' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Conectar Nova Instituição</h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Selecione a instituição financeira autorizada participante do Open Finance Brasil:
                </p>

                <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {INSTITUTIONS.map(inst => {
                    const isConnected = accounts.some(a => a.institutionId === inst.id);
                    const isSelected = selectedInstId === inst.id;

                    return (
                      <button
                        key={inst.id}
                        disabled={isConnected}
                        onClick={() => setSelectedInstId(inst.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isConnected
                            ? 'bg-slate-900/40 border-slate-800/40 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: inst.color }}
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{inst.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {isConnected ? 'Já Conectado' : `Código ${inst.code}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStartConnection}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    Avançar para Consentimento
                  </button>
                </div>
              </div>
            )}

            {/* Etapa 2: Termos de Consentimento & Escopos LGPD */}
            {connectingStep === 'TERMS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Autorização de Consentimento Open Finance</h3>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-300">
                      Instituição a conectar: {selectedInstObj?.name}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Você autoriza o FinPulse a consultar suas informações financeiras exclusivamente para consolidação, categorização e diagnóstico financeiro.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">Escopos de Dados Solicitados:</span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes('ACCOUNTS_READ')}
                        onChange={() => toggleScope('ACCOUNTS_READ')}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Dados de identificação e número de conta</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes('BALANCES_READ')}
                        onChange={() => toggleScope('BALANCES_READ')}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Saldos de conta corrente e investimentos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes('TRANSACTIONS_READ')}
                        onChange={() => toggleScope('TRANSACTIONS_READ')}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Histórico de transações, extratos e lançamentos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes('CREDIT_CARDS_READ')}
                        onChange={() => toggleScope('CREDIT_CARDS_READ')}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Limites e faturas de cartão de crédito</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300">Prazo de Validade do Acesso:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 6, 12].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedDuration(m)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          selectedDuration === m
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={() => setConnectingStep('SELECT')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmConsent}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    Autorizar no Banco Parceiro
                  </button>
                </div>
              </div>
            )}

            {/* Etapa 3: Redirecionamento & Handshake mTLS */}
            {connectingStep === 'REDIRECT' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-3 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Redirecionando para o ambiente seguro do {selectedInstObj?.name}...
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Validando certificados mTLS e gerando token de consentimento Open Finance criptografado.
                  </p>
                </div>
              </div>
            )}

            {/* Etapa 4: Conexão Bem-Sucedida */}
            {connectingStep === 'SUCCESS' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Instituição Conectada com Sucesso!</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    As contas e transações de {selectedInstObj?.name} já foram sincronizadas e unificadas ao seu painel.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Concluir e Ver Painel
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
