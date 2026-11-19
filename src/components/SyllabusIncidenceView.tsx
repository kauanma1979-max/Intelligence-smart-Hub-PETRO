import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { QuestionRecord, SyllabusIncidenceRow } from '../types/exam';
import {
  buildSyllabusIncidenceMap,
  buildTopicExamHeatmap,
} from '../utils/examIntelligence';
import {
  HeatmapMatrixChart,
  HorizontalFrequencyBarChart,
} from './DataVizCharts';

interface SyllabusIncidenceViewProps {
  questions: QuestionRecord[];
  onInspectTopic: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

export const SyllabusIncidenceView: React.FC<SyllabusIncidenceViewProps> = ({
  questions,
  onInspectTopic,
}) => {
  const [mode, setMode] = useState<'unificado' | 'codigo'>('unificado');
  const [search, setSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState('Todas');
  const [chartTab, setChartTab] = useState<'barras' | 'heatmap'>('barras');

  const exams = useMemo(
    () => Array.from(new Set(questions.map((q) => q.prova))).sort(),
    [questions]
  );

  const scopedQuestions = useMemo(() => {
    if (selectedExam === 'Todas') return questions;
    return questions.filter((q) => q.prova === selectedExam);
  }, [questions, selectedExam]);

  const rows: SyllabusIncidenceRow[] = useMemo(() => {
    const all = buildSyllabusIncidenceMap(scopedQuestions, mode);
    if (!search.trim()) return all;
    const s = search.toLowerCase();
    return all.filter(
      (r) =>
        r.titulo.toLowerCase().includes(s) ||
        r.codigosRelacionados.some((c) => c.toLowerCase().includes(s)) ||
        r.provasPresentes.some((p) => p.toLowerCase().includes(s))
    );
  }, [scopedQuestions, mode, search]);

  const heatmapData = useMemo(
    () => buildTopicExamHeatmap(scopedQuestions, 'edital', 10),
    [scopedQuestions]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Mapa de Incidência por Conteúdo Programático
          </h1>
          <p className="ui-page-subtitle">
            Descubra quais tópicos e códigos do edital possuem histórico real de cobrança e consulte prova e questão exatas.
          </p>
        </div>

        {/* Segmented Mode Control */}
        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Agrupamento do mapa programático"
        >
          <button
            type="button"
            onClick={() => setMode('unificado')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'unificado'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por tópico unificado do edital
          </button>
          <button
            type="button"
            onClick={() => setMode('codigo')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'codigo'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por código original (T18 / B1 / TP23 / ANSA)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ui-card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-0 w-full sm:min-w-[220px] sm:flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar conteúdo programático"
            placeholder="Filtrar tópico do edital ou código (ex: gases, bombas, ANSA.BIII.03, B1.03)..."
            className="ui-input pl-9 text-xs"
          />
        </div>

        <select
          aria-label="Filtrar por prova"
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="ui-select w-full sm:w-auto text-xs"
        >
          <option value="Todas">Todas as provas</option>
          {exams.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>

        <span className="font-mono text-xs font-medium text-[var(--text-muted)] tabular-nums">
          {rows.length} registros no edital
        </span>
      </div>

      {/* Interactive BI Chart Section */}
      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Visualização do mapa do edital"
          className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={chartTab === 'barras'}
            onClick={() => setChartTab('barras')}
            className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              chartTab === 'barras'
                ? 'bg-[var(--brand-secondary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            Top 10 Conteúdos (Barras)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={chartTab === 'heatmap'}
            onClick={() => setChartTab('heatmap')}
            className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              chartTab === 'heatmap'
                ? 'bg-[var(--brand-secondary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            Mapa de Calor (Provas)
          </button>
        </div>

        {chartTab === 'barras' ? (
          <HorizontalFrequencyBarChart
            title="Top 10 Tópicos e Códigos do Edital por Incidência"
            subtitle="Clique em qualquer barra para abrir todas as questões associadas ao conteúdo."
            maxItems={10}
            items={rows.map((r) => ({
              id: r.id,
              label: r.titulo,
              sublabel: `Códigos: ${r.codigosRelacionados.slice(0, 4).join(', ')} · Direto: ${r.vinculoDiretoCount} / Correlato: ${r.vinculoCorrelatoCount}`,
              value: r.questoesCount,
              pct: scopedQuestions.length > 0 ? (r.questoesCount / scopedQuestions.length) * 100 : 0,
              questions: r.questoes,
            }))}
            onSelectBar={(item) => {
              if (item.questions && item.questions.length > 0) {
                onInspectTopic(
                  item.label,
                  `${item.questions.length} questão(ões) associadas a este item do edital`,
                  item.questions
                );
              }
            }}
          />
        ) : (
          <HeatmapMatrixChart
            title="Mapa de Calor — Conteúdos do Edital × Provas"
            subtitle="Clique em qualquer célula para inspecionar as questões daquela prova."
            data={heatmapData}
            onSelectCell={(topic, exam, list) =>
              onInspectTopic(
                `${topic} — ${exam}`,
                `${list.length} questão(ões) nesta prova`,
                list
              )
            }
          />
        )}
      </div>

      {/* Incidence Table */}
      <section className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Conteúdo programático</th>
                <th className="px-3 py-3">Códigos de edital</th>
                <th className="px-3 py-3 text-right">Provas</th>
                <th className="px-3 py-3 text-right">Questões</th>
                <th className="px-3 py-3 text-right">Direto / Correlato</th>
                <th className="px-4 py-3 text-right">Relação completa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Nenhum conteúdo programático encontrado para o filtro digitado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-[var(--bg-surface-hover)]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--text-primary)]">{row.titulo}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {row.provasPresentes.join(' · ')}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {row.codigosRelacionados.slice(0, 6).join(', ')}
                      {row.codigosRelacionados.length > 6 &&
                        ` (+${row.codigosRelacionados.length - 6})`}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                      {row.provasCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-[var(--brand-primary)] tabular-nums">
                      {row.questoesCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--text-secondary)] tabular-nums">
                      {row.vinculoDiretoCount} / {row.vinculoCorrelatoCount}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectTopic(
                            row.titulo,
                            `${row.questoesCount} questões em ${row.provasCount} prova(s) · Códigos: ${row.codigosRelacionados.join(', ')}`,
                            row.questoes
                          )
                        }
                        className="ui-btn-secondary"
                      >
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
