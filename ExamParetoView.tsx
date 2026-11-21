import React, { useMemo, useState } from 'react';
import type { ExamSummary, ParetoRow, QuestionRecord } from '../types/exam';
import { calculatePareto } from '../utils/examIntelligence';
import { GroupedComparisonBarChart } from './DataVizCharts';
import { ParetoChart } from './ParetoChart';

interface ExamParetoViewProps {
  questions: QuestionRecord[];
  exams: ExamSummary[];
  globalPareto: ParetoRow[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

export const ExamParetoView: React.FC<ExamParetoViewProps> = ({
  questions,
  exams,
  globalPareto,
  onInspectQuestions,
}) => {
  const [selectedProva, setSelectedProva] = useState<string>(
    exams[exams.length - 1]?.prova || exams[0]?.prova || ''
  );

  const activeProva = exams.some((e) => e.prova === selectedProva)
    ? selectedProva
    : exams[0]?.prova || '';

  const examSummary = exams.find((e) => e.prova === activeProva);
  const examPareto = useMemo(
    () => calculatePareto(questions, activeProva),
    [questions, activeProva]
  );

  const globalPctByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of globalPareto) {
      map.set(r.grupo, r.percentual);
    }
    return map;
  }, [globalPareto]);

  // Matrix of % weight across all exams for comparison
  const allGroups = useMemo(() => globalPareto.map((g) => g.grupo), [globalPareto]);
  const perExamMatrix = useMemo(() => {
    const map = new Map<
      string,
      Map<string, { count: number; pct: number; questoes: QuestionRecord[] }>
    >();
    for (const ex of exams) {
      const p = calculatePareto(questions, ex.prova);
      const inner = new Map<
        string,
        { count: number; pct: number; questoes: QuestionRecord[] }
      >();
      for (const row of p) {
        inner.set(row.grupo, {
          count: row.frequencia,
          pct: row.percentual,
          questoes: row.questoes,
        });
      }
      map.set(ex.prova, inner);
    }
    return map;
  }, [exams, questions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ui-page-title">
          Pareto Individual por Concurso
        </h1>
        <p className="ui-page-subtitle">
          Analise o peso específico de cada disciplina por prova e compare o desvio em relação à média histórica geral.
        </p>
      </div>

      {/* Exam Selector Tabs */}
      <div
        className="ui-card flex flex-wrap gap-1.5 p-2"
        role="tablist"
        aria-label="Selecionar concurso para Pareto individual"
      >
        {exams.map((ex) => {
          const isActive = ex.prova === activeProva;
          return (
            <button
              key={ex.prova}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedProva(ex.prova)}
              className={`min-h-[40px] rounded-lg px-3.5 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-surface-subtle)]/75 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{ex.concursoCurto}</span>
              <span
                className={`ml-1.5 font-mono tabular-nums ${
                  isActive ? 'text-blue-100' : 'text-[var(--text-muted)]'
                }`}
              >
                ({ex.totalQuestoes}q)
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Exam Context Strip */}
      {examSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="ui-card p-4 sm:col-span-2">
            <div className="text-xs font-medium text-[var(--text-muted)]">Prova selecionada</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {examSummary.prova}
            </div>
            <div className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">
              Arquivo: {examSummary.arquivoOrigem}
            </div>
          </div>

          <div className="ui-card p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Banca & Ano</div>
            <div className="mt-1 font-mono text-base font-bold text-[var(--text-primary)]">
              {examSummary.banca} · {examSummary.ano}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">{examSummary.empresa}</div>
          </div>

          <div className="ui-card p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Núcleo 80% nesta prova</div>
            <div className="mt-1 font-mono text-base font-bold text-[var(--brand-primary)] tabular-nums">
              {examPareto.filter((r) => r.isNucleo80).length} de {examPareto.length} grupos
            </div>
            <div className="mt-1 font-mono text-xs text-[var(--text-muted)] tabular-nums">
              {examSummary.diretoCount} diretas · {examSummary.correlatoCount} correlatas
            </div>
          </div>
        </div>
      )}

      {/* Individual Pareto Chart */}
      <ParetoChart
        rows={examPareto}
        title={`Pareto Individual — ${examSummary?.concursoCurto || activeProva}`}
        subtitle="Clique em uma barra para consultar todas as questões deste grupo especificamente nesta prova."
        onSelectGroup={(row) =>
          onInspectQuestions(
            `${examSummary?.concursoCurto}: ${row.grupo}`,
            `${row.frequencia} questões (${row.percentual.toFixed(1)}% desta prova)`,
            row.questoes
          )
        }
      />

      {/* Exam Weight vs Global Historical Average Chart */}
      <GroupedComparisonBarChart
        title={`Comparativo: ${examSummary?.concursoCurto || activeProva} × Média Histórica Geral (%)`}
        subtitle="Contrasta a concentração percentual da prova selecionada com o comportamento histórico consolidado."
        series={[
          { key: 'prova', label: 'Nesta prova (%)', color: '#2563EB' },
          { key: 'media', label: 'Média histórica (%)', color: '#14213D' },
        ]}
        categories={examPareto.slice(0, 8).map((row) => ({
          id: row.grupo,
          label: row.grupo,
          values: {
            prova: Number(row.percentual.toFixed(1)),
            media: Number((globalPctByGroup.get(row.grupo) ?? 0).toFixed(1)),
          },
          questionsBySeries: {
            prova: row.questoes,
            media: globalPareto.find((g) => g.grupo === row.grupo)?.questoes || row.questoes,
          },
        }))}
        unitSuffix="%"
        onSelectCell={(cat, seriesKey, seriesLabel) => {
          const list = cat.questionsBySeries?.[seriesKey] || [];
          if (list.length > 0) {
            onInspectQuestions(
              `${cat.label} · ${seriesLabel}`,
              `${list.length} questão(ões) no recorte`,
              list
            );
          }
        }}
      />

      {/* Individual Breakdown with Delta vs General Average */}
      <section className="ui-card overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="ui-section-title">
            Peso da Prova vs Média Histórica Geral
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Identifique onde esta prova concentrou mais cobrança acima ou abaixo do padrão geral.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Grupo de estudo</th>
                <th className="px-3 py-3">Núcleo</th>
                <th className="px-3 py-3 text-right">Questões</th>
                <th className="px-3 py-3 text-right">Peso na prova</th>
                <th className="px-3 py-3 text-right">Acum.</th>
                <th className="px-3 py-3 text-right">Média geral</th>
                <th className="px-3 py-3 text-right">Desvio (p.p.)</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {examPareto.map((row) => {
                const avg = globalPctByGroup.get(row.grupo) ?? 0;
                const delta = row.percentual - avg;
                return (
                  <tr key={row.grupo} className="transition-colors hover:bg-[var(--bg-surface-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            `${examSummary?.concursoCurto}: ${row.grupo}`,
                            `${row.frequencia} questões (${row.percentual.toFixed(1)}% desta prova)`,
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
                            : 'text-[var(--text-muted)]'
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
                    <td className="px-3 py-3 text-right font-mono text-[var(--text-muted)] tabular-nums">
                      {avg.toFixed(1)}%
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono font-semibold tabular-nums ${
                        delta >= 2
                          ? 'text-[var(--brand-primary)]'
                          : delta <= -2
                            ? 'text-[var(--brand-accent)]'
                            : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} p.p.
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            `${examSummary?.concursoCurto}: ${row.grupo}`,
                            `${row.frequencia} questões (${row.percentual.toFixed(1)}% desta prova)`,
                            row.questoes
                          )
                        }
                        className="inline-flex min-h-[34px] items-center rounded-md px-2 font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary-ink)]"
                      >
                        Consultar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cross-Exam Comparison Matrix */}
      <section className="ui-card overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="ui-section-title">
            Matriz Comparativa Entre Todos os Concursos
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Compare lado a lado a participação percentual (%) e absoluta de cada área em todas as provas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Grupo consolidado</th>
                {exams.map((ex) => (
                  <th
                    key={ex.prova}
                    className="px-3 py-3 text-right whitespace-nowrap"
                  >
                    {ex.concursoCurto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {allGroups.map((grupo) => (
                <tr key={grupo} className="transition-colors hover:bg-[var(--bg-surface-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    <button
                      type="button"
                      onClick={() => {
                        const groupRow = globalPareto.find((g) => g.grupo === grupo);
                        if (groupRow) {
                          onInspectQuestions(
                            `Grupo: ${grupo}`,
                            `${groupRow.frequencia} questões em todas as provas`,
                            groupRow.questoes
                          );
                        }
                      }}
                      className="text-left font-medium hover:text-[var(--brand-primary)] hover:underline"
                    >
                      {grupo}
                    </button>
                  </td>
                  {exams.map((ex) => {
                    const cell = perExamMatrix.get(ex.prova)?.get(grupo);
                    return (
                      <td
                        key={`${grupo}-${ex.prova}`}
                        className="px-3 py-3 text-right font-mono text-[var(--text-secondary)] tabular-nums whitespace-nowrap"
                      >
                        {cell && cell.count > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onInspectQuestions(
                                `${grupo} — ${ex.concursoCurto}`,
                                `${cell.count} questão(ões) (${cell.pct.toFixed(1)}% da prova)`,
                                cell.questoes
                              )
                            }
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--brand-primary-soft)] hover:underline"
                          >
                            <span className="font-semibold text-[var(--text-primary)]">
                              {cell.pct.toFixed(1)}%
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              ({cell.count})
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400">0.0% (0)</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
