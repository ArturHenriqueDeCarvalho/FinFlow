import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  ShieldCheck,
  Download,
  Trash2,
  RotateCcw,
  Lock,
  Key,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const PrivacyLgpdView: React.FC = () => {
  const {
    exportLgpdData,
    deleteAllUserData,
    consents,
    accounts,
    transactions,
  } = useFinance();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleExport = () => {
    exportLgpdData();
    setSuccessMsg('Download do arquivo de exportação LGPD iniciado com sucesso.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteAll = () => {
    deleteAllUserData();
    setConfirmDelete(false);
    setSuccessMsg('Todos os dados foram permanentemente expurgados da sua conta.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Conformidade LGPD (Lei nº 13.709/2018) & Segurança Open Finance
          </span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Painel de Privacidade, Consentimento & Governança de Dados
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Você tem controle total sobre suas informações financeiras. Exporte seus dados em formato aberto, gerencie seus consentimentos ou solicite a exclusão definitiva a qualquer momento.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Diretrizes de Segurança da Arquitetura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Sem Senhas Bancárias</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            A plataforma nunca solicita nem armazena suas credenciais ou senhas de banco. A autorização é realizada diretamente na instituição financeira de origem via Open Finance Brasil.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Criptografia em Trânsito & Repouso</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Todas as comunicações com os bancos utilizam certificados digitais mTLS ICP-Brasil e criptografia TLS 1.3 / AES-256 em conformidade com as circulares do Bacen.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Finalidade Exclusiva</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Seus dados são utilizados exclusivamente para consolidação, categorização inteligente e alertas preventivos. Não há venda nem compartilhamento de dados com terceiros.
          </p>
        </div>
      </div>

      {/* 3. Direitos do Titular (Art. 18 LGPD) */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Exercício dos Direitos do Titular (LGPD)
        </h3>

        <div className="divide-y divide-slate-800/80 text-xs">
          {/* Direito à Portabilidade / Exportação */}
          <div className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white">Direito de Acesso e Portabilidade dos Dados</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Faça o download de todos os seus registros financeiros, contas, orçamentos e consentimentos em arquivo JSON estruturado.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Dados (JSON)</span>
            </button>
          </div>

          {/* Direito ao Esquecimento / Exclusão Total */}
          <div className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-rose-300">Direito à Eliminação dos Dados Pessoais (Esquecimento)</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Remove permanentemente todas as contas conectadas, histórico de transações, regras e consentimentos armazenados.
              </p>
            </div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Meus Dados</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-3.5 py-2 rounded-lg font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                >
                  Confirmar Exclusão Definitiva
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
