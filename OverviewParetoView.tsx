import React, { useMemo, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import type { ExamSummary, ParetoRow, QuestionRecord } from '../types/exam';
import { buildTopicExamHeatmap } from '../utils/examIntelligence';
import { CoverageDonutChart, HeatmapMatrixChart } from './DataVizCharts';
import { ParetoChart } from './ParetoChart';

interface OverviewParetoViewProps {
  questions: QuestionRecord[];
  exams: ExamSummary[];
  paretoRows: ParetoRow[];
  customExamsCount: number;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
  onOpenAddExam: () => void;
  onResetCustomExams: () => void;
}

export const OverviewParetoView: React.FC<OverviewParetoViewProps> = ({
  questions,
  exams,
  paretoRows,
  customExamsCount,
  onInspectQuestions,
  onOpenAddExam,
  onResetCustomExams,
}) => {
  const [donutMode, setDonutMode] = useState<'pareto' | 'vinculo'>('pareto');

  const total = questions.length;
  const core80Rows = paretoRows.filter((r) => r.isNucleo80);
  const core80Count = core80Rows.reduce((s, r) => s + r.frequencia, 0);
  const core80Pct = total > 0 ? (core80Count / total) * 100 : 0;

  const directQuestions = useMemo(
    () => questions.filter((q) => q.vinculo === 'Direto'),
    [questions]
  );
  const correlatoQuestions = useMemo(
    () => questions.filter((q) => q.vinculo !== 'Direto'),
    [questions]
  );
  const directCount = directQuestions.length;
  const directPct = total > 0 ? (directCount / total) * 100 : 0;

  const shortExamColumns = exams.map((e) => e.concursoCurto);

  const heatmapData = useMemo(
    () => buildTopicExamHeatmap(questions, 'grupo', 10),
    [questions]
  );

  const coreQuestions = useMemo(
    () => core80Rows.flatMap((r) => r.questoes),
    [core80Rows]
  );
  const compQuestions = useMemo(
    () => paretoRows.filter((r) => !r.isNucleo80).flatMap((r) => r.questoes),
    [paretoRows]
  );

  const donutSegments =
    donutMode === 'pareto'
      ? [
          {
            id: 'nucleo80',
            label: 'Núcleo Pareto (80/20)',
            value: core80Count,
            color: '#14213D',
            icon: 'cobrado' as const,
          },
          {
            id: 'complementar',
            label: 'Grupos complementares',
            value: total - core80Count,
            color: '#94A3B8',
            icon: 'neutral' as const,
          },
        ]
      : [
          {
            id: 'direto',
            label: 'Vínculo Direto com Edital',
            value: directCount,
            color: '#059669',
            icon: 'cobrado' as const,
          },
          {
            id: 'correlato',
            label: 'Vínculo Correlato',
            value: total - directCount,
            color: '#D97706',
            icon: 'aprofundamento' as const,
          },
        ];

  return (
    <div className="space-y-6">
      {/* Intro & Action Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Análise Pareto 80/20 e Visão Geral da Base
          </h1>
          <p className="ui-page-subtitle">
            Consolidação estatística integrada com rastreabilidade direta até prova, questão e página do PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {customExamsCount > 0 && (
            <button
              type="button"
              onClick={onResetCustomExams}
              className="ui-btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              Restaurar base original (270)
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddExam}
            className="ui-btn-secondary"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
            Simular nova prova / Recalcular Pareto
          </button>
        </div>
      </div>

      {/* 4-column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() =>
            onInspectQuestions(
              'Todas as questões rastreadas',
              `${total} questões integradas em ${exams.length} cadernos`,
              questions
            )
          }
          className="ui-card p-4 text-left transition-colors hover:bg-[var(--bg-surface-hover)] sm:p-5"
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Total de questões rastreadas
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {total}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {exams.length} cadernos distintos integrados
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onInspectQuestions(
              'Núcleo Vital (Pareto 80/20)',
              `${core80Rows.length} grupos · ${core80Count} questões (${core80Pct.toFixed(1)}% da base)`,
              coreQuestions
            )
          }
          className="ui-card p-4 text-left transition-colors hover:bg-[var(--bg-surface-hover)] sm:p-5"
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Núcleo vital (Pareto 80/20)
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-primary)] tabular-nums">
            {core80Rows.length} grupos
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {core80Count} questões ({core80Pct.toFixed(1)}% da base)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onInspectQuestions(
              'Grupos Complementares (20%)',
              `${paretoRows.length - core80Rows.length} grupos · ${total - core80Count} questões`,
              compQuestions
            )
          }
          className="ui-card p-4 text-left transition-colors hover:bg-[var(--bg-surface-hover)] sm:p-5"
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Grupos complementares
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {paretoRows.length - core80Rows.length} grupos
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {total - core80Count} questões ({(100 - core80Pct).toFixed(1)}% da base)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onInspectQuestions(
              'Vínculo Direto com Edital',
              `${directCount} diretas (${directPct.toFixed(1)}%)`,
              directQuestions
            )
          }
          className="ui-card p-4 text-left transition-colors hover:bg-[var(--bg-surface-hover)] sm:p-5"
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Vínculo direto com edital
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--status-success)] tabular-nums">
            {directPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {directCount} diretas · {total - directCount} correlatas
          </div>
        </button>
      </div>

      {/* Interactive Pareto Chart */}
      <ParetoChart
        rows={paretoRows}
        onSelectGroup={(row) =>
          onInspectQuestions(
            `Pareto: ${row.grupo}`,
            `${row.frequencia} questões (${row.percentual.toFixed(1)}% da base) · Classificação: ${row.isNucleo80 ? 'Núcleo 80%' : 'Complementar'}`,
            row.questoes
          )
        }
      />

      {/* Secondary BI Grid: Distribution Donut + Groups × Exams Heatmap */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div
              role="group"
              aria-label="Alternar leitura do gráfico de distribuição"
              className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1"
            >
              <button
                type="button"
                aria-pressed={donutMode === 'pareto'}
                onClick={() => setDonutMode('pareto')}
                className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  donutMode === 'pareto'
                    ? 'bg-[var(--brand-secondary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                Núcleo 80/20
              </button>
              <button
                type="button"
                aria-pressed={donutMode === 'vinculo'}
                onClick={() => setDonutMode('vinculo')}
                className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  donutMode === 'vinculo'
                    ? 'bg-[var(--brand-secondary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                Vínculo Edital
              </button>
            </div>
          </div>

          <CoverageDonutChart
            title={
              donutMode === 'pareto'
                ? 'Concentração do Núcleo Pareto'
                : 'Aderência Direta × Correlata'
            }
            subtitle="Clique em uma fatia para inspecionar o conjunto completo de questões."
            segments={donutSegments}
            centerValue={
              donutMode === 'pareto'
                ? `${core80Pct.toFixed(0)}%`
                : `${directPct.toFixed(0)}%`
            }
            centerLabel={donutMode === 'pareto' ? 'núcleo 80%' : 'vínculo direto'}
            onSelectSegment={(segId) => {
              if (segId === 'nucleo80') {
                onInspectQuestions(
                  'Núcleo Pareto 80/20',
                  `${coreQuestions.length} questões nos grupos prioritários`,
                  coreQuestions
                );
              } else if (segId === 'complementar') {
                onInspectQuestions(
                  'Grupos Complementares (20%)',
                  `${compQuestions.length} questões de menor incidência`,
                  compQuestions
                );
              } else if (segId === 'direto') {
                onInspectQuestions(
                  'Vínculo Direto com o Edital',
                  `${directQuestions.length} questões diretamente previstas no conteúdo`,
                  directQuestions
                );
              } else {
                onInspectQuestions(
                  'Vínculo Correlato ao Edital',
                  `${correlatoQuestions.length} questões correlatas ou interdisciplinares`,
                  correlatoQuestions
                );
              }
            }}
          />
        </div>

        <div className="xl:col-span-7">
          <HeatmapMatrixChart
            title="Mapa de Calor — Grupos de Estudo × Concursos"
            subtitle="Densidade absoluta de questões por grupo consolidado em cada prova. Clique em uma célula para abrir as questões."
            data={heatmapData}
            onSelectCell={(topic, exam, list) =>
              onInspectQuestions(
                `${topic} — ${exam}`,
                `${list.length} questão(ões) registradas nesta prova`,
                list
              )
            }
          />
        </div>
      </div>

      {/* Full Pareto Table */}
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="ui-section-title">
              Tabela Detalhada Pareto 80/20 e Incidência por Concurso
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Clique em qualquer linha ou em &ldquo;Consultar&rdquo; para abrir todas as questões usadas no cálculo.
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-[var(--text-muted)] tabular-nums">
            Base: {total} questões
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Grupo de estudo consolidado</th>
                <th className="px-3 py-3">Classificação</th>
                <th className="px-3 py-3 text-right">Freq.</th>
                <th className="px-3 py-3 text-right">Indiv. %</th>
                <th className="px-3 py-3 text-right">Acum. %</th>
                {shortExamColumns.map((col) => (
                  <th
                    key={col}
                    className="px-2.5 py-3 text-right whitespace-nowrap"
                    title={col}
                  >
                    {col.replace('Petrobras ', 'PET ').replace('Transpetro ', 'TP ')}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paretoRows.map((row) => (
                <tr
                  key={row.grupo}
                  className="transition-colors hover:bg-[var(--bg-surface-hover)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    <button
                      type="button"
                      onClick={() =>
                        onInspectQuestions(
                          `Pareto: ${row.grupo}`,
                          `${row.frequencia} questões usadas no cálculo (${row.percentual.toFixed(1)}%)`,
                          row.questoes
                        )
                      }
                      className="text-left font-medium hover:text-[var(--brand-primary)] hover:underline"
                    >
                      {row.grupo}
                    </button>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={
                        row.isNucleo80
                          ? 'font-semibold text-[var(--brand-primary)]'
                          : 'font-medium text-[var(--text-muted)]'
                      }
                    >
                      {row.isNucleo80 ? 'Núcleo 80%' : 'Complementar'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                    {row.frequencia}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[var(--text-secondary)] tabular-nums">
                    {row.percentual.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-[var(--brand-accent)] tabular-nums">
                    {row.acumulado.toFixed(1)}%
                  </td>
                  {shortExamColumns.map((col) => {
                    const cellCount = row.porConcurso[col] || 0;
                    const cellQuestions =
                      cellCount > 0
                        ? row.questoes.filter((q) => q.concursoCurto === col)
                        : [];
                    return (
                      <td
                        key={`${row.grupo}-${col}`}
                        className="px-2.5 py-3 text-right font-mono text-[var(--text-muted)] tabular-nums"
                      >
                        {cellCount > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onInspectQuestions(
                                `${row.grupo} — ${col}`,
                                `${cellQuestions.length} questão(ões) nesta prova`,
                                cellQuestions
                              )
                            }
                            className="inline-flex min-h-[28px] min-w-[28px] items-center justify-end rounded px-1.5 font-semibold text-[var(--brand-primary-ink)] hover:bg-[var(--brand-primary-soft)] hover:underline"
                          >
                            {cellCount}
                          </button>
                        ) : (
                          <span>0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        onInspectQuestions(
                          `Pareto: ${row.grupo}`,
                          `${row.frequencia} questões usadas no cálculo (${row.percentual.toFixed(1)}%)`,
                          row.questoes
                        )
                      }
                      className="inline-flex min-h-[34px] items-center rounded-md px-2 font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary-ink)]"
                    >
                      Consultar ({row.frequencia})
                    </button>
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
