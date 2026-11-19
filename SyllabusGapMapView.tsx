import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Layers,
  Search,
} from 'lucide-react';
import type { GapStatus, QuestionRecord } from '../types/exam';
import {
  buildSyllabusGapMap,
  buildTopicExamHeatmap,
  getAvailableEditalScopes,
} from '../utils/examIntelligence';
import {
  CoverageDonutChart,
  GroupedComparisonBarChart,
  HeatmapMatrixChart,
  HorizontalFrequencyBarChart,
  type ComparisonBarCategory,
  type DonutSegment,
  type FrequencyBarDatum,
} from './DataVizCharts';
import { KnowledgeAtlasMap } from './KnowledgeAtlasMap';

interface SyllabusGapMapViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const STATUS_META: Record<
  GapStatus,
  {
    label: string;
    colorHex: string;
    textHex: string;
    bgHex: string;
    borderHex: string;
    desc: string;
  }
> = {
  cobrado: {
    label: 'Já cobrado',
    colorHex: '#059669',
    textHex: '#047857',
    bgHex: '#ECFDF5',
    borderHex: '#A7F3D0',
    desc: '2+ questões diretas no edital',
  },
  parcial: {
    label: 'Cobrado parcialmente',
    colorHex: '#2563EB',
    textHex: '#1E3A8A',
    bgHex: '#EFF6FF',
    borderHex: '#BFDBFE',
    desc: 'Apenas 1 questão na prova',
  },
  nao_identificado: {
    label: 'Ainda não identificado',
    colorHex: '#DC2626',
    textHex: '#B91C1C',
    bgHex: '#FEF2F2',
    borderHex: '#FECACA',
    desc: '0 questões na amostra (lacuna)',
  },
  aprofundamento: {
    label: 'Precisa de aprofundamento',
    colorHex: '#D97706',
    textHex: '#B45309',
    bgHex: '#FFFBEB',
    borderHex: '#FDE68A',
    desc: 'Cobrança correlata ou fronteira',
  },
};

const StatusIcon: React.FC<{ status: GapStatus; className?: string }> = ({
  status,
  className = 'h-3.5 w-3.5 shrink-0',
}) => {
  if (status === 'cobrado') {
    return <CheckCircle2 className={className} style={{ color: '#059669' }} aria-hidden="true" />;
  }
  if (status === 'parcial') {
    return <CircleDot className={className} style={{ color: '#2563EB' }} aria-hidden="true" />;
  }
  if (status === 'nao_identificado') {
    return <AlertCircle className={className} style={{ color: '#DC2626' }} aria-hidden="true" />;
  }
  return <AlertTriangle className={className} style={{ color: '#D97706' }} aria-hidden="true" />;
};

const SAMPLE_CUSTOM_EDITAL = `Estudo de gases perfeitos e transformações isotérmicas
Bombas centrífugas, cavitação e NPSH
Corrosão eletroquímica e proteção catódica
Destilação fracionada e torres de pratos
Sistemas de alívio e válvulas de segurança PSV`;

type GapViewMode = 'completo' | 'atlas_graficos' | 'tabela';
type BiChartTab = 'frequencia' | 'comparacao' | 'heatmap';

export const SyllabusGapMapView: React.FC<SyllabusGapMapViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const scopes = useMemo(() => getAvailableEditalScopes(), []);
  const [selectedEdital, setSelectedEdital] = useState<string>(scopes[0].id);
  const [statusFilter, setStatusFilter] = useState<'all' | GapStatus>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [viewMode, setViewMode] = useState<GapViewMode>('completo');
  const [biChartTab, setBiChartTab] = useState<BiChartTab>('frequencia');
  const [customInput, setCustomInput] = useState('');
  const [activeCustomLines, setActiveCustomLines] = useState<string[]>([]);

  const selectedScopeMeta = useMemo(
    () => scopes.find((s) => s.id === selectedEdital),
    [scopes, selectedEdital]
  );

  const selectedEditalLabel =
    selectedEdital === 'CUSTOM'
      ? 'Edital Personalizado'
      : selectedScopeMeta?.label || selectedEdital;

  const gapRows = useMemo(() => {
    if (selectedEdital === 'CUSTOM') {
      return buildSyllabusGapMap(questions, 'CUSTOM', activeCustomLines);
    }
    return buildSyllabusGapMap(questions, selectedEdital);
  }, [questions, selectedEdital, activeCustomLines]);

  const counts = useMemo(
    () => ({
      cobrado: gapRows.filter((r) => r.status === 'cobrado').length,
      parcial: gapRows.filter((r) => r.status === 'parcial').length,
      nao_identificado: gapRows.filter((r) => r.status === 'nao_identificado').length,
      aprofundamento: gapRows.filter((r) => r.status === 'aprofundamento').length,
    }),
    [gapRows]
  );

  const coverageStats = useMemo(() => {
    const total = gapRows.length;
    const coveredItems =
      counts.cobrado + counts.parcial + counts.aprofundamento;
    const coveragePct = total > 0 ? (coveredItems / total) * 100 : 0;

    const uniqueSelectedQuestions = Array.from(
      new Map(
        gapRows.flatMap((r) => r.questoesNaSelecao).map((q) => [q.id, q])
      ).values()
    );

    return {
      total,
      coveredItems,
      coveragePct,
      analyzedCount: uniqueSelectedQuestions.length,
      uniqueSelectedQuestions,
    };
  }, [gapRows, counts]);

  const donutSegments = useMemo<DonutSegment[]>(
    () =>
      (['cobrado', 'parcial', 'aprofundamento', 'nao_identificado'] as GapStatus[]).map(
        (st) => ({
          id: st,
          label: STATUS_META[st].label,
          value: counts[st],
          color: STATUS_META[st].colorHex,
          icon: st,
        })
      ),
    [counts]
  );

  // Real-data subject frequency within the selected edital scope
  const frequencyBars = useMemo<FrequencyBarDatum[]>(() => {
    const pool =
      coverageStats.uniqueSelectedQuestions.length > 0
        ? coverageStats.uniqueSelectedQuestions
        : [];
    if (pool.length === 0) return [];

    const byGroup = new Map<string, QuestionRecord[]>();
    for (const q of pool) {
      const key = q.topicoEditalUnificado || q.grupoEstudo;
      const arr = byGroup.get(key) || [];
      arr.push(q);
      byGroup.set(key, arr);
    }

    return Array.from(byGroup.entries())
      .map(([label, list]) => ({
        id: label,
        label,
        sublabel: `${new Set(list.map((q) => q.codigoPrograma).filter(Boolean)).size} código(s) do edital`,
        value: list.length,
        pct: (list.length / pool.length) * 100,
        questions: list,
      }))
      .sort((a, b) => b.value - a.value);
  }, [coverageStats.uniqueSelectedQuestions]);

  // Real-data comparison: Selected Edital vs Overall Historical Base across top subjects
  const comparisonData = useMemo(() => {
    const selectedPool = coverageStats.uniqueSelectedQuestions;
    if (selectedPool.length === 0 || questions.length === 0) {
      return { categories: [] as ComparisonBarCategory[] };
    }

    const totalBase = questions.length;
    const totalSel = selectedPool.length;

    const groupStats = new Map<
      string,
      { selQs: QuestionRecord[]; allQs: QuestionRecord[] }
    >();

    for (const q of questions) {
      const entry = groupStats.get(q.grupoEstudo) || { selQs: [], allQs: [] };
      entry.allQs.push(q);
      groupStats.set(q.grupoEstudo, entry);
    }
    for (const q of selectedPool) {
      const entry = groupStats.get(q.grupoEstudo) || { selQs: [], allQs: [] };
      entry.selQs.push(q);
      groupStats.set(q.grupoEstudo, entry);
    }

    const categories: ComparisonBarCategory[] = Array.from(groupStats.entries())
      .map(([grupo, d]) => ({
        id: grupo,
        label: grupo,
        values: {
          edital: Math.round(((d.selQs.length / totalSel) * 100) * 10) / 10,
          historico: Math.round(((d.allQs.length / totalBase) * 100) * 10) / 10,
        },
        questionsBySeries: {
          edital: d.selQs,
          historico: d.allQs,
        },
      }))
      .sort((a, b) => b.values.edital - a.values.edital || b.values.historico - a.values.historico)
      .slice(0, 7);

    return { categories };
  }, [coverageStats.uniqueSelectedQuestions, questions]);

  const heatmapData = useMemo(
    () => buildTopicExamHeatmap(questions, 'edital', 10),
    [questions]
  );

  const visibleRows = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return gapRows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (term) {
        const hay = `${r.codigo} ${r.titulo} ${r.recomendacao}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [gapRows, statusFilter, tableSearch]);

  const handleRunCustomCheck = () => {
    const lines = customInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    setActiveCustomLines(lines);
  };

  return (
    <div className="space-y-6">
      {/* AREA 1: Header, Edital Selector & View Mode Toggle */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="ui-kicker text-[var(--brand-indigo)]">
            Knowledge Atlas · Auditoria de Cobertura Programática
          </div>
          <h1 className="ui-page-title mt-0.5">
            Mapa de Lacunas e Conhecimento do Edital
          </h1>
          <p className="ui-page-subtitle">
            Cruze cada item numerado do edital com a base histórica real para enxergar cobertura, lacunas cegas, distribuição visual e árvore interativa de conhecimento.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            aria-label="Selecionar edital para análise de lacunas"
            value={selectedEdital}
            onChange={(e) => {
              setSelectedEdital(e.target.value);
              setStatusFilter('all');
            }}
            className="ui-select w-full min-w-0 max-w-full sm:w-auto sm:max-w-[340px] text-xs font-medium"
          >
            {scopes.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.label}
              </option>
            ))}
            <option value="CUSTOM">Conferir lista de tópicos colados (Edital personalizado)</option>
          </select>

          <div
            role="group"
            aria-label="Modo de visualização"
            className="inline-flex max-w-full flex-wrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1"
          >
            {(
              [
                { id: 'completo', label: 'Completo' },
                { id: 'atlas_graficos', label: 'Atlas + Gráficos' },
                { id: 'tabela', label: 'Tabela' },
              ] as { id: GapViewMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={viewMode === mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  viewMode === mode.id
                    ? 'bg-[var(--brand-secondary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Syllabus Input Panel */}
      {selectedEdital === 'CUSTOM' && (
        <section className="ui-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="ui-section-title">
                Cruzar tópicos de qualquer edital com as {questions.length} questões
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Cole um tópico por linha abaixo para verificar quais itens possuem cobertura direta, parcial ou nenhuma questão na base.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomInput(SAMPLE_CUSTOM_EDITAL);
                setActiveCustomLines(SAMPLE_CUSTOM_EDITAL.split('\n'));
              }}
              className="ui-btn-secondary"
            >
              Preencher exemplo de edital
            </button>
          </div>

          <textarea
            rows={4}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            aria-label="Lista de tópicos do edital para verificação de lacunas"
            placeholder="Cole os tópicos do conteúdo programático (1 tópico por linha)..."
            className="ui-textarea mt-3 text-xs"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleRunCustomCheck}
              className="ui-btn-primary"
            >
              Cruzar edital com a base
            </button>
          </div>
        </section>
      )}

      {/* AREA 2: 6-Card KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`ui-card p-4 text-left transition-colors ${
            statusFilter === 'all'
              ? 'border-[var(--brand-secondary)] bg-[var(--bg-surface)]'
              : 'hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-[var(--text-muted)]">
            <span>Total do edital</span>
            <Layers className="h-3.5 w-3.5 text-[var(--brand-secondary)]" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {coverageStats.total}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            itens numerados
          </div>
        </button>

        {(['cobrado', 'parcial', 'nao_identificado', 'aprofundamento'] as GapStatus[]).map(
          (st) => {
            const meta = STATUS_META[st];
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(active ? 'all' : st)}
                className={`ui-card p-4 text-left transition-colors ${
                  active
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/50'
                    : 'hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-medium text-[var(--text-muted)]">
                  <span className="truncate">{meta.label}</span>
                  <StatusIcon status={st} />
                </div>
                <div
                  style={{ color: meta.textHex }}
                  className="mt-1.5 font-mono text-2xl font-bold tabular-nums"
                >
                  {counts[st]}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {meta.desc}
                </div>
              </button>
            );
          }
        )}

        <div className="ui-card p-4">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Cobertura e amostra
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--brand-indigo)] tabular-nums">
            {coverageStats.coveragePct.toFixed(0)}%
          </div>
          <div className="mt-1 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
            {coverageStats.analyzedCount} questões analisadas
          </div>
        </div>
      </div>

      {/* AREA 3: Dynamic BI Charts (Donut + Tabbed Frequency/Comparison/Heatmap) */}
      {viewMode !== 'tabela' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <CoverageDonutChart
              title="Distribuição de Cobertura do Edital"
              subtitle="Clique em um segmento ou legenda para filtrar os itens abaixo."
              segments={donutSegments}
              centerValue={`${coverageStats.coveragePct.toFixed(0)}%`}
              centerLabel="com evidência"
              activeSegmentId={statusFilter === 'all' ? null : statusFilter}
              onSelectSegment={(segId) => {
                const st = segId as GapStatus;
                setStatusFilter(statusFilter === st ? 'all' : st);
              }}
            />
          </div>

          <div className="xl:col-span-7 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Gráficos analíticos complementares"
                className="inline-flex flex-wrap rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1"
              >
                {(
                  [
                    { id: 'frequencia', label: 'Frequência por Assunto' },
                    { id: 'comparacao', label: 'Edital × Base Histórica' },
                    { id: 'heatmap', label: 'Mapa de Calor (Provas)' },
                  ] as { id: BiChartTab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={biChartTab === t.id}
                    onClick={() => setBiChartTab(t.id)}
                    className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      biChartTab === t.id
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {biChartTab === 'frequencia' && (
              <HorizontalFrequencyBarChart
                title={`Assuntos Mais Cobrados — ${selectedEditalLabel}`}
                subtitle="Clique em qualquer barra para consultar as questões originais do assunto."
                items={frequencyBars}
                maxItems={8}
                emptyMessage="Nenhuma questão associada aos itens deste recorte ainda."
                onSelectBar={(item) => {
                  if (item.questions && item.questions.length > 0) {
                    onInspectQuestions(
                      `${item.label} (${selectedEditalLabel})`,
                      `${item.questions.length} questão(ões) mapeadas neste assunto`,
                      item.questions
                    );
                  }
                }}
              />
            )}

            {biChartTab === 'comparacao' && (
              <GroupedComparisonBarChart
                title="Peso Relativo: Edital Selecionado × Base Histórica (%)"
                subtitle="Compara a proporção de questões por grupo de estudo no recorte atual frente ao histórico completo."
                series={[
                  {
                    key: 'edital',
                    label: selectedEdital === 'CUSTOM' ? 'Edital colado (%)' : 'No edital (%)',
                    color: '#2563EB',
                  },
                  {
                    key: 'historico',
                    label: 'Média histórica (%)',
                    color: '#14213D',
                  },
                ]}
                categories={comparisonData.categories}
                unitSuffix="%"
                onSelectCell={(cat, seriesKey, seriesLabel) => {
                  const list = cat.questionsBySeries?.[seriesKey] || [];
                  if (list.length > 0) {
                    onInspectQuestions(
                      `${cat.label} · ${seriesLabel}`,
                      `${list.length} questão(ões) encontradas`,
                      list
                    );
                  }
                }}
              />
            )}

            {biChartTab === 'heatmap' && (
              <HeatmapMatrixChart
                title="Mapa de Calor — Tópicos do Edital × Concursos"
                subtitle="Concentração de ocorrências por tópico unificado ao longo dos cadernos da base. Clique na célula para abrir as questões."
                data={heatmapData}
                onSelectCell={(topic, exam, list) =>
                  onInspectQuestions(
                    `${topic} — ${exam}`,
                    `${list.length} questão(ões) registradas nesta prova`,
                    list
                  )
                }
              />
            )}
          </div>
        </div>
      )}

      {/* AREA 4: Interactive 4-Level Knowledge Atlas */}
      {viewMode !== 'tabela' && (
        <KnowledgeAtlasMap
          gapRows={gapRows}
          allQuestions={questions}
          editalLabel={selectedEditalLabel}
          onInspectQuestions={onInspectQuestions}
        />
      )}

      {/* AREA 5: Filter Bar + Full Syllabus Gap Matrix Table */}
      {viewMode !== 'atlas_graficos' && (
        <section className="ui-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
              role="group"
              aria-label="Filtrar lacunas por situação"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Todos ({gapRows.length})
              </button>
              {(['nao_identificado', 'parcial', 'aprofundamento', 'cobrado'] as GapStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {STATUS_META[st].label} ({counts[st]})
                  </button>
                )
              )}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                aria-label="Buscar item na tabela de lacunas"
                placeholder="Filtrar por código ou tópico..."
                className="ui-input !pl-9 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                  <th className="px-4 py-3">Item do edital</th>
                  <th className="px-3 py-3">Tópico / Referência</th>
                  <th className="px-3 py-3">Situação</th>
                  <th className="px-3 py-3 text-right">Na prova</th>
                  <th className="px-3 py-3 text-right">Outras provas</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      {selectedEdital === 'CUSTOM' && activeCustomLines.length === 0
                        ? 'Cole os tópicos do edital acima e clique em "Cruzar edital com a base".'
                        : 'Nenhum item encontrado nesta categoria.'}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const meta = STATUS_META[row.status];
                    const inspectList =
                      row.questoesNaSelecao.length > 0
                        ? row.questoesNaSelecao
                        : row.questoesEmOutrasProvas;
                    return (
                      <tr key={row.codigo} className="transition-colors hover:bg-[var(--bg-surface-hover)]">
                        <td className="px-4 py-3 font-mono font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          {row.codigo}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-[var(--text-primary)]">{row.titulo}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                            {row.recomendacao}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            style={{ color: meta.textHex }}
                            className="inline-flex items-center gap-1.5 font-semibold"
                          >
                            <StatusIcon status={row.status} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-[var(--text-primary)] tabular-nums">
                          {row.questoesNaSelecao.length}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[var(--text-muted)] tabular-nums">
                          {row.questoesEmOutrasProvas.length}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {inspectList.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                onInspectQuestions(
                                  `${row.codigo} — ${row.titulo}`,
                                  row.questoesNaSelecao.length > 0
                                    ? `${row.questoesNaSelecao.length} questão(ões) no edital selecionado`
                                    : `Referência equivalente em outras provas (${row.questoesEmOutrasProvas.length} questões)`,
                                  inspectList
                                )
                              }
                              className="ui-btn-secondary !min-h-[32px] !px-2.5 !py-1 !text-[var(--brand-primary)]"
                            >
                              {row.questoesNaSelecao.length > 0
                                ? 'Consultar prova'
                                : 'Ver equivalentes'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">Sem questões</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
