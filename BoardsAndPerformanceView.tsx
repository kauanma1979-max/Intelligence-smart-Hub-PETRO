import React, { useMemo, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import type { QuestionPerformance, QuestionRecord } from '../types/exam';
import { buildBoardComparison } from '../utils/examIntelligence';
import {
  CoverageDonutChart,
  GroupedComparisonBarChart,
} from './DataVizCharts';

interface BoardsAndPerformanceViewProps {
  questions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  attachedPdfs: Record<string, string>;
  onAttachPdf: (filename: string, url: string) => void;
  onSelectQuestion: (q: QuestionRecord, allMatches: QuestionRecord[]) => void;
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

export const BoardsAndPerformanceView: React.FC<BoardsAndPerformanceViewProps> = ({
  questions,
  performanceMap,
  attachedPdfs,
  onAttachPdf,
  onSelectQuestion,
  onInspectQuestions,
}) => {
  const [tab, setTab] = useState<'bancas' | 'pdfs' | 'desempenho'>('bancas');
  const [previewPdf, setPreviewPdf] = useState<{ filename: string; page: number } | null>(null);

  const comparison = useMemo(() => buildBoardComparison(questions), [questions]);

  const pdfCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        filename: string;
        provas: Set<string>;
        banca: string;
        totalQuestoes: number;
        maxPage: number;
        specificPdfPath?: string;
        specificPdfTotalPages?: number;
        questoes: QuestionRecord[];
      }
    >();

    for (const q of questions) {
      const key = q.arquivoOrigem || q.concursoCurto;
      const entry = map.get(key) || {
        filename: key,
        provas: new Set<string>(),
        banca: q.banca,
        totalQuestoes: 0,
        maxPage: 0,
        specificPdfPath: q.specificPdfPath,
        specificPdfTotalPages: q.specificPdfTotalPages,
        questoes: [],
      };
      entry.provas.add(q.concursoCurto);
      entry.totalQuestoes++;
      entry.maxPage = Math.max(entry.maxPage, q.paginaPdf);
      if (!entry.specificPdfPath && q.specificPdfPath) {
        entry.specificPdfPath = q.specificPdfPath;
      }
      if (!entry.specificPdfTotalPages && q.specificPdfTotalPages) {
        entry.specificPdfTotalPages = q.specificPdfTotalPages;
      }
      entry.questoes.push(q);
      map.set(key, entry);
    }

    return Array.from(map.values());
  }, [questions]);

  const perfStats = useMemo(() => {
    let acerto = 0;
    let erro = 0;
    let revisar = 0;
    const tracked: QuestionRecord[] = [];
    for (const q of questions) {
      const p = performanceMap[q.id];
      if (!p || p.status === 'pendente') continue;
      tracked.push(q);
      if (p.status === 'acerto') acerto++;
      else if (p.status === 'erro') erro++;
      else if (p.status === 'revisar') revisar++;
    }
    return {
      acerto,
      erro,
      revisar,
      pendente: questions.length - tracked.length,
      tracked,
    };
  }, [questions, performanceMap]);

  const handleFileChange = (filename: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAttachPdf(filename, url);
    setPreviewPdf({ filename, page: 1 });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Comparação entre Bancas — CESGRANRIO × CEBRASPE
          </h1>
          <p className="ui-page-subtitle">
            Contraste o perfil disciplinar, formato de cobrança e padrão cognitivo entre CESGRANRIO e CEBRASPE, consulte os PDFs originais e acompanhe seu desempenho.
          </p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Seções de comparação de bancas"
        >
          <button
            type="button"
            onClick={() => setTab('bancas')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'bancas'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            CESGRANRIO × CEBRASPE
          </button>
          <button
            type="button"
            onClick={() => setTab('pdfs')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'pdfs'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Consulta aos PDFs Originais ({pdfCatalog.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('desempenho')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'desempenho'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Meu desempenho ({perfStats.tracked.length})
          </button>
        </div>
      </div>

      {tab === 'bancas' && (
        <div className="space-y-6">
          {/* Top Board KPI Summary */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="ui-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">Banca 01 · Múltipla Escolha</div>
                  <h2 className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">CESGRANRIO</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {comparison.cesgranrioExams.join(' · ') || 'Sem provas'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-[var(--brand-primary)] tabular-nums">
                    {comparison.cesgranrioTotal}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">questões (A–E)</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="text-[var(--text-secondary)]">Formato: Alternativas A–E</span>
                <button
                  type="button"
                  onClick={() =>
                    onInspectQuestions(
                      'Questões da CESGRANRIO',
                      `${comparison.cesgranrioTotal} questões em ${comparison.cesgranrioExams.join(' e ')}`,
                      questions.filter((q) => q.banca.toUpperCase().includes('CESGRANRIO'))
                    )
                  }
                  className="font-semibold text-[var(--brand-primary)] hover:underline whitespace-nowrap"
                >
                  Consultar todas →
                </button>
              </div>
            </section>

            <section className="ui-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">Banca 02 · Julgamento de Itens</div>
                  <h2 className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">CEBRASPE</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {comparison.cebraspeExams.join(' · ') || 'Sem provas'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-[var(--brand-secondary)] tabular-nums">
                    {comparison.cebraspeTotal}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">itens (Certo/Errado)</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="text-[var(--text-secondary)]">Formato: Certo ou Errado</span>
                <button
                  type="button"
                  onClick={() =>
                    onInspectQuestions(
                      'Itens do CEBRASPE',
                      `${comparison.cebraspeTotal} questões em ${comparison.cebraspeExams.join(', ')}`,
                      questions.filter((q) => q.banca.toUpperCase().includes('CEBRASPE'))
                    )
                  }
                  className="font-semibold text-[var(--brand-primary)] hover:underline whitespace-nowrap"
                >
                  Consultar todos →
                </button>
              </div>
            </section>
          </div>

          {/* Grouped Bar Chart: CESGRANRIO vs CEBRASPE */}
          <GroupedComparisonBarChart
            title="Comparação Visual por Disciplina e Critério (% da Banca)"
            subtitle="Clique em qualquer barra para abrir as questões correspondentes de CESGRANRIO ou CEBRASPE."
            series={[
              { key: 'cesgranrio', label: 'CESGRANRIO (%)', color: '#2563EB' },
              { key: 'cebraspe', label: 'CEBRASPE (%)', color: '#14213D' },
            ]}
            categories={comparison.criterios.map((c) => ({
              id: c.criterio,
              label: c.criterio,
              values: {
                cesgranrio: Number(c.cesgranrioPct.toFixed(1)),
                cebraspe: Number(c.cebraspePct.toFixed(1)),
              },
              questionsBySeries: {
                cesgranrio: c.cesgranrioQuestions,
                cebraspe: c.cebraspeQuestions,
              },
            }))}
            unitSuffix="%"
            onSelectCell={(cat, seriesKey, seriesLabel) => {
              const list = cat.questionsBySeries?.[seriesKey] || [];
              if (list.length > 0) {
                onInspectQuestions(
                  `${seriesLabel.replace(' (%)', '')} — ${cat.label}`,
                  `${list.length} questão(ões) neste critério`,
                  list
                );
              }
            }}
          />

          {/* Direct Comparison Matrix */}
          <section className="ui-card overflow-hidden">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h2 className="ui-section-title">
                Matriz Comparativa por Disciplina e Formato
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Clique em qualquer contagem para abrir as questões exatas daquela banca no critério analisado.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Critério</th>
                    <th className="px-4 py-3 text-right">
                      CESGRANRIO ({comparison.cesgranrioTotal}q)
                    </th>
                    <th className="px-4 py-3 text-right">
                      CEBRASPE ({comparison.cebraspeTotal}q)
                    </th>
                    <th className="px-4 py-3 text-right">Diferença (p.p.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {comparison.criterios.map((row) => {
                    const diff = row.cebraspePct - row.cesgranrioPct;
                    return (
                      <tr key={row.criterio} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.criterio}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {row.descricao}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <button
                            type="button"
                            disabled={row.cesgranrioCount === 0}
                            onClick={() =>
                              onInspectQuestions(
                                `CESGRANRIO — ${row.criterio}`,
                                `${row.cesgranrioCount} questões (${row.cesgranrioPct.toFixed(1)}% da banca)`,
                                row.cesgranrioQuestions
                              )
                            }
                            className="rounded px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-default disabled:text-slate-400"
                          >
                            {row.cesgranrioCount} ({row.cesgranrioPct.toFixed(1)}%)
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <button
                            type="button"
                            disabled={row.cebraspeCount === 0}
                            onClick={() =>
                              onInspectQuestions(
                                `CEBRASPE — ${row.criterio}`,
                                `${row.cebraspeCount} questões (${row.cebraspePct.toFixed(1)}% da banca)`,
                                row.cebraspeQuestions
                              )
                            }
                            className="rounded px-2 py-1 font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-default disabled:text-slate-400"
                          >
                            {row.cebraspeCount} ({row.cebraspePct.toFixed(1)}%)
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={
                              diff > 1
                                ? 'font-semibold text-slate-900'
                                : diff < -1
                                  ? 'font-semibold text-blue-700'
                                  : 'text-slate-500'
                            }
                          >
                            {diff >= 0 ? '+' : ''}
                            {diff.toFixed(1)} p.p. CEB
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        Formato das questões
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        Estrutura objetiva de resposta adotada por cada organizadora
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-800">
                      Alternativas A–E
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      Certo ou errado
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-slate-500">
                      Estruturas distintas
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Cognitive Profile & Question Patterns */}
          <section className="ui-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="ui-section-title">
                  Padrões de Cobrança: Conceitual, Cálculos e Interpretação Técnica
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Classificação automática extraída da coluna &ldquo;O que a questão exigiu&rdquo;. Para inspeção integral de enunciados e alternativas, anexe os PDFs originais na aba ao lado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab('pdfs')}
                className="ui-btn-secondary !min-h-[34px] !text-[var(--brand-primary)]"
              >
                <FileText className="h-3.5 w-3.5" />
                Consultar PDFs originais
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {comparison.padroes.map((p) => (
                <div key={p.padrao} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{p.label}</span>
                    <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            `CESGRANRIO — ${p.label}`,
                            `${p.cesgranrioCount} questões (${p.cesgranrioPct.toFixed(1)}%)`,
                            p.cesgranrioQuestions
                          )
                        }
                        className="font-semibold text-[var(--brand-primary)] hover:underline"
                      >
                        CESGRANRIO: {p.cesgranrioCount} ({p.cesgranrioPct.toFixed(1)}%)
                      </button>
                      <span aria-hidden="true" className="text-[var(--border-strong)]">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            `CEBRASPE — ${p.label}`,
                            `${p.cebraspeCount} questões (${p.cebraspePct.toFixed(1)}%)`,
                            p.cebraspeQuestions
                          )
                        }
                        className="font-semibold text-[var(--brand-secondary)] hover:underline"
                      >
                        CEBRASPE: {p.cebraspeCount} ({p.cebraspePct.toFixed(1)}%)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="h-2.5 overflow-hidden rounded-xs bg-[var(--bg-surface-subtle)]">
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{ width: `${p.cesgranrioPct}%` }}
                      />
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-xs bg-[var(--bg-surface-subtle)]">
                      <div
                        className="h-full bg-[#14213D]"
                        style={{ width: `${p.cebraspePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'pdfs' && (
        <div className="space-y-5">
          <section className="ui-card p-5">
            <h2 className="ui-section-title">
              Consulta Direta aos Cadernos Originais em PDF
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              A base tabular reúne metadados, temas, exigências e números de página, sem armazenar a íntegra textual das alternativas ou enunciados longos. Anexe seus arquivos PDF locais abaixo para abrir qualquer questão diretamente na página catalogada.
            </p>

            <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)]">
              {pdfCatalog.map((pdf) => {
                const attachedUrl = attachedPdfs[pdf.filename];
                const effectiveUrl = attachedUrl || pdf.specificPdfPath;
                return (
                  <div
                    key={pdf.filename}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-[var(--bg-surface-hover)]/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="break-all font-mono font-semibold text-[var(--text-primary)]">
                          {pdf.filename}
                        </span>
                        <span aria-hidden="true" className="text-[var(--border-strong)]">
                          ·
                        </span>
                        <span className="text-[var(--text-secondary)]">{pdf.banca}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {Array.from(pdf.provas).join(', ')} · {pdf.totalQuestoes} questões específicas
                        {pdf.specificPdfTotalPages
                          ? ` (${pdf.specificPdfTotalPages} págs. no PDF reduzido · até pág. ${pdf.maxPage} no original)`
                          : ` (até página ${pdf.maxPage})`}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="ui-btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-[var(--focus-ring)] focus-within:outline-offset-2">
                        <Upload className="h-3.5 w-3.5" />
                        {attachedUrl ? 'Trocar PDF local' : 'Anexar PDF completo'}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          onChange={(e) => handleFileChange(pdf.filename, e)}
                        />
                      </label>

                      {effectiveUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPdf({ filename: pdf.filename, page: 1 })
                          }
                          className="ui-btn-primary"
                        >
                          {attachedUrl ? 'Visualizar PDF local' : 'Abrir PDF específico'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onInspectQuestions(
                            pdf.filename,
                            `${pdf.totalQuestoes} questões catalogadas neste caderno`,
                            pdf.questoes
                          )
                        }
                        className="ui-btn-secondary text-[var(--brand-primary)]"
                      >
                        Ver questões ({pdf.totalQuestoes})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {previewPdf &&
            (() => {
              const catalogEntry = pdfCatalog.find((p) => p.filename === previewPdf.filename);
              const previewSrc =
                attachedPdfs[previewPdf.filename] || catalogEntry?.specificPdfPath;
              if (!previewSrc) return null;
              return (
                <section className="ui-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Visualizador:{' '}
                      <span className="font-mono">{previewPdf.filename}</span> (Página{' '}
                      {previewPdf.page}
                      {!attachedPdfs[previewPdf.filename] && catalogEntry?.specificPdfTotalPages
                        ? ` de ${catalogEntry.specificPdfTotalPages} — somente específicas`
                        : ''}
                      )
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-[var(--text-secondary)]">
                        Ir para página:
                        <input
                          type="number"
                          min={1}
                          value={previewPdf.page}
                          onChange={(e) =>
                            setPreviewPdf({
                              filename: previewPdf.filename,
                              page: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="ui-input ml-2 inline-block w-20 font-mono text-xs"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setPreviewPdf(null)}
                        className="ui-btn-secondary"
                      >
                        Fechar leitor
                      </button>
                    </div>
                  </div>
                  <iframe
                    key={`${previewSrc}-${previewPdf.page}`}
                    src={`${previewSrc}#page=${previewPdf.page}`}
                    title={`PDF ${previewPdf.filename}`}
                    className="h-[520px] w-full rounded-lg border border-[var(--border-subtle)]"
                  />
                </section>
              );
            })()}
        </div>
      )}

      {tab === 'desempenho' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="ui-card p-4">
              <div className="text-xs text-[var(--text-muted)]">Acertos</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--status-success)] tabular-nums">
                {perfStats.acerto}
              </div>
            </div>
            <div className="ui-card p-4">
              <div className="text-xs text-[var(--text-muted)]">Erros</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--status-error)] tabular-nums">
                {perfStats.erro}
              </div>
            </div>
            <div className="ui-card p-4">
              <div className="text-xs text-[var(--text-muted)]">Para revisão</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--status-warning)] tabular-nums">
                {perfStats.revisar}
              </div>
            </div>
            <div className="ui-card p-4">
              <div className="text-xs text-[var(--text-muted)]">Pendentes</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--text-secondary)] tabular-nums">
                {perfStats.pendente}
              </div>
            </div>
          </div>

          {perfStats.tracked.length > 0 && (
            <CoverageDonutChart
              title="Resumo Visual das Questões Marcadas"
              subtitle="Distribuição das marcações registradas durante a inspeção de questões."
              centerValue={`${perfStats.tracked.length}`}
              centerLabel="registradas"
              segments={[
                { id: 'acerto', label: 'Acertos', value: perfStats.acerto, color: '#059669', icon: 'cobrado' },
                { id: 'erro', label: 'Erros', value: perfStats.erro, color: '#DC2626', icon: 'nao_identificado' },
                { id: 'revisar', label: 'Para revisão', value: perfStats.revisar, color: '#D97706', icon: 'aprofundamento' },
              ]}
            />
          )}

          <section className="ui-card overflow-hidden">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3.5">
              <h2 className="ui-section-title">
                Caderno de Questões Registradas
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Questões que você marcou como Acertei, Errei ou Revisar ao inspecionar dossiês.
              </p>
            </div>
            {perfStats.tracked.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                Nenhuma questão registrada ainda. Abra qualquer questão no Localizador ou nos gráficos e marque seu status de estudo.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {perfStats.tracked.map((q) => {
                  const p = performanceMap[q.id];
                  return (
                    <div
                      key={q.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-[var(--bg-surface-hover)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {q.concursoCurto}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[var(--brand-primary)] tabular-nums">
                            Questão {q.questao} — Pág. {q.paginaPdf}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              p.status === 'acerto'
                                ? 'text-[var(--status-success)]'
                                : p.status === 'erro'
                                  ? 'text-[var(--status-error)]'
                                  : 'text-[var(--status-warning)]'
                            }`}
                          >
                            {p.status === 'acerto'
                              ? 'Acertei'
                              : p.status === 'erro'
                                ? 'Errei'
                                : 'Revisar'}
                          </span>
                          {p.timeSeconds !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {p.timeSeconds}s
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                          {q.tema}
                        </div>
                        {p.notes && (
                          <div className="mt-1 text-xs text-[var(--text-secondary)]">
                            Anotação: {p.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectQuestion(q, perfStats.tracked)}
                        className="ui-btn-secondary !min-h-[34px]"
                      >
                        Editar registro
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
