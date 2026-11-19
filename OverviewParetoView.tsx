import React from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import type { ExamSummary, ParetoRow, QuestionRecord } from '../types/exam';
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
  const total = questions.length;
  const core80Rows = paretoRows.filter((r) => r.isNucleo80);
  const core80Count = core80Rows.reduce((s, r) => s + r.frequencia, 0);
  const core80Pct = total > 0 ? (core80Count / total) * 100 : 0;

  const directCount = questions.filter((q) => q.vinculo === 'Direto').length;
  const directPct = total > 0 ? (directCount / total) * 100 : 0;

  const shortExamColumns = exams.map((e) => e.concursoCurto);

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
        <div className="ui-card p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Total de questões rastreadas
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {total}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {exams.length} cadernos distintos integrados
          </div>
        </div>

        <div className="ui-card p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Núcleo vital (Pareto 80/20)
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-primary)] tabular-nums">
            {core80Rows.length} grupos
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {core80Count} questões ({core80Pct.toFixed(1)}% da base)
          </div>
        </div>

        <div className="ui-card p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Grupos complementares
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {paretoRows.length - core80Rows.length} grupos
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {total - core80Count} questões ({(100 - core80Pct).toFixed(1)}% da base)
          </div>
        </div>

        <div className="ui-card p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Vínculo direto com edital
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--status-success)] tabular-nums">
            {directPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {directCount} diretas · {total - directCount} correlatas
          </div>
        </div>
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
                  {shortExamColumns.map((col) => (
                    <td
                      key={`${row.grupo}-${col}`}
                      className="px-2.5 py-3 text-right font-mono text-[var(--text-muted)] tabular-nums"
                    >
                      {row.porConcurso[col] || 0}
                    </td>
                  ))}
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
