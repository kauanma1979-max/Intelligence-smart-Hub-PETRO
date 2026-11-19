import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { HistoricalTopicEvolution, QuestionRecord } from '../types/exam';
import { buildHistoricalEvolution } from '../utils/examIntelligence';
import { MultiLineEvolutionChart, type MultiLineSeries } from './DataVizCharts';

interface HistoricalEvolutionViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const MULTI_COLORS = ['#14213D', '#2563EB', '#4338CA', '#06B6D4'];

export const HistoricalEvolutionView: React.FC<HistoricalEvolutionViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const [dimension, setDimension] = useState<'grupo' | 'edital'>('grupo');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [metricMode, setMetricMode] = useState<'pct' | 'count'>('pct');
  const [chartMode, setChartMode] = useState<'single' | 'multi'>('multi');

  const evolutionRows = useMemo(
    () => buildHistoricalEvolution(questions, dimension),
    [questions, dimension]
  );

  const activeRow: HistoricalTopicEvolution | undefined = useMemo(() => {
    if (evolutionRows.length === 0) return undefined;
    return (
      evolutionRows.find((r) => r.tema === selectedTopic) ||
      evolutionRows.find((r) => r.tema.includes('Termodinâmica')) ||
      evolutionRows[0]
    );
  }, [evolutionRows, selectedTopic]);

  const rising = useMemo(
    () =>
      [...evolutionRows]
        .filter((r) => r.deltaPercentual > 0.5)
        .sort((a, b) => b.deltaPercentual - a.deltaPercentual)
        .slice(0, 5),
    [evolutionRows]
  );

  const falling = useMemo(
    () =>
      [...evolutionRows]
        .filter((r) => r.deltaPercentual < -0.5)
        .sort((a, b) => a.deltaPercentual - b.deltaPercentual)
        .slice(0, 5),
    [evolutionRows]
  );

  // SVG Chronological Chart geometry
  const width = 900;
  const height = 286;
  const padLeft = 72;
  const padRight = 56;
  const padTop = 38;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const innerInset = 36;

  const pontos = activeRow?.pontos || [];
  const rawMax = Math.max(
    ...pontos.map((p) => (metricMode === 'pct' ? p.percentual : p.frequencia)),
    1
  );
  const yMax = metricMode === 'pct' ? Math.ceil(rawMax / 5) * 5 + 5 : Math.ceil(rawMax * 1.25);

  const coords = pontos.map((p, idx) => {
    const x =
      pontos.length === 1
        ? padLeft + plotW / 2
        : padLeft + innerInset + (idx / (pontos.length - 1)) * (plotW - innerInset * 2);
    const val = metricMode === 'pct' ? p.percentual : p.frequencia;
    const y = padTop + plotH - (val / yMax) * plotH;
    return { x, y, val, point: p };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const multiSeries = useMemo<MultiLineSeries[]>(() => {
    const topRows = [...evolutionRows]
      .sort((a, b) => b.totalGeral - a.totalGeral)
      .slice(0, 4);
    return topRows.map((row, idx) => ({
      id: row.tema,
      label: row.tema,
      color: MULTI_COLORS[idx % MULTI_COLORS.length],
      points: row.pontos.map((pt) => ({
        xLabel: pt.concursoCurto,
        subLabel: `${pt.banca} · ${pt.totalProva}q`,
        value: metricMode === 'pct' ? pt.percentual : pt.frequencia,
        count: pt.frequencia,
        questions: pt.questoes,
      })),
    }));
  }, [evolutionRows, metricMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Evolução Histórica das Cobranças
          </h1>
          <p className="ui-page-subtitle">
            Acompanhe como o peso de cada disciplina mudou de Transpetro 2018 até ANSA 2026 e identifique temas em alta ou retração.
          </p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Nível de agregação histórica"
        >
          <button
            type="button"
            onClick={() => {
              setDimension('grupo');
              setSelectedTopic('');
            }}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              dimension === 'grupo'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por grupo consolidado
          </button>
          <button
            type="button"
            onClick={() => {
              setDimension('edital');
              setSelectedTopic('');
            }}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              dimension === 'edital'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por tópico do edital
          </button>
        </div>
      </div>

      {/* Topic Selector + Interactive Chronological Chart */}
      <section className="ui-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="min-w-0 w-full sm:min-w-[240px] sm:flex-1">
            <label
              htmlFor="evo-topic-select"
              className="block text-xs font-medium text-[var(--text-secondary)]"
            >
              Assunto em foco no gráfico cronológico
            </label>
            <select
              id="evo-topic-select"
              value={activeRow?.tema || ''}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="ui-select mt-1 max-w-md text-xs font-medium"
            >
              {evolutionRows.map((row) => (
                <option key={row.tema} value={row.tema}>
                  {row.tema} ({row.totalGeral} questões)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
              role="group"
              aria-label="Modo de visualização do gráfico"
            >
              <button
                type="button"
                onClick={() => setChartMode('multi')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  chartMode === 'multi'
                    ? 'bg-[var(--brand-secondary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Comparativo Top 4
              </button>
              <button
                type="button"
                onClick={() => setChartMode('single')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  chartMode === 'single'
                    ? 'bg-[var(--brand-secondary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Assunto isolado
              </button>
            </div>

            <div
              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
              role="group"
              aria-label="Métrica do gráfico cronológico"
            >
              <button
                type="button"
                onClick={() => setMetricMode('pct')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  metricMode === 'pct'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                % da prova
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('count')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  metricMode === 'count'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Nº de questões
              </button>
            </div>
          </div>
        </div>

        {chartMode === 'multi' && (
          <div className="mt-4">
            <MultiLineEvolutionChart
              title="Evolução Simultânea — Top 4 Temas na Série Histórica"
              subtitle="Clique em qualquer vértice colorido para consultar as questões daquele tema na prova correspondente."
              series={multiSeries}
              unitMode={metricMode}
              onSelectPoint={(seriesLabel, xLabel, list, val, count) =>
                onInspectQuestions(
                  `${seriesLabel} — ${xLabel}`,
                  `${count} questão(ões) (${metricMode === 'pct' ? `${val.toFixed(1)}% da prova` : `${count} questões`})`,
                  list
                )
              }
            />
          </div>
        )}

        {chartMode === 'single' && activeRow && (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-semibold text-slate-900">{activeRow.tema}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeRow.totalGeral} questões no período
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    activeRow.deltaPercentual > 0.5
                      ? 'text-emerald-700'
                      : activeRow.deltaPercentual < -0.5
                        ? 'text-amber-700'
                        : 'text-slate-600'
                  }`}
                >
                  Tendência recente: {activeRow.deltaPercentual >= 0 ? '+' : ''}
                  {activeRow.deltaPercentual.toFixed(1)} p.p.
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Clique em qualquer ponto do gráfico para abrir as questões daquela prova.
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-auto w-full min-w-[600px] select-none"
                role="img"
                aria-label={`Evolução histórica de ${activeRow.tema}`}
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
                        stroke="#e2e8f0"
                        strokeDasharray={t === 0 ? undefined : '3 3'}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[11px]"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {metricMode === 'pct' ? `${val.toFixed(0)}%` : Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {coords.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {coords.map(({ x, y, point }) => (
                  <g
                    key={point.prova}
                    className="cursor-pointer"
                    onClick={() =>
                      point.questoes.length > 0 &&
                      onInspectQuestions(
                        `${activeRow.tema} — ${point.concursoCurto}`,
                        `${point.frequencia} questões (${point.percentual.toFixed(1)}% de ${point.totalProva}q)`,
                        point.questoes
                      )
                    }
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={6}
                      fill={point.frequencia > 0 ? '#14213D' : '#CBD5E1'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      className="fill-slate-900 text-[11px] font-semibold"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {point.frequencia}q ({point.percentual.toFixed(1)}%)
                    </text>
                    <text
                      x={x}
                      y={height - 22}
                      textAnchor="middle"
                      className="fill-slate-700 text-[11px] font-medium"
                    >
                      {point.concursoCurto}
                    </text>
                    <text
                      x={x}
                      y={height - 7}
                      textAnchor="middle"
                      className="fill-slate-500 text-[11px]"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {point.banca} · {point.totalProva}q
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </section>

      {/* Diagnostic Answer: Gained vs Lost Space */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="ui-card p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowUpRight className="h-4 w-4 text-emerald-700" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Assuntos que ganharam importância
              </h2>
              <p className="text-xs text-slate-500">
                Maior crescimento médio de participação nas provas recentes vs início da série.
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {rising.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">
                Nenhum tema apresentou alta significativa acima de +0.5 p.p.
              </p>
            ) : (
              rising.map((r) => (
                <button
                  key={r.tema}
                  type="button"
                  onClick={() => setSelectedTopic(r.tema)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="truncate text-xs font-medium text-slate-900">
                    {r.tema}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    +{r.deltaPercentual.toFixed(1)} p.p. ({r.totalGeral}q)
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="ui-card p-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <ArrowDownRight className="h-4 w-4 text-[var(--status-warning)]" />
            <div>
              <h2 className="ui-section-title">
                Assuntos que perderam espaço relativo
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Redução percentual comparando provas recentes (2023.2–2026) com iniciais (2018–2023.1).
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-[var(--border-subtle)]">
            {falling.length === 0 ? (
              <p className="py-4 text-xs text-[var(--text-muted)]">
                Nenhum tema apresentou redução acima de 0.5 p.p.
              </p>
            ) : (
              falling.map((r) => (
                <button
                  key={r.tema}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(r.tema);
                    setChartMode('single');
                  }}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                >
                  <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {r.tema}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold text-[var(--status-warning)] tabular-nums">
                    {r.deltaPercentual.toFixed(1)} p.p. ({r.totalGeral}q)
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Full Chronological Matrix */}
      <section className="ui-card overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3.5">
          <h2 className="ui-section-title">
            Série Histórica Completa por Concurso (2018 → 2026)
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Clique em qualquer célula para abrir as questões daquela prova ou no título da linha para atualizar o gráfico acima.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Assunto</th>
                {(evolutionRows[0]?.pontos || []).map((pt) => (
                  <th key={pt.prova} className="px-3 py-3 text-right whitespace-nowrap">
                    {pt.concursoCurto}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evolutionRows.map((row) => (
                <tr key={row.tema} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTopic(row.tema)}
                      className={`text-left font-medium hover:text-blue-700 ${
                        activeRow?.tema === row.tema
                          ? 'font-semibold text-blue-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {row.tema}
                    </button>
                  </td>
                  {row.pontos.map((pt) => (
                    <td key={pt.prova} className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {pt.frequencia > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onInspectQuestions(
                              `${row.tema} — ${pt.concursoCurto}`,
                              `${pt.frequencia} questões (${pt.percentual.toFixed(1)}%)`,
                              pt.questoes
                            )
                          }
                          className="rounded px-1.5 py-0.5 text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {pt.frequencia}{' '}
                          <span className="text-[10px] text-slate-400">
                            ({pt.percentual.toFixed(0)}%)
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {row.totalGeral}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold ${
                        row.tendencia === 'alta'
                          ? 'text-emerald-700'
                          : row.tendencia === 'queda'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {row.tendencia === 'alta' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : row.tendencia === 'queda' ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {row.deltaPercentual >= 0 ? '+' : ''}
                      {row.deltaPercentual.toFixed(1)} p.p.
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
