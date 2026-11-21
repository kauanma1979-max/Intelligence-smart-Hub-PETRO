import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, FileText, RotateCcw, Search } from 'lucide-react';
import type {
  LocatorFilters,
  QuestionPerformance,
  QuestionRecord,
} from '../types/exam';
import {
  filterQuestions,
  getQuestionAnswerKeyInfo,
} from '../utils/examIntelligence';

interface SmartLocatorViewProps {
  questions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  onSelectQuestion: (q: QuestionRecord, allMatches: QuestionRecord[]) => void;
}

const INITIAL_FILTERS: LocatorFilters = {
  query: '',
  empresa: 'Todas',
  prova: 'Todas',
  ano: 'Todos',
  enfase: 'Todas',
  banca: 'Todas',
  questaoNumero: '',
  area: 'Todas',
  grupo: 'Todos',
  vinculo: 'Todos',
  statusDesempenho: 'Todos',
};

export const SmartLocatorView: React.FC<SmartLocatorViewProps> = ({
  questions,
  performanceMap,
  onSelectQuestion,
}) => {
  const [filters, setFilters] = useState<LocatorFilters>(INITIAL_FILTERS);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const options = useMemo(() => {
    const uniq = (arr: string[]) => Array.from(new Set(arr)).filter(Boolean).sort();
    return {
      empresas: uniq(questions.map((q) => q.empresa)),
      provas: uniq(questions.map((q) => q.prova)),
      anos: uniq(questions.map((q) => q.ano)),
      enfases: uniq(questions.map((q) => q.enfase)),
      bancas: uniq(questions.map((q) => q.banca)),
      areas: uniq(questions.map((q) => q.areaOriginal)),
      grupos: uniq(questions.map((q) => q.grupoEstudo)),
    };
  }, [questions]);

  const matches = useMemo(
    () => filterQuestions(questions, filters, performanceMap),
    [questions, filters, performanceMap]
  );

  const updateFilter = <K extends keyof LocatorFilters>(
    key: K,
    value: LocatorFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilter =
    filters.query !== '' ||
    filters.empresa !== 'Todas' ||
    filters.prova !== 'Todas' ||
    filters.ano !== 'Todos' ||
    filters.enfase !== 'Todas' ||
    filters.banca !== 'Todas' ||
    filters.questaoNumero !== '' ||
    filters.area !== 'Todas' ||
    filters.grupo !== 'Todos' ||
    filters.vinculo !== 'Todos' ||
    filters.statusDesempenho !== 'Todos';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-page-title">
            Localizador Inteligente de Questões
          </h1>
          <p className="ui-page-subtitle">
            Pesquise por tema, exigência, código ou número exato. Toda questão é identificada pela prova + número + página do PDF.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
            {matches.length}
          </span>
          <span>questões localizadas</span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="ui-btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Search & Multi-Filter Panel */}
      <section
        aria-label="Filtros de busca de questões"
        className="ui-card p-4 sm:p-5"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            aria-label="Buscar por tema, assunto, exigência ou código do edital"
            placeholder="Ex: Bombas centrífugas, cavitação, ANSA.BIII.03, PID, Bernoulli..."
            className="ui-input pl-9 text-sm"
          />
        </div>

        {/* Quick Example Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Consultas rápidas:</span>
          {['Bombas centrífugas', 'Controlador PID', 'Estequiometria', 'Paquímetro', 'Bernoulli'].map(
            (sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => updateFilter('query', sample)}
                className="min-h-[34px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/70 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary-ink)] whitespace-nowrap"
              >
                {sample}
              </button>
            )
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-empresa" className="block text-xs font-medium text-[var(--text-secondary)]">
              Empresa
            </label>
            <select
              id="f-empresa"
              value={filters.empresa}
              onChange={(e) => updateFilter('empresa', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as empresas</option>
              {options.empresas.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-prova" className="block text-xs font-medium text-[var(--text-secondary)]">
              Concurso / Caderno
            </label>
            <select
              id="f-prova"
              value={filters.prova}
              onChange={(e) => updateFilter('prova', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todos os concursos</option>
              {options.provas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-ano" className="block text-xs font-medium text-[var(--text-secondary)]">
              Ano / Edição
            </label>
            <select
              id="f-ano"
              value={filters.ano}
              onChange={(e) => updateFilter('ano', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todos os anos</option>
              {options.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-banca" className="block text-xs font-medium text-[var(--text-secondary)]">
              Banca
            </label>
            <select
              id="f-banca"
              value={filters.banca}
              onChange={(e) => updateFilter('banca', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as bancas</option>
              {options.bancas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-enfase" className="block text-xs font-medium text-[var(--text-secondary)]">
              Ênfase
            </label>
            <select
              id="f-enfase"
              value={filters.enfase}
              onChange={(e) => updateFilter('enfase', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as ênfases</option>
              {options.enfases.map((en) => (
                <option key={en} value={en}>
                  {en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-area" className="block text-xs font-medium text-[var(--text-secondary)]">
              Área original
            </label>
            <select
              id="f-area"
              value={filters.area}
              onChange={(e) => updateFilter('area', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todas as áreas</option>
              {options.areas.map((ar) => (
                <option key={ar} value={ar}>
                  {ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-grupo" className="block text-xs font-medium text-[var(--text-secondary)]">
              Grupo consolidado (Tópico)
            </label>
            <select
              id="f-grupo"
              value={filters.grupo}
              onChange={(e) => updateFilter('grupo', e.target.value)}
              className="ui-select mt-1 text-xs"
            >
              <option value="Todas">Todos os grupos</option>
              {options.grupos.map((gr) => (
                <option key={gr} value={gr}>
                  {gr}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="f-questao"
                className="block text-xs font-medium text-[var(--text-secondary)]"
              >
                Nº Questão
              </label>
              <input
                id="f-questao"
                type="number"
                min={1}
                placeholder="Ex: 96"
                value={filters.questaoNumero}
                onChange={(e) => updateFilter('questaoNumero', e.target.value)}
                className="ui-input mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="f-vinculo"
                className="block text-xs font-medium text-[var(--text-secondary)]"
              >
                Vínculo
              </label>
              <select
                id="f-vinculo"
                value={filters.vinculo}
                onChange={(e) => updateFilter('vinculo', e.target.value)}
                className="ui-select mt-1 text-xs"
              >
                <option value="Todos">Todos</option>
                <option value="Direto">Direto</option>
                <option value="Correlato">Correlato</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results List */}
      {matches.length === 0 ? (
        <div className="ui-card p-10 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Nenhuma questão encontrada para os critérios aplicados
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Tente ampliar o termo de busca ou limpar os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="ui-btn-primary mt-4"
          >
            Mostrar todas as questões
          </button>
        </div>
      ) : (
        <div className="ui-card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {matches.map((q) => {
            const perf = performanceMap[q.id]?.status || 'pendente';
            const akInfo = getQuestionAnswerKeyInfo(q);
            return (
              <article
                key={q.id}
                className="p-4 sm:px-5 transition-colors hover:bg-[var(--bg-surface-hover)]/75"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {q.concursoCurto}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{q.banca}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[var(--brand-primary)] tabular-nums">
                        Questão {q.questao} — Página {q.paginaPdf} do PDF
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          q.vinculo === 'Direto'
                            ? 'font-medium text-[var(--status-success)]'
                            : 'font-medium text-[var(--status-warning)]'
                        }
                      >
                        Vínculo {q.vinculo}
                      </span>
                      {akInfo.hasOfficialKey && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedIds((prev) => ({
                                ...prev,
                                [q.id]: !prev[q.id],
                              }))
                            }
                            title={
                              revealedIds[q.id]
                                ? akInfo.statusBadgeLabel
                                : 'Exibir gabarito'
                            }
                            aria-label={
                              revealedIds[q.id]
                                ? `Ocultar gabarito da questão ${q.questao}`
                                : `Exibir gabarito da questão ${q.questao}`
                            }
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                              revealedIds[q.id]
                                ? akInfo.isAnnulled
                                  ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
                                  : akInfo.isPreliminary
                                    ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                                    : 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
                                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary-ink)]'
                            }`}
                          >
                            {revealedIds[q.id] ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span>
                                  {akInfo.isAnnulled
                                    ? 'ANULADA'
                                    : `Gab: ${akInfo.shortAnswerLabel}${akInfo.isPreliminary ? ' (Preliminar)' : ''}`}
                                </span>
                              </>
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </>
                      )}
                      {perf !== 'pendente' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              perf === 'acerto'
                                ? 'font-semibold text-[var(--status-success)]'
                                : perf === 'erro'
                                  ? 'font-semibold text-[var(--status-error)]'
                                  : 'font-semibold text-[var(--status-warning)]'
                            }
                          >
                            {perf === 'acerto'
                              ? 'Acertei'
                              : perf === 'erro'
                                ? 'Errei'
                                : 'Marcada para revisão'}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                      {q.tema}
                    </h2>

                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-muted)]">Exigência: </span>
                      {q.exigencia}
                    </p>

                    {q.statementWithoutNumber && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                        {q.statementWithoutNumber.replace(/\s+/g, ' ').trim()}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                      <span>
                        Edital:{' '}
                        <span className="font-mono font-medium text-[var(--text-primary)]">
                          {q.codigoPrograma}
                        </span>
                        {q.conteudosSecundarios.length > 0 && (
                          <span className="font-mono text-[var(--text-muted)]">
                            {' '}
                            (+ {q.conteudosSecundarios.join(', ')})
                          </span>
                        )}
                      </span>
                      <span>
                        Grupo: <span className="text-[var(--text-secondary)]">{q.grupoEstudo}</span>
                      </span>
                      <span className="truncate font-mono text-[var(--text-muted)]">
                        Arquivo: {q.arquivoOrigem}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectQuestion(q, matches)}
                      className="ui-btn-secondary"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Abrir prova / Dossiê
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
