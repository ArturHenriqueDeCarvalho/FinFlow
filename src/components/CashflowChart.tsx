import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/finance';

interface CashflowChartProps {
  transactions: Transaction[];
  currentBalance: number;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions, currentBalance }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    day: number;
    date: string;
    income: number;
    expense: number;
    net: number;
    projected: boolean;
  } | null>(null);

  const daysInCurrentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, []);

  const currentDay = useMemo(() => {
    return new Date().getDate();
  }, []);

  const chartData = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const dailyIncome = new Array(daysInCurrentMonth + 1).fill(0);
    const dailyExpense = new Array(daysInCurrentMonth + 1).fill(0);

    transactions.forEach(t => {
      if (t.isInternalTransfer || t.categoryId === 'cat-transferencia') return;
      if (t.date.startsWith(currentMonthPrefix)) {
        const day = parseInt(t.date.split('-')[2], 10);
        if (day >= 1 && day <= daysInCurrentMonth) {
          if (t.amount > 0) {
            dailyIncome[day] += t.amount;
          } else {
            dailyExpense[day] += Math.abs(t.amount);
          }
        }
      }
    });

    // Calcula curva cumulativa
    const points: Array<{
      day: number;
      date: string;
      income: number;
      expense: number;
      net: number;
      projected: boolean;
    }> = [];

    let runningNet = 0;
    // Média diária de gastos para extrapolar projeção
    const totalSpentSoFar = dailyExpense.slice(1, currentDay + 1).reduce((a, b) => a + b, 0);
    const avgDailyExpense = currentDay > 0 ? totalSpentSoFar / currentDay : 0;

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const isPastOrToday = day <= currentDay;
      const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;

      if (isPastOrToday) {
        runningNet += dailyIncome[day] - dailyExpense[day];
        points.push({
          day,
          date: dateStr,
          income: dailyIncome[day],
          expense: dailyExpense[day],
          net: runningNet,
          projected: false,
        });
      } else {
        // Projeção estimada
        runningNet -= avgDailyExpense;
        points.push({
          day,
          date: dateStr,
          income: 0,
          expense: avgDailyExpense,
          net: runningNet,
          projected: true,
        });
      }
    }

    return points;
  }, [transactions, daysInCurrentMonth, currentDay]);

  // Dimensões do SVG
  const width = 680;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const minNet = Math.min(0, ...chartData.map(d => d.net));
  const maxNet = Math.max(1000, ...chartData.map(d => d.net));
  const range = maxNet - minNet || 1;

  const getX = (day: number) => {
    return paddingX + ((day - 1) / (daysInCurrentMonth - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    return height - paddingY - ((val - minNet) / range) * (height - paddingY * 2);
  };

  // Linha realizada até hoje
  const realizedPoints = chartData.filter(d => !d.projected || d.day === currentDay);
  const realizedPath = realizedPoints.reduce((acc, curr, idx) => {
    const x = getX(curr.day);
    const y = getY(curr.net);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Área preenchida sob a curva realizada
  const zeroY = getY(0);
  const firstX = getX(1);
  const lastRealizedX = getX(currentDay);
  const areaPath = realizedPoints.length > 0
    ? `${realizedPath} L ${lastRealizedX} ${zeroY} L ${firstX} ${zeroY} Z`
    : '';

  // Linha projetada pontilhada de hoje até o final do mês
  const projectedPoints = chartData.filter(d => d.projected || d.day === currentDay);
  const projectedPath = projectedPoints.reduce((acc, curr, idx) => {
    const x = getX(curr.day);
    const y = getY(curr.net);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
            <span>Fluxo Acumulado Realizado</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 bg-indigo-400 border-b border-dashed border-indigo-400 inline-block" />
            <span>Projeção Estimada</span>
          </div>
        </div>

        {hoveredPoint && (
          <div className="text-right tabular-nums text-slate-300">
            <span className="text-slate-400">Dia {hoveredPoint.day}: </span>
            <span className={hoveredPoint.net >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {hoveredPoint.net >= 0 ? '+' : ''}R$ {hoveredPoint.net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {hoveredPoint.projected && <span className="text-[10px] text-indigo-400 ml-1.5">(Estimativa)</span>}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="realizedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de grade sutis */}
          <line
            x1={paddingX}
            y1={zeroY}
            x2={width - paddingX}
            y2={zeroY}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Área sombreada */}
          {areaPath && <path d={areaPath} fill="url(#realizedGradient)" />}

          {/* Curva Realizada */}
          {realizedPath && (
            <path
              d={realizedPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Curva Projetada Pontilhada */}
          {projectedPath && (
            <path
              d={projectedPath}
              fill="none"
              stroke="#818CF8"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* Marcador do dia atual */}
          <line
            x1={getX(currentDay)}
            y1={paddingY}
            x2={getX(currentDay)}
            y2={height - paddingY}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Pontos interativos para hover */}
          {chartData.map(pt => (
            <circle
              key={pt.day}
              cx={getX(pt.day)}
              cy={getY(pt.net)}
              r={hoveredPoint?.day === pt.day ? 5 : pt.day === currentDay ? 4 : 2}
              fill={pt.projected ? '#818CF8' : '#10B981'}
              stroke="#0B0F19"
              strokeWidth="1.5"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Eixo X labels */}
          <text x={getX(1)} y={height - 8} fill="#64748B" fontSize="10" textAnchor="start">
            Dia 1
          </text>
          <text x={getX(Math.round(daysInCurrentMonth / 2))} y={height - 8} fill="#64748B" fontSize="10" textAnchor="middle">
            Dia {Math.round(daysInCurrentMonth / 2)}
          </text>
          <text x={getX(daysInCurrentMonth)} y={height - 8} fill="#64748B" fontSize="10" textAnchor="end">
            Dia {daysInCurrentMonth}
          </text>
        </svg>
      </div>
    </div>
  );
};
