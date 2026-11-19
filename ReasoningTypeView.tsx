import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { QuestionRecord, ReasoningType } from '../types/exam';
import {
  buildReasoningBreakdown,
  classifyReasoningType,
  REASONING_DEFINITIONS,
} from '../utils/examIntelligence';
import { GroupedComparisonBarChart } from './DataVizCharts';

interface ReasoningTypeViewProps {
  questions: QuestionRecord[];
  reasoningOverrides: Record<string, ReasoningType>;
  onUpdateReasoningOverride: (id: string, tipo: ReasoningType | null) => void;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
  onSelectQuestion: (q: QuestionRecord, contextList: QuestionRecord[]) => void;
}

export const ReasoningTypeView: React.FC<ReasoningTypeViewProps> = ({
  questions,
  reasoningOverrides,
  onUpdateReasoningOverride,
  onInspectQuestions,
  onSelectQuestion,
}) => {
  const [selectedType, setSelectedType] = useState<'all' | ReasoningType>('all');
  const [boardFilter, setBoardFilter] = useState('Todas');
  const [examFilter, setExamFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.concursoCurto))),
    [questions]
  );

  const scopedQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (boardFilter !== 'Todas' && q.banca !== boardFilter) return false;
      if (examFilter !== 'Todas' && q.concursoCurto !== examFilter) return false;
      return true;
    });
  }, [questions, boardFilter, examFilter]);

  const breakdown = useMemo(
    () => buildReasoningBreakdown(scopedQuestions, reasoningOverrides),
    [scopedQuestions, reasoningOverrides]
  );

  const visibleQuestions = useMemo(() => {
    const s = search.trim().toLowerCase();
    return scopedQuestions.filter((q) => {
      const rType = classifyReasoningType(q, reasoningOverrides);
      if (selectedType !== 'all' && rType !== selectedType) return false;
      if (s) {
        const hay = `${q.concursoCurto} ${q.questao} ${q.tema} ${q.exigencia} ${q.grupoEstudo}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [scopedQuestions, reasoningOverrides, selectedType, search]);

  const overrideCount = Object.keys(reasoningOverrides).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Classificação do Tipo de Raciocínio Exigido
          </h1>
          <p className="ui-page-subtitle">
            Classificação complementar (não presente nas planilhas originais) de como o candidato precisa pensar para resolver cada questão. Você pode confirmar ou ajustar qualquer item manualmente.
          </p>
        </div>

        <div className="text-xs font-medium text-[var(--text-muted)]">
          <span className="font-mono tabular-nums">
            {overrideCount} ajuste(s) manuais salvos
          </span>
        </div>
      </div>

      {/* 7 Reasoning Categories Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {breakdown.map((row) => {
          const active = selectedType === row.tipo;
          return (
            <div
              key={row.tipo}
              className={`ui-card flex flex-col justify-between p-4 transition-colors ${
                active
                  ? '!border-[var(--brand-primary)] !bg-[var(--brand-primary-soft)]/45'
                  : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelectedType(active ? 'all' : row.tipo)
                    }
                    className="min-h-[32px] text-left text-xs font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                  >
                    {row.label}
                  </button>
                  <span className="font-mono text-lg font-bold text-[var(--brand-primary-ink)] tabular-nums">
                    {row.total}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                  {row.exemplo}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-xs">
                <span className="font-mono text-[var(--text-muted)] tabular-nums">
                  {row.percentual.toFixed(1)}% · CES {row.cesgranrioCount} / CEB {row.cebraspeCount}
                </span>
                <button
                  type="button"
                  disabled={row.total === 0}
                  onClick={() =>
                    onInspectQuestions(
                      `Raciocínio: ${row.label}`,
                      `${row.total} questões (${row.exemplo})`,
                      row.questoes
                    )
                  }
                  className="min-h-[32px] font-semibold text-[var(--brand-primary-ink)] hover:underline disabled:text-slate-300 whitespace-nowrap"
                >
                  Abrir →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped Comparison: CESGRANRIO vs CEBRASPE by Reasoning Type */}
      <GroupedComparisonBarChart
        title="Perfil Cognitivo Comparado: CESGRANRIO × CEBRASPE"
        subtitle="Distribuição das 7 exigências de raciocínio entre as bancas (clique em uma barra para abrir as questões correspondentes)."
        series={[
          { key: 'cesgranrio', label: 'CESGRANRIO', color: '#2563EB' },
          { key: 'cebraspe', label: 'CEBRASPE', color: '#14213D' },
        ]}
        categories={breakdown.map((row) => ({
          id: row.tipo,
          label: row.label,
          values: {
            cesgranrio: row.cesgranrioCount,
            cebraspe: row.cebraspeCount,
          },
        }))}
        unitSuffix="q"
        onSelectCell={(cat, seriesKey, seriesLabel) => {
          const row = breakdown.find((r) => r.tipo === cat.id);
          if (!row) return;
          const boardKey = seriesKey === 'cesgranrio' ? 'CESGRANRIO' : 'CEBRASPE';
          const list = row.questoes.filter((q) =>
            q.banca.toUpperCase().includes(boardKey)
          );
          if (list.length > 0) {
            onInspectQuestions(
              `Raciocínio: ${row.label} (${seriesLabel})`,
              `${list.length} questões identificadas para esta banca`,
              list
            );
          }
        }}
      />

      {/* Filter Bar */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="relative min-w-0 w-full sm:min-w-[220px] sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar questões por tipo de raciocínio"
            placeholder="Filtrar tema, exigência ou nº da questão..."
            className="ui-input !pl-9"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            aria-label="Filtrar por tipo de raciocínio"
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as 'all' | ReasoningType)
            }
            className="ui-select !w-full sm:!w-auto"
          >
            <option value="all">Todos os 7 tipos ({scopedQuestions.length}q)</option>
            {breakdown.map((b) => (
              <option key={b.tipo} value={b.tipo}>
                {b.label} ({b.total})
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar raciocínio por banca"
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="ui-select !w-full sm:!w-auto"
          >
            <option value="Todas">Todas as bancas</option>
            <option value="CESGRANRIO">CESGRANRIO</option>
            <option value="CEBRASPE">CEBRASPE</option>
          </select>

          <select
            aria-label="Filtrar raciocínio por prova"
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="ui-select !w-full sm:!w-auto"
          >
            <option value="Todas">Todas as provas</option>
            {exams.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editable Classification Table */}
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div>
            <h2 className="ui-section-title">
              Catálogo Classificado ({visibleQuestions.length} questões)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Altere a classificação complementar na coluna à direita caso queira recalibrar o perfil cognitivo de uma questão.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {visibleQuestions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Nenhuma questão encontrada para os filtros aplicados.
            </div>
          ) : (
            visibleQuestions.slice(0, 80).map((q) => {
              const currentType = classifyReasoningType(q, reasoningOverrides);
              const isOverridden = Boolean(reasoningOverrides[q.id]);
              return (
                <div
                  key={q.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:bg-[var(--bg-surface-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {q.concursoCurto}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[var(--brand-primary-ink)] tabular-nums">
                        Questão {q.questao} — Pág. {q.paginaPdf}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{q.banca}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectQuestion(q, visibleQuestions)}
                      className="mt-1 text-left text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                    >
                      {q.tema}
                    </button>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {q.exigencia}
                    </p>
                  </div>

                  <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                    <select
                      aria-label={`Classificação de raciocínio para ${q.concursoCurto} Questão ${q.questao}`}
                      value={currentType}
                      onChange={(e) =>
                        onUpdateReasoningOverride(
                          q.id,
                          e.target.value as ReasoningType
                        )
                      }
                      className="ui-select !w-full sm:!w-auto font-medium"
                    >
                      {REASONING_DEFINITIONS.map((def) => (
                        <option key={def.tipo} value={def.tipo}>
                          {def.label}
                        </option>
                      ))}
                    </select>

                    {isOverridden && (
                      <button
                        type="button"
                        onClick={() => onUpdateReasoningOverride(q.id, null)}
                        title="Restaurar classificação automática"
                        aria-label={`Restaurar classificação automática de ${q.concursoCurto} Q${q.questao}`}
                        className="ui-btn-secondary !min-h-[38px] !min-w-[38px] !p-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {visibleQuestions.length > 80 && (
          <div className="border-t border-[var(--border-subtle)] px-5 py-3 text-center text-xs text-[var(--text-muted)]">
            Exibindo as primeiras 80 questões filtradas. Use os filtros acima ou clique em &ldquo;Abrir →&rdquo; nos cards para inspecionar todas as {visibleQuestions.length}.
          </div>
        )}
      </section>
    </div>
  );
};
