import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import type {
  OriginalBankFilters,
  QuestionPerformance,
  QuestionRecord,
  SpecificExamMetadata,
  StudentAttemptRecord,
} from '../types/exam';
import {
  buildExamCountValidation,
  filterOriginalBankQuestions,
  filterOriginalBankScoringAttempts,
  getQuestionAnswerKeyInfo,
  isAnswerMatchingGabarito,
  resolveQuestionByKey,
} from '../utils/examIntelligence';
import { QuestionVisualAndPdfPanel } from './QuestionVisualAndPdfPanel';

interface OriginalQuestionsBankViewProps {
  questions: QuestionRecord[];
  provasMeta: SpecificExamMetadata[];
  performanceMap: Record<string, QuestionPerformance>;
  attempts?: StudentAttemptRecord[];
  onUpdatePerformance: (id: string, perf: QuestionPerformance) => void;
  onAddAttempt: (attempt: StudentAttemptRecord) => void;
  initialQuestionKey?: string | null;
  initialFilters?: Partial<OriginalBankFilters> | null;
  onConsumeInitialSelection?: () => void;
}

const DEFAULT_FILTERS: OriginalBankFilters = {
  query: '',
  empresa: 'Todas',
  prova: 'Todas',
  ano: 'Todos',
  banca: 'Todas',
  enfase: 'Todas',
  grupo: 'Todas',
  area: 'Todas',
  tema: 'Todos',
  questaoNumero: '',
};

const getStableKey = (q: QuestionRecord) =>
  q.questionId || q.appLookupKey || q.id;

export const OriginalQuestionsBankView: React.FC<OriginalQuestionsBankViewProps> = ({
  questions,
  provasMeta,
  performanceMap,
  attempts = [],
  onUpdatePerformance,
  onAddAttempt,
  initialQuestionKey = null,
  initialFilters = null,
  onConsumeInitialSelection,
}) => {
  // Strictly scope this area to the 5 official specific-knowledge exams (no basic subjects, no synthetic exams without examId)
  const specificQuestions = useMemo(
    () =>
      questions.filter(
        (q) => !q.isCustom && (Boolean(q.examId) || Boolean(q.appLookupKey))
      ),
    [questions]
  );

  const [filters, setFilters] = useState<OriginalBankFilters>(DEFAULT_FILTERS);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Per-question solving state keyed strictly by stable question_id / app_lookup_key
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [gradedKeys, setGradedKeys] = useState<Record<string, boolean>>({});
  const [gradedChoices, setGradedChoices] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [showImageMap, setShowImageMap] = useState<Record<string, boolean>>({});
  const [showPdfMap, setShowPdfMap] = useState<Record<string, boolean>>({});

  // Hydrate previously graded original-bank answers & clear cleanly when attempts are reset
  useEffect(() => {
    const scoringAttempts = filterOriginalBankScoringAttempts(attempts);
    if (scoringAttempts.length === 0) {
      if (attempts.length === 0 && Object.keys(performanceMap).length === 0) {
        setSelectedAnswers({});
        setGradedKeys({});
        setGradedChoices({});
        setRevealedKeys({});
      }
      return;
    }

    const qIdToStableKey = new Map<string, string>();
    for (const q of specificQuestions) {
      qIdToStableKey.set(q.id, getStableKey(q));
    }

    const latestAttemptChoice: Record<string, string> = {};
    const latestGraded: Record<string, boolean> = {};
    const sorted = [...scoringAttempts].sort((a, b) =>
      b.answeredAt.localeCompare(a.answeredAt)
    );
    for (const att of sorted) {
      const sKey = qIdToStableKey.get(att.questionId);
      if (!sKey || latestAttemptChoice[sKey]) continue;
      if (att.minhaResposta && att.minhaResposta !== '—') {
        latestAttemptChoice[sKey] = att.minhaResposta;
        latestGraded[sKey] = true;
      }
    }

    setGradedKeys((prev) => ({ ...latestGraded, ...prev }));
    setGradedChoices((prev) => ({ ...latestAttemptChoice, ...prev }));
    setSelectedAnswers((prev) => ({ ...latestAttemptChoice, ...prev }));
    setRevealedKeys((prev) => ({ ...latestGraded, ...prev }));
  }, [attempts, performanceMap, specificQuestions]);

  // Consume deep-link selection from Dashboard / Pareto / Drilldown Drawer
  useEffect(() => {
    if (!initialQuestionKey && !initialFilters) return;
    if (initialFilters) {
      setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    }
    if (initialQuestionKey) {
      const target = resolveQuestionByKey(specificQuestions, initialQuestionKey);
      if (target) {
        setSelectedKey(getStableKey(target));
        setMobileDetailOpen(true);
      }
    }
    onConsumeInitialSelection?.();
  }, [
    initialQuestionKey,
    initialFilters,
    specificQuestions,
    onConsumeInitialSelection,
  ]);

  const examValidation = useMemo(
    () => buildExamCountValidation(provasMeta, specificQuestions),
    [provasMeta, specificQuestions]
  );

  const filterOptions = useMemo(() => {
    const uniq = (arr: string[]) =>
      Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return {
      empresas: uniq(specificQuestions.map((q) => q.empresa)),
      provas: uniq(specificQuestions.map((q) => q.prova)),
      anos: uniq(specificQuestions.map((q) => q.ano)),
      bancas: uniq(specificQuestions.map((q) => q.banca)),
      enfases: uniq(specificQuestions.map((q) => q.enfase)),
      grupos: uniq(specificQuestions.map((q) => q.grupoEstudo)),
      areas: uniq(specificQuestions.map((q) => q.areaOriginal)),
      temas: uniq(specificQuestions.map((q) => q.tema)),
    };
  }, [specificQuestions]);

  const matches = useMemo(
    () => filterOriginalBankQuestions(specificQuestions, filters),
    [specificQuestions, filters]
  );

  const activeQuestion = useMemo(() => {
    if (matches.length === 0) return null;
    if (selectedKey) {
      const found = matches.find((q) => getStableKey(q) === selectedKey);
      if (found) return found;
    }
    return matches[0];
  }, [matches, selectedKey]);

  useEffect(() => {
    if (matches.length > 0 && !activeQuestion) {
      setSelectedKey(getStableKey(matches[0]));
    }
  }, [matches, activeQuestion]);

  const activeStableKey = activeQuestion ? getStableKey(activeQuestion) : '';
  const activeKeyInfo = useMemo(
    () => (activeQuestion ? getQuestionAnswerKeyInfo(activeQuestion) : null),
    [activeQuestion]
  );

  const activeIndex = activeQuestion
    ? matches.findIndex((q) => getStableKey(q) === activeStableKey)
    : -1;

  const updateFilter = <K extends keyof OriginalBankFilters>(
    key: K,
    value: OriginalBankFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters =
    filters.query !== '' ||
    filters.empresa !== 'Todas' ||
    filters.prova !== 'Todas' ||
    filters.ano !== 'Todos' ||
    filters.banca !== 'Todas' ||
    filters.enfase !== 'Todas' ||
    filters.grupo !== 'Todas' ||
    filters.area !== 'Todas' ||
    filters.tema !== 'Todos' ||
    filters.questaoNumero !== '';

  const isActiveGraded = Boolean(activeStableKey && gradedKeys[activeStableKey]);
  const isActiveRevealed = Boolean(activeStableKey && revealedKeys[activeStableKey]);
  const currentChoice = activeStableKey ? selectedAnswers[activeStableKey] || '' : '';

  const isCebraspe = Boolean(
    activeQuestion &&
      (activeQuestion.questionType === 'true_false' ||
        activeQuestion.banca.toUpperCase().includes('CEBRASPE'))
  );

  const sessionStats = useMemo(() => {
    let answered = 0;
    let acertos = 0;
    let erros = 0;
    let annulledChecked = 0;
    for (const q of specificQuestions) {
      const k = getStableKey(q);
      if (!gradedKeys[k]) continue;
      const ak = getQuestionAnswerKeyInfo(q);
      if (ak.isAnnulled) {
        annulledChecked++;
        continue;
      }
      const picked = gradedChoices[k] || selectedAnswers[k];
      if (!picked) continue;
      answered++;
      if (ak.expectedChoiceValue && isAnswerMatchingGabarito(picked, ak.expectedChoiceValue, q)) {
        acertos++;
      } else {
        erros++;
      }
    }
    return { answered, acertos, erros, annulledChecked };
  }, [specificQuestions, gradedKeys, gradedChoices, selectedAnswers]);

  const handleSelectOption = (q: QuestionRecord, choice: string) => {
    const key = getStableKey(q);
    setSelectedAnswers((prev) => ({ ...prev, [key]: choice }));
  };

  const handleToggleAnswerKeyAndGrade = (q: QuestionRecord) => {
    const key = getStableKey(q);
    const currentlyRevealed = Boolean(revealedKeys[key]);

    if (currentlyRevealed) {
      setRevealedKeys((prev) => ({ ...prev, [key]: false }));
      return;
    }

    const ak = getQuestionAnswerKeyInfo(q);
    setRevealedKeys((prev) => ({ ...prev, [key]: true }));
    setGradedKeys((prev) => ({ ...prev, [key]: true }));

    // Annulled questions MUST NEVER count as right or wrong
    if (ak.isAnnulled) {
      return;
    }

    const picked = selectedAnswers[key];
    if (!picked || !ak.expectedChoiceValue) {
      return;
    }

    // Avoid recording duplicate attempts when toggling reveal off/on for the exact same choice
    if (gradedChoices[key] === picked) {
      return;
    }

    const isRight = isAnswerMatchingGabarito(picked, ak.expectedChoiceValue, q);
    const status = isRight ? 'acerto' : 'erro';
    const nowIso = new Date().toISOString();

    setGradedChoices((prev) => ({ ...prev, [key]: picked }));

    const prevPerf = performanceMap[q.id];
    onUpdatePerformance(q.id, {
      ...prevPerf,
      status,
      minhaResposta: picked,
      gabarito: ak.expectedChoiceValue,
      answeredAt: nowIso,
      updatedAt: nowIso,
    });

    onAddAttempt({
      id: `orig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questionId: q.id,
      minhaResposta: picked,
      gabarito: ak.expectedChoiceValue,
      status,
      source: 'original_bank',
      confianca: 'media',
      dificuldade: 'media',
      revisaoNecessaria: !isRight,
      notes: `Resolvida no Banco de Questões Originais (${q.appLookupKey || q.questionId})`,
      answeredAt: nowIso,
    });
  };

  const contextTextToShow = activeQuestion
    ? (activeQuestion.contextTextNormalized || activeQuestion.contextText || '').trim()
    : '';

  const statementTextToShow = activeQuestion
    ? (
        activeQuestion.statementWithoutNumber ||
        activeQuestion.questionTextNormalized ||
        activeQuestion.questionText ||
        ''
      ).trim()
    : '';

  const activeIsCorrect = Boolean(
    activeQuestion &&
      activeKeyInfo &&
      !activeKeyInfo.isAnnulled &&
      activeKeyInfo.expectedChoiceValue &&
      currentChoice &&
      isAnswerMatchingGabarito(currentChoice, activeKeyInfo.expectedChoiceValue, activeQuestion)
  );

  return (
    <div className="space-y-5">
      {/* Header & Session Tally */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Banco de Questões — Provas Originais
          </h1>
          <p className="ui-page-subtitle">
            Resolução fiel de todas as {examValidation.totalActual || specificQuestions.length} questões de Conhecimentos Específicos (sem Conhecimentos Básicos), com recorte WebP original e PDF reduzido por prova.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <div className="font-mono tabular-nums">
            <span className="font-semibold text-[var(--text-primary)]">
              {matches.length}
            </span>{' '}
            de {specificQuestions.length} exibidas
            {sessionStats.answered > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-[var(--status-success)]">
                  {sessionStats.acertos} acerto(s)
                </span>
                {' · '}
                <span className="font-semibold text-[var(--status-error)]">
                  {sessionStats.erros} erro(s)
                </span>
              </>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="ui-btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* 5-Exam Package Validation & Quick-Filter Bar (Requirement #1 & #12) */}
      {examValidation.exams.length > 0 && (
        <section
          aria-label="Contagem oficial por prova — Somente Conhecimentos Específicos"
          className="ui-card p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Cadernos Originais de Conhecimentos Específicos ({examValidation.totalActual} questões em {examValidation.exams.length} provas)
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {examValidation.isComplete270 && examValidation.allBasicExcluded ? (
                <span className="inline-flex items-center gap-1 font-medium text-[var(--status-success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Integridade validada: 270 específicas · Básicas excluídas
                </span>
              ) : (
                <span className="font-mono tabular-nums">
                  Total carregado: {examValidation.totalActual}/{examValidation.totalExpected}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {examValidation.exams.map((ex) => {
              const isSelected = filters.prova === ex.examName;
              const isPrelim = ex.answerKeyStatus === 'official_preliminary';
              return (
                <button
                  key={ex.examId}
                  type="button"
                  onClick={() =>
                    updateFilter('prova', isSelected ? 'Todas' : ex.examName)
                  }
                  aria-pressed={isSelected}
                  className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-[var(--text-muted)]">
                      <span className="font-mono font-semibold text-[var(--text-secondary)]">
                        {ex.company} · {ex.year}
                      </span>
                      <span className="font-mono font-bold text-[var(--brand-primary-ink)] tabular-nums">
                        {ex.actualCount}q
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--text-primary)]">
                      {ex.examName}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-[var(--border-subtle)]/70 pt-1.5 font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                    <span>
                      Q{ex.questionNumberRange[0]}–{ex.questionNumberRange[1]} · {ex.bank}
                    </span>
                    <span
                      className={
                        isPrelim
                          ? 'font-semibold text-[var(--status-warning)]'
                          : 'text-[var(--text-muted)]'
                      }
                    >
                      {isPrelim ? 'Preliminar' : 'Oficial'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* All Required Filters (Requirement #4) */}
      <section aria-label="Filtros do Banco de Questões" className="ui-card p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            aria-label="Buscar por enunciado, contexto, alternativa, tema ou ID da questão"
            placeholder="Buscar no enunciado, contexto comum, alternativas, tema, código do edital ou ID (ex: PETROBRAS_2023_1_OPERACAO:41)..."
            className="ui-input pl-9 text-sm"
          />
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="ob-empresa" className="block text-xs font-medium text-[var(--text-secondary)]">
              Empresa
            </label>
            <select
              id="ob-empresa"
              value={filters.empresa}
              onChange={(e) => updateFilter('empresa', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as empresas</option>
              {filterOptions.empresas.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-prova" className="block text-xs font-medium text-[var(--text-secondary)]">
              Concurso / Ano
            </label>
            <select
              id="ob-prova"
              value={filters.prova}
              onChange={(e) => updateFilter('prova', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as provas (5)</option>
              {filterOptions.provas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-ano" className="block text-xs font-medium text-[var(--text-secondary)]">
              Ano
            </label>
            <select
              id="ob-ano"
              value={filters.ano}
              onChange={(e) => updateFilter('ano', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todos">Todos os anos</option>
              {filterOptions.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-banca" className="block text-xs font-medium text-[var(--text-secondary)]">
              Banca
            </label>
            <select
              id="ob-banca"
              value={filters.banca}
              onChange={(e) => updateFilter('banca', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as bancas</option>
              {filterOptions.bancas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-enfase" className="block text-xs font-medium text-[var(--text-secondary)]">
              Ênfase
            </label>
            <select
              id="ob-enfase"
              value={filters.enfase}
              onChange={(e) => updateFilter('enfase', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as ênfases</option>
              {filterOptions.enfases.map((en) => (
                <option key={en} value={en}>
                  {en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-grupo" className="block text-xs font-medium text-[var(--text-secondary)]">
              Grupo Pareto
            </label>
            <select
              id="ob-grupo"
              value={filters.grupo}
              onChange={(e) => updateFilter('grupo', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todos os grupos</option>
              {filterOptions.grupos.map((gr) => (
                <option key={gr} value={gr}>
                  {gr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-area" className="block text-xs font-medium text-[var(--text-secondary)]">
              Área
            </label>
            <select
              id="ob-area"
              value={filters.area}
              onChange={(e) => updateFilter('area', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as áreas</option>
              {filterOptions.areas.map((ar) => (
                <option key={ar} value={ar}>
                  {ar}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="ob-tema" className="block text-xs font-medium text-[var(--text-secondary)]">
              Tema específico
            </label>
            <select
              id="ob-tema"
              value={filters.tema}
              onChange={(e) => updateFilter('tema', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todos">Todos os temas</option>
              {filterOptions.temas.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ob-numero" className="block text-xs font-medium text-[var(--text-secondary)]">
              Número da questão
            </label>
            <input
              id="ob-numero"
              type="number"
              min={21}
              max={100}
              placeholder="Ex: 41 (lista por prova)"
              value={filters.questaoNumero}
              onChange={(e) => updateFilter('questaoNumero', e.target.value)}
              className="ui-input mt-1 font-mono text-xs"
            />
          </div>
        </div>
      </section>

      {/* Main Split View: Left Question Index + Right Full Question Solver */}
      {matches.length === 0 ? (
        <div className="ui-card p-10 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Nenhuma questão encontrada para os filtros selecionados
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Ajuste os filtros ou clique abaixo para visualizar todas as {specificQuestions.length} questões de Conhecimentos Específicos.
          </p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ui-btn-primary mt-4"
          >
            Exibir todas as {specificQuestions.length} questões
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          {/* Left Index List */}
          <aside
            aria-label="Lista de questões filtradas"
            className={`ui-card overflow-hidden lg:col-span-4 ${
              mobileDetailOpen ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-3 text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Questões filtradas ({matches.length})
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Chave: EXAM_ID:num
              </span>
            </div>

            <div className="max-h-[72vh] divide-y divide-[var(--border-subtle)] overflow-y-auto">
              {matches.map((q) => {
                const sKey = getStableKey(q);
                const isActive = activeStableKey === sKey;
                const isGraded = Boolean(gradedKeys[sKey]);
                const ak = getQuestionAnswerKeyInfo(q);
                const picked = selectedAnswers[sKey];
                const savedStatus = performanceMap[q.id]?.status;

                return (
                  <button
                    key={sKey}
                    type="button"
                    onClick={() => {
                      setSelectedKey(sKey);
                      setMobileDetailOpen(true);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)] ${
                      isActive ? 'bg-[var(--brand-primary-soft)]/80' : 'bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="truncate font-semibold text-[var(--text-primary)]">
                        {q.concursoCurto} · Q{q.questao}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--brand-primary-ink)] tabular-nums">
                        Pág. esp. {q.specificPdfPage ?? '?'} · Orig. {q.sourcePdfPageOriginal ?? q.paginaPdf}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-xs font-medium text-[var(--text-primary)]">
                      {q.tema}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--text-muted)]">
                      <span className="truncate">{q.appLookupKey || sKey}</span>
                      {isGraded ? (
                        ak.isAnnulled ? (
                          <span className="font-semibold text-[var(--status-error)]">
                            Anulada
                          </span>
                        ) : picked && ak.expectedChoiceValue ? (
                          isAnswerMatchingGabarito(picked, ak.expectedChoiceValue, q) ? (
                            <span className="font-semibold text-[var(--status-success)]">
                              Acerto ({picked})
                            </span>
                          ) : (
                            <span className="font-semibold text-[var(--status-error)]">
                              Erro ({picked})
                            </span>
                          )
                        ) : (
                          <span className="text-[var(--text-secondary)]">Corrigida</span>
                        )
                      ) : savedStatus && savedStatus !== 'pendente' ? (
                        <span
                          className={
                            savedStatus === 'acerto'
                              ? 'text-[var(--status-success)]'
                              : savedStatus === 'erro'
                                ? 'text-[var(--status-error)]'
                                : 'text-[var(--status-warning)]'
                          }
                        >
                          {savedStatus === 'acerto'
                            ? 'Hist: Acerto'
                            : savedStatus === 'erro'
                              ? 'Hist: Erro'
                              : 'Revisar'}
                        </span>
                      ) : (
                        <span>{q.banca}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Question Reader & Interactive Solver */}
          <section
            aria-label="Visualização e resolução da questão"
            className={`space-y-4 lg:col-span-8 ${
              mobileDetailOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {activeQuestion && activeKeyInfo && (
              <div className="ui-card p-5 sm:p-6">
                {/* Top Mobile Back + Navigation Bar */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="ui-btn-secondary !min-h-[34px] lg:hidden"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar à lista ({matches.length})
                  </button>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-mono font-semibold text-[var(--brand-primary-ink)]">
                      {activeQuestion.questionId || activeStableKey}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Chave {activeQuestion.appLookupKey || activeStableKey}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={activeIndex <= 0}
                      onClick={() => {
                        if (activeIndex > 0) {
                          setSelectedKey(getStableKey(matches[activeIndex - 1]));
                        }
                      }}
                      aria-label="Questão anterior"
                      className="ui-btn-secondary !min-h-[34px] !px-2.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>
                    <span className="px-1 font-mono text-xs text-[var(--text-muted)] tabular-nums">
                      {activeIndex + 1}/{matches.length}
                    </span>
                    <button
                      type="button"
                      disabled={activeIndex < 0 || activeIndex >= matches.length - 1}
                      onClick={() => {
                        if (activeIndex >= 0 && activeIndex < matches.length - 1) {
                          setSelectedKey(getStableKey(matches[activeIndex + 1]));
                        }
                      }}
                      aria-label="Próxima questão"
                      className="ui-btn-secondary !min-h-[34px] !px-2.5"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Exam Metadata Header (Req #5) */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {activeQuestion.prova}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-medium text-[var(--text-secondary)]">
                      {activeQuestion.banca}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-bold text-[var(--brand-primary)] tabular-nums">
                      Questão {activeQuestion.questao}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Pág. PDF específico: {activeQuestion.specificPdfPage ?? '—'}
                      {activeQuestion.specificPdfTotalPages
                        ? `/${activeQuestion.specificPdfTotalPages}`
                        : ''}{' '}
                      (Original: pág. {activeQuestion.sourcePdfPageOriginal ?? activeQuestion.paginaPdf})
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                    {activeQuestion.tema}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>
                      Área: <strong className="font-medium text-[var(--text-secondary)]">{activeQuestion.areaOriginal}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Grupo Pareto: <strong className="font-medium text-[var(--text-secondary)]">{activeQuestion.grupoEstudo}</strong>
                    </span>
                    {activeQuestion.codigoPrograma && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          Edital:{' '}
                          <span className="font-mono font-semibold text-[var(--text-primary)]">
                            {activeQuestion.codigoPrograma}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Common Context First (Requirement #5 & app_render.show_context_first) */}
                {contextTextToShow && (
                  <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/80 p-4">
                    <div className="mb-1.5 text-[11px] font-bold tracking-wide text-[var(--text-muted)] uppercase">
                      Contexto comum do bloco
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                      {contextTextToShow}
                    </p>
                  </div>
                )}

                {/* Question Statement */}
                <div className="mt-4 text-[15px] leading-relaxed font-medium text-[var(--text-primary)] whitespace-pre-line">
                  {statementTextToShow || activeQuestion.exigencia}
                </div>

                {/* Notice when question may require diagram / table / equation in original WebP */}
                {activeQuestion.mayNeedPdfFigure && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-[var(--brand-primary-ink)]" />
                      <span>
                        Esta questão contém figura, tabela ou equação gráfica no caderno original.
                      </span>
                    </div>
                    {!showImageMap[activeStableKey] && activeQuestion.originalImagePath && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowImageMap((prev) => ({
                            ...prev,
                            [activeStableKey]: true,
                          }))
                        }
                        className="font-semibold text-[var(--brand-primary-ink)] underline hover:text-[var(--brand-primary)]"
                      >
                        Carregar recorte original agora
                      </button>
                    )}
                  </div>
                )}

                {/* Interactive Response Section (Requirement #8: A-E for CESGRANRIO, Certo/Errado for CEBRASPE) */}
                <div className="mt-5 space-y-2.5" role="group" aria-label="Alternativas da questão">
                  {isCebraspe ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(['Certo', 'Errado'] as const).map((judgment) => {
                        const isPicked = currentChoice === judgment;
                        const isExpected =
                          isActiveRevealed &&
                          !activeKeyInfo.isAnnulled &&
                          activeKeyInfo.expectedChoiceValue === judgment;
                        const isWrongPicked =
                          isActiveRevealed &&
                          !activeKeyInfo.isAnnulled &&
                          isPicked &&
                          !isExpected;

                        return (
                          <button
                            key={judgment}
                            type="button"
                            onClick={() => handleSelectOption(activeQuestion, judgment)}
                            aria-pressed={isPicked}
                            className={`flex min-h-[48px] items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                              isExpected
                                ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                                : isWrongPicked
                                  ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]'
                                  : isPicked
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary-ink)]'
                                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                          >
                            <span>{judgment}</span>
                            {isExpected && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                            {isWrongPicked && <XCircle className="h-4 w-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : activeQuestion.alternatives && activeQuestion.alternatives.length > 0 ? (
                    <div className="space-y-2">
                      {activeQuestion.alternatives.map((alt) => {
                        const isPicked = currentChoice === alt.label;
                        const isExpected =
                          isActiveRevealed &&
                          !activeKeyInfo.isAnnulled &&
                          activeKeyInfo.expectedChoiceValue === alt.label;
                        const isWrongPicked =
                          isActiveRevealed &&
                          !activeKeyInfo.isAnnulled &&
                          isPicked &&
                          !isExpected;

                        return (
                          <button
                            key={alt.label}
                            type="button"
                            onClick={() => handleSelectOption(activeQuestion, alt.label)}
                            aria-pressed={isPicked}
                            className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                              isExpected
                                ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--text-primary)]'
                                : isWrongPicked
                                  ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--text-primary)]'
                                  : isPicked
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--text-primary)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                          >
                            <span
                              className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold ${
                                isExpected
                                  ? 'bg-[var(--status-success)] text-white'
                                  : isWrongPicked
                                    ? 'bg-[var(--status-error)] text-white'
                                    : isPicked
                                      ? 'bg-[var(--brand-primary)] text-white'
                                      : 'bg-[var(--bg-surface-subtle)] text-[var(--text-primary)]'
                              }`}
                            >
                              {alt.label}
                            </span>
                            <span className="flex-1 leading-relaxed whitespace-pre-line">
                              {alt.text}
                            </span>
                            {isExpected && (
                              <span className="shrink-0 text-xs font-semibold text-[var(--status-success)]">
                                Correta
                              </span>
                            )}
                            {isWrongPicked && (
                              <span className="shrink-0 text-xs font-semibold text-[var(--status-error)]">
                                Sua escolha
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => {
                        const isPicked = currentChoice === letter;
                        const isExpected =
                          isActiveRevealed &&
                          !activeKeyInfo.isAnnulled &&
                          activeKeyInfo.expectedChoiceValue === letter;
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => handleSelectOption(activeQuestion, letter)}
                            aria-pressed={isPicked}
                            className={`min-h-[44px] rounded-lg border font-mono text-sm font-bold transition-colors ${
                              isExpected
                                ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                                : isPicked
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary-ink)]'
                                  : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Answer Key Eye Toggle (auto-grades when clicked to reveal; toggles cleanly back to hidden) */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--border-subtle)] pt-4">
                  <button
                    type="button"
                    onClick={() => handleToggleAnswerKeyAndGrade(activeQuestion)}
                    aria-label={isActiveRevealed ? 'Ocultar gabarito' : 'Exibir gabarito'}
                    aria-pressed={isActiveRevealed}
                    className={isActiveRevealed ? 'ui-btn-secondary' : 'ui-btn-primary'}
                  >
                    {isActiveRevealed ? (
                      <>
                        <EyeOff className="h-4 w-4 shrink-0" />
                        <span>Ocultar gabarito</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 shrink-0" />
                        <span>Exibir gabarito</span>
                      </>
                    )}
                  </button>

                  {!isActiveRevealed && (
                    <span className="text-xs text-[var(--text-muted)]">
                      Selecione uma opção e clique no ícone para corrigir e exibir o gabarito
                    </span>
                  )}
                </div>

                {/* Revealed / Graded Feedback Box (Requirements #9 & #10) */}
                {isActiveRevealed && (
                  <div
                    role="status"
                    className={`mt-4 rounded-lg border p-4 text-xs ${
                      activeKeyInfo.isAnnulled
                        ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]'
                        : activeKeyInfo.isPreliminary
                          ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]'
                          : 'border-[var(--status-success-border)] bg-[var(--status-success-bg)]'
                    }`}
                  >
                    {activeKeyInfo.isAnnulled ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-[var(--status-error)]">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Questão anulada</span>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                            {activeQuestion.answerKey?.statusLabel || activeKeyInfo.statusBadgeLabel}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)]">
                          Esta questão foi oficialmente anulada pela banca e não é contabilizada como acerto nem como erro no desempenho.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {isActiveGraded && currentChoice ? (
                              activeIsCorrect ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-[var(--status-success)]">
                                  <Check className="h-4 w-4" />
                                  Você acertou ({currentChoice})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-bold text-[var(--status-error)]">
                                  <XCircle className="h-4 w-4" />
                                  Você marcou {currentChoice}
                                </span>
                              )
                            ) : (
                              <span className="font-semibold text-[var(--text-primary)]">
                                Gabarito oficial:
                              </span>
                            )}
                            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                              {activeKeyInfo.shortAnswerLabel}
                            </span>
                          </div>

                          <span className="rounded border border-current/20 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-primary)]">
                            {activeQuestion.answerKey?.statusLabel || activeKeyInfo.statusBadgeLabel}
                          </span>
                        </div>

                        {activeKeyInfo.optionText && (
                          <div className="rounded border border-[var(--border-subtle)] bg-white/80 px-3 py-2 text-[var(--text-primary)]">
                            <span className="font-semibold">Alternativa correta: </span>
                            <span className="whitespace-pre-line">
                              {activeKeyInfo.optionText.replace(/\s+/g, ' ').trim()}
                            </span>
                          </div>
                        )}

                        {activeKeyInfo.isPreliminary && (
                          <p className="font-medium text-[var(--status-warning)]">
                            Atenção: gabarito oficial preliminar — não definitivo e sujeito a alteração após recursos.
                          </p>
                        )}

                        {activeKeyInfo.adjustmentNote && (
                          <p className="font-medium text-[var(--text-primary)]">
                            {activeKeyInfo.adjustmentNote}
                          </p>
                        )}

                        {activeKeyInfo.sourceNote && (
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {activeKeyInfo.sourceNote}
                          </p>
                        )}

                        {activeKeyInfo.sourcePdf && (
                          <p className="font-mono text-[11px] text-[var(--text-muted)]">
                            Fonte: {activeKeyInfo.sourcePdf}
                            {activeKeyInfo.sourcePage ? ` · Pág. ${activeKeyInfo.sourcePage}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Original WebP Image + Reduced Specific PDF Controls (Requirements #6 & #7) */}
                <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                  <QuestionVisualAndPdfPanel
                    question={activeQuestion}
                    showOriginalImage={Boolean(showImageMap[activeStableKey])}
                    onToggleOriginalImage={() =>
                      setShowImageMap((prev) => ({
                        ...prev,
                        [activeStableKey]: !prev[activeStableKey],
                      }))
                    }
                    showSpecificPdf={Boolean(showPdfMap[activeStableKey])}
                    onToggleSpecificPdf={() =>
                      setShowPdfMap((prev) => ({
                        ...prev,
                        [activeStableKey]: !prev[activeStableKey],
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
