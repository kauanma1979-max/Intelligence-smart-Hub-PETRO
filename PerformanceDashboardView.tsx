import React, { useMemo, useState } from 'react';
import { Plus, Trash2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import type {
  ConfidenceLevel,
  PerceivedDifficulty,
  PerformanceStatus,
  QuestionPerformance,
  QuestionRecord,
  StudentAttemptRecord,
} from '../types/exam';
import { buildStudentPerformanceSummary } from '../utils/examIntelligence';

interface PerformanceDashboardViewProps {
  questions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  attempts: StudentAttemptRecord[];
  onAddAttempt: (attempt: StudentAttemptRecord) => void;
  onDeleteAttempt: (attemptId: string, questionId: string) => void;
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
  onAddAttempt,
  onDeleteAttempt,
  onSelectQuestion,
  onInspectQuestions,
}) => {
  const [subTab, setSubTab] = useState<'painel' | 'registrar' | 'historico'>('painel');
  const [subtopicSearch, setSubtopicSearch] = useState('');

  // Form state for adding a new attempt
  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.prova))),
    [questions]
  );
  const [selectedProva, setSelectedProva] = useState<string>(() => exams[0] || '');

  const activeProva = exams.includes(selectedProva) ? selectedProva : exams[0] || '';
  const questionsInProva = useMemo(
    () =>
      questions
        .filter((q) => q.prova === activeProva)
        .sort((a, b) => a.questao - b.questao),
    [questions, activeProva]
  );

  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    () => questionsInProva[0]?.id || ''
  );

  const activeQuestion = useMemo(
    () =>
      questionsInProva.find((q) => q.id === selectedQuestionId) ||
      questionsInProva[0],
    [questionsInProva, selectedQuestionId]
  );

  const [minhaResposta, setMinhaResposta] = useState('A');
  const [gabarito, setGabarito] = useState('A');
  const [statusOverride, setStatusOverride] = useState<'auto' | Exclude<PerformanceStatus, 'pendente'>>('auto');
  const [timeSeconds, setTimeSeconds] = useState('120');
  const [confianca, setConfianca] = useState<ConfidenceLevel>('media');
  const [dificuldade, setDificuldade] = useState<PerceivedDifficulty>('media');
  const [revisaoNecessaria, setRevisaoNecessaria] = useState(false);
  const [answeredDate, setAnsweredDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const isCebraspe = activeQuestion?.banca.toUpperCase().includes('CEBRASPE') ?? false;

  const handleProvaChange = (nextProva: string) => {
    setSelectedProva(nextProva);
    const firstQ = questions
      .filter((q) => q.prova === nextProva)
      .sort((a, b) => a.questao - b.questao)[0];
    if (firstQ) {
      setSelectedQuestionId(firstQ.id);
      const ceb = firstQ.banca.toUpperCase().includes('CEBRASPE');
      setMinhaResposta(ceb ? 'Certo' : 'A');
      setGabarito(ceb ? 'Certo' : 'A');
    }
  };

  const handleQuestionChange = (qId: string) => {
    setSelectedQuestionId(qId);
    const q = questions.find((item) => item.id === qId);
    if (q) {
      const ceb = q.banca.toUpperCase().includes('CEBRASPE');
      if (ceb && !['Certo', 'Errado'].includes(minhaResposta)) {
        setMinhaResposta('Certo');
        setGabarito('Certo');
      } else if (!ceb && ['Certo', 'Errado'].includes(minhaResposta)) {
        setMinhaResposta('A');
        setGabarito('A');
      }
    }
  };

  const resolvedStatus: Exclude<PerformanceStatus, 'pendente'> = useMemo(() => {
    if (statusOverride !== 'auto') return statusOverride;
    const mine = minhaResposta.trim().toUpperCase();
    const gab = gabarito.trim().toUpperCase();
    if (mine && gab) {
      return mine === gab ? 'acerto' : 'erro';
    }
    return revisaoNecessaria ? 'revisar' : 'acerto';
  }, [statusOverride, minhaResposta, gabarito, revisaoNecessaria]);

  const handleSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion) return;

    const parsedTime = timeSeconds ? Number.parseInt(timeSeconds, 10) : undefined;
    const finalStatus = resolvedStatus;
    const needsReview = revisaoNecessaria || finalStatus === 'erro' || finalStatus === 'revisar';

    onAddAttempt({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questionId: activeQuestion.id,
      minhaResposta: minhaResposta.trim() || '—',
      gabarito: gabarito.trim() || '—',
      status: finalStatus,
      timeSeconds: Number.isFinite(parsedTime) ? parsedTime : undefined,
      confianca,
      dificuldade,
      revisaoNecessaria: needsReview,
      notes: notes.trim() || undefined,
      answeredAt: `${answeredDate || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
    });

    setNotes('');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const summary = useMemo(
    () => buildStudentPerformanceSummary(questions, performanceMap, attempts),
    [questions, performanceMap, attempts]
  );

  const filteredSubtopics = useMemo(() => {
    const s = subtopicSearch.trim().toLowerCase();
    if (!s) return summary.porSubtopico;
    return summary.porSubtopico.filter(
      (row) =>
        row.label.toLowerCase().includes(s) ||
        (row.parentGrupo || '').toLowerCase().includes(s)
    );
  }, [summary.porSubtopico, subtopicSearch]);

  const answerChoices = isCebraspe ? ['Certo', 'Errado'] : ['A', 'B', 'C', 'D', 'E'];

  const formatTime = (sec: number | null) => {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Painel de Desempenho Individual e Histórico
          </h1>
          <p className="ui-page-subtitle">
            Registre suas respostas reais às questões e identifique acertos por matéria, pontos cegos por subtópico, erros por banca/concurso e evolução temporal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setSubTab('registrar')}
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'registrar'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar resposta
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
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Questões registradas
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {summary.totalTentativas}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.questoesUnicasRespondidas} única(s) de {questions.length}
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
            Revisão necessária
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-accent)] tabular-nums">
            {summary.totalErros + summary.totalRevisar}
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
            Baseado nas tentativas com tempo
          </div>
        </div>
      </div>

      {/* Registration Form Tab */}
      {subTab === 'registrar' && (
        <section className="ui-card p-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Adicionar Registro ao Histórico do Estudante
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cada registro fica vinculado à prova e ao número exato da questão, atualizando automaticamente os diagnósticos e o planejador de estudos.
            </p>
          </div>

          <form onSubmit={handleSubmitAttempt} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="perf-prova"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Prova
                </label>
                <select
                  id="perf-prova"
                  value={activeProva}
                  onChange={(e) => handleProvaChange(e.target.value)}
                  className="ui-select mt-1"
                >
                  {exams.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="perf-questao"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Número da questão e Tema
                </label>
                <select
                  id="perf-questao"
                  value={activeQuestion?.id || ''}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  className="ui-select mt-1"
                >
                  {questionsInProva.map((q) => (
                    <option key={q.id} value={q.id}>
                      Q{q.questao} (Pág. {q.paginaPdf}) — {q.tema}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeQuestion && (
              <div className="ui-surface-subtle px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex flex-wrap items-center gap-2 font-medium text-[var(--text-primary)]">
                  <span>{activeQuestion.grupoEstudo}</span>
                  <span aria-hidden="true">·</span>
                  <span>Subtópico: {activeQuestion.subtopico || activeQuestion.topico}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[var(--brand-primary-ink)]">
                    {activeQuestion.banca} · Pág. {activeQuestion.paginaPdf}
                  </span>
                </div>
                <p className="mt-1 text-[var(--text-muted)]">{activeQuestion.exigencia}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="perf-minha-resp"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Minha resposta
                </label>
                <select
                  id="perf-minha-resp"
                  value={minhaResposta}
                  onChange={(e) => setMinhaResposta(e.target.value)}
                  className="ui-select mt-1"
                >
                  {answerChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="perf-gabarito"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Gabarito
                </label>
                <select
                  id="perf-gabarito"
                  value={gabarito}
                  onChange={(e) => setGabarito(e.target.value)}
                  className="ui-select mt-1"
                >
                  {answerChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="perf-acerto-erro"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Acerto ou erro
                </label>
                <select
                  id="perf-acerto-erro"
                  value={statusOverride}
                  onChange={(e) =>
                    setStatusOverride(
                      e.target.value as 'auto' | Exclude<PerformanceStatus, 'pendente'>
                    )
                  }
                  className="ui-select mt-1 font-semibold"
                >
                  <option value="auto">
                    Automático ({resolvedStatus === 'acerto' ? 'Acerto' : 'Erro'})
                  </option>
                  <option value="acerto">Acerto</option>
                  <option value="erro">Erro</option>
                  <option value="revisar">Marcar para revisar</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="perf-tempo-seg"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Tempo de resolução (seg)
                </label>
                <input
                  id="perf-tempo-seg"
                  type="number"
                  min={1}
                  value={timeSeconds}
                  onChange={(e) => setTimeSeconds(e.target.value)}
                  className="ui-input mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="perf-confianca"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Grau de confiança
                </label>
                <select
                  id="perf-confianca"
                  value={confianca}
                  onChange={(e) => setConfianca(e.target.value as ConfidenceLevel)}
                  className="ui-select mt-1"
                >
                  <option value="alta">Alta (certeza técnica)</option>
                  <option value="media">Média (dúvida entre 2 opções)</option>
                  <option value="baixa">Baixa (chute / insegurança)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="perf-dificuldade"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Dificuldade percebida
                </label>
                <select
                  id="perf-dificuldade"
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value as PerceivedDifficulty)}
                  className="ui-select mt-1"
                >
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="perf-data"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Data da resolução
                </label>
                <input
                  id="perf-data"
                  type="date"
                  value={answeredDate}
                  onChange={(e) => setAnsweredDate(e.target.value)}
                  className="ui-input mt-1 font-mono"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={revisaoNecessaria}
                    onChange={(e) => setRevisaoNecessaria(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--brand-primary)]"
                  />
                  Necessidade de revisão
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="perf-obs"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Motivo do erro / anotação de estudo (opcional)
              </label>
              <input
                id="perf-obs"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Errei conversão de unidades ou confundi deslocamento de equilíbrio..."
                className="ui-input mt-1"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
              <span className="text-xs text-[var(--text-muted)]">
                Resultado que será salvo:{' '}
                <strong
                  className={
                    resolvedStatus === 'acerto'
                      ? 'text-[var(--status-success)]'
                      : resolvedStatus === 'erro'
                        ? 'text-[var(--status-error)]'
                        : 'text-[var(--status-warning)]'
                  }
                >
                  {resolvedStatus === 'acerto'
                    ? 'Acerto'
                    : resolvedStatus === 'erro'
                      ? 'Erro'
                      : 'Revisar'}
                </strong>
              </span>

              <button type="submit" className="ui-btn-primary">
                {savedNotice ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Registro adicionado ao histórico
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Salvar resposta no histórico
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Analytical Dashboard Tab */}
      {subTab === 'painel' && (
        <>
          {summary.totalTentativas === 0 ? (
            <div className="ui-card border-dashed p-8 text-center">
              <h2 className="ui-section-title">
                Nenhum registro de resolução encontrado ainda
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-xs text-[var(--text-muted)]">
                Como os dados de desempenho são registros pessoais novos (não vêm prontos das duas planilhas), registre suas primeiras questões aqui ou aplique um simulado no Módulo 15 para desbloquear o diagnóstico completo.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('registrar')}
                className="ui-btn-primary mt-4"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar primeira resposta
              </button>
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
                            className="rounded-md border border-amber-200 bg-white p-3 text-left transition-colors hover:border-amber-400"
                          >
                            <div className="text-xs font-semibold text-slate-900">
                              {b.subtopico}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {b.materia}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between font-mono text-xs tabular-nums">
                              <span className="font-bold text-red-700">
                                {b.taxaSubtopico.toFixed(0)}% no subtópico
                              </span>
                              <span className="text-slate-500">
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
                                ? 'bg-[#15803D]'
                                : m.taxaAcerto >= 55
                                  ? 'bg-[#B45309]'
                                  : 'bg-[#B91C1C]'
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

                  <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
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
                            className="truncate text-left font-medium text-slate-900 hover:text-blue-700"
                          >
                            {s.label}
                          </button>
                          <div className="truncate text-[11px] text-slate-500">
                            {s.parentGrupo}
                          </div>
                        </div>
                        <div className="shrink-0 text-right font-mono tabular-nums">
                          <span
                            className={`font-bold ${
                              s.taxaAcerto >= 75
                                ? 'text-emerald-700'
                                : s.taxaAcerto >= 55
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                            }`}
                          >
                            {s.taxaAcerto.toFixed(0)}%
                          </span>
                          <span className="ml-1.5 text-[11px] text-slate-400">
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
                            {b.acertos} acertos · {b.erros} erros · {b.revisar} revisar
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
                                  `${b.questoesErradas.length} questão(ões) para revisão`,
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
                            {c.acertos} acertos · {c.erros} erros · {formatTime(c.tempoMedioSeg)} médio
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
                                  `${c.questoesErradas.length} questão(ões) erradas ou em revisão`,
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
                    Temas que acumularam erros ou necessidade de revisão nas suas tentativas.
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
                                  `${err.errosCount} erro(s)/revisão em ${err.tentativasTotais} tentativa(s)`,
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
                              stroke="#64748B"
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
                              stroke="#1B4FD8"
                              strokeWidth={2.2}
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
                              <circle cx={x} cy={y} r={4} fill="#1B4FD8" />
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
                                className="fill-[#143B9E] font-mono text-[11px] font-bold"
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
                Histórico Cronológico do Estudante ({summary.historicoOrdenado.length})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Todos os registros de resposta vinculados à prova, número da questão, gabarito, confiança e dificuldade percebida.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('registrar')}
              className="ui-btn-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo registro
            </button>
          </div>

          {summary.historicoOrdenado.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Nenhuma resposta registrada ainda.
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
                        {attempt.minhaResposta} / {attempt.gabarito}
                      </td>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">
                        <span
                          className={
                            attempt.status === 'acerto'
                              ? 'text-[var(--status-success)]'
                              : attempt.status === 'erro'
                                ? 'text-[var(--status-error)]'
                                : 'text-[var(--status-warning)]'
                          }
                        >
                          {attempt.status === 'acerto'
                            ? 'Acerto'
                            : attempt.status === 'erro'
                              ? 'Erro'
                              : 'Revisar'}
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
