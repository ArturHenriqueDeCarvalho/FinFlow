import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  Sparkles,
  BrainCircuit,
  TrendingUp,
  RotateCw,
  Lightbulb,
  CheckCircle2,
  Sliders,
  DollarSign,
  Percent,
} from 'lucide-react';

interface AiInsightItem {
  title: string;
  type: string;
  description: string;
  impactAmount?: number;
}

export const AiInsightsView: React.FC = () => {
  const {
    totalLiquidBalance,
    monthlyIncome,
    monthlyExpenses,
    categorySpending,
    projection,
  } = useFinance();

  const [isLoading, setIsLoading] = useState(false);
  const [healthScore, setHealthScore] = useState<number>(84);
  const [healthStatus, setHealthStatus] = useState<string>('EQUILIBRADO');
  const [insights, setInsights] = useState<AiInsightItem[]>([
    {
      title: 'Teto de Gastos em Alimentação & Delivery',
      type: 'WARNING',
      description: 'Gastos com iFood e restaurantes atingiram 28% do total das despesas este mês. Reduzir 2 pedidos por semana geraria economia de R$ 260,00/mês.',
      impactAmount: 260.00,
    },
    {
      title: 'Auditoria de Assinaturas Digitais Ativas',
      type: 'SAVINGS',
      description: 'Você possui múltiplos streamings contratados paralelamente. O cancelamento dos serviços de menor frequência representa R$ 680,00 no acumulado de 1 ano.',
      impactAmount: 680.00,
    },
    {
      title: 'Otimização de Reserva com Renda Fixa 100% CDI',
      type: 'OPPORTUNITY',
      description: 'Seu saldo em conta corrente com liquidez imediata no Inter e Itaú rende abaixo da taxa Selic vigente. Transferir parte da folga para CDB de liquidez diária rende aproximadamente R$ 92,00 extras/mês.',
      impactAmount: 92.00,
    },
  ]);

  // Simulador de Economia
  const [deliveryCut, setDeliveryCut] = useState(15); // %
  const [streamingsCut, setStreamingsCut] = useState(1); // qtd
  const [impulseCut, setImpulseCut] = useState(20); // %

  const monthlyEstimatedSavings = (deliveryCut * 18.5) + (streamingsCut * 55.90) + (impulseCut * 9.2);
  const annualEstimatedSavings = monthlyEstimatedSavings * 12;

  const handleGenerateAiDiagnostic = async () => {
    setIsLoading(true);

    try {
      const summaryPayload = {
        saldoDisponivel: totalLiquidBalance,
        receitaMensal: monthlyIncome,
        despesasMensais: monthlyExpenses,
        principaisCategorias: categorySpending.slice(0, 5),
        burnRateDiario: projection.historicalBurnRateDaily,
      };

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summaryPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.healthScore) setHealthScore(data.healthScore);
        if (data.financialHealthStatus) setHealthStatus(data.financialHealthStatus);
        if (data.insights && Array.isArray(data.insights)) setInsights(data.insights);
      }
    } catch (err) {
      console.error('Erro ao conectar com API de IA:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Motor de Diagnóstico com Gemini 3.8 Flash
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Consultoria Financeira Preventiva por Inteligência Artificial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Análise comportamental das suas contas integradas via Open Finance para encontrar oportunidades de economia e prevenção de dívidas.
          </p>
        </div>

        <button
          onClick={handleGenerateAiDiagnostic}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer shrink-0"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analisando com IA...' : 'Atualizar Diagnóstico'}</span>
        </button>
      </div>

      {/* 2. Placar de Saúde Financeira */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Score de Saúde Financeira
            </span>
            <div className="text-3xl font-extrabold text-white mt-1 tabular-nums">
              {healthScore}
              <span className="text-sm text-slate-500 font-normal"> / 100</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium mt-1 inline-block">
              {healthStatus}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
            <BrainCircuit className="w-7 h-7" />
          </div>
        </div>

        {/* Burn Rate */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Velocidade de Gasto Diário
            </span>
            <div className="text-3xl font-extrabold text-white mt-1 tabular-nums">
              R$ {projection.historicalBurnRateDaily}
              <span className="text-sm text-slate-500 font-normal"> / dia</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 inline-block">
              Compatível com sua receita
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>

        {/* Projeção de Poupança */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Potencial de Economia Mensal
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1 tabular-nums">
              R$ {Math.round(monthlyEstimatedSavings)}
              <span className="text-sm text-slate-500 font-normal"> / mês</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 inline-block">
              R$ {Math.round(annualEstimatedSavings)} em 12 meses
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 3. Recomendações Práticas da IA */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Recomendações Práticas & Oportunidades Identificadas
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 inline-block">
                  {item.type}
                </span>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{item.description}</p>
              </div>

              {item.impactAmount && (
                <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Impacto Estimado:</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    + R$ {item.impactAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Simulador Interativo de Economia */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Simulador de Impacto Financeiro
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Ajuste os controles abaixo para simular o resultado de pequenas mudanças nos seus hábitos de consumo:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Delivery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Redução em Delivery & Restaurantes:</span>
              <span className="font-bold text-emerald-400 tabular-nums">{deliveryCut}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={deliveryCut}
              onChange={e => setDeliveryCut(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[11px] text-slate-500 block">
              Economia estimada: R$ {Math.round(deliveryCut * 18.5)}/mês
            </span>
          </div>

          {/* Slider 2: Assinaturas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Cancelar assinaturas não essenciais:</span>
              <span className="font-bold text-cyan-400 tabular-nums">{streamingsCut} serviço(s)</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={streamingsCut}
              onChange={e => setStreamingsCut(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[11px] text-slate-500 block">
              Economia estimada: R$ {Math.round(streamingsCut * 55.90)}/mês
            </span>
          </div>

          {/* Slider 3: Compras por impulso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Controle de Compras Pessoais:</span>
              <span className="font-bold text-indigo-400 tabular-nums">{impulseCut}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="10"
              value={impulseCut}
              onChange={e => setImpulseCut(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500 block">
              Economia estimada: R$ {Math.round(impulseCut * 9.2)}/mês
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-200">
          <div>
            <span className="font-bold text-white">Resultado acumulado da simulação:</span>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Aplicando esses 3 ajustes, você terá <strong className="text-emerald-400">R$ {Math.round(annualEstimatedSavings).toLocaleString('pt-BR')}</strong> a mais na sua conta ao final de 12 meses.
            </p>
          </div>
          <span className="text-base font-extrabold text-emerald-400 shrink-0 tabular-nums">
            + R$ {Math.round(monthlyEstimatedSavings).toLocaleString('pt-BR')}/mês
          </span>
        </div>
      </div>
    </div>
  );
};
