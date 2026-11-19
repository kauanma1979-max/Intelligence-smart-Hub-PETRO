import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { LinkType, NewExamPayload, NewQuestionInput } from '../types/exam';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGroups: string[];
  onSaveExam: (payload: NewExamPayload) => void;
}

const EMPTY_QUESTION: NewQuestionInput = {
  questao: 1,
  paginaPdf: 1,
  areaOriginal: 'Equipamentos de processo',
  tema: '',
  grupoEstudo: 'Equipamentos, Tubulações e Bombas',
  vinculo: 'Direto',
  codigoPrograma: '',
  conteudosSecundarios: '',
  exigencia: '',
};

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  existingGroups,
  onSaveExam,
}) => {
  const [prova, setProva] = useState('');
  const [banca, setBanca] = useState('CEBRASPE');
  const [empresa, setEmpresa] = useState('Petrobras');
  const [ano, setAno] = useState('2026');
  const [enfase, setEnfase] = useState('Ênfase 10: Operação');
  const [arquivoOrigem, setArquivoOrigem] = useState('2026 - nova_prova_operacao.pdf');
  const [questoes, setQuestoes] = useState<NewQuestionInput[]>([{ ...EMPTY_QUESTION }]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setProva('Petrobras 2026 — Simulado Operação');
    setBanca('CEBRASPE');
    setEmpresa('Petrobras');
    setAno('2026');
    setEnfase('Simulado Operação');
    setArquivoOrigem('2026 - simulado_petrobras_operacao.pdf');
    setQuestoes([
      {
        questao: 31,
        paginaPdf: 3,
        areaOriginal: 'Equipamentos de processo',
        tema: 'Bombas centrífugas — NPSH disponível e cavitação',
        grupoEstudo: 'Equipamentos, Tubulações e Bombas',
        vinculo: 'Direto',
        codigoPrograma: 'B3.03',
        conteudosSecundarios: 'B3.05',
        exigencia: 'Calcular margem de segurança contra cavitação a partir da pressão de vapor.',
      },
      {
        questao: 32,
        paginaPdf: 3,
        areaOriginal: 'Operação/Controle',
        tema: 'Controle de processos — sintonia PID e ação derivativa',
        grupoEstudo: 'Instrumentação, Medição e Controle',
        vinculo: 'Direto',
        codigoPrograma: 'B3.01',
        conteudosSecundarios: '',
        exigencia: 'Avaliar o efeito antecipativo da ação derivativa diante de perturbação rápida.',
      },
      {
        questao: 33,
        paginaPdf: 4,
        areaOriginal: 'Química/Físico-química',
        tema: 'Estequiometria — combustão completa de gás natural',
        grupoEstudo: 'Química e Físico-Química',
        vinculo: 'Direto',
        codigoPrograma: 'B1.03',
        conteudosSecundarios: 'B2.09',
        exigencia: 'Determinar volume de oxigênio em CNTP para queima estequiométrica de metano.',
      },
      {
        questao: 34,
        paginaPdf: 4,
        areaOriginal: 'Física — Termodinâmica',
        tema: 'Termodinâmica — rendimento do ciclo de Rankine',
        grupoEstudo: 'Termologia e Termodinâmica',
        vinculo: 'Correlato',
        codigoPrograma: 'B2.04',
        conteudosSecundarios: 'B1.13',
        exigencia: 'Avaliar o ganho de eficiência térmica com superaquecimento do vapor.',
      },
    ]);
    setErrorMsg(null);
  };

  const updateQuestion = <K extends keyof NewQuestionInput>(
    index: number,
    key: K,
    value: NewQuestionInput[K]
  ) => {
    setQuestoes((prev) =>
      prev.map((q, idx) => (idx === index ? { ...q, [key]: value } : q))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prova.trim() || !banca.trim() || !arquivoOrigem.trim()) {
      setErrorMsg('Preencha o nome da prova, a banca e o arquivo PDF de origem.');
      return;
    }

    const invalidQuestion = questoes.find(
      (q) => !q.tema.trim() || !q.exigencia.trim() || q.questao < 1
    );
    if (invalidQuestion) {
      setErrorMsg(
        'Todas as questões precisam ter número válido, tema cobrado e descrição do que a questão exigiu.'
      );
      return;
    }

    onSaveExam({
      prova: prova.trim(),
      banca: banca.trim(),
      empresa: empresa.trim() || prova.trim().split(' ')[0],
      ano: ano.trim() || '2026',
      enfase: enfase.trim() || 'Geral',
      arquivoOrigem: arquivoOrigem.trim(),
      questoes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-exam-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="add-exam-title" className="text-base font-semibold text-[var(--text-primary)]">
              Adicionar Nova Prova e Recalcular Pareto 80/20
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              As novas questões entram na base integrada e recalculam imediatamente Pareto, rankings e mapa do edital.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de nova prova"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div className="ui-surface-subtle flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
              <span className="text-[var(--text-secondary)]">
                Quer testar rapidamente o recálculo automático do Pareto?
              </span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="font-semibold text-[var(--brand-primary-ink)] hover:underline"
              >
                Preencher exemplo (4 questões)
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3.5 py-2.5 text-xs font-medium text-[var(--status-error)]"
              >
                {errorMsg}
              </div>
            )}

            {/* Exam Metadata */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="ex-prova" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Nome da prova / concurso *
                </label>
                <input
                  id="ex-prova"
                  type="text"
                  required
                  placeholder="Ex: Petrobras 2026 — Ênfase 10: Operação"
                  value={prova}
                  onChange={(e) => setProva(e.target.value)}
                  className="ui-input mt-1 text-xs"
                />
              </div>

              <div>
                <label htmlFor="ex-banca" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Banca *
                </label>
                <input
                  id="ex-banca"
                  type="text"
                  required
                  value={banca}
                  onChange={(e) => setBanca(e.target.value)}
                  className="ui-input mt-1 text-xs"
                />
              </div>

              <div>
                <label htmlFor="ex-empresa" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Empresa
                </label>
                <input
                  id="ex-empresa"
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="ui-input mt-1 text-xs"
                />
              </div>

              <div>
                <label htmlFor="ex-ano" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Ano / Edição
                </label>
                <input
                  id="ex-ano"
                  type="text"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="ui-input mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="ex-enfase" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Ênfase
                </label>
                <input
                  id="ex-enfase"
                  type="text"
                  value={enfase}
                  onChange={(e) => setEnfase(e.target.value)}
                  className="ui-input mt-1 text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="ex-pdf" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Arquivo PDF de origem *
                </label>
                <input
                  id="ex-pdf"
                  type="text"
                  required
                  value={arquivoOrigem}
                  onChange={(e) => setArquivoOrigem(e.target.value)}
                  className="ui-input mt-1 font-mono text-xs"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Questões da prova ({questoes.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setQuestoes((prev) => [
                      ...prev,
                      {
                        ...EMPTY_QUESTION,
                        questao: (prev[prev.length - 1]?.questao || 0) + 1,
                        paginaPdf: prev[prev.length - 1]?.paginaPdf || 1,
                      },
                    ])
                  }
                  className="ui-btn-secondary !min-h-[34px] !px-3 !py-1 text-[var(--brand-primary-ink)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar questão
                </button>
              </div>

              {questoes.map((q, idx) => (
                <div
                  key={idx}
                  className="ui-surface-subtle space-y-3 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      Item #{idx + 1}
                    </span>
                    {questoes.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuestoes((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label={`Remover item ${idx + 1}`}
                        className="text-[var(--text-muted)] hover:text-[var(--status-error)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div>
                      <label className="block text-[11px] text-slate-600">Questão *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={q.questao}
                        onChange={(e) =>
                          updateQuestion(
                            idx,
                            'questao',
                            Number.parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600">Página PDF</label>
                      <input
                        type="number"
                        min={1}
                        value={q.paginaPdf}
                        onChange={(e) =>
                          updateQuestion(
                            idx,
                            'paginaPdf',
                            Number.parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600">Código edital</label>
                      <input
                        type="text"
                        placeholder="Ex: B3.03"
                        value={q.codigoPrograma}
                        onChange={(e) =>
                          updateQuestion(idx, 'codigoPrograma', e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600">Vínculo</label>
                      <select
                        value={q.vinculo}
                        onChange={(e) =>
                          updateQuestion(idx, 'vinculo', e.target.value as LinkType)
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value="Direto">Direto</option>
                        <option value="Correlato">Correlato</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] text-slate-600">
                        Grupo de estudo consolidado (Pareto)
                      </label>
                      <select
                        value={q.grupoEstudo}
                        onChange={(e) =>
                          updateQuestion(idx, 'grupoEstudo', e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {existingGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600">
                        Área original
                      </label>
                      <input
                        type="text"
                        value={q.areaOriginal}
                        onChange={(e) =>
                          updateQuestion(idx, 'areaOriginal', e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600">
                      Tema efetivamente cobrado *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Bombas centrífugas — cavitação"
                      value={q.tema}
                      onChange={(e) => updateQuestion(idx, 'tema', e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600">
                      O que a questão exigiu *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Identificar a relação entre pressão de vapor e formação de bolhas."
                      value={q.exigencia}
                      onChange={(e) => updateQuestion(idx, 'exigencia', e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/65 px-5 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ui-btn-primary"
            >
              Salvar prova e recalcular Pareto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
