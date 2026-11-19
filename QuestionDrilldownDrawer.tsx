import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  Search,
  X,
} from 'lucide-react';
import type {
  PerformanceStatus,
  QuestionPerformance,
  QuestionRecord,
} from '../types/exam';

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
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialSelectedId
  );
  const [localSearch, setLocalSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfNoticeId, setPdfNoticeId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedId) {
        setSelectedQuestionId(initialSelectedId);
      } else if (questions.length === 1) {
        setSelectedQuestionId(questions[0].id);
      } else {
        setSelectedQuestionId(null);
      }
      setLocalSearch('');
      setPdfNoticeId(null);
    }
  }, [isOpen, initialSelectedId, questions]);

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
      q.tema.toLowerCase().includes(s) ||
      q.exigencia.toLowerCase().includes(s) ||
      q.codigoPrograma.toLowerCase().includes(s)
    );
  });

  const activeQuestion =
    questions.find((q) => q.id === selectedQuestionId) ||
    (filteredQuestions.length === 1 ? filteredQuestions[0] : null);

  const handleCopyRef = (q: QuestionRecord) => {
    const refText = `${q.prova} | Questão ${q.questao} | Página ${q.paginaPdf} do PDF | Arquivo: ${q.arquivoOrigem} | Código: ${q.codigoPrograma}`;
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

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-4xl flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="drawer-title"
              className="truncate text-lg font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de rastreabilidade"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: Split List + Dossier on desktop when > 1 question, or full dossier when 1 */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {questions.length > 1 && (
            <div className="flex max-h-[36vh] w-full flex-col border-b border-[var(--border-subtle)] md:max-h-none md:w-[44%] md:border-r md:border-b-0">
              <div className="border-b border-[var(--border-subtle)] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Filtrar nesta seleção..."
                    aria-label="Filtrar questões nesta seleção"
                    className="ui-input pl-9 text-xs"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="tabular-nums">
                    {filteredQuestions.length} de {questions.length} questões
                  </span>
                  <span>Prova + Questão + Página</span>
                </div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {filteredQuestions.map((q) => {
                  const isActive = activeQuestion?.id === q.id;
                  const perfStatus = performanceMap[q.id]?.status || 'pendente';
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 ${
                        isActive ? 'bg-blue-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
                        <span className="truncate font-semibold text-slate-700">
                          {q.concursoCurto}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-blue-700">
                          Q{q.questao} · Pág. {q.paginaPdf}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-900">
                        {q.tema}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono">{q.codigoPrograma}</span>
                        <span
                          className={
                            perfStatus === 'acerto'
                              ? 'font-medium text-emerald-700'
                              : perfStatus === 'erro'
                                ? 'font-medium text-red-700'
                                : perfStatus === 'revisar'
                                  ? 'font-medium text-amber-700'
                                  : 'text-slate-400'
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Dossier Pane */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
            {activeQuestion ? (
              <div className="space-y-5">
                {/* Traceability Header */}
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {activeQuestion.prova}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{activeQuestion.banca}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-blue-700 tabular-nums">
                      Questão {activeQuestion.questao}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Página {activeQuestion.paginaPdf} do PDF
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-base font-semibold text-slate-900">
                    {activeQuestion.tema}
                  </h3>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-[11px] font-medium text-slate-500">
                      O que a questão exigiu
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">
                      {activeQuestion.exigencia}
                    </p>
                  </div>
                </div>

                {/* Verifiable Origin Table */}
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Rastreabilidade Documental e Vínculo com o Edital
                  </h4>

                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Arquivo PDF de origem</dt>
                      <dd className="mt-0.5 break-all font-mono font-medium text-slate-900">
                        {activeQuestion.arquivoOrigem}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Localização exata</dt>
                      <dd className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                        Questão {activeQuestion.questao} — Página {activeQuestion.paginaPdf}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Código do programa (principal)</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-blue-700">
                        {activeQuestion.codigoPrograma || 'N/D'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Conteúdo secundário relacionado</dt>
                      <dd className="mt-0.5 font-mono text-slate-800">
                        {activeQuestion.conteudosSecundarios.length > 0
                          ? activeQuestion.conteudosSecundarios.join(', ')
                          : 'Nenhum secundário'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Vínculo com o edital</dt>
                      <dd
                        className={`mt-0.5 font-semibold ${
                          activeQuestion.vinculo === 'Direto'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {activeQuestion.vinculo}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Área original / Grupo Pareto</dt>
                      <dd className="mt-0.5 text-slate-800">
                        {activeQuestion.areaOriginal} · {activeQuestion.grupoEstudo}
                      </dd>
                    </div>
                  </dl>

                  {(activeQuestion.observacaoAnalise ||
                    activeQuestion.observacaoClassificacao) && (
                    <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
                      <span className="font-medium text-slate-600">
                        Observação da análise:{' '}
                      </span>
                      <span className="text-slate-700">
                        {activeQuestion.observacaoAnalise ||
                          activeQuestion.observacaoClassificacao}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPdfNoticeId(
                          pdfNoticeId === activeQuestion.id ? null : activeQuestion.id
                        )
                      }
                      className="ui-btn-primary"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Abrir prova na página {activeQuestion.paginaPdf}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyRef(activeQuestion)}
                      className="ui-btn-secondary"
                    >
                      {copiedId === activeQuestion.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
                          Referência copiada
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar referência completa
                        </>
                      )}
                    </button>
                  </div>

                  {pdfNoticeId === activeQuestion.id && (
                    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-blue-900">
                          Guia de abertura direta do caderno original
                        </p>
                        {onAttachPdf && (
                          <label className="cursor-pointer rounded border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50">
                            {attachedPdfs[activeQuestion.arquivoOrigem]
                              ? 'Trocar PDF'
                              : 'Anexar este PDF'}
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
                        )}
                      </div>
                      <p className="mt-1">
                        Arquivo:{' '}
                        <span className="font-mono font-medium text-slate-900">
                          {activeQuestion.arquivoOrigem}
                        </span>{' '}
                        · Página{' '}
                        <span className="font-mono font-semibold text-blue-800">
                          {activeQuestion.paginaPdf}
                        </span>{' '}
                        (Questão{' '}
                        <span className="font-mono font-semibold text-blue-800">
                          {activeQuestion.questao}
                        </span>
                        ).
                      </p>
                      {attachedPdfs[activeQuestion.arquivoOrigem] ? (
                        <iframe
                          src={`${attachedPdfs[activeQuestion.arquivoOrigem]}#page=${activeQuestion.paginaPdf}`}
                          title={`${activeQuestion.arquivoOrigem} página ${activeQuestion.paginaPdf}`}
                          className="mt-2.5 h-80 w-full rounded border border-slate-200 bg-white"
                        />
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-600">
                          Use <span className="font-mono">#page={activeQuestion.paginaPdf}</span> ao
                          abrir o PDF localmente ou anexe o arquivo acima para abrir direto na página{' '}
                          <span className="font-mono">{activeQuestion.paginaPdf}</span>.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Personal Study & Performance Tracker */}
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                      Registro de Desempenho e Revisão
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Salvo automaticamente
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
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
                        className="block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Tempo de resolução (seg)
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
                        className="ui-input mt-1 font-mono text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="perf-notes"
                        className="block text-xs font-medium text-[var(--text-secondary)]"
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
                        className="ui-input mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Selecione uma questão à esquerda para abrir o dossiê completo
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cada item mostra prova, número exato, página do PDF, código do edital e registro de estudo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
