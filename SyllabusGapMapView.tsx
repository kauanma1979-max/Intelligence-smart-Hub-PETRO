import React, { useMemo, useState } from 'react';
import type { GapStatus, QuestionRecord } from '../types/exam';
import {
  buildSyllabusGapMap,
  getAvailableEditalScopes,
} from '../utils/examIntelligence';

interface SyllabusGapMapViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

const STATUS_META: Record<
  GapStatus,
  { label: string; colorClass: string; desc: string }
> = {
  cobrado: {
    label: 'Já cobrado',
    colorClass: 'text-emerald-700',
    desc: '2+ questões diretas no edital selecionado',
  },
  parcial: {
    label: 'Cobrado parcialmente',
    colorClass: 'text-blue-700',
    desc: 'Apenas 1 questão identificada na prova',
  },
  nao_identificado: {
    label: 'Ainda não identificado',
    colorClass: 'text-red-700',
    desc: '0 questões na amostra do edital (lacuna)',
  },
  aprofundamento: {
    label: 'Precisa de aprofundamento',
    colorClass: 'text-amber-700',
    desc: 'Cobrança correlata ou fronteira conceitual',
  },
};

const SAMPLE_CUSTOM_EDITAL = `Estudo de gases perfeitos e transformações isotérmicas
Bombas centrífugas, cavitação e NPSH
Corrosão eletroquímica e proteção catódica
Destilação fracionada e torres de pratos
Sistemas de alívio e válvulas de segurança PSV`;

export const SyllabusGapMapView: React.FC<SyllabusGapMapViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const scopes = useMemo(() => getAvailableEditalScopes(), []);
  const [selectedEdital, setSelectedEdital] = useState<string>(scopes[0].id);
  const [statusFilter, setStatusFilter] = useState<'all' | GapStatus>('all');
  const [customInput, setCustomInput] = useState('');
  const [activeCustomLines, setActiveCustomLines] = useState<string[]>([]);

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

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return gapRows;
    return gapRows.filter((r) => r.status === statusFilter);
  }, [gapRows, statusFilter]);

  const handleRunCustomCheck = () => {
    const lines = customInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    setActiveCustomLines(lines);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Mapa de Lacunas do Edital
          </h1>
          <p className="ui-page-subtitle">
            Compare todos os itens numerados do conteúdo programático de um edital com a amostra real de questões para revelar pontos cegos ainda não cobrados.
          </p>
        </div>

        <select
          aria-label="Selecionar edital para análise de lacunas"
          value={selectedEdital}
          onChange={(e) => {
            setSelectedEdital(e.target.value);
            setStatusFilter('all');
          }}
          className="ui-select w-full sm:w-auto text-xs font-medium"
        >
          {scopes.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.label}
            </option>
          ))}
          <option value="CUSTOM">Conferir lista de tópicos colados (Edital personalizado)</option>
        </select>
      </div>

      {/* 4 Status KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(['cobrado', 'parcial', 'nao_identificado', 'aprofundamento'] as GapStatus[]).map(
          (st) => {
            const meta = STATUS_META[st];
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(active ? 'all' : st)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-medium text-slate-500">{meta.label}</div>
                <div
                  className={`mt-1 font-mono text-2xl font-bold tabular-nums ${meta.colorClass}`}
                >
                  {counts[st]}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{meta.desc}</div>
              </button>
            );
          }
        )}
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Filtrar lacunas por situação"
        >
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
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
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
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
      </div>

      {/* Gap Matrix Table */}
      <section className="ui-card overflow-hidden">
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
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
                    <tr key={row.codigo} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.codigo}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{row.titulo}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {row.recomendacao}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${meta.colorClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {row.questoesNaSelecao.length}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600 tabular-nums">
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
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-50 whitespace-nowrap"
                          >
                            {row.questoesNaSelecao.length > 0
                              ? 'Consultar prova'
                              : 'Ver equivalentes'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem questões</span>
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
    </div>
  );
};
