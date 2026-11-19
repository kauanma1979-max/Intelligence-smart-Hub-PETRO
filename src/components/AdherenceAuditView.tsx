import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import type {
  AdherenceAuditRow,
  AdherenceCategory,
  QuestionRecord,
} from '../types/exam';
import { buildAdherenceAudit } from '../utils/examIntelligence';
import {
  CoverageDonutChart,
  HorizontalFrequencyBarChart,
} from './DataVizCharts';

interface AdherenceAuditViewProps {
  questions: QuestionRecord[];
  onSelectQuestion: (q: QuestionRecord, contextList: QuestionRecord[]) => void;
}

const CATEGORY_META: Record<
  AdherenceCategory,
  { label: string; colorClass: string; desc: string }
> = {
  direta: {
    label: 'Cobrança direta',
    colorClass: 'text-[var(--status-success)]',
    desc: 'Correspondência explícita ao item do edital',
  },
  correlata: {
    label: 'Cobrança correlata',
    colorClass: 'text-[var(--status-warning)]',
    desc: 'Conhecimento próximo, sem citação literal no edital',
  },
  revisao: {
    label: 'Necessidade de revisão',
    colorClass: 'text-[var(--brand-primary-ink)]',
    desc: 'Fronteira temática ou dupla mobilização de itens',
  },
  sem_correspondencia: {
    label: 'Sem correspondência',
    colorClass: 'text-[var(--status-error)]',
    desc: 'Assunto sem código programático vinculado',
  },
};

export const AdherenceAuditView: React.FC<AdherenceAuditViewProps> = ({
  questions,
  onSelectQuestion,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | AdherenceCategory>('correlata');
  const [examFilter, setExamFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AdherenceAuditRow | null>(null);

  useEffect(() => {
    if (!selectedAudit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAudit(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAudit]);

  const auditRows = useMemo(() => buildAdherenceAudit(questions), [questions]);

  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.concursoCurto))),
    [questions]
  );

  const counts = useMemo(
    () => ({
      direta: auditRows.filter((r) => r.categoria === 'direta').length,
      correlata: auditRows.filter((r) => r.categoria === 'correlata').length,
      revisao: auditRows.filter((r) => r.categoria === 'revisao').length,
      sem_correspondencia: auditRows.filter(
        (r) => r.categoria === 'sem_correspondencia'
      ).length,
    }),
    [auditRows]
  );

  const examAttentionBars = useMemo(() => {
    const map = new Map<string, { total: number; attention: number }>();
    for (const row of auditRows) {
      const ex = row.question.concursoCurto;
      const cur = map.get(ex) || { total: 0, attention: 0 };
      cur.total++;
      if (row.categoria !== 'direta') cur.attention++;
      map.set(ex, cur);
    }
    return Array.from(map.entries())
      .map(([exam, stats]) => ({
        id: exam,
        label: exam,
        sublabel: `${stats.attention} correlata(s)/revisão de ${stats.total} questões`,
        value: stats.attention,
        pct: stats.total > 0 ? (stats.attention / stats.total) * 100 : 0,
        color:
          examFilter === exam
            ? '#4338CA'
            : stats.attention > 0
              ? '#D97706'
              : '#059669',
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [auditRows, examFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditRows.filter((row) => {
      if (categoryFilter !== 'all' && row.categoria !== categoryFilter) return false;
      if (examFilter !== 'Todas' && row.question.concursoCurto !== examFilter)
        return false;
      if (q) {
        const hay = `${row.edital} ${row.itemProgramatico} ${row.question.tema} ${row.justificativa} ${row.question.questao}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditRows, categoryFilter, examFilter, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="ui-page-title">Análise de Aderência ao Edital</h1>
        <p className="ui-page-subtitle">
          Investigue a relação entre o enunciado cobrado e o item previsto no programa oficial, identificando cobranças correlatas e classificações que exigem revisão.
        </p>
      </div>

      {/* 4 Adherence Classifications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          ['direta', 'correlata', 'revisao', 'sem_correspondencia'] as AdherenceCategory[]
        ).map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={active}
              onClick={() => setCategoryFilter(active ? 'all' : cat)}
              className={`ui-card p-4 text-left transition-colors ${
                active
                  ? '!border-[var(--brand-primary)] !bg-[var(--brand-primary-soft)]/50'
                  : 'hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                {meta.label}
              </div>
              <div
                className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${meta.colorClass}`}
              >
                {counts[cat]}
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{meta.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 2-Column BI Charts: Adherence Distribution + Exam Attention Concentration */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CoverageDonutChart
            title="Proporção de Aderência ao Edital"
            subtitle="Clique em uma categoria para filtrar a tabela de auditoria."
            centerValue={String(auditRows.length)}
            centerLabel="questões"
            activeSegmentId={categoryFilter === 'all' ? null : categoryFilter}
            onSelectSegment={(id) =>
              setCategoryFilter(
                categoryFilter === id ? 'all' : (id as AdherenceCategory)
              )
            }
            segments={[
              {
                id: 'direta',
                label: 'Cobrança direta',
                value: counts.direta,
                color: '#059669',
                icon: 'cobrado',
              },
              {
                id: 'correlata',
                label: 'Cobrança correlata',
                value: counts.correlata,
                color: '#D97706',
                icon: 'aprofundamento',
              },
              {
                id: 'revisao',
                label: 'Necessidade de revisão',
                value: counts.revisao,
                color: '#4338CA',
                icon: 'parcial',
              },
              {
                id: 'sem_correspondencia',
                label: 'Sem correspondência',
                value: counts.sem_correspondencia,
                color: '#DC2626',
                icon: 'nao_identificado',
              },
            ]}
          />
        </div>

        <div className="lg:col-span-7">
          <HorizontalFrequencyBarChart
            title="Incidência de Itens Correlatos ou em Revisão por Prova"
            subtitle="Clique em uma prova para filtrar os casos não diretos."
            items={examAttentionBars}
            maxItems={8}
            onSelectBar={(item) =>
              setExamFilter((prev) => (prev === item.id ? 'Todas' : item.id))
            }
          />
        </div>
      </div>

      {/* Filters */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="relative min-w-0 w-full sm:min-w-[220px] sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar análise de aderência"
            placeholder="Filtrar por justificativa, código do item, tema ou questão..."
            className="ui-input !pl-9"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            aria-label="Filtrar por classificação de aderência"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as 'all' | AdherenceCategory)
            }
            className="ui-select !w-full sm:!w-auto"
          >
            <option value="all">Todas as classificações ({auditRows.length})</option>
            <option value="correlata">Cobrança correlata ({counts.correlata})</option>
            <option value="revisao">Necessidade de revisão ({counts.revisao})</option>
            <option value="direta">Cobrança direta ({counts.direta})</option>
            <option value="sem_correspondencia">
              Sem correspondência ({counts.sem_correspondencia})
            </option>
          </select>

          <select
            aria-label="Filtrar aderência por concurso"
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

      {/* Results Table */}
      <section className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Prova / Questão</th>
                <th className="px-3 py-3">Item programático</th>
                <th className="px-3 py-3">Classificação</th>
                <th className="px-3 py-3">Tema e justificativa</th>
                <th className="px-4 py-3 text-right">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Nenhuma questão encontrada nesta classificação de aderência.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const meta = CATEGORY_META[row.categoria];
                  return (
                    <tr
                      key={row.question.id}
                      className="transition-colors hover:bg-[var(--bg-surface-hover)]"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {row.question.concursoCurto}
                        </div>
                        <div className="font-mono text-xs text-[var(--brand-primary-ink)] tabular-nums">
                          Questão {row.question.questao} · Pág. {row.question.paginaPdf}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {row.itemProgramatico}
                        {row.question.conteudosSecundarios.length > 0 && (
                          <div className="text-[11px] text-[var(--text-muted)]">
                            + {row.question.conteudosSecundarios.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${meta.colorClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {row.question.tema}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                          {row.justificativa}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedAudit(row)}
                          className="ui-btn-secondary !min-h-[34px] !px-3 !py-1 text-[var(--brand-primary-ink)]"
                        >
                          Ver justificativa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Adherence Justification Detail Modal */}
      {selectedAudit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adherence-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAudit(null);
          }}
        >
          <div className="ui-card ui-panel-enter w-full max-w-lg overflow-hidden shadow-[var(--shadow-modal)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <h2
                  id="adherence-modal-title"
                  className="text-base font-bold text-[var(--text-primary)]"
                >
                  Parecer de Aderência ao Edital
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {CATEGORY_META[selectedAudit.categoria].label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                aria-label="Fechar parecer de aderência"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="grid grid-cols-1 gap-3 p-5 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">Edital</dt>
                <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                  {selectedAudit.edital}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Item programático</dt>
                <dd className="mt-0.5 font-mono font-semibold text-[var(--brand-primary-ink)]">
                  {selectedAudit.itemProgramatico}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Prova</dt>
                <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
                  {selectedAudit.question.prova}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Número da questão</dt>
                <dd className="mt-0.5 font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                  Questão {selectedAudit.question.questao} (Pág.{' '}
                  {selectedAudit.question.paginaPdf})
                </dd>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-3 sm:col-span-2">
                <dt className="text-[var(--text-muted)]">
                  Assunto e exigência da questão
                </dt>
                <dd className="mt-1 font-medium text-[var(--text-primary)]">
                  {selectedAudit.question.tema}
                </dd>
                <dd className="mt-0.5 text-[var(--text-secondary)]">
                  {selectedAudit.question.exigencia}
                </dd>
              </div>
              <div className="ui-surface-subtle p-3 sm:col-span-2">
                <dt className="font-semibold text-[var(--text-secondary)]">
                  Justificativa da classificação
                </dt>
                <dd className="mt-1 leading-relaxed text-[var(--text-primary)]">
                  {selectedAudit.justificativa}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3">
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="ui-btn-secondary"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedAudit.question;
                  setSelectedAudit(null);
                  onSelectQuestion(
                    target,
                    filtered.map((f) => f.question)
                  );
                }}
                className="ui-btn-primary"
              >
                <FileText className="h-3.5 w-3.5" />
                Abrir Dossiê da Questão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
