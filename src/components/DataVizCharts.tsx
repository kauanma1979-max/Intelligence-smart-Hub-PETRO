import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Info,
} from 'lucide-react';
import type { HeatmapMatrixData, QuestionRecord } from '../types/exam';

// ============================================================================
// Shared Empty / Insufficient Data Guard
// ============================================================================
export const ChartEmptyNotice: React.FC<{
  title: string;
  message: string;
}> = ({ title, message }) => (
  <div className="flex min-h-[210px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-subtle)]/40 p-6 text-center">
    <Info className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
    <div className="mt-2 text-xs font-semibold text-[var(--text-primary)]">{title}</div>
    <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">{message}</p>
  </div>
);

// ============================================================================
// A) Donut Distribution Chart
// ============================================================================
export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  description?: string;
  icon?: 'cobrado' | 'parcial' | 'nao_identificado' | 'aprofundamento' | 'neutral';
}

interface CoverageDonutChartProps {
  title: string;
  subtitle?: string;
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  activeSegmentId?: string | null;
  onSelectSegment?: (segmentId: string) => void;
}

const renderStatusIcon = (icon?: DonutSegment['icon'], color?: string) => {
  const style = color ? { color } : undefined;
  if (icon === 'cobrado') {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={style} aria-hidden="true" />;
  }
  if (icon === 'parcial') {
    return <CircleDot className="h-3.5 w-3.5 shrink-0" style={style} aria-hidden="true" />;
  }
  if (icon === 'nao_identificado') {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0" style={style} aria-hidden="true" />;
  }
  if (icon === 'aprofundamento') {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={style} aria-hidden="true" />;
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
      style={{ backgroundColor: color || '#2563EB' }}
      aria-hidden="true"
    />
  );
};

export const CoverageDonutChart: React.FC<CoverageDonutChartProps> = ({
  title,
  subtitle,
  segments,
  centerValue,
  centerLabel,
  activeSegmentId,
  onSelectSegment,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments]
  );

  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    if (total === 0) return [];
    let accumulatedPct = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const pct = s.value / total;
        const dashLength = pct * circumference;
        const dashOffset = -accumulatedPct * circumference;
        accumulatedPct += pct;
        return {
          ...s,
          pct: pct * 100,
          dashLength,
          dashOffset,
        };
      });
  }, [segments, total, circumference]);

  const focusedSegment =
    arcs.find((a) => a.id === hoveredId) ||
    arcs.find((a) => a.id === activeSegmentId) ||
    null;

  return (
    <section className="ui-card flex h-full flex-col p-5">
      <div className="border-b border-[var(--border-subtle)] pb-3">
        <h2 className="ui-section-title">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>

      {total === 0 ? (
        <div className="mt-4 flex-1">
          <ChartEmptyNotice
            title="Sem dados suficientes para distribuição"
            message="Selecione um edital ou adicione itens para visualizar a distribuição proporcional."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="relative flex shrink-0 items-center justify-center">
            <svg
              width={176}
              height={176}
              viewBox="0 0 176 176"
              role="img"
              aria-label={`${title}: ${centerValue} ${centerLabel}`}
              className="select-none"
            >
              <circle
                cx={88}
                cy={88}
                r={radius}
                fill="none"
                stroke="#EEF2F8"
                strokeWidth={strokeWidth}
              />
              <g transform="rotate(-90 88 88)">
                {arcs.map((arc) => {
                  const isHighlighted =
                    hoveredId === arc.id || activeSegmentId === arc.id;
                  const isDimmed =
                    (hoveredId !== null && hoveredId !== arc.id) ||
                    (hoveredId === null &&
                      activeSegmentId &&
                      activeSegmentId !== 'all' &&
                      activeSegmentId !== arc.id);
                  return (
                    <circle
                      key={arc.id}
                      cx={88}
                      cy={88}
                      r={radius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isHighlighted ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${Math.max(0, arc.dashLength - 1.5)} ${circumference}`}
                      strokeDashoffset={arc.dashOffset}
                      opacity={isDimmed ? 0.35 : 1}
                      className={
                        onSelectSegment
                          ? 'cursor-pointer transition-all duration-150'
                          : 'transition-all duration-150'
                      }
                      onMouseEnter={() => setHoveredId(arc.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onSelectSegment?.(arc.id)}
                    />
                  );
                })}
              </g>
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {focusedSegment
                  ? `${focusedSegment.pct.toFixed(0)}%`
                  : centerValue}
              </span>
              <span className="max-w-[96px] truncate text-[11px] font-medium text-[var(--text-muted)]">
                {focusedSegment ? focusedSegment.label : centerLabel}
              </span>
            </div>
          </div>

          <div className="w-full min-w-0 flex-1 space-y-2">
            {segments.map((seg) => {
              const pct = total > 0 ? (seg.value / total) * 100 : 0;
              const isSelected = activeSegmentId === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  disabled={!onSelectSegment}
                  onMouseEnter={() => setHoveredId(seg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectSegment?.(seg.id)}
                  className={`flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/70'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]'
                  } disabled:cursor-default`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {renderStatusIcon(seg.icon, seg.color)}
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {seg.label}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">
                    <strong className="text-[var(--text-primary)]">{seg.value}</strong>{' '}
                    <span className="text-[var(--text-muted)]">({pct.toFixed(0)}%)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================================================
// B) Horizontal Frequency Bar Chart
// ============================================================================
export interface FrequencyBarDatum {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  pct?: number;
  color?: string;
  questions?: QuestionRecord[];
}

interface HorizontalFrequencyBarChartProps {
  title: string;
  subtitle?: string;
  items: FrequencyBarDatum[];
  maxItems?: number;
  valueUnit?: string;
  onSelectBar?: (item: FrequencyBarDatum) => void;
  emptyMessage?: string;
}

export const HorizontalFrequencyBarChart: React.FC<
  HorizontalFrequencyBarChartProps
> = ({
  title,
  subtitle,
  items,
  maxItems = 10,
  valueUnit = 'q',
  onSelectBar,
  emptyMessage = 'Nenhuma ocorrência registrada para os filtros atuais.',
}) => {
  const visible = useMemo(() => items.slice(0, maxItems), [items, maxItems]);
  const maxVal = useMemo(
    () => Math.max(...visible.map((i) => i.value), 1),
    [visible]
  );

  return (
    <section className="ui-card flex h-full flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        {items.length > 0 && (
          <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            Top {visible.length} de {items.length}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex-1">
          <ChartEmptyNotice
            title="Sem dados para exibir barras"
            message={emptyMessage}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {visible.map((item, idx) => {
            const widthPct = item.value > 0 ? Math.max(4, (item.value / maxVal) * 100) : 0;
            const barColor =
              item.color ||
              (idx === 0
                ? '#14213D'
                : idx < 3
                  ? '#2563EB'
                  : idx < 6
                    ? '#4338CA'
                    : '#06B6D4');
            return (
              <button
                key={item.id}
                type="button"
                disabled={!onSelectBar}
                onClick={() => onSelectBar?.(item)}
                className="group block w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] disabled:cursor-default"
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                    <span className="mr-1.5 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    {item.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                    {item.value}
                    {valueUnit}
                    {item.pct !== undefined && (
                      <span className="ml-1 font-normal text-[var(--text-muted)]">
                        ({item.pct.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-sm bg-[var(--bg-surface-subtle)]">
                  <div
                    className="h-full rounded-sm transition-all duration-200"
                    style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                  />
                </div>
                {item.sublabel && (
                  <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                    {item.sublabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// C) Grouped Comparison Bar Chart
// ============================================================================
export interface ComparisonSeriesMeta {
  key: string;
  label: string;
  color: string;
}

export interface ComparisonBarCategory {
  id: string;
  label: string;
  values: Record<string, number>;
  questionsBySeries?: Record<string, QuestionRecord[]>;
}

interface GroupedComparisonBarChartProps {
  title: string;
  subtitle?: string;
  series: ComparisonSeriesMeta[];
  categories: ComparisonBarCategory[];
  unitSuffix?: string;
  onSelectCell?: (
    category: ComparisonBarCategory,
    seriesKey: string,
    seriesLabel: string
  ) => void;
}

export const GroupedComparisonBarChart: React.FC<
  GroupedComparisonBarChartProps
> = ({
  title,
  subtitle,
  series,
  categories,
  unitSuffix = '',
  onSelectCell,
}) => {
  const [hovered, setHovered] = useState<{
    catLabel: string;
    seriesLabel: string;
    value: number;
  } | null>(null);

  const maxVal = useMemo(() => {
    let max = 1;
    for (const c of categories) {
      for (const s of series) {
        const v = c.values[s.key] || 0;
        if (v > max) max = v;
      }
    }
    return max;
  }, [categories, series]);

  if (categories.length === 0 || series.length === 0) {
    return (
      <section className="ui-card p-5">
        <h2 className="ui-section-title">{title}</h2>
        <div className="mt-4">
          <ChartEmptyNotice
            title="Comparação indisponível"
            message="São necessárias pelo menos duas séries comparáveis com registros reais."
          />
        </div>
      </section>
    );
  }

  const width = Math.max(720, categories.length * 105 + 110);
  const height = 285;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 74;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const yMax = Math.ceil(maxVal * 1.15) || 5;
  const slotW = plotW / categories.length;
  const groupW = Math.min(72, slotW * 0.72);
  const barW = Math.max(10, groupW / series.length - 3);

  return (
    <section className="ui-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-xs"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[580px] select-none"
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padTop + plotH * (1 - t);
            const val = yMax * t;
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#526077] font-mono text-[11px]"
                >
                  {unitSuffix === '%' ? `${val.toFixed(0)}%` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {categories.map((cat, cIdx) => {
            const cx = padLeft + slotW * cIdx + slotW / 2;
            const startX = cx - (series.length * (barW + 3)) / 2;
            const shortLabel =
              cat.label.length > 20 ? `${cat.label.slice(0, 18)}…` : cat.label;

            return (
              <g key={cat.id}>
                {series.map((s, sIdx) => {
                  const val = cat.values[s.key] || 0;
                  const barH = val > 0 ? Math.max(3, (val / yMax) * plotH) : 0;
                  const x = startX + sIdx * (barW + 3);
                  const y = padTop + plotH - barH;
                  return (
                    <g key={s.key}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={3}
                        fill={s.color}
                        className={onSelectCell ? 'cursor-pointer hover:opacity-85' : ''}
                        onMouseEnter={() =>
                          setHovered({
                            catLabel: cat.label,
                            seriesLabel: s.label,
                            value: val,
                          })
                        }
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onSelectCell?.(cat, s.key, s.label)}
                      />
                    </g>
                  );
                })}
                <text
                  x={cx}
                  y={padTop + plotH + 16}
                  textAnchor="end"
                  transform={`rotate(-20, ${cx}, ${padTop + plotH + 16})`}
                  className="fill-[#334155] text-[11px] font-medium"
                >
                  {shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hovered && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">
            {hovered.catLabel} · {hovered.seriesLabel}
          </span>
          <span className="font-mono font-bold text-[var(--brand-primary-ink)] tabular-nums">
            {unitSuffix === '%'
              ? `${hovered.value.toFixed(1)}%`
              : `${hovered.value}${unitSuffix}`}
          </span>
        </div>
      )}
    </section>
  );
};

// ============================================================================
// D) Multi-Series Line Evolution Chart
// ============================================================================
export interface MultiLineSeries {
  id: string;
  label: string;
  color: string;
  points: {
    xLabel: string;
    subLabel?: string;
    value: number;
    count: number;
    questions: QuestionRecord[];
  }[];
}

interface MultiLineEvolutionChartProps {
  title: string;
  subtitle?: string;
  series: MultiLineSeries[];
  unitMode: 'pct' | 'count';
  onSelectPoint?: (
    seriesLabel: string,
    xLabel: string,
    questions: QuestionRecord[],
    value: number,
    count: number
  ) => void;
}

export const MultiLineEvolutionChart: React.FC<MultiLineEvolutionChartProps> = ({
  title,
  subtitle,
  series,
  unitMode,
  onSelectPoint,
}) => {
  const [hoveredPt, setHoveredPt] = useState<{
    seriesLabel: string;
    xLabel: string;
    value: number;
    count: number;
  } | null>(null);

  const xLabels = series[0]?.points.map((p) => p) || [];

  if (series.length === 0 || xLabels.length < 2) {
    return (
      <section className="ui-card p-5">
        <h2 className="ui-section-title">{title}</h2>
        <div className="mt-4">
          <ChartEmptyNotice
            title="Série temporal insuficiente"
            message="São necessárias pelo menos 2 provas cronológicas comparáveis para traçar evolução histórica."
          />
        </div>
      </section>
    );
  }

  const width = 880;
  const height = 270;
  const padLeft = 58;
  const padRight = 36;
  const padTop = 26;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const innerInset = 32;

  const rawMax = Math.max(
    ...series.flatMap((s) => s.points.map((p) => p.value)),
    1
  );
  const yMax =
    unitMode === 'pct'
      ? Math.ceil(rawMax / 5) * 5 + 5
      : Math.ceil(rawMax * 1.2);

  const getX = (idx: number) =>
    xLabels.length === 1
      ? padLeft + plotW / 2
      : padLeft + innerInset + (idx / (xLabels.length - 1)) * (plotW - innerInset * 2);

  const getY = (val: number) => padTop + plotH - (val / yMax) * plotH;

  return (
    <section className="ui-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="max-w-[190px] truncate">{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[580px] select-none"
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padTop + plotH * (1 - t);
            const val = yMax * t;
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#526077] font-mono text-[11px]"
                >
                  {unitMode === 'pct' ? `${val.toFixed(0)}%` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {xLabels.map((pt, idx) => (
            <g key={pt.xLabel}>
              <text
                x={getX(idx)}
                y={height - 22}
                textAnchor="middle"
                className="fill-[#172033] text-[11px] font-semibold"
              >
                {pt.xLabel}
              </text>
              {pt.subLabel && (
                <text
                  x={getX(idx)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[#526077] font-mono text-[10px]"
                >
                  {pt.subLabel}
                </text>
              )}
            </g>
          ))}

          {series.map((s) => {
            const pts = s.points
              .map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.value).toFixed(1)}`)
              .join(' ');
            return (
              <g key={s.id}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  points={pts}
                />
                {s.points.map((p, idx) => (
                  <circle
                    key={`${s.id}-${p.xLabel}`}
                    cx={getX(idx)}
                    cy={getY(p.value)}
                    r={5}
                    fill={p.count > 0 ? s.color : '#CBD5E1'}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className={
                      p.questions.length > 0 && onSelectPoint
                        ? 'cursor-pointer'
                        : ''
                    }
                    onMouseEnter={() =>
                      setHoveredPt({
                        seriesLabel: s.label,
                        xLabel: p.xLabel,
                        value: p.value,
                        count: p.count,
                      })
                    }
                    onMouseLeave={() => setHoveredPt(null)}
                    onClick={() =>
                      p.questions.length > 0 &&
                      onSelectPoint?.(
                        s.label,
                        p.xLabel,
                        p.questions,
                        p.value,
                        p.count
                      )
                    }
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredPt && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            {hoveredPt.seriesLabel} · {hoveredPt.xLabel}
          </span>
          <span className="font-mono font-semibold text-[var(--brand-primary-ink)] tabular-nums">
            {hoveredPt.count} questões (
            {unitMode === 'pct'
              ? `${hoveredPt.value.toFixed(1)}% da prova`
              : `${hoveredPt.value}q`}
            )
          </span>
        </div>
      )}
    </section>
  );
};

// ============================================================================
// E) Heatmap Matrix (Assuntos × Provas)
// ============================================================================
interface HeatmapMatrixChartProps {
  title: string;
  subtitle?: string;
  data: HeatmapMatrixData;
  onSelectCell?: (
    topic: string,
    exam: string,
    questions: QuestionRecord[]
  ) => void;
}

export const HeatmapMatrixChart: React.FC<HeatmapMatrixChartProps> = ({
  title,
  subtitle,
  data,
  onSelectCell,
}) => {
  const getCellStyle = (count: number, max: number) => {
    if (count === 0 || max === 0) {
      return {
        bg: '#F8FAFC',
        text: '#94A3B8',
        border: '#E2E8F0',
      };
    }
    const ratio = count / max;
    if (ratio >= 0.75) {
      return { bg: '#14213D', text: '#FFFFFF', border: '#14213D' };
    }
    if (ratio >= 0.5) {
      return { bg: '#4338CA', text: '#FFFFFF', border: '#4338CA' };
    }
    if (ratio >= 0.25) {
      return { bg: '#93C5FD', text: '#172033', border: '#60A5FA' };
    }
    return { bg: '#E0E7FF', text: '#1E3A8A', border: '#C7D2FE' };
  };

  return (
    <section className="ui-card flex h-full flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span>Menor</span>
          <span className="h-3 w-3 rounded-xs border border-[#E2E8F0] bg-[#F8FAFC]" />
          <span className="h-3 w-3 rounded-xs bg-[#E0E7FF]" />
          <span className="h-3 w-3 rounded-xs bg-[#93C5FD]" />
          <span className="h-3 w-3 rounded-xs bg-[#4338CA]" />
          <span className="h-3 w-3 rounded-xs bg-[#14213D]" />
          <span>Maior</span>
        </div>
      </div>

      {data.rows.length === 0 || data.exams.length === 0 ? (
        <div className="mt-4">
          <ChartEmptyNotice
            title="Matriz de calor vazia"
            message="Não há tópicos cruzados suficientes com os filtros atuais."
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
                <th className="py-2 pr-3">Assunto</th>
                {data.exams.map((ex) => (
                  <th key={ex} className="px-1.5 py-2 text-center whitespace-nowrap">
                    {ex.replace('Petrobras ', 'PET ').replace('Transpetro ', 'TP ')}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.rows.map((row) => (
                <tr key={row.topic}>
                  <td className="max-w-[240px] truncate py-2 pr-3 font-medium text-[var(--text-primary)]" title={row.topic}>
                    {row.topic}
                  </td>
                  {row.cells.map((cell) => {
                    const st = getCellStyle(cell.count, data.maxCellCount);
                    return (
                      <td key={`${row.topic}-${cell.exam}`} className="p-1 text-center">
                        <button
                          type="button"
                          disabled={cell.count === 0 || !onSelectCell}
                          onClick={() =>
                            onSelectCell?.(row.topic, cell.exam, cell.questions)
                          }
                          title={`${row.topic} em ${cell.exam}: ${cell.count} questão(ões) (${cell.pct.toFixed(1)}%)`}
                          style={{
                            backgroundColor: st.bg,
                            color: st.text,
                            borderColor: st.border,
                          }}
                          className="inline-flex h-8 w-full min-w-[44px] items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums transition-transform hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100"
                        >
                          {cell.count}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-2 text-right font-mono font-bold text-[var(--text-primary)] tabular-nums">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
