import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, FileText, Search, Upload } from 'lucide-react';
import type {
  DistractorMechanism,
  QuestionEngineeringStudy,
  QuestionRecord,
} from '../types/exam';
import {
  analyzePastedTextTraps,
  buildDistractorRadar,
  DISTRACTOR_MECHANISMS,
  getQuestionAnswerKeyInfo,
} from '../utils/examIntelligence';
import { HorizontalFrequencyBarChart } from './DataVizCharts';

interface QuestionEngineeringViewProps {
  questions: QuestionRecord[];
  studiesMap: Record<string, QuestionEngineeringStudy>;
  onSaveStudy: (study: QuestionEngineeringStudy) => void;
  attachedPdfs: Record<string, string>;
  onAttachPdf: (filename: string, url: string) => void;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const PRESET_QUERIES = [
  {
    label: 'Termodinâmica: calor × temperatura × energia interna',
    filter: (q: QuestionRecord) =>
      q.grupoEstudo === 'Termologia e Termodinâmica' &&
      /calor|temperatura|energia interna|escala|variação|carnot/i.test(
        `${q.tema} ${q.exigencia}`
      ),
  },
  {
    label: 'Troca de unidades e escalas (°C, K, °F, MPa)',
    filter: (q: QuestionRecord) =>
      /converter|conversão|celsius|kelvin|fahrenheit|mpa|sistema internacional|escala/i.test(
        `${q.tema} ${q.exigencia}`
      ),
  },
  {
    label: 'Instrumentação: precisão × exatidão × histerese',
    filter: (q: QuestionRecord) =>
      /precisão|exatidão|histerese|repetibilidade|paralaxe|range|span/i.test(
        `${q.tema} ${q.exigencia}`
      ),
  },
];

export const QuestionEngineeringView: React.FC<QuestionEngineeringViewProps> = ({
  questions,
  studiesMap,
  onSaveStudy,
  attachedPdfs,
  onAttachPdf,
  onInspectQuestions,
}) => {
  const [subTab, setSubTab] = useState<'radar' | 'disseccao'>('radar');
  const [radarSearch, setRadarSearch] = useState('');
  const [selectedMechanism, setSelectedMechanism] = useState<
    'all' | DistractorMechanism
  >('all');

  // Dissection Lab state
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    () =>
      questions.find((q) => q.grupoEstudo === 'Termologia e Termodinâmica')?.id ||
      questions[0]?.id ||
      ''
  );
  const [questionPickerQuery, setQuestionPickerQuery] = useState('');

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) || questions[0],
    [questions, selectedQuestionId]
  );

  const existingStudy = activeQuestion ? studiesMap[activeQuestion.id] : undefined;

  const [enunciado, setEnunciado] = useState('');
  const [altA, setAltA] = useState('');
  const [altB, setAltB] = useState('');
  const [altC, setAltC] = useState('');
  const [altD, setAltD] = useState('');
  const [altE, setAltE] = useState('');
  const [gabarito, setGabarito] = useState('');
  const [cebraspeTwist, setCebraspeTwist] = useState('');
  const [selectedMechanisms, setSelectedMechanisms] = useState<DistractorMechanism[]>([]);
  const [analiseBanca, setAnaliseBanca] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [revealEditorGabarito, setRevealEditorGabarito] = useState(false);

  const populateFromQuestion = (q: QuestionRecord) => {
    const saved = studiesMap[q.id];
    const ak = getQuestionAnswerKeyInfo(q);
    const getAlt = (letter: string) =>
      q.alternatives?.find((a) => a.label === letter)?.text || '';
    const defaultEnunciado = [q.contextText, q.statementWithoutNumber || q.questionText]
      .filter(Boolean)
      .join('\n\n');

    setEnunciado(saved?.enunciadoOriginal || defaultEnunciado);
    setAltA(saved?.alternativasOuJulgamento.A || getAlt('A'));
    setAltB(saved?.alternativasOuJulgamento.B || getAlt('B'));
    setAltC(saved?.alternativasOuJulgamento.C || getAlt('C'));
    setAltD(saved?.alternativasOuJulgamento.D || getAlt('D'));
    setAltE(saved?.alternativasOuJulgamento.E || getAlt('E'));
    setGabarito(
      saved?.alternativasOuJulgamento.gabarito ||
        (ak.isAnnulled ? 'ANULADA' : ak.expectedChoiceValue || '')
    );
    setCebraspeTwist(
      saved?.alternativasOuJulgamento.alteracaoConceitualCebraspe || ''
    );
    setSelectedMechanisms(saved?.mecanismos || []);
    setAnaliseBanca(saved?.analiseBanca || '');
  };

  useEffect(() => {
    if (activeQuestion) {
      populateFromQuestion(activeQuestion);
      setRevealEditorGabarito(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.id]);

  const loadQuestionIntoEditor = (q: QuestionRecord) => {
    setSelectedQuestionId(q.id);
    populateFromQuestion(q);
    setRevealEditorGabarito(false);
    setSavedFeedback(false);
  };

  const radarRows = useMemo(() => buildDistractorRadar(questions), [questions]);

  const pickerMatches = useMemo(() => {
    const s = questionPickerQuery.trim().toLowerCase();
    if (!s) return questions.slice(0, 40);
    return questions
      .filter((q) =>
        `${q.concursoCurto} ${q.questao} ${q.tema} ${q.exigencia}`
          .toLowerCase()
          .includes(s)
      )
      .slice(0, 40);
  }, [questions, questionPickerQuery]);

  const combinedPastedText = [
    enunciado,
    altA,
    altB,
    altC,
    altD,
    altE,
    cebraspeTwist,
    analiseBanca,
  ]
    .filter(Boolean)
    .join(' ');

  const autoDetections = useMemo(
    () => analyzePastedTextTraps(combinedPastedText),
    [combinedPastedText]
  );

  const toggleMechanism = (m: DistractorMechanism) => {
    setSelectedMechanisms((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleSaveStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion) return;
    const isCebraspe = activeQuestion.banca.toUpperCase().includes('CEBRASPE');
    onSaveStudy({
      questionId: activeQuestion.id,
      bancaFormato: isCebraspe ? 'CEBRASPE_CE' : 'CESGRANRIO_AE',
      enunciadoOriginal: enunciado,
      alternativasOuJulgamento: isCebraspe
        ? {
            gabarito,
            alteracaoConceitualCebraspe: cebraspeTwist,
          }
        : {
            A: altA,
            B: altB,
            C: altC,
            D: altD,
            E: altE,
            gabarito,
          },
      mecanismos: selectedMechanisms,
      analiseBanca,
      updatedAt: new Date().toISOString(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const filteredRadar = useMemo(() => {
    const s = radarSearch.trim().toLowerCase();
    return radarRows
      .filter((r) => selectedMechanism === 'all' || r.mecanismo === selectedMechanism)
      .map((r) => ({
        ...r,
        questoesFiltradas: s
          ? r.questoesCandidatas.filter((q) =>
              `${q.tema} ${q.exigencia} ${q.concursoCurto} ${q.grupoEstudo}`
                .toLowerCase()
                .includes(s)
            )
          : r.questoesCandidatas,
      }));
  }, [radarRows, selectedMechanism, radarSearch]);

  const savedStudiesList = Object.values(studiesMap);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Engenharia das Questões e Análise de Distratores
          </h1>
          <p className="ui-page-subtitle">
            Mapeie armadilhas clássicas das bancas (CESGRANRIO A–E e afirmações Certo/Errado do CEBRASPE) e disseque enunciados reais a partir dos PDFs originais.
          </p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Modo de engenharia de distratores"
        >
          <button
            type="button"
            onClick={() => setSubTab('radar')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'radar'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Radar na base (8 mecanismos)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('disseccao')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'disseccao'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Laboratório de Dissecação ({savedStudiesList.length})
          </button>
        </div>
      </div>

      {subTab === 'radar' && (
        <div className="space-y-5">
          {/* Honesty / PDF Requirement Notice */}
          <div className="rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-4 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--brand-primary-ink)]">
              Base integrada com enunciados e gabaritos:{' '}
            </span>
            todas as 270 questões já estão enriquecidas com enunciados extraídos, alternativas (A–E ou julgamento CEBRASPE) e status do gabarito (definitivo, alterado pós-recurso, preliminar ou anulada). Abra qualquer item no{' '}
            <button
              type="button"
              onClick={() => setSubTab('disseccao')}
              className="font-semibold text-[var(--brand-primary-ink)] underline"
            >
              Laboratório de Dissecação
            </button>{' '}
            para auditar distratores e consultar figuras nos PDFs originais.
          </div>

          {/* Preset Thematic Queries */}
          <div className="ui-card p-4">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Consultas temáticas rápidas de construção da banca
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRESET_QUERIES.map((preset) => {
                const matched = questions.filter(preset.filter);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onInspectQuestions(
                        preset.label,
                        `${matched.length} questões identificadas na amostra`,
                        matched
                      )
                    }
                    className="ui-btn-secondary !whitespace-normal text-left"
                  >
                    <span>{preset.label}</span>
                    <span className="font-mono text-[var(--brand-primary-ink)] tabular-nums">
                      ({matched.length})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
              <div className="relative min-w-0 w-full sm:min-w-[220px] sm:flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={radarSearch}
                  onChange={(e) => setRadarSearch(e.target.value)}
                  aria-label="Filtrar mecanismos de distratores"
                  placeholder="Filtrar questões candidatas (ex: Termodinâmica, Carnot, Kelvin, MPa)..."
                  className="ui-input !pl-9"
                />
              </div>

              <select
                aria-label="Filtrar mecanismo de construção"
                value={selectedMechanism}
                onChange={(e) =>
                  setSelectedMechanism(e.target.value as 'all' | DistractorMechanism)
                }
                className="ui-select !w-full sm:!w-auto"
              >
                <option value="all">Todos os 8 mecanismos</option>
                {DISTRACTOR_MECHANISMS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 8 Mechanisms Incidence Chart */}
          <HorizontalFrequencyBarChart
            title="Incidência dos 8 Mecanismos de Distratores na Base"
            subtitle="Clique em qualquer mecanismo para abrir todas as questões candidatas identificadas."
            maxItems={8}
            items={[...filteredRadar]
              .sort((a, b) => b.questoesFiltradas.length - a.questoesFiltradas.length)
              .map((row, idx) => ({
                id: row.mecanismo,
                label: row.label,
                sublabel: row.descricao,
                value: row.questoesFiltradas.length,
                pct:
                  questions.length > 0
                    ? (row.questoesFiltradas.length / questions.length) * 100
                    : 0,
                color:
                  idx === 0
                    ? '#14213D'
                    : idx < 3
                      ? '#2563EB'
                      : idx < 6
                        ? '#4338CA'
                        : '#06B6D4',
                questions: row.questoesFiltradas,
              }))}
            onSelectBar={(item) => {
              if (item.questions && item.questions.length > 0) {
                onInspectQuestions(
                  `Mecanismo: ${item.label}`,
                  `${item.questions.length} questões candidatas identificadas`,
                  item.questions
                );
              }
            }}
          />

          {/* 8 Mechanisms Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredRadar.map((row) => (
              <section
                key={row.mecanismo}
                className="ui-card flex min-w-0 flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="ui-section-title">{row.label}</h2>
                    <span className="shrink-0 font-mono text-sm font-bold text-[var(--brand-primary-ink)] tabular-nums">
                      {row.questoesFiltradas.length}q
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {row.descricao}
                  </p>

                  {row.questoesFiltradas.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
                      {row.questoesFiltradas.slice(0, 3).map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate text-[var(--text-secondary)]">
                            <span className="font-mono font-semibold text-[var(--text-primary)]">
                              {q.concursoCurto} Q{q.questao}
                            </span>{' '}
                            · {q.tema}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              loadQuestionIntoEditor(q);
                              setSubTab('disseccao');
                            }}
                            className="min-h-[32px] shrink-0 font-semibold text-[var(--brand-primary-ink)] hover:underline whitespace-nowrap"
                          >
                            Dissecar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                  <button
                    type="button"
                    disabled={row.questoesFiltradas.length === 0}
                    onClick={() =>
                      onInspectQuestions(
                        `Mecanismo: ${row.label}`,
                        `${row.questoesFiltradas.length} questões candidatas identificadas`,
                        row.questoesFiltradas
                      )
                    }
                    className="min-h-[34px] font-semibold text-[var(--brand-primary-ink)] hover:underline disabled:text-[var(--text-muted)]/50 whitespace-nowrap"
                  >
                    Ver todas as {row.questoesFiltradas.length} questões →
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {subTab === 'disseccao' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Question Selector Sidebar */}
          <section className="ui-card min-w-0 p-4 lg:col-span-4">
            <h2 className="text-xs font-semibold text-[var(--text-primary)]">
              1. Selecionar questão para dissecar
            </h2>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={questionPickerQuery}
                onChange={(e) => setQuestionPickerQuery(e.target.value)}
                placeholder="Buscar prova, tema ou nº..."
                aria-label="Buscar questão para dissecação"
                className="ui-input !pl-8"
              />
            </div>

            <div className="mt-3 max-h-[460px] divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
              {pickerMatches.map((q) => {
                const isSelected = activeQuestion?.id === q.id;
                const hasStudy = Boolean(studiesMap[q.id]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => loadQuestionIntoEditor(q)}
                    className={`w-full px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-[var(--brand-primary-soft)]'
                        : 'hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {q.concursoCurto} · Q{q.questao}
                      </span>
                      <span className="font-mono text-[var(--text-muted)]">
                        {hasStudy ? 'Dissecada' : `Pág. ${q.paginaPdf}`}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--text-secondary)]">
                      {q.tema}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Dissection & Lexical Trap Analyzer Form */}
          <section className="ui-card min-w-0 p-5 lg:col-span-8">
            {activeQuestion && (
              <form onSubmit={handleSaveStudy} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {activeQuestion.prova}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[var(--brand-primary-ink)]">
                        Questão {activeQuestion.questao} — Pág. {activeQuestion.paginaPdf}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{activeQuestion.banca}</span>
                      {(() => {
                        const ak = getQuestionAnswerKeyInfo(activeQuestion);
                        if (!ak.hasOfficialKey) return null;
                        return (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => setRevealEditorGabarito((v) => !v)}
                              aria-label={
                                revealEditorGabarito
                                  ? 'Ocultar gabarito'
                                  : 'Exibir gabarito'
                              }
                              title={
                                revealEditorGabarito
                                  ? 'Ocultar gabarito'
                                  : 'Exibir gabarito'
                              }
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                                revealEditorGabarito
                                  ? ak.isAnnulled
                                    ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
                                    : ak.isPreliminary
                                      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                                      : 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
                                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]'
                              }`}
                            >
                              {revealEditorGabarito ? (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  <span>
                                    {ak.isAnnulled
                                      ? 'ANULADA'
                                      : `Gabarito: ${ak.shortAnswerLabel} · ${ak.statusBadgeLabel}`}
                                  </span>
                                </>
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    <h2 className="mt-1 text-base font-bold text-[var(--text-primary)]">
                      {activeQuestion.tema}
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      Exigência catalogada: {activeQuestion.exigencia}
                    </p>
                  </div>

                  <label className="ui-btn-secondary cursor-pointer text-[var(--brand-primary-ink)]">
                    <Upload className="h-3.5 w-3.5" />
                    {attachedPdfs[activeQuestion.arquivoOrigem]
                      ? 'PDF anexado'
                      : 'Anexar PDF original'}
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
                        }
                      }}
                    />
                  </label>
                </div>

                {attachedPdfs[activeQuestion.arquivoOrigem] ? (
                  <iframe
                    src={`${attachedPdfs[activeQuestion.arquivoOrigem]}#page=${activeQuestion.paginaPdf}`}
                    title={`${activeQuestion.arquivoOrigem} página ${activeQuestion.paginaPdf}`}
                    className="h-64 w-full rounded-lg border border-[var(--border-subtle)]"
                  />
                ) : activeQuestion.specificPdfPath ? (
                  <iframe
                    src={`${activeQuestion.specificPdfPath}#page=${activeQuestion.specificPdfPage ?? 1}`}
                    title={`${activeQuestion.prova} específicas página ${activeQuestion.specificPdfPage ?? 1}`}
                    className="h-64 w-full rounded-lg border border-[var(--border-subtle)]"
                  />
                ) : null}

                <div>
                  <label
                    htmlFor="eng-enunciado"
                    className="block break-words text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Enunciado literal copiado do PDF ({activeQuestion.arquivoOrigem})
                  </label>
                  <textarea
                    id="eng-enunciado"
                    rows={3}
                    value={enunciado}
                    onChange={(e) => setEnunciado(e.target.value)}
                    placeholder="Cole aqui o texto original do enunciado da prova para ativar o detector léxico de armadilhas..."
                    className="ui-textarea mt-1"
                  />
                </div>

                {activeQuestion.banca.toUpperCase().includes('CEBRASPE') ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="eng-gab-ceb"
                          className="block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Gabarito oficial
                        </label>
                        <button
                          type="button"
                          onClick={() => setRevealEditorGabarito((v) => !v)}
                          aria-label={
                            revealEditorGabarito ? 'Ocultar gabarito' : 'Exibir gabarito'
                          }
                          title={
                            revealEditorGabarito ? 'Ocultar gabarito' : 'Exibir gabarito'
                          }
                          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                        >
                          {revealEditorGabarito ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {revealEditorGabarito ? (
                        <select
                          id="eng-gab-ceb"
                          value={gabarito}
                          disabled={Boolean(activeQuestion.isAnnulled)}
                          onChange={(e) => setGabarito(e.target.value)}
                          className="ui-select mt-1 disabled:opacity-60"
                        >
                          {activeQuestion.isAnnulled ? (
                            <option value="ANULADA">ANULADA</option>
                          ) : (
                            <>
                              <option value="">Selecionar</option>
                              <option value="Certo">Certo</option>
                              <option value="Errado">Errado</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <button
                          type="button"
                          id="eng-gab-ceb"
                          onClick={() => setRevealEditorGabarito(true)}
                          className="mt-1 flex min-h-[38px] w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                        >
                          <span>Gabarito oculto</span>
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="eng-twist-ceb"
                        className="block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Alteração conceitual que torna o item errado (ou valida o certo)
                      </label>
                      <input
                        id="eng-twist-ceb"
                        type="text"
                        value={cebraspeTwist}
                        onChange={(e) => setCebraspeTwist(e.target.value)}
                        placeholder="Ex: A banca trocou energia interna por calor ou usou 'sempre' em processo isobárico..."
                        className="ui-input mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Análise das 5 alternativas (CESGRANRIO A–E)
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        ['A', altA, setAltA],
                        ['B', altB, setAltB],
                        ['C', altC, setAltC],
                        ['D', altD, setAltD],
                        ['E', altE, setAltE],
                      ].map(([letter, val, setter]) => (
                        <input
                          key={letter as string}
                          type="text"
                          value={val as string}
                          onChange={(e) =>
                            (setter as React.Dispatch<React.SetStateAction<string>>)(
                              e.target.value
                            )
                          }
                          placeholder={`Alternativa ${letter}: texto ou papel do distrator`}
                          aria-label={`Alternativa ${letter}`}
                          className="ui-input"
                        />
                      ))}
                      <div className="flex items-center gap-2">
                        {revealEditorGabarito ? (
                          <select
                            aria-label="Gabarito CESGRANRIO"
                            value={gabarito}
                            disabled={Boolean(activeQuestion.isAnnulled)}
                            onChange={(e) => setGabarito(e.target.value)}
                            className="ui-select flex-1 disabled:opacity-60"
                          >
                            {activeQuestion.isAnnulled ? (
                              <option value="ANULADA">ANULADA</option>
                            ) : (
                              <>
                                <option value="">Gabarito oficial (A–E)</option>
                                {['A', 'B', 'C', 'D', 'E'].map((l) => (
                                  <option key={l} value={l}>
                                    Alternativa {l}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRevealEditorGabarito(true)}
                            aria-label="Exibir gabarito CESGRANRIO"
                            className="flex min-h-[38px] flex-1 items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                          >
                            <span>Gabarito oculto</span>
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRevealEditorGabarito((v) => !v)}
                          aria-label={
                            revealEditorGabarito ? 'Ocultar gabarito' : 'Exibir gabarito'
                          }
                          title={
                            revealEditorGabarito ? 'Ocultar gabarito' : 'Exibir gabarito'
                          }
                          className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]"
                        >
                          {revealEditorGabarito ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-Time Lexical Trap Detector */}
                {autoDetections.length > 0 && (
                  <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-xs">
                    <div className="font-semibold text-amber-950">
                      Sinais detectados automaticamente no texto colado:
                    </div>
                    <ul className="mt-1.5 space-y-1 text-amber-950">
                      {autoDetections.map((d) => (
                        <li key={d.mecanismo}>
                          <span className="font-semibold">{d.label}:</span>{' '}
                          <span className="font-mono">
                            {d.trechosEncontrados.join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Distractor Mechanisms Tagging */}
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Mecanismos de engenharia identificados nesta questão
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DISTRACTOR_MECHANISMS.map((m) => {
                      const active = selectedMechanisms.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleMechanism(m.id)}
                          className={`min-h-[34px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                              : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="eng-notes"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Síntese da engenharia da questão
                  </label>
                  <textarea
                    id="eng-notes"
                    rows={2}
                    value={analiseBanca}
                    onChange={(e) => setAnaliseBanca(e.target.value)}
                    placeholder="Registre o mecanismo central que induz o erro e como evitar a armadilha na prova..."
                    className="ui-textarea mt-1"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                  <span className="text-xs text-[var(--text-muted)]">
                    {existingStudy
                      ? `Salvo anteriormente em ${new Date(existingStudy.updatedAt).toLocaleDateString('pt-BR')}`
                      : 'Salvo localmente no navegador'}
                  </span>
                  <button type="submit" className="ui-btn-primary">
                    {savedFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Dissecação salva
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        Salvar dissecação da questão
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
