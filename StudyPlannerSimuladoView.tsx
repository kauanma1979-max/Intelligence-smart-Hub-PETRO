import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Target,
  Upload,
} from 'lucide-react';
import type {
  ConfidenceLevel,
  PerceivedDifficulty,
  PerformanceStatus,
  QuestionPerformance,
  QuestionRecord,
  SimuladoConfig,
  SimuladoDifficultyFilter,
  SimuladoSelectionMode,
  StudentAttemptRecord,
} from '../types/exam';
import {
  buildSmartStudyPlan,
  generateCustomSimulado,
  getAvailableEditalScopes,
  getQuestionAnswerKeyInfo,
  isAnswerMatchingGabarito,
} from '../utils/examIntelligence';
import { HorizontalFrequencyBarChart } from './DataVizCharts';

interface StudyPlannerSimuladoViewProps {
  questions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  attempts: StudentAttemptRecord[];
  attachedPdfs: Record<string, string>;
  onAttachPdf: (filename: string, url: string) => void;
  onSaveSimuladoBatch: (batch: StudentAttemptRecord[]) => void;
  onSelectQuestion: (q: QuestionRecord, contextList: QuestionRecord[]) => void;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

interface SimuladoDraftAnswer {
  minhaResposta: string;
  gabarito: string;
  status: 'auto' | Exclude<PerformanceStatus, 'pendente'>;
  confianca: ConfidenceLevel;
  dificuldade: PerceivedDifficulty;
  revisaoNecessaria: boolean;
}

export const StudyPlannerSimuladoView: React.FC<StudyPlannerSimuladoViewProps> = ({
  questions,
  performanceMap,
  attempts,
  attachedPdfs,
  onAttachPdf,
  onSaveSimuladoBatch,
  onSelectQuestion,
  onInspectQuestions,
}) => {
  const [subTab, setSubTab] = useState<'plano' | 'simulado'>('plano');
  const [editalScopeId, setEditalScopeId] = useState<string>('ALL');

  const editalOptions = useMemo(() => getAvailableEditalScopes(), []);
  const planBlocks = useMemo(
    () => buildSmartStudyPlan(questions, performanceMap, attempts, editalScopeId),
    [questions, performanceMap, attempts, editalScopeId]
  );

  // Simulado builder state
  const bancas = useMemo(
    () => Array.from(new Set(questions.map((q) => q.banca))).sort(),
    [questions]
  );
  const provas = useMemo(
    () => Array.from(new Set(questions.map((q) => q.concursoCurto))),
    [questions]
  );
  const grupos = useMemo(
    () => Array.from(new Set(questions.map((q) => q.grupoEstudo))).sort(),
    [questions]
  );

  const [config, setConfig] = useState<SimuladoConfig>({
    banca: 'Todas',
    prova: 'Todas',
    grupo: 'Todas',
    dificuldade: 'todas',
    quantidade: 10,
    modo: 'inteligente_pareto_erros',
  });

  const [activeSimulado, setActiveSimulado] = useState<QuestionRecord[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, SimuladoDraftAnswer>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [simuladoSavedMsg, setSimuladoSavedMsg] = useState<string | null>(null);
  const [expandedPdfId, setExpandedPdfId] = useState<string | null>(null);
  const [revealSimuladoKeys, setRevealSimuladoKeys] = useState(false);
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const startSimuladoWithConfig = (nextConfig: SimuladoConfig) => {
    const generated = generateCustomSimulado(
      questions,
      nextConfig,
      performanceMap,
      attempts
    );
    setConfig(nextConfig);
    setActiveSimulado(generated);
    const initialDrafts: Record<string, SimuladoDraftAnswer> = {};
    for (const q of generated) {
      const isCeb = q.banca.toUpperCase().includes('CEBRASPE');
      const ak = getQuestionAnswerKeyInfo(q);
      initialDrafts[q.id] = {
        minhaResposta: '',
        gabarito: ak.isAnnulled
          ? 'ANULADA'
          : ak.expectedChoiceValue || (isCeb ? 'Certo' : 'A'),
        status: 'auto',
        confianca: 'media',
        dificuldade: 'media',
        revisaoNecessaria: false,
      };
    }
    setDraftAnswers(initialDrafts);
    setElapsedSec(0);
    setTimerRunning(generated.length > 0);
    setSimuladoSavedMsg(null);
    setExpandedPdfId(null);
    setRevealSimuladoKeys(false);
    setRevealedQuestionIds({});
  };

  const handleUpdateDraft = (
    qId: string,
    patch: Partial<SimuladoDraftAnswer>
  ) => {
    setDraftAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], ...patch },
    }));
  };

  const answeredCount = useMemo(
    () =>
      activeSimulado.filter((q) => {
        const d = draftAnswers[q.id];
        return d && (d.minhaResposta.trim() !== '' || d.status !== 'auto');
      }).length,
    [activeSimulado, draftAnswers]
  );

  const handleFinalizeSimulado = () => {
    if (activeSimulado.length === 0) return;
    const answeredItems = activeSimulado.filter((q) => {
      const d = draftAnswers[q.id];
      return d && (d.minhaResposta.trim() !== '' || d.status !== 'auto');
    });
    if (answeredItems.length === 0) return;

    const avgSecPerQuestion =
      elapsedSec > 0 ? Math.max(10, Math.round(elapsedSec / answeredItems.length)) : undefined;
    const nowIso = new Date().toISOString();

    const batch: StudentAttemptRecord[] = answeredItems.map((q) => {
      const d = draftAnswers[q.id];
      const mine = d.minhaResposta.trim();
      const gab = d.gabarito.trim();
      let finalStatus: Exclude<PerformanceStatus, 'pendente'>;
      if (d.status !== 'auto') {
        finalStatus = d.status;
      } else if (q.isAnnulled || gab.toUpperCase() === 'ANULADA') {
        finalStatus = 'revisar';
      } else if (mine && gab) {
        finalStatus = isAnswerMatchingGabarito(mine, gab, q) ? 'acerto' : 'erro';
      } else {
        finalStatus = d.revisaoNecessaria ? 'revisar' : 'acerto';
      }

      return {
        id: `sim-${Date.now()}-${q.questao}-${Math.random().toString(36).slice(2, 6)}`,
        questionId: q.id,
        minhaResposta: mine || (finalStatus === 'acerto' ? gab : '—'),
        gabarito: gab || '—',
        status: finalStatus,
        timeSeconds: avgSecPerQuestion,
        confianca: d.confianca,
        dificuldade: d.dificuldade,
        revisaoNecessaria:
          d.revisaoNecessaria || finalStatus === 'erro' || finalStatus === 'revisar',
        notes: 'Registrado via Simulado Personalizado (Módulo 15)',
        answeredAt: nowIso,
      };
    });

    onSaveSimuladoBatch(batch);
    setTimerRunning(false);
    setSimuladoSavedMsg(
      `${batch.length} questão(ões) salva(s) no seu Histórico e Painel de Desempenho.`
    );
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const highCount = planBlocks.filter((b) => b.prioridade === 'alta').length;
  const totalErrors = planBlocks.reduce((s, b) => s + b.errosCount, 0);
  const totalPending = planBlocks.reduce((s, b) => s + b.questoesNaoResolvidasCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Planejador Inteligente de Estudos e Simulados
          </h1>
          <p className="ui-page-subtitle">
            Integra Pareto 80/20, histórico dos concursos, edital escolhido e seu desempenho individual em atividades rastreáveis e simulados personalizados.
          </p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Modos do planejador e simulados"
        >
          <button
            type="button"
            onClick={() => setSubTab('plano')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'plano'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Plano de Estudos Recomendado
          </button>
          <button
            type="button"
            onClick={() => setSubTab('simulado')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'simulado'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Montar Simulado ({activeSimulado.length}q)
          </button>
        </div>
      </div>

      {/* PLANO DE ESTUDOS RECOMENDADO */}
      {subTab === 'plano' && (
        <div className="space-y-5">
          {/* Edital Selector + KPI Bar */}
          <div className="ui-card flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0 w-full sm:min-w-[240px] sm:flex-1">
              <label
                htmlFor="planner-edital"
                className="block text-xs font-medium text-[var(--text-muted)]"
              >
                Edital de referência para priorização e lacunas
              </label>
              <select
                id="planner-edital"
                value={editalScopeId}
                onChange={(e) => setEditalScopeId(e.target.value)}
                className="ui-select mt-1 max-w-lg font-semibold"
              >
                <option value="ALL">Todos os editais consolidados (270 questões)</option>
                {editalOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  Blocos prioridade alta
                </div>
                <div className="font-mono text-base font-bold text-[var(--status-error)] tabular-nums">
                  {highCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  Erros pendentes
                </div>
                <div className="font-mono text-base font-bold text-[var(--brand-accent)] tabular-nums">
                  {totalErrors}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  Questões inéditas
                </div>
                <div className="font-mono text-base font-bold text-[var(--brand-primary-ink)] tabular-nums">
                  {totalPending}
                </div>
              </div>
            </div>
          </div>

          {/* Priority Ranking Chart */}
          <HorizontalFrequencyBarChart
            title="Índice de Prioridade por Bloco de Estudo"
            subtitle="Combina Pareto 80/20, peso no edital selecionado e histórico de acertos/erros. Clique em um bloco para abrir suas questões."
            valueUnit=" pts"
            maxItems={10}
            items={planBlocks.map((b) => ({
              id: b.grupo,
              label: b.grupo,
              sublabel: `${b.concentracaoHistoricaPct.toFixed(1)}% da amostra (${b.frequenciaHistorica}q) · ${b.errosCount} erro(s) · ${b.questoesNaoResolvidasCount} pendente(s)`,
              value: Math.round(b.scorePrioridade),
              color:
                b.prioridade === 'alta'
                  ? '#DC2626'
                  : b.prioridade === 'media'
                    ? '#D97706'
                    : '#059669',
              questions: b.questoesDoBloco,
            }))}
            onSelectBar={(item) => {
              const block = planBlocks.find((b) => b.grupo === item.id);
              if (block) {
                onInspectQuestions(
                  `Bloco de estudo: ${block.grupo}`,
                  block.justificativa,
                  block.questoesDoBloco
                );
              }
            }}
          />

          {/* Study Plan Blocks */}
          <div className="space-y-4">
            {planBlocks.map((block) => {
              const priorityStyle =
                block.prioridade === 'alta'
                  ? 'text-[var(--status-error)]'
                  : block.prioridade === 'media'
                    ? 'text-[var(--status-warning)]'
                    : 'text-[var(--status-success)]';
              const priorityLabel =
                block.prioridade === 'alta'
                  ? 'Prioridade alta'
                  : block.prioridade === 'media'
                    ? 'Prioridade média'
                    : 'Manutenção';

              return (
                <section key={block.grupo} className="ui-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-bold uppercase tracking-wide ${priorityStyle}`}>
                          {priorityLabel}
                        </span>
                        <span className="text-[var(--border-strong)]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-[var(--text-secondary)] tabular-nums">
                          {block.concentracaoHistoricaPct.toFixed(1)}% da amostra ({block.frequenciaHistorica}q)
                        </span>
                        <span className="text-[var(--border-strong)]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          {block.isNucleo80 ? 'Núcleo Pareto 80/20' : 'Bloco Complementar'}
                        </span>
                      </div>

                      <h2 className="mt-1 text-base font-bold text-[var(--text-primary)]">
                        {block.grupo}
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {block.justificativa}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            `Bloco de estudo: ${block.grupo}`,
                            block.justificativa,
                            block.questoesDoBloco
                          )
                        }
                        className="ui-btn-secondary"
                      >
                        Ver todas ({block.questoesDoBloco.length}q)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubTab('simulado');
                          startSimuladoWithConfig({
                            banca: 'Todas',
                            prova: 'Todas',
                            grupo: block.grupo,
                            dificuldade: 'todas',
                            quantidade: Math.min(10, block.questoesDoBloco.length),
                            modo: 'inteligente_pareto_erros',
                          });
                        }}
                        className="ui-btn-primary"
                      >
                        <Target className="h-3.5 w-3.5" />
                        Simulado do bloco
                      </button>
                    </div>
                  </div>

                  {/* Traceable Activities List */}
                  <div className="mt-3.5 space-y-2.5">
                    <div className="ui-kicker">
                      Atividades recomendadas com rastreabilidade na prova e página do PDF
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                      {block.atividades.map((act) => (
                        <div key={act.id} className="ui-surface-subtle p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-semibold text-[var(--text-primary)]">
                              {act.titulo}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onInspectQuestions(
                                  act.titulo,
                                  `${block.grupo} — ${act.detalhe}`,
                                  act.questoesAlvo
                                )
                              }
                              className="min-h-[32px] shrink-0 text-xs font-semibold text-[var(--brand-primary-ink)] hover:underline whitespace-nowrap"
                            >
                              Abrir ({act.questoesAlvo.length}) →
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            {act.detalhe}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {act.questoesAlvo.slice(0, 4).map((q) => (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => onSelectQuestion(q, act.questoesAlvo)}
                                className="min-h-[30px] rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-0.5 font-mono text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)] whitespace-nowrap"
                              >
                                {q.concursoCurto} · Q{q.questao} · Pág. {q.paginaPdf}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* SIMULADO BUILDER & EXECUTOR */}
      {subTab === 'simulado' && (
        <div className="space-y-5">
          {/* Simulado Configurator */}
          <section className="ui-card p-5">
            <h2 className="ui-section-title">
              Configurar Simulado Personalizado
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Combine filtros por banca, concurso, matéria, profundidade/dificuldade e prioridade para montar um caderno de treino rastreável.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label
                  htmlFor="sim-banca"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Banca
                </label>
                <select
                  id="sim-banca"
                  value={config.banca}
                  onChange={(e) => setConfig((c) => ({ ...c, banca: e.target.value }))}
                  className="ui-select mt-1"
                >
                  <option value="Todas">Todas as bancas</option>
                  {bancas.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sim-prova"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Prova / Concurso
                </label>
                <select
                  id="sim-prova"
                  value={config.prova}
                  onChange={(e) => setConfig((c) => ({ ...c, prova: e.target.value }))}
                  className="ui-select mt-1"
                >
                  <option value="Todas">Todas as provas</option>
                  {provas.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="sim-materia"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Matéria / Grupo de estudo
                </label>
                <select
                  id="sim-materia"
                  value={config.grupo}
                  onChange={(e) => setConfig((c) => ({ ...c, grupo: e.target.value }))}
                  className="ui-select mt-1"
                >
                  <option value="Todas">Todas as matérias</option>
                  {grupos.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sim-dificuldade"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Dificuldade / Nível
                </label>
                <select
                  id="sim-dificuldade"
                  value={config.dificuldade}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      dificuldade: e.target.value as SimuladoDifficultyFilter,
                    }))
                  }
                  className="ui-select mt-1"
                >
                  <option value="todas">Todos os níveis</option>
                  <option value="basico">Fácil (Conceitos básicos)</option>
                  <option value="aplicacao">Média (Aplicação técnica)</option>
                  <option value="calculo_estrutura">Difícil (Cálculo / Estrutura)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sim-qtd"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Quantidade
                </label>
                <input
                  id="sim-qtd"
                  type="number"
                  min={1}
                  max={100}
                  value={config.quantidade}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      quantidade: Math.max(1, Number.parseInt(e.target.value || '10', 10)),
                    }))
                  }
                  className="ui-input mt-1 font-mono"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <label
                  htmlFor="sim-modo"
                  className="text-xs font-medium text-[var(--text-secondary)]"
                >
                  Critério de seleção:
                </label>
                <select
                  id="sim-modo"
                  value={config.modo}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      modo: e.target.value as SimuladoSelectionMode,
                    }))
                  }
                  className="ui-select !w-full sm:!w-auto"
                >
                  <option value="inteligente_pareto_erros">
                    Inteligente (priorizar erros, revisão e Pareto 80/20)
                  </option>
                  <option value="pendentes">Somente questões inéditas/pendentes</option>
                  <option value="equilibrado">Distribuição equilibrada por assunto</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => startSimuladoWithConfig(config)}
                className="ui-btn-primary"
              >
                <Target className="h-3.5 w-3.5" />
                Gerar simulado
              </button>
            </div>
          </section>

          {simuladoSavedMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-3.5 text-xs font-medium text-[var(--status-success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--status-success)]" />
              {simuladoSavedMsg}
            </div>
          )}

          {/* Active Simulado Execution Sheet */}
          {activeSimulado.length > 0 && (
            <section className="ui-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-3.5">
                <div>
                  <h2 className="ui-section-title">
                    Caderno de Simulado Gerado ({activeSimulado.length} questões)
                  </h2>
                  <p className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                    {answeredCount}/{activeSimulado.length} preenchida(s) · Tempo:{' '}
                    <strong className="text-[var(--text-primary)]">
                      {formatTimer(elapsedSec)}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerRunning((r) => !r)}
                    className="ui-btn-secondary"
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        Pausar cronômetro
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Retomar cronômetro
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setElapsedSec(0);
                      setTimerRunning(false);
                    }}
                    aria-label="Zerar cronômetro"
                    className="ui-btn-secondary !px-2.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (revealSimuladoKeys) {
                        setRevealSimuladoKeys(false);
                        setRevealedQuestionIds({});
                      } else {
                        setRevealSimuladoKeys(true);
                      }
                    }}
                    className="ui-btn-secondary"
                  >
                    {revealSimuladoKeys ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Ocultar gabaritos
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Exibir gabaritos
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={answeredCount === 0}
                    onClick={handleFinalizeSimulado}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[var(--status-success)] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalizar simulado e salvar no histórico
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {activeSimulado.map((q, index) => {
                  const d = draftAnswers[q.id];
                  const isCeb = q.banca.toUpperCase().includes('CEBRASPE');
                  const akInfo = getQuestionAnswerKeyInfo(q);
                  const isKeyRevealed =
                    revealSimuladoKeys || Boolean(revealedQuestionIds[q.id]);
                  const choices = isCeb
                    ? ['Certo', 'Errado']
                    : ['A', 'B', 'C', 'D', 'E'];
                  const hasPdf = Boolean(attachedPdfs[q.arquivoOrigem]);

                  return (
                    <div key={q.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              #{index + 1}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[var(--brand-primary-ink)]">
                              {q.concursoCurto} — Questão {q.questao}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              Página {q.paginaPdf} do PDF
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{q.banca}</span>
                            {q.codigoPrograma && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[var(--text-secondary)]">
                                  {q.codigoPrograma}
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                            {q.tema}
                          </h3>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            {q.exigencia}
                          </p>
                          {q.contextText && (
                            <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/70 p-2.5 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                              {q.contextText}
                            </div>
                          )}
                          {q.statementWithoutNumber && (
                            <div className="mt-2 text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-line">
                              {q.statementWithoutNumber}
                            </div>
                          )}
                          {q.alternatives && q.alternatives.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {q.alternatives.map((alt) => {
                                const isPicked = d?.minhaResposta === alt.label;
                                const isCorrectAlt =
                                  isKeyRevealed &&
                                  !akInfo.isAnnulled &&
                                  akInfo.expectedChoiceValue === alt.label;
                                return (
                                  <li key={alt.label}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateDraft(q.id, {
                                          minhaResposta: alt.label,
                                        })
                                      }
                                      className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                                        isCorrectAlt
                                          ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--text-primary)]'
                                          : isPicked
                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--text-primary)]'
                                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                                      }`}
                                    >
                                      <span className="font-mono font-bold text-[var(--text-primary)]">
                                        ({alt.label})
                                      </span>
                                      <span className="flex-1 whitespace-pre-line">
                                        {alt.text}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          <div className="mt-1.5 break-all font-mono text-xs text-[var(--text-muted)]">
                            Arquivo: {q.arquivoOrigem}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPdfId(expandedPdfId === q.id ? null : q.id)
                            }
                            className="ui-btn-secondary text-[var(--brand-primary-ink)]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Abrir Pág. {q.paginaPdf}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectQuestion(q, activeSimulado)}
                            className="ui-btn-secondary"
                          >
                            Dossiê
                          </button>
                        </div>
                      </div>

                      {expandedPdfId === q.id && (
                        <div className="rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-[var(--brand-primary-ink)]">
                              {q.arquivoOrigem} — Pág. original {q.paginaPdf}
                              {q.specificPdfPage
                                ? ` (Pág. ${q.specificPdfPage} no PDF específico)`
                                : ''}
                            </span>
                            <label className="ui-btn-secondary cursor-pointer !min-h-[34px] text-[var(--brand-primary-ink)]">
                              <Upload className="h-3.5 w-3.5" />
                              {hasPdf ? 'Trocar PDF' : 'Anexar PDF completo'}
                              <input
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onAttachPdf(
                                      q.arquivoOrigem,
                                      URL.createObjectURL(file)
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {hasPdf ? (
                            <iframe
                              src={`${attachedPdfs[q.arquivoOrigem]}#page=${q.paginaPdf}`}
                              title={`${q.arquivoOrigem} pág ${q.paginaPdf}`}
                              className="mt-2 h-64 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                            />
                          ) : q.specificPdfPath ? (
                            <iframe
                              src={`${q.specificPdfPath}#page=${q.specificPdfPage ?? 1}`}
                              title={`${q.prova} específicas pág ${q.specificPdfPage ?? 1}`}
                              className="mt-2 h-64 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                            />
                          ) : null}
                        </div>
                      )}

                      {d && (
                        <div className="ui-surface-subtle grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <label
                              htmlFor={`sim-resp-${q.id}`}
                              className="block text-xs font-medium text-[var(--text-secondary)]"
                            >
                              Minha resposta
                            </label>
                            <select
                              id={`sim-resp-${q.id}`}
                              value={d.minhaResposta}
                              onChange={(e) =>
                                handleUpdateDraft(q.id, {
                                  minhaResposta: e.target.value,
                                })
                              }
                              className="ui-select mt-1"
                            >
                              <option value="">Selecionar...</option>
                              {choices.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <label
                                htmlFor={`sim-gab-${q.id}`}
                                className="block text-xs font-medium text-[var(--text-secondary)]"
                              >
                                Gabarito{' '}
                                {akInfo.isPreliminary && isKeyRevealed ? '(Preliminar)' : ''}
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedQuestionIds((prev) => ({
                                    ...prev,
                                    [q.id]: !isKeyRevealed,
                                  }))
                                }
                                aria-label={
                                  isKeyRevealed
                                    ? `Ocultar gabarito da questão ${q.questao}`
                                    : `Exibir gabarito da questão ${q.questao}`
                                }
                                title={
                                  isKeyRevealed ? 'Ocultar gabarito' : 'Exibir gabarito'
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                              >
                                {isKeyRevealed ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {isKeyRevealed ? (
                              <select
                                id={`sim-gab-${q.id}`}
                                value={d.gabarito}
                                disabled={akInfo.isAnnulled}
                                onChange={(e) =>
                                  handleUpdateDraft(q.id, { gabarito: e.target.value })
                                }
                                className="ui-select mt-1"
                              >
                                {akInfo.isAnnulled ? (
                                  <option value="ANULADA">ANULADA</option>
                                ) : (
                                  choices.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))
                                )}
                              </select>
                            ) : (
                              <button
                                type="button"
                                id={`sim-gab-${q.id}`}
                                onClick={() =>
                                  setRevealedQuestionIds((prev) => ({
                                    ...prev,
                                    [q.id]: true,
                                  }))
                                }
                                className="mt-1 flex min-h-[38px] w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                              >
                                <span>Oculto</span>
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor={`sim-res-${q.id}`}
                              className="block text-xs font-medium text-[var(--text-secondary)]"
                            >
                              Resultado
                            </label>
                            <select
                              id={`sim-res-${q.id}`}
                              value={d.status}
                              onChange={(e) =>
                                handleUpdateDraft(q.id, {
                                  status: e.target.value as SimuladoDraftAnswer['status'],
                                })
                              }
                              className="ui-select mt-1"
                            >
                              <option value="auto">Automático</option>
                              <option value="acerto">Acerto</option>
                              <option value="erro">Erro</option>
                              <option value="revisar">Revisar</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`sim-conf-${q.id}`}
                              className="block text-xs font-medium text-[var(--text-secondary)]"
                            >
                              Confiança
                            </label>
                            <select
                              id={`sim-conf-${q.id}`}
                              value={d.confianca}
                              onChange={(e) =>
                                handleUpdateDraft(q.id, {
                                  confianca: e.target.value as ConfidenceLevel,
                                })
                              }
                              className="ui-select mt-1"
                            >
                              <option value="alta">Alta</option>
                              <option value="media">Média</option>
                              <option value="baixa">Baixa</option>
                            </select>
                          </div>

                          <div className="flex items-end pb-1.5">
                            <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]">
                              <input
                                type="checkbox"
                                checked={d.revisaoNecessaria}
                                onChange={(e) =>
                                  handleUpdateDraft(q.id, {
                                    revisaoNecessaria: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--brand-primary)]"
                              />
                              Revisar depois
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
