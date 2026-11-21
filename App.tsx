import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  CheckSquare,
  Download,
  FileCheck2,
  GitCompare,
  Grid3x3,
  Layers,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import type {
  NewExamPayload,
  OriginalBankFilters,
  QuestionEngineeringStudy,
  QuestionPerformance,
  QuestionRecord,
  RawQuestionBankPayload,
  RawQuestionCorrelationPayload,
  ReasoningType,
  SpecificExamMetadata,
  SpecificQuestionsPayload,
  StudentAttemptRecord,
} from './types/exam';
import {
  buildExamSummaries,
  buildUnifiedDatabase,
  calculatePareto,
  createBackupPayload,
  createRecordsFromNewExam,
  enrichDatabaseWithAnswerBank,
  mergeSpecificQuestionsDatabase,
  parseAndReconcileBackup,
} from './utils/examIntelligence';
import { OverviewParetoView } from './components/OverviewParetoView';
import { OriginalQuestionsBankView } from './components/OriginalQuestionsBankView';
import { SmartLocatorView } from './components/SmartLocatorView';
import { SyllabusIncidenceView } from './components/SyllabusIncidenceView';
import { TopicRankingView } from './components/TopicRankingView';
import { ExamParetoView } from './components/ExamParetoView';
import { BoardsAndPerformanceView } from './components/BoardsAndPerformanceView';
import { HistoricalEvolutionView } from './components/HistoricalEvolutionView';
import { CommonExclusiveView } from './components/CommonExclusiveView';
import { SyllabusGapMapView } from './components/SyllabusGapMapView';
import { AdherenceAuditView } from './components/AdherenceAuditView';
import { SubjectDepthView } from './components/SubjectDepthView';
import { ReasoningTypeView } from './components/ReasoningTypeView';
import { QuestionEngineeringView } from './components/QuestionEngineeringView';
import { PerformanceDashboardView } from './components/PerformanceDashboardView';
import { StudyPlannerSimuladoView } from './components/StudyPlannerSimuladoView';
import { QuestionDrilldownDrawer } from './components/QuestionDrilldownDrawer';
import { AddExamModal } from './components/AddExamModal';

type NavTabId =
  | 'pareto'
  | 'original-bank'
  | 'locator'
  | 'syllabus'
  | 'ranking'
  | 'exam-pareto'
  | 'boards'
  | 'evolution'
  | 'common-exclusive'
  | 'gaps'
  | 'adherence'
  | 'depth'
  | 'reasoning'
  | 'engineering'
  | 'performance'
  | 'planner';

interface NavGroup {
  id: string;
  label: string;
  items: {
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'exploracao',
    label: 'Exploração e Pareto',
    items: [
      { id: 'pareto', label: 'Pareto 80/20 Geral', icon: PieChart },
      { id: 'original-bank', label: 'Banco de Questões — Provas Originais', icon: FileCheck2 },
      { id: 'locator', label: 'Localizador de Questões', icon: Search },
      { id: 'syllabus', label: 'Mapa do Edital', icon: BookOpen },
      { id: 'ranking', label: 'Ranking de Assuntos', icon: BarChart3 },
      { id: 'exam-pareto', label: 'Pareto por Concurso', icon: Layers },
    ],
  },
  {
    id: 'bancas-edital',
    label: 'Bancas e Edital',
    items: [
      { id: 'boards', label: 'Comparação de Bancas', icon: GitCompare },
      { id: 'evolution', label: 'Evolução Histórica', icon: TrendingUp },
      { id: 'common-exclusive', label: 'Comuns e Exclusivos', icon: Grid3x3 },
      { id: 'gaps', label: 'Lacunas do Edital', icon: AlertCircle },
      { id: 'adherence', label: 'Aderência ao Edital', icon: CheckSquare },
    ],
  },
  {
    id: 'cognitiva',
    label: 'Engenharia Cognitiva',
    items: [
      { id: 'depth', label: 'Profundidade dos Assuntos', icon: SlidersHorizontal },
      { id: 'reasoning', label: 'Tipo de Raciocínio', icon: Brain },
      { id: 'engineering', label: 'Engenharia e Distratores', icon: ShieldAlert },
    ],
  },
  {
    id: 'estudante',
    label: 'Desempenho e Plano',
    items: [
      { id: 'performance', label: 'Desempenho Individual', icon: Activity },
      { id: 'planner', label: 'Planejador e Simulados', icon: Target },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, groupLabel: group.label }))
);

const LS_CUSTOM_EXAMS = 'exam_intel_custom_questions_v1';
const LS_PERFORMANCE = 'exam_intel_performance_v1';
const LS_STUDENT_ATTEMPTS = 'exam_intel_student_attempts_v1';
const LS_REASONING_OVERRIDES = 'exam_intel_reasoning_overrides_v1';
const LS_DISTRACTOR_STUDIES = 'exam_intel_distractor_studies_v1';
const LS_SIDEBAR_COLLAPSED = 'exam_intel_sidebar_collapsed_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('pareto');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const [baseQuestions, setBaseQuestions] = useState<QuestionRecord[]>([]);
  const [provasMeta, setProvasMeta] = useState<SpecificExamMetadata[]>([]);
  const [originalBankTarget, setOriginalBankTarget] = useState<{
    questionKey?: string | null;
    filters?: Partial<OriginalBankFilters> | null;
  } | null>(null);
  const [customQuestions, setCustomQuestions] = useState<QuestionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_EXAMS);
      return raw ? (JSON.parse(raw) as QuestionRecord[]) : [];
    } catch {
      return [];
    }
  });
  const [performanceMap, setPerformanceMap] = useState<
    Record<string, QuestionPerformance>
  >(() => {
    try {
      const raw = localStorage.getItem(LS_PERFORMANCE);
      return raw ? (JSON.parse(raw) as Record<string, QuestionPerformance>) : {};
    } catch {
      return {};
    }
  });
  const [reasoningOverrides, setReasoningOverrides] = useState<
    Record<string, ReasoningType>
  >(() => {
    try {
      const raw = localStorage.getItem(LS_REASONING_OVERRIDES);
      return raw ? (JSON.parse(raw) as Record<string, ReasoningType>) : {};
    } catch {
      return {};
    }
  });
  const [studiesMap, setStudiesMap] = useState<
    Record<string, QuestionEngineeringStudy>
  >(() => {
    try {
      const raw = localStorage.getItem(LS_DISTRACTOR_STUDIES);
      return raw
        ? (JSON.parse(raw) as Record<string, QuestionEngineeringStudy>)
        : {};
    } catch {
      return {};
    }
  });
  const [studentAttempts, setStudentAttempts] = useState<StudentAttemptRecord[]>(
    () => {
      try {
        const raw = localStorage.getItem(LS_STUDENT_ATTEMPTS);
        return raw ? (JSON.parse(raw) as StudentAttemptRecord[]) : [];
      } catch {
        return [];
      }
    }
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drilldown Drawer State
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    questions: QuestionRecord[];
    initialSelectedId?: string | null;
  }>({
    isOpen: false,
    title: '',
    questions: [],
  });

  // Add Exam Modal State
  const [addExamOpen, setAddExamOpen] = useState(false);

  // Attached local exam PDFs (session ObjectURLs mapped by filename)
  const [attachedPdfs, setAttachedPdfs] = useState<Record<string, string>>({});
  const [backupStatus, setBackupStatus] = useState<{
    type: 'ok' | 'error';
    message: string;
  } | null>(null);

  const handleAttachPdf = useCallback((filename: string, url: string) => {
    setAttachedPdfs((prev) => {
      if (prev[filename]) {
        URL.revokeObjectURL(prev[filename]);
      }
      return { ...prev, [filename]: url };
    });
  }, []);

  const loadCsvData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        paretoRes,
        principalRes,
        bankRes,
        correlacaoRes,
        specificRes,
        provasRes,
      ] = await Promise.all([
        fetch('/assets/aistudio/Base_Questoes_Pareto_0ab26850.csv'),
        fetch('/assets/aistudio/Questoes_270_base_principal_8e6a3811.csv'),
        fetch('/assets/aistudio/banco_questoes_operacao_dutos_app_63a3f59b.json'),
        fetch('/assets/aistudio/correlacao_questoes_app_53d7bc78.json'),
        fetch('/data/questoes_especificas.min.json'),
        fetch('/data/provas.json'),
      ]);

      if (!paretoRes.ok || !principalRes.ok) {
        throw new Error('Falha ao carregar os arquivos CSV da base de questões.');
      }

      const [paretoText, principalText] = await Promise.all([
        paretoRes.text(),
        principalRes.text(),
      ]);

      const unified = buildUnifiedDatabase(paretoText, principalText);

      // Import in recommended order: 1) banco_questoes_operacao_dutos_app.json, 2) correlacao_questoes_app.json
      const bankJson = bankRes.ok
        ? ((await bankRes.json()) as RawQuestionBankPayload)
        : null;
      const correlacaoJson = correlacaoRes.ok
        ? ((await correlacaoRes.json()) as RawQuestionCorrelationPayload)
        : null;
      const specificJson = specificRes.ok
        ? ((await specificRes.json()) as SpecificQuestionsPayload)
        : null;
      const provasJson = provasRes.ok
        ? ((await provasRes.json()) as SpecificExamMetadata[])
        : specificJson?.exams ?? [];

      const enriched = enrichDatabaseWithAnswerBank(unified, bankJson, correlacaoJson);
      const merged = mergeSpecificQuestionsDatabase(enriched, specificJson, provasJson);
      setProvasMeta(provasJson);
      setBaseQuestions(merged);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao processar as planilhas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCsvData();
  }, [loadCsvData]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SIDEBAR_COLLAPSED, String(sidebarCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileMenuOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CUSTOM_EXAMS, JSON.stringify(customQuestions));
    } catch {
      // Ignore quota errors
    }
  }, [customQuestions]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PERFORMANCE, JSON.stringify(performanceMap));
    } catch {
      // Ignore quota errors
    }
  }, [performanceMap]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_REASONING_OVERRIDES,
        JSON.stringify(reasoningOverrides)
      );
    } catch {
      // Ignore quota errors
    }
  }, [reasoningOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_DISTRACTOR_STUDIES, JSON.stringify(studiesMap));
    } catch {
      // Ignore quota errors
    }
  }, [studiesMap]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_STUDENT_ATTEMPTS,
        JSON.stringify(studentAttempts)
      );
    } catch {
      // Ignore quota errors
    }
  }, [studentAttempts]);

  const allQuestions = useMemo(
    () => [...baseQuestions, ...customQuestions],
    [baseQuestions, customQuestions]
  );

  const exams = useMemo(() => buildExamSummaries(allQuestions), [allQuestions]);
  const paretoRows = useMemo(() => calculatePareto(allQuestions), [allQuestions]);
  const existingGroups = useMemo(
    () => Array.from(new Set(allQuestions.map((q) => q.grupoEstudo))).sort(),
    [allQuestions]
  );

  const customExamsCount = useMemo(
    () => new Set(customQuestions.map((q) => q.prova)).size,
    [customQuestions]
  );

  const handleInspectQuestions = (
    title: string,
    subtitle: string,
    list: QuestionRecord[]
  ) => {
    setDrawerState({
      isOpen: true,
      title,
      subtitle,
      questions: list,
      initialSelectedId: list.length === 1 ? list[0].id : null,
    });
  };

  const handleSelectQuestion = (
    q: QuestionRecord,
    contextList: QuestionRecord[]
  ) => {
    setDrawerState({
      isOpen: true,
      title: `${q.concursoCurto} — Questão ${q.questao}`,
      subtitle: `${q.tema} · Página ${q.paginaPdf} do PDF`,
      questions: contextList.length > 0 ? contextList : [q],
      initialSelectedId: q.id,
    });
  };

  const handleUpdatePerformance = (id: string, perf: QuestionPerformance) => {
    setPerformanceMap((prev) => ({
      ...prev,
      [id]: perf,
    }));
  };

  const handleUpdateReasoningOverride = (
    id: string,
    tipo: ReasoningType | null
  ) => {
    setReasoningOverrides((prev) => {
      const next = { ...prev };
      if (tipo === null) {
        delete next[id];
      } else {
        next[id] = tipo;
      }
      return next;
    });
  };

  const handleSaveStudy = (study: QuestionEngineeringStudy) => {
    setStudiesMap((prev) => ({
      ...prev,
      [study.questionId]: study,
    }));
  };

  const syncAttemptsToPerformanceMap = (batch: StudentAttemptRecord[]) => {
    setPerformanceMap((prev) => {
      const next = { ...prev };
      for (const att of batch) {
        next[att.questionId] = {
          status: att.status,
          minhaResposta: att.minhaResposta,
          gabarito: att.gabarito,
          timeSeconds: att.timeSeconds,
          confianca: att.confianca,
          dificuldade: att.dificuldade,
          revisaoNecessaria: att.revisaoNecessaria,
          notes: att.notes,
          answeredAt: att.answeredAt,
          updatedAt: att.answeredAt,
        };
      }
      return next;
    });
  };

  const handleAddAttempt = (attempt: StudentAttemptRecord) => {
    setStudentAttempts((prev) => [attempt, ...prev]);
    syncAttemptsToPerformanceMap([attempt]);
  };

  const handleSaveSimuladoBatch = (batch: StudentAttemptRecord[]) => {
    setStudentAttempts((prev) => [...batch, ...prev]);
    syncAttemptsToPerformanceMap(batch);
  };

  const handleDeleteAttempt = (attemptId: string, questionId: string) => {
    if (attemptId.startsWith('sync-')) {
      setPerformanceMap((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      return;
    }

    setStudentAttempts((prev) => {
      const remaining = prev.filter((a) => a.id !== attemptId);
      const latestForQ = remaining.find((a) => a.questionId === questionId);
      setPerformanceMap((perfPrev) => {
        const next = { ...perfPrev };
        if (latestForQ) {
          next[questionId] = {
            status: latestForQ.status,
            minhaResposta: latestForQ.minhaResposta,
            gabarito: latestForQ.gabarito,
            timeSeconds: latestForQ.timeSeconds,
            confianca: latestForQ.confianca,
            dificuldade: latestForQ.dificuldade,
            revisaoNecessaria: latestForQ.revisaoNecessaria,
            notes: latestForQ.notes,
            answeredAt: latestForQ.answeredAt,
            updatedAt: latestForQ.answeredAt,
          };
        } else {
          delete next[questionId];
        }
        return next;
      });
      return remaining;
    });
  };

  const handleResetAllPerformance = () => {
    setStudentAttempts([]);
    setPerformanceMap({});
  };

  const handleSaveNewExam = (payload: NewExamPayload) => {
    const newRecords = createRecordsFromNewExam(payload);
    setCustomQuestions((prev) => [...prev, ...newRecords]);
    setActiveTab('pareto');
  };

  const handleResetCustomExams = () => {
    setCustomQuestions([]);
  };

  const handleExportBackup = () => {
    try {
      const payload = createBackupPayload({
        customQuestions,
        performanceMap,
        studentAttempts,
        reasoningOverrides,
        studiesMap,
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `central-provas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const totalItems =
        payload.counts.customQuestions +
        payload.counts.studentAttempts +
        payload.counts.performanceEntries +
        payload.counts.reasoningOverrides +
        payload.counts.distractorStudies;
      setBackupStatus({
        type: 'ok',
        message: `Backup exportado (${totalItems} registro(s)).`,
      });
    } catch {
      setBackupStatus({
        type: 'error',
        message: 'Falha ao gerar o arquivo de backup.',
      });
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const restored = parseAndReconcileBackup(rawText, baseQuestions);
      setCustomQuestions(restored.data.customQuestions);
      setStudentAttempts(restored.data.studentAttempts);
      setPerformanceMap(restored.data.performanceMap);
      setReasoningOverrides(restored.data.reasoningOverrides);
      setStudiesMap(restored.data.studiesMap);

      const countRestored =
        restored.data.customQuestions.length +
        restored.data.studentAttempts.length +
        Object.keys(restored.data.performanceMap).length +
        Object.keys(restored.data.reasoningOverrides).length +
        Object.keys(restored.data.studiesMap).length;

      setBackupStatus({
        type: 'ok',
        message:
          restored.skippedOrphans > 0
            ? `Restaurado (${countRestored} item(ns); ${restored.skippedOrphans} órfão(s) ignorados).`
            : `Backup restaurado (${countRestored} item(ns)).`,
      });
    } catch (err) {
      setBackupStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao restaurar backup JSON.',
      });
    }
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab)!;

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (Collapsible on Desktop, Drawer on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#1E2E52] bg-[var(--brand-secondary)] text-slate-200 transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-[272px] lg:w-[76px]' : 'w-[272px]'}`}
        aria-label="Navegação principal"
      >
        <div
          className={`flex h-15 shrink-0 items-center border-b border-white/10 ${
            sidebarCollapsed ? 'justify-between px-4 lg:justify-center lg:px-2' : 'justify-between px-5'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] font-mono text-xs font-bold text-white shadow-xs"
              aria-hidden="true"
            >
              CP
            </span>
            <div className={sidebarCollapsed ? 'lg:hidden' : 'min-w-0'}>
              <span className="block truncate font-display text-sm font-bold tracking-tight text-white">
                Central de Provas
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-300">
                Inteligência de Concursos
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu de navegação"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Módulos de análise">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <div
                className={`mb-1.5 px-2.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 ${
                  sidebarCollapsed ? 'lg:sr-only' : ''
                }`}
              >
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.label}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`group flex min-h-[44px] lg:min-h-[38px] w-full items-center rounded-lg text-left text-[13px] transition-colors ${
                        sidebarCollapsed
                          ? 'gap-2.5 px-3 lg:justify-center lg:px-0'
                          : 'gap-2.5 px-3'
                      } ${
                        isActive
                          ? 'bg-[var(--brand-primary)] font-semibold text-white shadow-xs'
                          : 'font-medium text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-300 group-hover:text-white'
                        }`}
                      />
                      <span
                        className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Compact Database Summary & Backup Controls in Sidebar Footer */}
        <div className="border-t border-white/10 bg-[#0F1A33] p-3.5 text-xs">
          <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
            <div className="font-semibold text-white">
              Base Consolidada
            </div>
            <div className="mt-1 font-mono text-xs font-medium text-cyan-200 tabular-nums">
              {allQuestions.length} questões · {exams.length} provas
            </div>
            <div className="mt-0.5 text-xs text-slate-300">
              Petrobras, Transpetro e ANSA
            </div>
          </div>

          <div
            className={`grid gap-2 ${
              sidebarCollapsed ? 'mt-3 grid-cols-2 lg:mt-0 lg:grid-cols-1' : 'mt-3 grid-cols-2'
            }`}
          >
            <button
              type="button"
              onClick={handleExportBackup}
              title="Exportar backup JSON"
              aria-label="Exportar backup JSON"
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Backup JSON</span>
            </button>
            <label
              title="Restaurar backup JSON"
              className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 whitespace-nowrap focus-within:outline-2 focus-within:outline-cyan-300 focus-within:outline-offset-2"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Restaurar</span>
              <input
                type="file"
                accept="application/json,.json"
                aria-label="Restaurar backup JSON"
                onChange={handleRestoreBackup}
                className="sr-only"
              />
            </label>
          </div>

          {backupStatus && (
            <div
              role="status"
              className={`mt-2.5 flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs leading-snug ${
                sidebarCollapsed ? 'lg:hidden' : ''
              } ${
                backupStatus.type === 'error'
                  ? 'border-red-400/40 bg-red-950/60 text-red-100'
                  : 'border-emerald-400/40 bg-emerald-950/60 text-emerald-100'
              }`}
            >
              {backupStatus.type === 'error' ? (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>{backupStatus.message}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Sidebar toggle + breadcrumb on left, primary action on right */}
        <header className="sticky top-0 z-30 flex h-15 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={
                sidebarCollapsed
                  ? 'Expandir painel lateral'
                  : 'Recolher painel lateral'
              }
              title={
                sidebarCollapsed
                  ? 'Expandir painel lateral'
                  : 'Recolher painel lateral'
              }
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] lg:inline-flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4.5 w-4.5" />
              ) : (
                <PanelLeftClose className="h-4.5 w-4.5" />
              )}
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
              <span className="hidden text-[var(--text-muted)] sm:inline whitespace-nowrap">
                {activeNavMeta.groupLabel}
              </span>
              <span className="hidden text-[var(--border-strong)] sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-[var(--text-primary)] whitespace-nowrap">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAddExamOpen(true)}
              className="ui-btn-primary shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Adicionar prova</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-5 sm:px-6 sm:py-7 focus:outline-none"
        >
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Carregando base de questões">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="ui-card h-24 animate-pulse"
                  />
                ))}
              </div>
              <div className="ui-card h-80 animate-pulse" />
            </div>
          ) : loadError ? (
            <div className="ui-card border-[var(--status-error-border)] p-8 text-center">
              <h2 className="text-base font-semibold text-[var(--status-error)]">
                Erro ao carregar a base de questões
              </h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">{loadError}</p>
              <button
                type="button"
                onClick={loadCsvData}
                className="ui-btn-primary mt-4"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div key={activeTab} className="ui-panel-enter">
              {activeTab === 'pareto' && (
                <OverviewParetoView
                  questions={allQuestions}
                  exams={exams}
                  paretoRows={paretoRows}
                  customExamsCount={customExamsCount}
                  onInspectQuestions={handleInspectQuestions}
                  onOpenAddExam={() => setAddExamOpen(true)}
                  onResetCustomExams={handleResetCustomExams}
                />
              )}

              {activeTab === 'original-bank' && (
                <OriginalQuestionsBankView
                  questions={allQuestions}
                  provasMeta={provasMeta}
                  performanceMap={performanceMap}
                  attempts={studentAttempts}
                  onUpdatePerformance={handleUpdatePerformance}
                  onAddAttempt={handleAddAttempt}
                  initialQuestionKey={originalBankTarget?.questionKey ?? null}
                  initialFilters={originalBankTarget?.filters ?? null}
                  onConsumeInitialSelection={() => setOriginalBankTarget(null)}
                />
              )}

              {activeTab === 'locator' && (
                <SmartLocatorView
                  questions={allQuestions}
                  performanceMap={performanceMap}
                  onSelectQuestion={handleSelectQuestion}
                />
              )}

              {activeTab === 'syllabus' && (
                <SyllabusIncidenceView
                  questions={allQuestions}
                  onInspectTopic={handleInspectQuestions}
                />
              )}

              {activeTab === 'ranking' && (
                <TopicRankingView
                  questions={allQuestions}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'exam-pareto' && (
                <ExamParetoView
                  questions={allQuestions}
                  exams={exams}
                  globalPareto={paretoRows}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'boards' && (
                <BoardsAndPerformanceView
                  questions={allQuestions}
                  performanceMap={performanceMap}
                  attachedPdfs={attachedPdfs}
                  onAttachPdf={handleAttachPdf}
                  onSelectQuestion={handleSelectQuestion}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'evolution' && (
                <HistoricalEvolutionView
                  questions={allQuestions}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'common-exclusive' && (
                <CommonExclusiveView
                  questions={allQuestions}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'gaps' && (
                <SyllabusGapMapView
                  questions={allQuestions}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'adherence' && (
                <AdherenceAuditView
                  questions={allQuestions}
                  onSelectQuestion={handleSelectQuestion}
                />
              )}

              {activeTab === 'depth' && (
                <SubjectDepthView
                  questions={allQuestions}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'reasoning' && (
                <ReasoningTypeView
                  questions={allQuestions}
                  reasoningOverrides={reasoningOverrides}
                  onUpdateReasoningOverride={handleUpdateReasoningOverride}
                  onInspectQuestions={handleInspectQuestions}
                  onSelectQuestion={handleSelectQuestion}
                />
              )}

              {activeTab === 'engineering' && (
                <QuestionEngineeringView
                  questions={allQuestions}
                  studiesMap={studiesMap}
                  onSaveStudy={handleSaveStudy}
                  attachedPdfs={attachedPdfs}
                  onAttachPdf={handleAttachPdf}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'performance' && (
                <PerformanceDashboardView
                  questions={allQuestions}
                  performanceMap={performanceMap}
                  attempts={studentAttempts}
                  onAddAttempt={handleAddAttempt}
                  onDeleteAttempt={handleDeleteAttempt}
                  onResetAllPerformance={handleResetAllPerformance}
                  onOpenOriginalBank={() => setActiveTab('original-bank')}
                  onSelectQuestion={handleSelectQuestion}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}

              {activeTab === 'planner' && (
                <StudyPlannerSimuladoView
                  questions={allQuestions}
                  performanceMap={performanceMap}
                  attempts={studentAttempts}
                  attachedPdfs={attachedPdfs}
                  onAttachPdf={handleAttachPdf}
                  onSaveSimuladoBatch={handleSaveSimuladoBatch}
                  onSelectQuestion={handleSelectQuestion}
                  onInspectQuestions={handleInspectQuestions}
                />
              )}
            </div>
          )}
        </main>

        <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 text-xs text-[var(--text-muted)] sm:px-6">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2">
            <span>
              Central de Inteligência de Provas · Rastreabilidade por concurso, número da questão e página do PDF
            </span>
            <span className="font-mono tabular-nums">
              {allQuestions.length} questões integradas · {exams.length} cadernos
            </span>
          </div>
        </footer>
      </div>

      {/* Traceability Drilldown Drawer */}
      <QuestionDrilldownDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
        title={drawerState.title}
        subtitle={drawerState.subtitle}
        questions={drawerState.questions}
        initialSelectedId={drawerState.initialSelectedId}
        performanceMap={performanceMap}
        onUpdatePerformance={handleUpdatePerformance}
        attachedPdfs={attachedPdfs}
        onAttachPdf={handleAttachPdf}
        onOpenInOriginalBank={(q) => {
          setOriginalBankTarget({
            questionKey: q.questionId || q.appLookupKey || q.id,
            filters: null,
          });
          setActiveTab('original-bank');
        }}
      />

      {/* Add Exam & Recalculate Pareto Modal */}
      <AddExamModal
        isOpen={addExamOpen}
        onClose={() => setAddExamOpen(false)}
        existingGroups={
          existingGroups.length > 0
            ? existingGroups
            : ['Química e Físico-Química', 'Equipamentos, Tubulações e Bombas']
        }
        onSaveExam={handleSaveNewExam}
      />
    </div>
  );
}
