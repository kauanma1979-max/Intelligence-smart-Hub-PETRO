import React, { useMemo, useState } from 'react';
import type { QuestionRecord } from '../types/exam';
import { calculateRanking, type RankingLevel } from '../utils/examIntelligence';

interface TopicRankingViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const LEVELS: { id: RankingLevel; label: string; desc: string }[] = [
  {
    id: 'grupo',
    label: 'Por grupo consolidado',
    desc: 'Agrupamento macro das 270+ questões para visão de prioridade estratégica.',
  },
  {
    id: 'area',
    label: 'Por área original',
    desc: 'Disciplina exata registrada na caderneta de cada prova.',
  },
  {
    id: 'topico',
    label: 'Por tópico específico',
    desc: 'Núcleo do tema efetivamente cobrado (ex: Bombas centrífugas, Hidrocarbonetos).',
  },
  {
    id: 'subtopico',
    label: 'Por subtópico detalhado',
    desc: 'Recorte granular completo (tema — subtópico) de cada item cobrado.',
  },
];

export const TopicRankingView: React.FC<TopicRankingViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const [level, setLevel] = useState<RankingLevel>('grupo');
  const [examFilter, setExamFilter] = useState('Todas');
  const [limit, setLimit] = useState(25);

  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.prova))).sort(),
    [questions]
  );

  const rankingRows = useMemo(
    () => calculateRanking(questions, level, examFilter),
    [questions, level, examFilter]
  );

  const visibleRows = rankingRows.slice(0, limit);
  const maxFreq = Math.max(...visibleRows.map((r) => r.frequencia), 1);
  const activeMeta = LEVELS.find((l) => l.id === level)!;

  const totalInScope = useMemo(
    () => rankingRows.reduce((s, r) => s + r.frequencia, 0),
    [rankingRows]
  );
  const top3Pct = useMemo(() => {
    if (totalInScope === 0) return 0;
    const sum3 = rankingRows.slice(0, 3).reduce((s, r) => s + r.frequencia, 0);
    return (sum3 / totalInScope) * 100;
  }, [rankingRows, totalInScope]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Ranking de Assuntos Mais Cobrados
          </h1>
          <p className="ui-page-subtitle">
            {activeMeta.desc} Clique em qualquer barra para abrir as questões que formaram o resultado.
          </p>
        </div>
        <span className="font-mono text-xs font-medium text-[var(--text-muted)] tabular-nums">
          {rankingRows.length} classificações distintas
        </span>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ui-card p-4">
          <div className="text-xs text-[var(--text-muted)]">Questões no recorte</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {totalInScope}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {rankingRows.length} temas distintos ranqueados
          </div>
        </div>
        <div className="ui-card p-4">
          <div className="text-xs text-[var(--text-muted)]">1º colocado no nível atual</div>
          <div className="mt-1 truncate text-sm font-bold text-[var(--brand-secondary)]">
            {rankingRows[0]?.label || '—'}
          </div>
          <div className="mt-1 font-mono text-xs text-[var(--brand-primary)] tabular-nums">
            {rankingRows[0]
              ? `${rankingRows[0].frequencia} questões (${rankingRows[0].percentual.toFixed(1)}%)`
              : 'Sem registros'}
          </div>
        </div>
        <div className="ui-card p-4">
          <div className="text-xs text-[var(--text-muted)]">Concentração Top 3</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--brand-indigo)] tabular-nums">
            {top3Pct.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            participação dos 3 primeiros colocados
          </div>
        </div>
      </div>

      {/* Classification Level Selector & Exam Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Nível de classificação do ranking"
        >
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setLevel(lvl.id);
                setLimit(25);
              }}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                level === lvl.id
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        <select
          aria-label="Filtrar ranking por concurso"
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="ui-select w-full sm:w-auto text-xs"
        >
          <option value="Todas">Todas as provas ({questions.length} questões)</option>
          {exams.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      {/* Interactive Horizontal Bar Ranking */}
      <section className="ui-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="ui-section-title">
              Classificação histórica em ordem decrescente
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Cada barra é clicável e exibe as questões rastreáveis de origem.
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-[var(--text-muted)] tabular-nums">
            Exibindo {visibleRows.length} de {rankingRows.length}
          </span>
        </div>

        <div className="space-y-1.5">
          {visibleRows.map((row, idx) => {
            const pctWidth = Math.max(2, (row.frequencia / maxFreq) * 100);
            return (
              <button
                key={row.label}
                type="button"
                onClick={() =>
                  onInspectQuestions(
                    `Ranking (${activeMeta.label}): ${row.label}`,
                    `${row.frequencia} questões (${row.percentual.toFixed(1)}%) em ${row.concursosCount} prova(s)`,
                    row.questoes
                  )
                }
                aria-label={`${idx + 1}. ${row.label}: ${row.frequencia} questões (${row.percentual.toFixed(1)}%). Clique para consultar questões.`}
                className="group flex min-h-[44px] w-full flex-col gap-1.5 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 items-baseline gap-2 sm:w-[38%]">
                  <span className="w-6 shrink-0 font-mono text-xs text-[var(--text-muted)] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span className="truncate text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                    {row.label}
                  </span>
                </div>

                <div className="flex flex-1 items-center gap-3">
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-[var(--bg-surface-subtle)]">
                    <div
                      className="h-full rounded-sm transition-opacity group-hover:opacity-90"
                      style={{
                        width: `${pctWidth}%`,
                        backgroundColor:
                          idx === 0
                            ? '#14213D'
                            : idx < 3
                              ? '#2563EB'
                              : idx < 8
                                ? '#4338CA'
                                : '#06B6D4',
                      }}
                    />
                  </div>
                  <div className="w-36 shrink-0 text-right font-mono text-xs tabular-nums">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {row.frequencia}
                    </span>{' '}
                    <span className="text-[var(--text-muted)]">
                      ({row.percentual.toFixed(1)}%) · {row.concursosCount} pr.
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {rankingRows.length > limit && (
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-center">
            <button
              type="button"
              onClick={() => setLimit((prev) => prev + 30)}
              className="ui-btn-secondary"
            >
              Carregar mais classificações ({rankingRows.length - limit} restantes)
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
