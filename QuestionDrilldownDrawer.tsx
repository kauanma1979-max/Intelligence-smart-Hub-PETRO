import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type {
  PerformanceStatus,
  QuestionPerformance,
  QuestionRecord,
} from '../types/exam';
import {
  getQuestionAnswerKeyInfo,
  isAnswerMatchingGabarito,
} from '../utils/examIntelligence';
import { QuestionVisualAndPdfPanel } from './QuestionVisualAndPdfPanel';

interface QuestionDrilldownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  questions: QuestionRecord[];
  initialSelectedId?: string | null;
  performanceMap: Record<string, QuestionPerformance>;
  onUpdatePerformance: (id: string, perf: QuestionPerformance) => void;
  attachedPdfs?: Record<string, string>;
  onAttachPdf?: (filename: string, url: string) => void;
  onOpenInOriginalBank?: (q: QuestionRecord) => void;
}

const STATUS_OPTIONS: { value: PerformanceStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'acerto', label: 'Acertei' },
  { value: 'erro', label: 'Errei' },
  { value: 'revisar', label: 'Revisar' },
];

export const QuestionDrilldownDrawer: React.FC<QuestionDrilldownDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  questions,
  initialSelectedId = null,
  performanceMap,
  onUpdatePerformance,
  attachedPdfs = {},
  onAttachPdf,
  onOpenInOriginalBank,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialSelectedId
  );
  const [localSearch, setLocalSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [revealedListIds, setRevealedListIds] = useState<Record<string, boolean>>({});
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [showSpecificPdf, setShowSpecificPdf] = useState(false);
  const [traceabilityOpen, setTraceabilityOpen] = useState(false);
  const dossierScrollRef = useRef<HTMLDivElement>(null);
  const lastInitializedRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedId) {
        setSelectedQuestionId(initialSelectedId);
      } else if (questions.length >= 1) {
        setSelectedQuestionId(questions[0].id);
      } else {
        setSelectedQuestionId(null);
      }
      setLocalSearch('');
      setRevealedListIds({});
      setShowOriginalImage(false);
      setShowSpecificPdf(false);
      setTraceabilityOpen(false);
      if (Object.keys(performanceMap).length === 0) {
        setSelectedChoices({});
      }
    } else {
      lastInitializedRef.current = '';
    }
  }, [isOpen, initialSelectedId, questions, performanceMap]);

  useEffect(() => {
    if (!isOpen) return;
    const activeQ =
      questions.find((q) => q.id === selectedQuestionId) || questions[0] || null;
    const initKey = activeQ ? `${activeQ.id}` : '__none__';
    if (lastInitializedRef.current === initKey) return;
    lastInitializedRef.current = initKey;

    const savedPerf = activeQ ? performanceMap[activeQ.id] : undefined;
    const alreadyAnswered = Boolean(
      savedPerf &&
        (savedPerf.status === 'acerto' || savedPerf.status === 'erro') &&
        savedPerf.minhaResposta
    );

    if (alreadyAnswered && activeQ && savedPerf?.minhaResposta) {
      const choiceKey = activeQ.questionId || activeQ.id;
      setSelectedChoices((prev) => ({
        ...prev,
        [choiceKey]: savedPerf.minhaResposta!,
      }));
      setShowAnswerKey(true);
    } else {
      setShowAnswerKey(false);
    }
    setShowOriginalImage(false);
    setShowSpecificPdf(false);
    dossierScrollRef.current?.scrollTo({ top: 0 });
  }, [selectedQuestionId, isOpen, questions, performanceMap]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredQuestions = questions.filter((q) => {
    if (!localSearch.trim()) return true;
    const s = localSearch.toLowerCase();
    return (
      q.prova.toLowerCase().includes(s) ||
      String(q.questao).includes(s) ||
      (q.questionId || '').toLowerCase().includes(s) ||
      q.tema.toLowerCase().includes(s) ||
      q.exigencia.toLowerCase().includes(s) ||
      q.codigoPrograma.toLowerCase().includes(s) ||
      (q.statementWithoutNumber || '').toLowerCase().includes(s)
    );
  });

  const activeQuestion =
    questions.find((q) => q.id === selectedQuestionId) ||
    filteredQuestions[0] ||
    null;

  const activeIndex = activeQuestion
    ? filteredQuestions.findIndex((q) => q.id === activeQuestion.id)
    : -1;

  const activeKeyInfo = activeQuestion ? getQuestionAnswerKeyInfo(activeQuestion) : null;

  const handleCopyRef = (q: QuestionRecord) => {
    const keyPart = q.questionId ? ` | ID: ${q.questionId}` : '';
    const refText = `${q.prova} | Questão ${q.questao} | Página ${q.paginaPdf} do PDF | Arquivo: ${q.arquivoOrigem} | Código: ${q.codigoPrograma}${keyPart}`;
    navigator.clipboard?.writeText(refText).catch(() => {});
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activePerf: QuestionPerformance = activeQuestion
    ? performanceMap[activeQuestion.id] || {
        status: 'pendente',
        updatedAt: new Date().toISOString(),
      }
    : { status: 'pendente', updatedAt: '' };

  const activeChoiceKey = activeQuestion
    ? activeQuestion.questionId || activeQuestion.id
    : '';
  const activePickedChoice = activeChoiceKey ? selectedChoices[activeChoiceKey] || '' : '';

  const handleToggleRevealAndGrade = () => {
    if (!activeQuestion || !activeKeyInfo) return;
    if (showAnswerKey) {
      setShowAnswerKey(false);
      return;
    }

    setShowAnswerKey(true);
    if (activeKeyInfo.isAnnulled) return;

    if (activePickedChoice && activeKeyInfo.expectedChoiceValue) {
      const isRight = isAnswerMatchingGabarito(
        activePickedChoice,
        activeKeyInfo.expectedChoiceValue,
        activeQuestion
      );
      const nowIso = new Date().toISOString();
      onUpdatePerformance(activeQuestion.id, {
        ...activePerf,
        status: isRight ? 'acerto' : 'erro',
        minhaResposta: activePickedChoice,
        gabarito: activeKeyInfo.expectedChoiceValue,
        answeredAt: nowIso,
        updatedAt: nowIso,
      });
    }
  };

  const isCebraspe = Boolean(
    activeQuestion &&
      (activeQuestion.questionType === 'true_false' ||
        activeQuestion.banca.toUpperCase().includes('CEBRASPE'))
  );

  const hasAlternatives = Boolean(
    activeQuestion &&
      (isCebraspe || (activeQuestion.alternatives && activeQuestion.alternatives.length > 0))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-5xl flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2
              id="drawer-title"
              className="truncate text-base font-bold text-[var(--text-primary)] sm:text-lg"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de rastreabilidade"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: Compact Left Index + Spacious Single-Surface Question Dossier */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {questions.length > 1 && (
            <aside
              aria-label="Navegação das questões da seleção"
              className="flex max-h-[30vh] w-full shrink-0 flex-col border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40 md:max-h-none md:w-[32%] md:max-w-[340px] md:border-r md:border-b-0"
            >
              <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Filtrar nesta seleção..."
                    aria-label="Filtrar questões nesta seleção"
                    className="ui-input !min-h-[36px] pl-9 text-xs"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="font-mono tabular-nums">
                    {filteredQuestions.length} de {questions.length} questões
                  </span>
                  <span>Clique no olho p/ gabarito</span>
                </div>
              </div>

              <div className="flex-1 divide-y divide-[var(--border-subtle)] overflow-y-auto">
                {filteredQuestions.map((q) => {
                  const isActive = activeQuestion?.id === q.id;
                  const perfStatus = performanceMap[q.id]?.status || 'pendente';
                  const qKey = getQuestionAnswerKeyInfo(q);
                  const isListKeyRevealed = Boolean(revealedListIds[q.id]);
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center gap-2 px-3.5 py-2.5 transition-colors hover:bg-[var(--bg-surface-hover)] ${
                        isActive
                          ? 'bg-[var(--brand-primary-soft)]/80'
                          : 'bg-[var(--bg-surface)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionId(q.id)}
                        className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--brand-primary)]"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate font-semibold text-[var(--text-primary)]">
                            {q.concursoCurto}
                          </span>
                          <span className="shrink-0 font-mono font-semibold text-[var(--brand-primary-ink)] tabular-nums">
                            Q{q.questao} · P.{q.paginaPdf}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--text-primary)]">
                          {q.tema}
                        </p>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                          <span className="truncate font-mono">{q.codigoPrograma}</span>
                          <span
                            className={
                              perfStatus === 'acerto'
                                ? 'font-semibold text-[var(--status-success)]'
                                : perfStatus === 'erro'
                                  ? 'font-semibold text-[var(--status-error)]'
                                  : perfStatus === 'revisar'
                                    ? 'font-semibold text-[var(--status-warning)]'
                                    : 'text-[var(--text-muted)]'
                            }
                          >
                            {perfStatus === 'acerto'
                              ? 'Acertei'
                              : perfStatus === 'erro'
                                ? 'Errei'
                                : perfStatus === 'revisar'
                                  ? 'Revisar'
                                  : 'Pendente'}
                          </span>
                        </div>
                      </button>

                      {qKey.hasOfficialKey && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedListIds((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          aria-label={
                            isListKeyRevealed
                              ? `Ocultar gabarito da questão ${q.questao}`
                              : `Exibir gabarito da questão ${q.questao}`
                          }
                          title={isListKeyRevealed ? 'Ocultar gabarito' : 'Exibir gabarito'}
                          className={`inline-flex h-8 min-w-[32px] shrink-0 items-center justify-center gap-1 rounded-md border px-2 font-mono text-[10px] font-semibold transition-colors ${
                            isListKeyRevealed
                              ? qKey.isAnnulled
                                ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]'
                                : qKey.isPreliminary
                                  ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                                  : 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]'
                          }`}
                        >
                          {isListKeyRevealed ? (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span>{qKey.shortAnswerLabel}</span>
                            </>
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Main Single-Surface Question Dossier */}
          <div
            ref={dossierScrollRef}
            className="flex-1 overflow-y-auto bg-[var(--bg-surface)]"
          >
            {activeQuestion ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {/* 1. Compact Header & Navigation Strip */}
                <div className="px-5 py-4 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                        {activeQuestion.specificPdfPage
                          ? `Pág. PDF esp. ${activeQuestion.specificPdfPage} (Orig. ${activeQuestion.sourcePdfPageOriginal ?? activeQuestion.paginaPdf})`
                          : `Página ${activeQuestion.paginaPdf} do PDF`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {questions.length > 1 && (
                        <div className="mr-1 inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={activeIndex <= 0}
                            onClick={() => {
                              if (activeIndex > 0) {
                                setSelectedQuestionId(filteredQuestions[activeIndex - 1].id);
                              }
                            }}
                            aria-label="Questão anterior"
                            className="ui-btn-secondary !min-h-[30px] !px-2 !py-1"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-1 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                            {activeIndex + 1}/{filteredQuestions.length}
                          </span>
                          <button
                            type="button"
                            disabled={
                              activeIndex < 0 || activeIndex >= filteredQuestions.length - 1
                            }
                            onClick={() => {
                              if (
                                activeIndex >= 0 &&
                                activeIndex < filteredQuestions.length - 1
                              ) {
                                setSelectedQuestionId(filteredQuestions[activeIndex + 1].id);
                              }
                            }}
                            aria-label="Próxima questão"
                            className="ui-btn-secondary !min-h-[30px] !px-2 !py-1"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {onOpenInOriginalBank &&
                        (activeQuestion.questionId || activeQuestion.appLookupKey) && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenInOriginalBank(activeQuestion);
                              onClose();
                            }}
                            className="ui-btn-secondary !min-h-[30px] !px-2.5 !py-1 text-[11px] text-[var(--brand-primary-ink)]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir no Banco de Questões</span>
                          </button>
                        )}
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                    {activeQuestion.tema}
                  </h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>{activeQuestion.areaOriginal}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeQuestion.grupoEstudo}</span>
                    {activeQuestion.codigoPrograma && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-[var(--brand-primary-ink)]">
                          Edital {activeQuestion.codigoPrograma}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        activeQuestion.vinculo === 'Direto'
                          ? 'font-semibold text-[var(--status-success)]'
                          : 'font-semibold text-[var(--status-warning)]'
                      }
                    >
                      Vínculo {activeQuestion.vinculo}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      O que exigiu:{' '}
                    </span>
                    {activeQuestion.exigencia}
                  </p>
                </div>

                {/* 2. Primary Interactive Solving & Statement Section */}
                <div className="px-5 py-5 sm:px-7">
                  {(activeQuestion.contextTextNormalized || activeQuestion.contextText) && (
                    <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/75 p-3.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                      <div className="mb-1 text-[11px] font-semibold text-[var(--text-muted)]">
                        Texto de apoio / Contexto comum
                      </div>
                      <p className="whitespace-pre-line">
                        {activeQuestion.contextTextNormalized || activeQuestion.contextText}
                      </p>
                    </div>
                  )}

                  {(activeQuestion.statementWithoutNumber ||
                    activeQuestion.questionTextNormalized ||
                    activeQuestion.questionText) && (
                    <div className="text-[15px] leading-relaxed font-medium text-[var(--text-primary)] whitespace-pre-line">
                      {activeQuestion.statementWithoutNumber ||
                        activeQuestion.questionTextNormalized ||
                        activeQuestion.questionText}
                    </div>
                  )}

                  {activeQuestion.mayNeedPdfFigure && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary-ink)]" />
                        <span>
                          Contém figura, tabela ou equação gráfica no caderno original (pág.{' '}
                          {activeQuestion.sourcePdfPageOriginal ?? activeQuestion.paginaPdf}).
                        </span>
                      </div>
                      {activeQuestion.originalImagePath && !showOriginalImage && (
                        <button
                          type="button"
                          onClick={() => setShowOriginalImage(true)}
                          className="font-semibold text-[var(--brand-primary-ink)] underline"
                        >
                          Ver questão original
                        </button>
                      )}
                    </div>
                  )}

                  {/* Interactive Choices */}
                  {hasAlternatives && (
                    <div className="mt-4">
                      {isCebraspe ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          {(['Certo', 'Errado'] as const).map((judgment) => {
                            const isPicked = activePickedChoice === judgment;
                            const isCorrectChoice =
                              showAnswerKey &&
                              !activeKeyInfo?.isAnnulled &&
                              activeKeyInfo?.expectedChoiceValue === judgment;
                            const isWrongPicked =
                              showAnswerKey &&
                              !activeKeyInfo?.isAnnulled &&
                              isPicked &&
                              !isCorrectChoice;
                            return (
                              <button
                                key={judgment}
                                type="button"
                                onClick={() =>
                                  setSelectedChoices((prev) => ({
                                    ...prev,
                                    [activeChoiceKey]: judgment,
                                  }))
                                }
                                aria-pressed={isPicked}
                                className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                                  isCorrectChoice
                                    ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                                    : isWrongPicked
                                      ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]'
                                      : isPicked
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary-ink)]'
                                        : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                                }`}
                              >
                                <span>{judgment}</span>
                                {isCorrectChoice && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {isWrongPicked && <XCircle className="h-3.5 w-3.5" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {activeQuestion.alternatives!.map((alt) => {
                            const isPicked = activePickedChoice === alt.label;
                            const isCorrectAlt =
                              showAnswerKey &&
                              !activeKeyInfo?.isAnnulled &&
                              activeKeyInfo?.expectedChoiceValue === alt.label;
                            const isWrongPicked =
                              showAnswerKey &&
                              !activeKeyInfo?.isAnnulled &&
                              isPicked &&
                              !isCorrectAlt;
                            return (
                              <li key={alt.label}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedChoices((prev) => ({
                                      ...prev,
                                      [activeChoiceKey]: alt.label,
                                    }))
                                  }
                                  aria-pressed={isPicked}
                                  className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                                    isCorrectAlt
                                      ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--text-primary)]'
                                      : isWrongPicked
                                        ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--text-primary)]'
                                        : isPicked
                                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--text-primary)]'
                                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
                                      isCorrectAlt
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
                                  {isCorrectAlt && (
                                    <span className="shrink-0 font-semibold text-[var(--status-success)]">
                                      Correta
                                    </span>
                                  )}
                                  {isWrongPicked && (
                                    <span className="shrink-0 font-semibold text-[var(--status-error)]">
                                      Sua escolha
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Unified Action Row: Single Eye Icon (Auto-grades & toggles) + Visual Crop & Specific PDF */}
                  <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {activeKeyInfo?.hasOfficialKey && (
                        <button
                          type="button"
                          onClick={handleToggleRevealAndGrade}
                          aria-label={showAnswerKey ? 'Ocultar gabarito' : 'Exibir gabarito'}
                          aria-pressed={showAnswerKey}
                          className={showAnswerKey ? 'ui-btn-secondary' : 'ui-btn-primary'}
                        >
                          {showAnswerKey ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 shrink-0" />
                              <span>Ocultar gabarito</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>Exibir gabarito</span>
                            </>
                          )}
                        </button>
                      )}

                      {!showAnswerKey && activeKeyInfo?.hasOfficialKey && (
                        <span className="text-xs text-[var(--text-muted)]">
                          Gabarito oculto · clique no ícone para corrigir e exibir
                        </span>
                      )}
                    </div>

                    {activeKeyInfo?.hasOfficialKey && showAnswerKey && (
                      <div
                        role="status"
                        className={`rounded-lg border p-3.5 text-xs ${
                          activeKeyInfo.isAnnulled
                            ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]'
                            : activeKeyInfo.isPreliminary
                              ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]'
                              : 'border-[var(--status-success-border)] bg-[var(--status-success-bg)]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {activeKeyInfo.isAnnulled ? (
                              <AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />
                            ) : (
                              <Check className="h-4 w-4 text-[var(--status-success)]" />
                            )}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {activeKeyInfo.isAnnulled ? (
                                'Questão anulada'
                              ) : (
                                <>
                                  Gabarito:{' '}
                                  <span className="font-mono font-bold">
                                    {activeKeyInfo.shortAnswerLabel}
                                  </span>
                                </>
                              )}
                            </span>
                            {activeKeyInfo.optionText && !activeKeyInfo.isAnnulled && (
                              <span className="text-[var(--text-secondary)]">
                                — {activeKeyInfo.optionText.replace(/\s+/g, ' ').trim()}
                              </span>
                            )}
                          </div>
                          <span className="rounded border border-current/20 bg-[var(--bg-surface)]/80 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-primary)]">
                            {activeQuestion.answerKey?.statusLabel || activeKeyInfo.statusBadgeLabel}
                          </span>
                        </div>

                        {activeKeyInfo.isAnnulled && (
                          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                            Questão anulada oficialmente pela banca; não entra no cálculo de acertos ou erros.
                          </p>
                        )}
                        {activeKeyInfo.isPreliminary && (
                          <p className="mt-1.5 text-[11px] font-medium text-[var(--status-warning)]">
                            Ressalva: gabarito oficial preliminar, sujeito a alteração após recursos.
                          </p>
                        )}
                        {activeKeyInfo.adjustmentNote && (
                          <p className="mt-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                            {activeKeyInfo.adjustmentNote}
                          </p>
                        )}
                        {activeKeyInfo.sourcePdf && (
                          <p className="mt-1.5 font-mono text-[11px] text-[var(--text-muted)]">
                            Fonte: {activeKeyInfo.sourcePdf}
                            {activeKeyInfo.sourcePage ? ` · Pág. ${activeKeyInfo.sourcePage}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {(activeQuestion.originalImagePath || activeQuestion.specificPdfPath) && (
                      <QuestionVisualAndPdfPanel
                        question={activeQuestion}
                        showOriginalImage={showOriginalImage}
                        onToggleOriginalImage={() => setShowOriginalImage((v) => !v)}
                        showSpecificPdf={showSpecificPdf}
                        onToggleSpecificPdf={() => setShowSpecificPdf((v) => !v)}
                      />
                    )}
                  </div>
                </div>

                {/* 3. Compact Study Status & Revision Notes */}
                <div className="px-5 py-4 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Status de Revisão e Anotações
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Salvo automaticamente
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = activePerf.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onUpdatePerformance(activeQuestion.id, {
                              ...activePerf,
                              status: opt.value,
                              gabarito:
                                activePerf.gabarito ||
                                activeKeyInfo?.expectedChoiceValue ||
                                (activeKeyInfo?.isAnnulled ? 'ANULADA' : undefined),
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className={`min-h-[34px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                            active
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                              : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="perf-time"
                        className="block text-[11px] font-medium text-[var(--text-muted)]"
                      >
                        Tempo (seg)
                      </label>
                      <input
                        id="perf-time"
                        type="number"
                        min={0}
                        placeholder="Ex: 120"
                        value={activePerf.timeSeconds ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                            ? Number.parseInt(e.target.value, 10)
                            : undefined;
                          onUpdatePerformance(activeQuestion.id, {
                            ...activePerf,
                            timeSeconds: val,
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        className="ui-input mt-1 !min-h-[36px] font-mono text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="perf-notes"
                        className="block text-[11px] font-medium text-[var(--text-muted)]"
                      >
                        Anotação de revisão / armadilha da banca
                      </label>
                      <input
                        id="perf-notes"
                        type="text"
                        placeholder="Ex: Atenção à conversão bar para psi ou detalhe do edital..."
                        value={activePerf.notes ?? ''}
                        onChange={(e) =>
                          onUpdatePerformance(activeQuestion.id, {
                            ...activePerf,
                            notes: e.target.value,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="ui-input mt-1 !min-h-[36px] text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Collapsible Document Traceability Metadata (No redundant PDF button) */}
                <div className="bg-[var(--bg-surface-subtle)]/35 px-5 py-3.5 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setTraceabilityOpen((v) => !v)}
                      aria-expanded={traceabilityOpen}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          traceabilityOpen ? 'rotate-180' : ''
                        }`}
                      />
                      <span>Detalhes de rastreabilidade documental</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyRef(activeQuestion)}
                        className="ui-btn-secondary !min-h-[30px] !px-2.5 !py-1 text-[11px]"
                      >
                        {copiedId === activeQuestion.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
                            <span>Referência copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar referência</span>
                          </>
                        )}
                      </button>

                      {onAttachPdf && (
                        <label className="ui-btn-secondary cursor-pointer !min-h-[30px] !px-2.5 !py-1 text-[11px] text-[var(--brand-primary-ink)]">
                          {attachedPdfs[activeQuestion.arquivoOrigem]
                            ? 'Trocar PDF completo local'
                            : 'Anexar PDF completo'}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onAttachPdf(
                                  activeQuestion.arquivoOrigem,
                                  URL.createObjectURL(file)
                                );
                                setTraceabilityOpen(true);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {traceabilityOpen && (
                    <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] text-[var(--text-muted)]">
                            Arquivo PDF original
                          </dt>
                          <dd className="mt-0.5 break-all font-mono text-[11px] font-medium text-[var(--text-primary)]">
                            {activeQuestion.arquivoOrigem}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-[var(--text-muted)]">
                            Localização exata
                          </dt>
                          <dd className="mt-0.5 font-mono text-[11px] font-medium text-[var(--text-primary)] tabular-nums">
                            Questão {activeQuestion.questao} — Pág. original{' '}
                            {activeQuestion.sourcePdfPageOriginal ?? activeQuestion.paginaPdf}
                            {activeQuestion.specificPdfPage
                              ? ` · Pág. específico ${activeQuestion.specificPdfPage}`
                              : ''}
                            {activeQuestion.pdfPageCorrected && activeQuestion.paginaPdfOriginalCsv
                              ? ` (corrigida de pág. ${activeQuestion.paginaPdfOriginalCsv})`
                              : ''}
                          </dd>
                        </div>
                        {activeQuestion.questionId && (
                          <div>
                            <dt className="text-[11px] text-[var(--text-muted)]">
                              Chave estável de integração
                            </dt>
                            <dd className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                              {activeQuestion.questionId}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-[11px] text-[var(--text-muted)]">
                            Conteúdo secundário relacionado
                          </dt>
                          <dd className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                            {activeQuestion.conteudosSecundarios.length > 0
                              ? activeQuestion.conteudosSecundarios.join(', ')
                              : 'Nenhum secundário'}
                          </dd>
                        </div>
                      </dl>

                      {(activeQuestion.observacaoAnalise ||
                        activeQuestion.observacaoClassificacao) && (
                        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            Observação da análise:{' '}
                          </span>
                          {activeQuestion.observacaoAnalise ||
                            activeQuestion.observacaoClassificacao}
                        </p>
                      )}

                      {attachedPdfs[activeQuestion.arquivoOrigem] && (
                        <iframe
                          src={`${attachedPdfs[activeQuestion.arquivoOrigem]}#page=${activeQuestion.paginaPdf}`}
                          title={`${activeQuestion.arquivoOrigem} página ${activeQuestion.paginaPdf}`}
                          className="h-80 w-full rounded-lg border border-[var(--border-subtle)] bg-white"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Selecione uma questão à esquerda para abrir o dossiê completo
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Cada item mostra prova, número exato, página do PDF, código do edital e resolução interativa.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
