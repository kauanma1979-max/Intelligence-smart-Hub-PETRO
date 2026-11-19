import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { PresenceScope, QuestionRecord } from '../types/exam';
import { buildCommonAndExclusiveMatrix } from '../utils/examIntelligence';
import {
  CoverageDonutChart,
  HorizontalFrequencyBarChart,
} from './DataVizCharts';

interface CommonExclusiveViewProps {
  questions: QuestionRecord[];
  onInspectQuestions: (title: string, subtitle: string, list: QuestionRecord[]) => void;
}

export const CommonExclusiveView: React.FC<CommonExclusiveViewProps> = ({
  questions,
  onInspectQuestions,
}) => {
  const [level, setLevel] = useState<'edital' | 'topico' | 'grupo'>('edital');
  const [axis, setAxis] = useState<'empresa' | 'prova'>('empresa');
  const [scopeFilter, setScopeFilter] = useState<'all' | PresenceScope>('all');
  const [search, setSearch] = useState('');

  const { empresas, provas, rows } = useMemo(
    () => buildCommonAndExclusiveMatrix(questions, level),
    [questions, level]
  );

  const counts = useMemo(() => {
    const getScope = (r: (typeof rows)[number]) =>
      axis === 'empresa' ? r.scopeEmpresa : r.scopeProva;
    return {
      total: rows.length,
      todos: rows.filter((r) => getScope(r) === 'todos').length,
      varios: rows.filter((r) => getScope(r) === 'varios').length,
      exclusivo: rows.filter((r) => getScope(r) === 'exclusivo').length,
    };
  }, [rows, axis]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const s = axis === 'empresa' ? r.scopeEmpresa : r.scopeProva;
      if (scopeFilter !== 'all' && s !== scopeFilter) return false;
      if (q) {
        const matchesTopic = r.tema.toLowerCase().includes(q);
        const matchesSub = r.questoes.some(
          (item) =>
            item.tema.toLowerCase().includes(q) ||
            item.exigencia.toLowerCase().includes(q)
        );
        if (!matchesTopic && !matchesSub) return false;
      }
      return true;
    });
  }, [rows, axis, scopeFilter, search]);

  const columns = axis === 'empresa' ? empresas : provas;

  const formatQuestionRefs = (list: QuestionRecord[]) => {
    if (list.length === 0) return '';
    return list
      .slice(0, 6)
      .map((q) => `${q.concursoCurto.replace('Petrobras ', 'P').replace('Transpetro ', 'TP')} Q${q.questao}`)
      .join(', ') + (list.length > 6 ? ` (+${list.length - 6})` : '');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Conteúdos Comuns e Exclusivos dos Concursos
          </h1>
          <p className="ui-page-subtitle">
            Identifique o núcleo transversal cobrado em todas as provas, os temas recorrentes em vários editais e os tópicos exclusivos.
          </p>
        </div>

        <div
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-1"
          role="group"
          aria-label="Comparar por empresa ou prova individual"
        >
          <button
            type="button"
            onClick={() => setAxis('empresa')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              axis === 'empresa'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por empresa (Transpetro × Petrobras × ANSA)
          </button>
          <button
            type="button"
            onClick={() => setAxis('prova')}
            className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              axis === 'prova'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por prova ({provas.length} provas)
          </button>
        </div>
      </div>

      {/* 3 Situations Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setScopeFilter(scopeFilter === 'todos' ? 'all' : 'todos')}
          className={`ui-card p-4 text-left transition-colors ${
            scopeFilter === 'todos'
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/50'
              : 'hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            1. Presentes em todos ({columns.length}/{columns.length})
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--status-success)] tabular-nums">
            {counts.todos}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Núcleo obrigatório entre todos os concursos analisados
          </div>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter(scopeFilter === 'varios' ? 'all' : 'varios')}
          className={`ui-card p-4 text-left transition-colors ${
            scopeFilter === 'varios'
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/50'
              : 'hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            2. Presentes em vários concursos
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--brand-primary)] tabular-nums">
            {counts.varios}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Recorrentes em mais de um edital ou banca
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setScopeFilter(scopeFilter === 'exclusivo' ? 'all' : 'exclusivo')
          }
          className={`ui-card p-4 text-left transition-colors ${
            scopeFilter === 'exclusivo'
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/50'
              : 'hover:bg-[var(--bg-surface-hover)]'
          }`}
        >
          <div className="text-xs font-medium text-[var(--text-muted)]">
            3. Exclusivos de um concurso
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--status-warning)] tabular-nums">
            {counts.exclusivo}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Identificados em apenas uma empresa ou prova específica
          </div>
        </button>
      </div>

      {/* Visual Analytics Strip */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <CoverageDonutChart
            title="Proporção de Transversalidade"
            subtitle="Clique em um grupo para filtrar a matriz de interseção."
            centerValue={`${counts.total}`}
            centerLabel="temas"
            activeSegmentId={scopeFilter === 'all' ? null : scopeFilter}
            onSelectSegment={(segId) => {
              const s = segId as PresenceScope;
              setScopeFilter(scopeFilter === s ? 'all' : s);
            }}
            segments={[
              {
                id: 'todos',
                label: 'Comum a todos',
                value: counts.todos,
                color: '#059669',
                icon: 'cobrado',
              },
              {
                id: 'varios',
                label: 'Presente em vários',
                value: counts.varios,
                color: '#2563EB',
                icon: 'parcial',
              },
              {
                id: 'exclusivo',
                label: 'Exclusivo de 1 escopo',
                value: counts.exclusivo,
                color: '#D97706',
                icon: 'aprofundamento',
              },
            ]}
          />
        </div>

        <div className="xl:col-span-7">
          <HorizontalFrequencyBarChart
            title="Temas de Maior Recorrência no Recorte Atual"
            subtitle="Clique em uma barra para consultar todas as questões desse tema."
            maxItems={7}
            items={filteredRows
              .slice()
              .sort((a, b) => b.totalQuestoes - a.totalQuestoes)
              .map((r) => ({
                id: r.tema,
                label: r.tema,
                sublabel: `${r.provasPresentes.length} prova(s): ${r.provasPresentes.join(' · ')}`,
                value: r.totalQuestoes,
                questions: r.questoes,
              }))}
            onSelectBar={(item) => {
              if (item.questions && item.questions.length > 0) {
                onInspectQuestions(
                  item.label,
                  `${item.questions.length} questão(ões) encontradas`,
                  item.questions
                );
              }
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="relative min-w-0 w-full sm:min-w-[220px] sm:flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar assunto na matriz comum e exclusivos"
            placeholder="Ex: Estequiometria, Calorimetria, Cavitação, Polímeros..."
            className="ui-input pl-9 text-xs"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            aria-label="Granularidade da comparação"
            value={level}
            onChange={(e) =>
              setLevel(e.target.value as 'edital' | 'topico' | 'grupo')
            }
            className="ui-select w-full sm:w-auto text-xs"
          >
            <option value="edital">Por tópico unificado do edital</option>
            <option value="topico">Por tópico específico literal (ex: Cavitação, Estática)</option>
            <option value="grupo">Por grupo consolidado</option>
          </select>

          <select
            aria-label="Filtrar situação de abrangência"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as 'all' | PresenceScope)}
            className="ui-select w-full sm:w-auto text-xs"
          >
            <option value="all">Todas as situações ({counts.total})</option>
            <option value="todos">Em todos os concursos ({counts.todos})</option>
            <option value="varios">Em vários concursos ({counts.varios})</option>
            <option value="exclusivo">Exclusivos ({counts.exclusivo})</option>
          </select>
        </div>
      </div>

      {/* Intersection Matrix */}
      <section className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-4 py-3">Tema / Assunto</th>
                <th className="px-3 py-3">Situação</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-3 text-center whitespace-nowrap">
                    {col}
                  </th>
                ))}
                <th className="px-3 py-3">Questões responsáveis</th>
                <th className="px-4 py-3 text-right">Consultar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 4}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Nenhum assunto encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const scope =
                    axis === 'empresa' ? row.scopeEmpresa : row.scopeProva;
                  const bucketMap =
                    axis === 'empresa' ? row.porEmpresa : row.porProva;
                  const presentLabel =
                    axis === 'empresa'
                      ? row.empresasPresentes[0]
                      : row.provasPresentes[0];

                  return (
                    <tr key={row.tema} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row.tema}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[11px]">
                        {scope === 'todos' ? (
                          <span className="font-semibold text-emerald-700">
                            Comum a todos
                          </span>
                        ) : scope === 'varios' ? (
                          <span className="font-medium text-blue-700">
                            Vários ({axis === 'empresa' ? row.empresasPresentes.length : row.provasPresentes.length})
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700">
                            Exclusivo · {presentLabel}
                          </span>
                        )}
                      </td>
                      {columns.map((col) => {
                        const cellQuestions = bucketMap[col] || [];
                        return (
                          <td
                            key={col}
                            className="px-3 py-3 text-center font-mono tabular-nums"
                          >
                            {cellQuestions.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onInspectQuestions(
                                    `${row.tema} — ${col}`,
                                    `${cellQuestions.length} questão(ões) encontradas em ${col}`,
                                    cellQuestions
                                  )
                                }
                                className="rounded px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
                              >
                                Sim ({cellQuestions.length})
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                        {formatQuestionRefs(row.questoes)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onInspectQuestions(
                              row.tema,
                              `${row.totalQuestoes} questões em ${row.provasPresentes.join(', ')}`,
                              row.questoes
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-50 whitespace-nowrap"
                        >
                          Ver questões ({row.totalQuestoes})
                        </button>
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
