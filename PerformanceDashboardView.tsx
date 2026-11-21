import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  FileCheck2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type {
  ConfidenceLevel,
  PerceivedDifficulty,
  QuestionPerformance,
  QuestionRecord,
  StudentAttemptRecord,
} from '../types/exam';
import {
  buildStudentPerformanceSummary,
  filterOriginalBankScoringAttempts,
} from '../utils/examIntelligence';
import {
  CoverageDonutChart,
  HorizontalFrequencyBarChart,
} from './DataVizCharts';

interface PerformanceDashboardViewProps {
  questions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  attempts: StudentAttemptRecord[];
  onAddAttempt?: (attempt: StudentAttemptRecord) => void;
  onDeleteAttempt: (attemptId: string, questionId: string) => void;
  onResetAllPerformance?: () => void;
  onOpenOriginalBank?: () => void;
  onSelectQuestion: (q: QuestionRecord, contextList: QuestionRecord[]) => void;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const DIFFICULTY_LABELS: Record<PerceivedDifficulty, string> = {
  facil: 'Fácil',
  media: 'Média',
  dificil: 'Difícil',
};

export const PerformanceDashboardView: React.FC<PerformanceDashboardViewProps> = ({
  questions,
  performanceMap,
  attempts,
  onDeleteAttempt,
  onResetAllPerformance,
  onOpenOriginalBank,
  onSelectQuestion,
  onInspectQuestions,
}) => {
  const [subTab, setSubTab] = useState<'painel' | 'historico'>('painel');
  const [subtopicSearch, setSubtopicSearch] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [revealedHistoryIds, setRevealedHistoryIds] = useState<Record<string, boolean>>({});

  // Contabilizar exclusivamente acertos e erros realizados na aba Banco de Questões
  const originalBankAttempts = useMemo(
    () => filterOriginalBankScoringAttempts(attempts),
    [attempts]
  );

  const summary = useMemo(
    () => buildStudentPerformanceSummary(questions, {}, originalBankAttempts),
    [questions, originalBankAttempts]
  );

  const hasAnyStoredRecords =
    summary.totalTentativas > 0 ||
    attempts.length > 0 ||
    Object.keys(performanceMap).length > 0;

  const filteredSubtopics = useMemo(() => {
    const s = subtopicSearch.trim().toLowerCase();
    if (!s) return summary.porSubtopico;
    return summary.porSubtopico.filter(
      (row) =>
        row.label.toLowerCase().includes(s) ||
        (row.parentGrupo || '').toLowerCase().includes(s)
    );
  }, [summary.porSubtopico, subtopicSearch]);

  const formatTime = (sec: number | null) => {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  const handleConfirmReset = () => {
    onResetAllPerformance?.();
    setRevealedHistoryIds({});
    setConfirmResetOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Painel de Desempenho Individual e Histórico
          </h1>
          <p className="ui-page-subtitle">
            Contabiliza exclusivamente os acertos e erros realizados na aba Banco de Questões — Provas Originais, com diagnóstico por matéria, subtópico, banca e evolução temporal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
            role="group"
            aria-label="Seções do painel de desempenho"
          >
            <button
              type="button"
              onClick={() => setSubTab('painel')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'painel'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Painel analítico
            </button>
            <button
              type="button"
              onClick={() => setSubTab('historico')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'historico'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Histórico ({summary.totalTentativas})
            </button>
          </div>

          {onResetAllPerformance && (
            confirmResetOpen ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-2.5 py-1">
                <span className="text-xs font-semibold text-[var(--status-error)] whitespace-nowrap">
                  Confirmar?
                </span>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="inline-flex min-h-[30px] items-center rounded-md bg-[var(--status-error)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 whitespace-nowrap"
                >
                  Sim, zerar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="inline-flex min-h-[30px] items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!hasAnyStoredRecords}
                onClick={() => setConfirmResetOpen(true)}
                className="ui-btn-secondary !min-h-[38px] border-[var(--status-error-border)] text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-45 disabled:pointer-events-none"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Zerar registros</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Questões corrigidas
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {summary.totalTentativas}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.questoesUnicasRespondidas} única(s) no Banco de Questões
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Taxa de acerto geral
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-primary-ink)] tabular-nums">
            {summary.totalTentativas > 0
              ? `${summary.taxaAcertoGeral.toFixed(1)}%`
              : '—'}
          </div>
          <div className="mt-1 font-mono text-xs text-[var(--text-muted)] tabular-nums">
            {summary.totalAcertos} acertos · {summary.totalErros} erros
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Erros para revisão
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-accent)] tabular-nums">
            {summary.totalErros}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.pontosCegos.length} subtópico(s) abaixo da média
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Tempo médio / questão
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {formatTime(summary.tempoMedioSeg)}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Baseado nas resoluções com tempo
          </div>
        </div>
      </div>

      {/* Analytical Dashboard Tab */}
      {subTab === 'painel' && (
        <>
          {summary.totalTentativas === 0 ? (
            <div className="ui-card border-dashed p-8 text-center">
              <h2 className="ui-section-title">
                Nenhum acerto ou erro registrado no Banco de Questões ainda
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-xs text-[var(--text-muted)]">
                Este painel contabiliza exclusivamente as questões resolvidas na aba Banco de Questões — Provas Originais (questões anuladas não entram na contagem).
              </p>
              {onOpenOriginalBank && (
                <button
                  type="button"
                  onClick={onOpenOriginalBank}
                  className="ui-btn-primary mt-4"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Resolver no Banco de Questões
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Blind Spots Alert (Granular Subtopic Detection) */}
              {summary.pontosCegos.length > 0 && (
                <section className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-bold text-amber-950">
                        Alerta de Pontos Cegos por Subtópico (dificuldades ocultas dentro da matéria)
                      </h2>
                      <p className="mt-0.5 text-xs text-amber-950">
                        Subtópicos com desempenho crítico mesmo quando a média geral da matéria aparenta domínio:
                      </p>
                      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {summary.pontosCegos.slice(0, 6).map((b) => (
                          <button
                            key={`${b.materia}::${b.subtopico}`}
                            type="button"
                            onClick={() =>
                              onInspectQuestions(
                                `Ponto cego: ${b.subtopico}`,
                                `${b.taxaSubtopico.toFixed(0)}% de acerto neste subtópico vs ${b.taxaMateria.toFixed(0)}% na matéria (${b.materia})`,
                                b.questoesErradas
                              )
                            }
                            className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--bg-surface)] p-3 text-left transition-colors hover:border-[var(--brand-accent)]"
                          >
                            <div className="text-xs font-semibold text-[var(--text-primary)]">
                              {b.subtopico}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                              {b.materia}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between font-mono text-xs tabular-nums">
                              <span className="font-bold text-[var(--status-error)]">
                                {b.taxaSubtopico.toFixed(0)}% no subtópico
                              </span>
                              <span className="text-[var(--text-muted)]">
                                ({b.taxaMateria.toFixed(0)}% na matéria)
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 2-Column BI Summary Row: Attempt Outcome Donut + Exam Accuracy Bars */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <CoverageDonutChart
                    title="Distribuição das Resoluções"
                    subtitle="Balanço entre acertos e erros realizados no Banco de Questões."
                    centerValue={`${summary.taxaAcertoGeral.toFixed(0)}%`}
                    centerLabel="acerto geral"
                    segments={[
                      {
                        id: 'acertos',
                        label: 'Acertos',
                        value: summary.totalAcertos,
                        color: '#059669',
                        icon: 'cobrado',
                      },
                      {
                        id: 'erros',
                        label: 'Erros',
                        value: summary.totalErros,
                        color: '#DC2626',
                        icon: 'nao_identificado',
                      },
                    ]}
                  />
                </div>

                <div className="lg:col-span-7">
                  <HorizontalFrequencyBarChart
                    title="Aproveitamento por Concurso (%)"
                    subtitle="Clique em qualquer prova para abrir as questões respondidas."
                    valueUnit="%"
                    maxItems={6}
                    items={summary.porConcurso.map((c) => ({
                      id: c.label,
                      label: c.label,
                      sublabel: `${c.acertos} acerto(s) · ${c.erros} erro(s)`,
                      value: Math.round(c.taxaAcerto),
                      color:
                        c.taxaAcerto >= 75
                          ? '#059669'
                          : c.taxaAcerto >= 55
                            ? '#D97706'
                            : '#DC2626',
                      questions: c.questoesTodas,
                    }))}
                    onSelectBar={(item) => {
                      if (item.questions && item.questions.length > 0) {
                        onInspectQuestions(
                          `Desempenho em ${item.label}`,
                          `${item.value}% de acerto (${item.questions.length} questão(ões) respondida(s))`,
                          item.questions
                        );
                      }
                    }}
                  />
                </div>
              </div>

              {/* Subject & Subtopic Accuracy */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="ui-card p-5">
                  <h2 className="ui-section-title">
                    Percentual de Acertos por Matéria
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Clique em qualquer matéria para inspecionar as questões respondidas e erradas.
                  </p>
                  <div className="mt-4 space-y-3">
                    {summary.porMateria.map((m) => (
                      <div key={m.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onInspectQuestions(
                                `Desempenho — ${m.label}`,
                                `${m.acertos} acertos · ${m.erros} erros · ${m.taxaAcerto.toFixed(1)}% de aproveitamento`,
                                m.questoesTodas
                              )
                            }
                            className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                          >
                            {m.label}
                          </button>
                          <span className="shrink-0 font-mono text-[var(--text-secondary)] tabular-nums">
                            <strong
                              className={
                                m.taxaAcerto >= 75
                                  ? 'text-[var(--status-success)]'
                                  : m.taxaAcerto >= 55
                                    ? 'text-[var(--status-warning)]'
                                    : 'text-[var(--status-error)]'
                              }
                            >
                              {m.taxaAcerto.toFixed(0)}%
                            </strong>{' '}
                            <span className="text-[var(--text-muted)]">
                              ({m.acertos}/{m.totalRespondidas})
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-xs bg-[var(--bg-surface-subtle)]">
                          <div
                            className={`h-full ${
                              m.taxaAcerto >= 75
                                ? 'bg-[#059669]'
                                : m.taxaAcerto >= 55
                                  ? 'bg-[#D97706]'
                                  : 'bg-[#DC2626]'
                            }`}
                            style={{ width: `${Math.max(4, m.taxaAcerto)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Subtopic Accuracy Table */}
                <section className="ui-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="ui-section-title">
                        Percentual por Subtópico
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Detalhamento granular para evitar falsos domínios na matéria.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={subtopicSearch}
                      onChange={(e) => setSubtopicSearch(e.target.value)}
                      placeholder="Filtrar subtópico..."
                      aria-label="Filtrar desempenho por subtópico"
                      className="ui-input !w-full sm:!w-48"
                    />
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                    {filteredSubtopics.map((s) => (
                      <div
                        key={`${s.parentGrupo}::${s.label}`}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              onInspectQuestions(
                                `Subtópico — ${s.label}`,
                                `${s.parentGrupo} · ${s.acertos} acerto(s) e ${s.erros} erro(s)`,
                                s.questoesTodas
                              )
                            }
                            className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                          >
                            {s.label}
                          </button>
                          <div className="truncate text-[11px] text-[var(--text-muted)]">
                            {s.parentGrupo}
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-mono tabular-nums">
                          <span
                            className={`font-bold ${
                              s.taxaAcerto >= 75
                                ? 'text-[var(--status-success)]'
                                : s.taxaAcerto >= 55
                                  ? 'text-[var(--status-warning)]'
                                  : 'text-[var(--status-error)]'
                            }`}
                          >
                            {s.taxaAcerto.toFixed(0)}%
                          </span>
                          <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">
                            ({s.acertos}/{s.totalRespondidas})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Errors by Board + Errors by Exam */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="ui-card p-5">
                  <h2 className="ui-section-title">
                    Erros e Aproveitamento por Banca
                  </h2>
                  <div className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {summary.porBanca.map((b) => (
                      <div
                        key={b.label}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {b.label}
                          </div>
                          <div className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                            {b.acertos} acertos · {b.erros} erros
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            {b.taxaAcerto.toFixed(0)}%
                          </span>
                          {b.questoesErradas.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onInspectQuestions(
                                  `Erros na banca ${b.label}`,
                                  `${b.questoesErradas.length} questão(ões) errada(s)`,
                                  b.questoesErradas
                                )
                              }
                              className="min-h-[32px] text-xs font-semibold text-[var(--status-error)] hover:underline whitespace-nowrap"
                            >
                              Ver erros ({b.questoesErradas.length})
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="ui-card p-5">
                  <h2 className="ui-section-title">Erros por Concurso</h2>
                  <div className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {summary.porConcurso.map((c) => (
                      <div
                        key={c.label}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {c.label}
                          </div>
                          <div className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                            {c.acertos} acertos · {c.erros} erros
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            {c.taxaAcerto.toFixed(0)}%
                          </span>
                          {c.questoesErradas.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onInspectQuestions(
                                  `Erros em ${c.label}`,
                                  `${c.questoesErradas.length} questão(ões) errada(s)`,
                                  c.questoesErradas
                                )
                              }
                              className="min-h-[32px] text-xs font-semibold text-[var(--status-error)] hover:underline whitespace-nowrap"
                            >
                              Ver erros ({c.questoesErradas.length})
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Error Recurrence + Chronological Timeline */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="ui-card p-5">
                  <h2 className="ui-section-title">
                    Temas com Maior Reincidência de Erros
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Temas que acumularam erros nas suas tentativas do Banco de Questões.
                  </p>
                  {summary.reincidenciaErros.length === 0 ? (
                    <p className="mt-4 text-xs text-[var(--status-success)]">
                      Nenhum erro registrado até o momento.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-[var(--border-subtle)]">
                      {summary.reincidenciaErros.slice(0, 8).map((err) => (
                        <div
                          key={err.tema}
                          className="flex items-center justify-between gap-3 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                onInspectQuestions(
                                  `Reincidência — ${err.tema}`,
                                  `${err.errosCount} erro(s) em ${err.tentativasTotais} tentativa(s)`,
                                  err.questoes
                                )
                              }
                              className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--brand-primary-ink)]"
                            >
                              {err.tema}
                            </button>
                            <div className="text-xs text-[var(--text-muted)]">
                              {err.grupoEstudo} · {err.bancas.join(', ')}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-xs font-bold text-[var(--status-error)] tabular-nums">
                            {err.errosCount} erro(s) ({err.taxaErro.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Evolution Over Time SVG Chart */}
                <section className="ui-card p-5">
                  <h2 className="ui-section-title">
                    Evolução do Desempenho ao Longo do Tempo
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Taxa de acertos por sessão/data (linha sólida) e média acumulada (tracejada).
                  </p>

                  {summary.evolucaoTemporal.length > 0 && (
                    <div className="mt-4">
                      <svg
                        viewBox="0 0 420 170"
                        className="h-44 w-full"
                        role="img"
                        aria-label="Gráfico de evolução do percentual de acertos ao longo do tempo"
                      >
                        {[0, 25, 50, 75, 100].map((v) => {
                          const y = 135 - (v / 100) * 110;
                          return (
                            <g key={v}>
                              <line
                                x1={42}
                                y1={y}
                                x2={402}
                                y2={y}
                                stroke="#E2E8F0"
                                strokeWidth={1}
                              />
                              <text
                                x={36}
                                y={y + 4}
                                textAnchor="end"
                                className="fill-[#475569] font-mono text-[11px]"
                              >
                                {v}%
                              </text>
                            </g>
                          );
                        })}

                        {summary.evolucaoTemporal.length > 1 && (
                          <>
                            <polyline
                              fill="none"
                              stroke="#526077"
                              strokeWidth={1.5}
                              strokeDasharray="4 3"
                              points={summary.evolucaoTemporal
                                .map((p, i) => {
                                  const x =
                                    52 +
                                    (i / (summary.evolucaoTemporal.length - 1)) * 336;
                                  const y = 135 - (p.taxaAcumulada / 100) * 110;
                                  return `${x},${y}`;
                                })
                                .join(' ')}
                            />
                            <polyline
                              fill="none"
                              stroke="#2563EB"
                              strokeWidth={2.4}
                              points={summary.evolucaoTemporal
                                .map((p, i) => {
                                  const x =
                                    52 +
                                    (i / (summary.evolucaoTemporal.length - 1)) * 336;
                                  const y = 135 - (p.taxaAcerto / 100) * 110;
                                  return `${x},${y}`;
                                })
                                .join(' ')}
                            />
                          </>
                        )}

                        {summary.evolucaoTemporal.map((p, i) => {
                          const x =
                            summary.evolucaoTemporal.length === 1
                              ? 220
                              : 52 +
                                (i / (summary.evolucaoTemporal.length - 1)) * 336;
                          const y = 135 - (p.taxaAcerto / 100) * 110;
                          return (
                            <g key={p.dateKey}>
                              <circle cx={x} cy={y} r={4.5} fill="#14213D" stroke="#FFFFFF" strokeWidth={1.5} />
                              <text
                                x={x}
                                y={157}
                                textAnchor="middle"
                                className="fill-[#334155] font-mono text-[11px]"
                              >
                                {p.label}
                              </text>
                              <text
                                x={x}
                                y={Math.max(14, y - 9)}
                                textAnchor="middle"
                                className="fill-[#14213D] font-mono text-[11px] font-bold"
                              >
                                {p.taxaAcerto.toFixed(0)}%
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </>
      )}

      {/* Full Chronological Student History Table */}
      {subTab === 'historico' && (
        <section className="ui-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-3.5">
            <div>
              <h2 className="ui-section-title">
                Histórico Cronológico no Banco de Questões ({summary.historicoOrdenado.length})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Acertos e erros registrados ao corrigir questões na aba Banco de Questões — Provas Originais.
              </p>
            </div>
            {onOpenOriginalBank && (
              <button
                type="button"
                onClick={onOpenOriginalBank}
                className="ui-btn-primary"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                Resolver no Banco de Questões
              </button>
            )}
          </div>

          {summary.historicoOrdenado.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Nenhum acerto ou erro registrado no Banco de Questões ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-3 py-3">Prova e Questão</th>
                    <th className="px-3 py-3">Tema</th>
                    <th className="px-3 py-3">Resp. / Gab.</th>
                    <th className="px-3 py-3">Resultado</th>
                    <th className="px-3 py-3">Tempo</th>
                    <th className="px-3 py-3">Confiança · Dif.</th>
                    <th className="px-3 py-3">Revisão</th>
                    <th className="px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {summary.historicoOrdenado.map(({ attempt, question }) => (
                    <tr
                      key={attempt.id}
                      className="transition-colors hover:bg-[var(--bg-surface-hover)]"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                        {attempt.answeredAt.slice(0, 10)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectQuestion(
                              question,
                              summary.historicoOrdenado.map((r) => r.question)
                            )
                          }
                          className="font-mono font-semibold text-[var(--brand-primary-ink)] hover:underline"
                        >
                          {question.concursoCurto} · Q{question.questao}
                        </button>
                      </td>
                      <td className="max-w-xs px-3 py-3">
                        <div className="truncate font-medium text-[var(--text-primary)]">
                          {question.tema}
                        </div>
                        <div className="truncate text-xs text-[var(--text-muted)]">
                          {question.grupoEstudo}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[var(--text-primary)] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span>
                            {attempt.minhaResposta} /{' '}
                            {revealedHistoryIds[attempt.id] ? attempt.gabarito : '••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedHistoryIds((prev) => ({
                                ...prev,
                                [attempt.id]: !prev[attempt.id],
                              }))
                            }
                            aria-label={
                              revealedHistoryIds[attempt.id]
                                ? 'Ocultar gabarito'
                                : 'Exibir gabarito'
                            }
                            title={
                              revealedHistoryIds[attempt.id]
                                ? 'Ocultar gabarito'
                                : 'Exibir gabarito'
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                          >
                            {revealedHistoryIds[attempt.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">
                        <span
                          className={
                            attempt.status === 'acerto'
                              ? 'text-[var(--status-success)]'
                              : 'text-[var(--status-error)]'
                          }
                        >
                          {attempt.status === 'acerto' ? 'Acerto' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                        {formatTime(attempt.timeSeconds ?? null)}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                        {CONFIDENCE_LABELS[attempt.confianca]} ·{' '}
                        {DIFFICULTY_LABELS[attempt.dificuldade]}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-primary)] whitespace-nowrap">
                        {attempt.revisaoNecessaria ? 'Sim' : 'Não'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteAttempt(attempt.id, question.id)}
                          aria-label={`Excluir registro ${question.concursoCurto} Q${question.questao}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
