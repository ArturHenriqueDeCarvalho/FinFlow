import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

interface CategoryDonutChartProps {
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ onSelectCategory }) => {
  const { categorySpending, filterCategoryId, setFilterCategoryId, setActiveTab } = useFinance();
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  const total = categorySpending.reduce((acc, curr) => acc + curr.total, 0);

  // Se não houver despesas registradas
  if (categorySpending.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
        <p>Nenhuma despesa registrada no período atual.</p>
      </div>
    );
  }

  // Geometria do Donut SVG
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const slices = categorySpending.slice(0, 6).map(cat => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += cat.percentage;

    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeCategory = hoveredCategoryId
    ? categorySpending.find(c => c.categoryId === hoveredCategoryId)
    : filterCategoryId !== 'ALL'
    ? categorySpending.find(c => c.categoryId === filterCategoryId)
    : null;

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      setFilterCategoryId(catId === filterCategoryId ? 'ALL' : catId);
      setActiveTab('transactions');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
          />

          {slices.map(slice => {
            const isHovered = hoveredCategoryId === slice.categoryId;
            const isFiltered = filterCategoryId === slice.categoryId;

            return (
              <circle
                key={slice.categoryId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered || isFiltered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredCategoryId(slice.categoryId)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                onClick={() => handleCategoryClick(slice.categoryId)}
              />
            );
          })}
        </svg>

        {/* Informação Central do Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {activeCategory ? activeCategory.categoryName : 'Total Despesas'}
          </span>
          <span className="text-sm font-bold text-white tabular-nums">
            R${' '}
            {(activeCategory ? activeCategory.total : total).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          {activeCategory && (
            <span className="text-[10px] text-emerald-400 font-semibold tabular-nums">
              {activeCategory.percentage.toFixed(1)}% do total
            </span>
          )}
        </div>
      </div>

      {/* Legenda Lateral Interativa */}
      <div className="w-full flex-1 space-y-1.5">
        {categorySpending.slice(0, 5).map(cat => {
          const isSelected = filterCategoryId === cat.categoryId;

          return (
            <button
              key={cat.categoryId}
              onClick={() => handleCategoryClick(cat.categoryId)}
              onMouseEnter={() => setHoveredCategoryId(cat.categoryId)}
              onMouseLeave={() => setHoveredCategoryId(null)}
              className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                isSelected
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.categoryName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums text-right">
                <span className="text-slate-400 text-[11px]">{cat.percentage.toFixed(1)}%</span>
                <span className="font-semibold text-slate-200">
                  R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
