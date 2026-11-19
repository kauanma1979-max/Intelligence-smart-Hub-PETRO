import React, { useState } from 'react';
import type { ParetoRow } from '../types/exam';

interface ParetoChartProps {
  rows: ParetoRow[];
  onSelectGroup: (row: ParetoRow) => void;
  title?: string;
  subtitle?: string;
}

export const ParetoChart: React.FC<ParetoChartProps> = ({
  rows,
  onSelectGroup,
  title = 'Curva Pareto 80/20 por Grupo Consolidado',
  subtitle = 'Clique em qualquer barra para inspecionar as questões exatas que compõem o índice.',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Nenhuma questão disponível para calcular o gráfico de Pareto.
      </div>
    );
  }

  const width = 920;
  const height = 356;
  const padLeft = 112;
  const padRight = 56;
  const padTop = 28;
  const padBottom = 98;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxFreq = Math.max(...rows.map((r) => r.frequencia), 1);
  const yMax = Math.ceil((maxFreq * 1.15) / 5) * 5 || maxFreq + 2;

  const slotW = plotW / rows.length;
  const barW = Math.min(54, Math.max(22, slotW * 0.6));

  const yFreq = (v: number) => padTop + plotH - (v / yMax) * plotH;
  const yPct = (p: number) => padTop + plotH - (p / 100) * plotH;
  const xCenter = (i: number) => padLeft + slotW * i + slotW / 2;

  const linePoints = rows
    .map((r, i) => `${xCenter(i).toFixed(1)},${yPct(r.acumulado).toFixed(1)}`)
    .join(' ');

  const y80 = yPct(80);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));
  const pctTicks = [0, 20, 40, 60, 80, 100];

  const hoveredRow = hoveredIdx !== null ? rows[hoveredIdx] : null;

  return (
    <section
      aria-label={title}
      className="ui-card p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#2563EB]" aria-hidden="true" />
            Núcleo vital (até 80%)
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
            Complementar (&gt; 80%)
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[#D97706]" aria-hidden="true" />
            % Acumulado
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[660px] select-none"
          role="img"
          aria-label="Gráfico de Pareto mostrando frequência por grupo e curva acumulada de 80%"
        >
          {/* Horizontal gridlines */}
          {yTicks.map((tick) => {
            const y = yFreq(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#526077] font-mono text-[11px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Right Y axis labels (%) */}
          {pctTicks.map((pct) => {
            const y = yPct(pct);
            return (
              <text
                key={`ptick-${pct}`}
                x={width - padRight + 8}
                y={y + 4}
                textAnchor="start"
                className={`font-mono text-[11px] ${
                  pct === 80 ? 'fill-[#B45309] font-semibold' : 'fill-[#526077]'
                }`}
              >
                {pct}%
              </text>
            );
          })}

          {/* 80% threshold dashed line */}
          <line
            x1={padLeft}
            y1={y80}
            x2={width - padRight}
            y2={y80}
            stroke="#D97706"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <text
            x={width - padRight - 6}
            y={y80 + 14}
            textAnchor="end"
            className="fill-[#B45309] font-mono text-[11px] font-semibold"
          >
            Corte 80%
          </text>

          {/* Bars */}
          {rows.map((row, idx) => {
            const cx = xCenter(idx);
            const barTop = yFreq(row.frequencia);
            const barH = Math.max(2, padTop + plotH - barTop);
            const isHovered = hoveredIdx === idx;
            const fill = row.isNucleo80
              ? isHovered
                ? '#14213D'
                : idx === 0
                  ? '#14213D'
                  : '#2563EB'
              : isHovered
                ? '#64748B'
                : '#CBD5E1';

            const shortLabel =
              row.grupo.length > 22 ? `${row.grupo.slice(0, 20)}…` : row.grupo;

            return (
              <g
                key={row.grupo}
                className="cursor-pointer"
                onClick={() => onSelectGroup(row)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                role="button"
                tabIndex={0}
                aria-label={`${row.grupo}: ${row.frequencia} questões (${row.percentual.toFixed(1)}%, acumulado ${row.acumulado.toFixed(1)}%). Clique para consultar questões.`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectGroup(row);
                  }
                }}
              >
                <rect
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={fill}
                  className="transition-colors duration-150"
                />
                <text
                  x={cx}
                  y={barTop - 6}
                  textAnchor="middle"
                  className="fill-[#172033] font-mono text-[11px] font-semibold"
                >
                  {row.frequencia}
                </text>
                <text
                  x={cx}
                  y={padTop + plotH + 16}
                  textAnchor="end"
                  transform={`rotate(-26, ${cx}, ${padTop + plotH + 16})`}
                  className="fill-[#334155] text-[11px] font-medium"
                >
                  {shortLabel}
                </text>
              </g>
            );
          })}

          {/* Cumulative line */}
          <polyline
            fill="none"
            stroke="#D97706"
            strokeWidth={2.25}
            points={linePoints}
            pointerEvents="none"
          />

          {/* Cumulative points */}
          {rows.map((row, idx) => (
            <circle
              key={`pt-${row.grupo}`}
              cx={xCenter(idx)}
              cy={yPct(row.acumulado)}
              r={hoveredIdx === idx ? 5 : 3.5}
              fill="#ffffff"
              stroke="#D97706"
              strokeWidth={2}
              pointerEvents="none"
            />
          ))}
        </svg>

        {hoveredRow && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{hoveredRow.grupo}</span>
            <span className="font-mono tabular-nums text-[var(--text-muted)]">
              {hoveredRow.frequencia} questões · {hoveredRow.percentual.toFixed(1)}% individual ·{' '}
              {hoveredRow.acumulado.toFixed(1)}% acumulado ·{' '}
              {hoveredRow.isNucleo80 ? 'Núcleo 80%' : 'Complementar'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
