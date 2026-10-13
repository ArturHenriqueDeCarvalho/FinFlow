import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl =
    'https://console.firebase.google.com/project/semiotic-aria-7v4kj/authentication/settings';

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    setIsUnauthorizedDomain(false);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Erro de autenticação Google:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setErrorMsg('Domínio não autorizado pelo Firebase Authentication.');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('A janela de login com Google foi fechada antes de concluir.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site.');
      } else {
        setErrorMsg('Não foi possível autenticar com o Google. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCopyDomain = async () => {
    if (!currentHostname) return;
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">FinPulse</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>LGPD & Open Finance Brasil</span>
        </div>
      </div>

      {/* Hero / Login Box */}
      <div className="max-w-lg w-full mx-auto my-auto p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-6">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Gestão Financeira Inteligente
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Centralize suas contas bancárias reais via Open Finance, importe extratos (OFX/CSV/PDF) e antecipe riscos com IA.
          </p>
        </div>

        {/* Diagnóstico detalhado para erro auth/unauthorized-domain */}
        {isUnauthorizedDomain ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3.5">
            <div className="flex items-start gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Domínio não autorizado no Firebase
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  O Google OAuth bloqueia chamadas vindas de URLs não cadastradas na lista de domínios autorizados do seu projeto Firebase.
                </p>
              </div>
            </div>

            {/* Domínio atual com botão copiar */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400">Domínio atual desta aplicação:</div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700/80">
                <code className="text-xs text-emerald-400 font-mono truncate select-all">
                  {currentHostname}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-white font-medium transition cursor-pointer shrink-0"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Passo a passo rápido */}
            <div className="text-[11px] text-slate-300 space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="font-semibold text-slate-200">Como resolver no Firebase Console:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Abra o Console Firebase na aba <strong className="text-slate-300">Domínios autorizados</strong>.</li>
                <li>Clique em <strong className="text-slate-300">Adicionar domínio</strong> e cole o domínio copiado.</li>
                <li>(Se for na Vercel, adicione também seu domínio <code className="text-slate-300 font-mono text-[10px]">*.vercel.app</code>).</li>
                <li>Salve e clique em <strong className="text-slate-300">Tentar Novamente</strong>.</li>
              </ol>
            </div>

            {/* Ações imediatas */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={firebaseSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer text-center"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={signInAsGuest}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Testar como Convidado</span>
              </button>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Botões de Acesso */}
        <div className="space-y-3 pt-1">
          {/* Botão Oficial de Login com Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Conectando conta Google...' : 'Entrar com o Google'}</span>
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-2">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">ou</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          {/* Botão de Convidado / Modo Teste Rápido */}
          <button
            type="button"
            onClick={signInAsGuest}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-medium text-xs sm:text-sm transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Acessar Modo Demonstração (Convidado)</span>
          </button>

          <p className="text-[11px] text-slate-500">
            Acesso seguro individual. Nenhuma senha bancária é solicitada.
          </p>
        </div>

        {/* Guia retrátil sobre domínios */}
        <div className="text-left border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setShowDomainHelp(!showDomainHelp)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
          >
            <span>Como configurar o domínio no Firebase (Vercel / Preview)?</span>
            {showDomainHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDomainHelp && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-2 leading-relaxed">
              <p>
                O Firebase Authentication exige que todo domínio onde a aplicação roda seja adicionado à lista de domínios confiáveis.
              </p>
              <div className="space-y-1">
                <div>1. Copie o domínio atual: <code className="text-emerald-400 font-mono text-[10px]">{currentHostname}</code></div>
                <div>2. Acesse <a href={firebaseSettingsUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Firebase Authentication Settings <ExternalLink className="w-2.5 h-2.5" /></a></div>
                <div>3. Em <strong className="text-slate-300">Domínios autorizados</strong>, clique em <strong className="text-slate-300">Adicionar domínio</strong> e salve.</div>
              </div>
            </div>
          )}
        </div>

        {/* Pilares de Segurança */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-3 text-left">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-300 block">Zero Mocks</strong>
              Comece com sua conta limpa e dados reais.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-300 block">Open Finance</strong>
              Conecte Nubank, Itaú, Inter e outros.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4">
        FinPulse · Conformidade total com a Lei Geral de Proteção de Dados (LGPD).
      </footer>
    </div>
  );
};
