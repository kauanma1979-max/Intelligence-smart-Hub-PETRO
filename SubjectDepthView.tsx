import React, { useMemo, useState } from 'react';
import type { QuestionRecord } from '../types/exam';
import { buildSubjectDepthAnalysis } from '../utils/examIntelligence';
import { GroupedComparisonBarChart } from './DataVizCharts';

interface SubjectDepthViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

export const SubjectDepthView: React.FC<SubjectDepthViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const groups = useMemo(
    () => Array.from(new Set(questions.map((q) => q.grupoEstudo))).sort(),
    [questions]
  );

  const [selectedGroup, setSelectedGroup] = useState<string>(
    'Química e Físico-Química'
  );
  const [subScope, setSubScope] = useState<string>('Todos');
  const [examFilter, setExamFilter] = useState<string>('Todas');

  const activeGroup = groups.includes(selectedGroup)
    ? selectedGroup
    : groups[0] || 'Todos';

  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.concursoCurto))),
    [questions]
  );

  const scopedQuestions = useMemo(() => {
    if (examFilter === 'Todas') return questions;
    return questions.filter((q) => q.concursoCurto === examFilter);
  }, [questions, examFilter]);

  const depthData = useMemo(
    () =>
      buildSubjectDepthAnalysis(
        scopedQuestions,
        activeGroup,
        activeGroup === 'Química e Físico-Química' && subScope === 'Química Orgânica'
          ? 'Química Orgânica'
          : undefined
      ),
    [scopedQuestions, activeGroup, subScope]
  );

  const summaryCounts = useMemo(() => {
    return depthData.rows.reduce(
      (acc, r) => ({
        basico: acc.basico + r.basicoCount,
        aplicacao: acc.aplicacao + r.aplicacaoCount,
        calculoEstrutura: acc.calculoEstrutura + r.calculoEstruturaCount,
      }),
      { basico: 0, aplicacao: 0, calculoEstrutura: 0 }
    );
  }, [depthData]);

  const pct = (n: number) =>
    depthData.total > 0 ? ((n / depthData.total) * 100).toFixed(1) : '0.0';

  const depthComparisonCategories = useMemo(
    () =>
      depthData.rows.slice(0, 7).map((row) => ({
        id: row.subtema,
        label: row.subtema,
        values: {
          basico: row.basicoCount,
          aplicacao: row.aplicacaoCount,
          calculoEstrutura: row.calculoEstruturaCount,
        },
        questionsBySeries: {
          basico: row.questoes,
          aplicacao: row.questoes,
          calculoEstrutura: row.questoes,
        },
      })),
    [depthData]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">Análise de Profundidade dos Assuntos</h1>
          <p className="ui-page-subtitle">
            Decomponha cada grande área em subtópicos específicos e descubra se a banca cobra conceitos básicos, aplicação industrial ou cálculos e interpretação de estruturas.
          </p>
        </div>

        <select
          aria-label="Filtrar profundidade por prova"
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="ui-select !w-full sm:!w-auto font-medium"
        >
          <option value="Todas">Todas as provas ({questions.length}q)</option>
          {exams.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      {/* Group Selector + Chemistry Organic Quick Focus */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 w-full sm:min-w-[240px] sm:flex-1">
          <label
            htmlFor="depth-group-select"
            className="block text-xs font-medium text-[var(--text-muted)]"
          >
            Disciplina / Grupo de estudo consolidado
          </label>
          <select
            id="depth-group-select"
            value={activeGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setSubScope('Todos');
            }}
            className="ui-select mt-1 max-w-md font-semibold"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {activeGroup === 'Química e Físico-Química' && (
          <div
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
            role="group"
            aria-label="Recorte de profundidade em Química"
          >
            <button
              type="button"
              onClick={() => setSubScope('Todos')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subScope === 'Todos'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Toda Química e Físico-Química
            </button>
            <button
              type="button"
              onClick={() => setSubScope('Química Orgânica')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subScope === 'Química Orgânica'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Foco: Química Orgânica
            </button>
          </div>
        )}
      </div>

      {/* Depth Level Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Total no recorte
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {depthData.total}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {depthData.rows.length} subtemas detalhados
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Conceitos básicos
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--status-success)] tabular-nums">
            {summaryCounts.basico}{' '}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              ({pct(summaryCounts.basico)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Definições, reconhecimento e classificação
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Aplicação e interpretação
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-primary-ink)] tabular-nums">
            {summaryCounts.aplicacao}{' '}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              ({pct(summaryCounts.aplicacao)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Análise de processo, comportamento e efeito
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Cálculos e estruturas
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-accent)] tabular-nums">
            {summaryCounts.calculoEstrutura}{' '}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              ({pct(summaryCounts.calculoEstrutura)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Fórmulas, estequiometria, diagramas e estruturas
          </div>
        </div>
      </div>

      {/* Grouped Depth Comparison Chart */}
      <GroupedComparisonBarChart
        title="Perfil de Profundidade nos Principais Subtópicos"
        subtitle="Comparativo entre cobrança básica, aplicação e cálculo/estrutura nos 7 subtópicos mais frequentes do recorte."
        series={[
          { key: 'basico', label: 'Básico', color: '#059669' },
          { key: 'aplicacao', label: 'Aplicação', color: '#2563EB' },
          { key: 'calculoEstrutura', label: 'Cálculo / Estrutura', color: '#D97706' },
        ]}
        categories={depthComparisonCategories}
        unitSuffix="q"
        onSelectCell={(cat, _seriesKey, seriesLabel) => {
          const matchedRow = depthData.rows.find((r) => r.subtema === cat.id);
          if (matchedRow) {
            onInspectQuestions(
              `Profundidade — ${matchedRow.subtema} (${seriesLabel})`,
              `${matchedRow.total} questões no subtópico (${matchedRow.basicoCount} básico · ${matchedRow.aplicacaoCount} aplicação · ${matchedRow.calculoEstruturaCount} cálculo/estrutura)`,
              matchedRow.questoes
            );
          }
        }}
      />

      {/* Subtopic Breakdown Table */}
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div>
            <h2 className="ui-section-title">
              Subtópicos Exigidos e Nível de Profundidade
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Clique em qualquer subtema para abrir as questões correspondentes e verificar exatamente o que foi cobrado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#059669]" />
              Básico
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#2563EB]" />
              Aplicação
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]" />
              Cálculo / Estrutura
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Subtópico / Conteúdo específico</th>
                <th className="px-3 py-3 text-right">Questões</th>
                <th className="px-3 py-3 text-right">% Recorte</th>
                <th className="px-3 py-3 text-right">Básico</th>
                <th className="px-3 py-3 text-right">Aplicação</th>
                <th className="px-3 py-3 text-right">Cálculo / Estr.</th>
                <th className="w-44 px-4 py-3">Perfil visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {depthData.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Nenhuma questão encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                depthData.rows.map((row) => {
                  const wBasico = (row.basicoCount / row.total) * 100;
                  const wApl = (row.aplicacaoCount / row.total) * 100;
                  const wCalc = (row.calculoEstruturaCount / row.total) * 100;
                  return (
                    <tr
                      key={row.subtema}
                      className="transition-colors hover:bg-[var(--bg-surface-hover)]"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            onInspectQuestions(
                              `Profundidade — ${row.subtema}`,
                              `${row.total} questões (${row.basicoCount} básico · ${row.aplicacaoCount} aplicação · ${row.calculoEstruturaCount} cálculo/estrutura)`,
                              row.questoes
                            )
                          }
                          className="min-h-[32px] text-left font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                        >
                          {row.subtema}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-[var(--brand-primary-ink)] tabular-nums">
                        <button
                          type="button"
                          onClick={() =>
                            onInspectQuestions(
                              `Profundidade — ${row.subtema}`,
                              `${row.total} questões encontradas`,
                              row.questoes
                            )
                          }
                          className="min-h-[32px] rounded px-2 py-0.5 hover:bg-[var(--brand-primary-soft)]"
                        >
                          {row.total}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--text-secondary)] tabular-nums">
                        {row.percentualNoGrupo.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--status-success)] tabular-nums">
                        {row.basicoCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--brand-primary-ink)] tabular-nums">
                        {row.aplicacaoCount}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[var(--brand-accent)] tabular-nums">
                        {row.calculoEstruturaCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex h-3 w-full overflow-hidden rounded-xs bg-[var(--bg-surface-subtle)]">
                          {wBasico > 0 && (
                            <div
                              className="h-full bg-[#059669]"
                              style={{ width: `${wBasico}%` }}
                              title={`Básico: ${row.basicoCount}`}
                            />
                          )}
                          {wApl > 0 && (
                            <div
                              className="h-full bg-[#2563EB]"
                              style={{ width: `${wApl}%` }}
                              title={`Aplicação: ${row.aplicacaoCount}`}
                            />
                          )}
                          {wCalc > 0 && (
                            <div
                              className="h-full bg-[#D97706]"
                              style={{ width: `${wCalc}%` }}
                              title={`Cálculo/Estrutura: ${row.calculoEstruturaCount}`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
