export type LinkType = 'Direto' | 'Correlato';

export type PerformanceStatus = 'pendente' | 'acerto' | 'erro' | 'revisar';

export type ConfidenceLevel = 'alta' | 'media' | 'baixa';
export type PerceivedDifficulty = 'facil' | 'media' | 'dificil';

export interface QuestionPerformance {
  status: PerformanceStatus;
  minhaResposta?: string;
  gabarito?: string;
  timeSeconds?: number;
  confianca?: ConfidenceLevel;
  dificuldade?: PerceivedDifficulty;
  revisaoNecessaria?: boolean;
  notes?: string;
  answeredAt?: string;
  updatedAt: string;
}

export interface StudentAttemptRecord {
  id: string;
  questionId: string;
  minhaResposta: string;
  gabarito: string;
  status: Exclude<PerformanceStatus, 'pendente'>;
  source?: 'original_bank' | 'manual' | 'simulado' | 'drawer';
  timeSeconds?: number;
  confianca: ConfidenceLevel;
  dificuldade: PerceivedDifficulty;
  revisaoNecessaria: boolean;
  notes?: string;
  answeredAt: string; // ISO timestamp or YYYY-MM-DDTHH:mm:ss
}


export type AnswerKeyStatus =
  | 'official_final'
  | 'official_adjusted'
  | 'official_final_adjusted'
  | 'official_preliminary'
  | 'annulled';

export interface QuestionAlternative {
  label: string;
  text: string;
}

export interface QuestionAnswerKey {
  value: string | null;
  displayValue: string;
  status: AnswerKeyStatus;
  statusLabel: string;
  questionType: 'multiple_choice' | 'true_false';
  sourcePdf: string;
  sourcePage: number;
  sourceNote?: string;
  previousValue?: string;
  adjustmentNote?: string;
  sourceAdjustmentPage?: number;
  originalMark?: string;
}

export interface RawQuestionBankItem {
  question_id: string;
  app_lookup_key: string;
  exam_id: string;
  exam_name: string;
  company?: string;
  year?: number;
  bank?: string;
  emphasis?: string;
  question_number: number;
  question_type?: 'multiple_choice' | 'true_false';
  pdf_page?: number;
  page_as_listed_in_analysis_csv?: number;
  page_number_corrected?: boolean;
  source_pdf?: string;
  context_text?: string;
  question_text?: string;
  display_text?: string;
  statement_without_number?: string;
  alternatives?: QuestionAlternative[];
  visual_reference?: {
    may_need_pdf_figure?: boolean;
    pdf_page_bbox_points?: number[];
  };
  answer_key?: {
    value: string | null;
    display_value: string;
    status: AnswerKeyStatus;
    status_label: string;
    question_type: 'multiple_choice' | 'true_false';
    source_pdf: string;
    source_page: number;
    source_note?: string;
    previous_value?: string;
    adjustment_note?: string;
    source_adjustment_page?: number;
    original_mark?: string;
  };
  correct_answer?: string | null;
  correct_option_label?: string | null;
  correct_option_text?: string | null;
  correct_judgment?: 'CERTO' | 'ERRADO' | null;
  answer_key_status?: AnswerKeyStatus;
  answer_key_source_pdf?: string;
  answer_key_source_page?: number;
}

export interface RawQuestionBankPayload {
  schema_name?: string;
  schema_version?: string;
  dataset_id?: string;
  record_count?: number;
  questions: RawQuestionBankItem[];
}

export interface RawCorrelationLinkItem {
  app_lookup_key: string;
  question_id: string;
  exam_id: string;
  question_number: number;
  pdf_page?: number;
  page_as_listed_in_analysis_csv?: number;
  page_number_corrected?: boolean;
  source_pdf?: string;
  program_code?: string;
  topic?: string;
  area?: string;
  pareto_group?: string;
  program_link_type?: string;
  question_type?: 'multiple_choice' | 'true_false';
  answer_key?: RawQuestionBankItem['answer_key'];
  correct_answer?: string | null;
  correct_option_label?: string | null;
  correct_option_text?: string | null;
  correct_judgment?: 'CERTO' | 'ERRADO' | null;
  answer_key_status?: AnswerKeyStatus;
  answer_key_source_pdf?: string;
  answer_key_source_page?: number;
}

export interface RawQuestionCorrelationPayload {
  schema_name?: string;
  schema_version?: string;
  dataset_id?: string;
  question_count?: number;
  question_links: RawCorrelationLinkItem[];
}

export interface SpecificExamMetadata {
  exam_id: string;
  exam_name: string;
  company: string;
  year: number;
  bank: string;
  emphasis: string;
  question_type: 'multiple_choice' | 'true_false';
  question_count: number;
  question_number_range: [number, number];
  specific_questions_only: boolean;
  excluded_basic_question_range: [number, number];
  source_pdf_original_name: string;
  source_pdf_sha256?: string;
  source_pdf_total_pages: number;
  specific_pdf_path: string;
  specific_pdf_page_count: number;
  original_to_specific_pdf_page_map?: Record<string, number>;
  specific_pages_in_original_pdf?: number[];
  answer_key_status: AnswerKeyStatus;
  answer_key_status_label: string;
  answer_key_source_pdf: string;
  answer_key_source_page: number;
  note?: string;
}

export interface SpecificQuestionItem {
  question_id: string;
  app_lookup_key: string;
  exam_id: string;
  exam_name: string;
  company: string;
  year: number;
  bank: string;
  emphasis: string;
  question_number: number;
  question_type: 'multiple_choice' | 'true_false';
  pdf_page: number;
  source_pdf_page_original?: number;
  source_pdf_page_specific_derivative: number;
  source_pdf: string;
  specific_pdf_path: string;
  question_text: string;
  context_text: string;
  display_text?: string;
  question_text_normalized?: string;
  context_text_normalized?: string;
  display_text_normalized?: string;
  statement_without_number?: string;
  alternatives: QuestionAlternative[];
  alternative_count?: number;
  answer_key?: RawQuestionBankItem['answer_key'];
  correct_answer?: string | null;
  correct_option_label?: string | null;
  correct_option_text?: string | null;
  correct_judgment?: 'CERTO' | 'ERRADO' | null;
  answer_key_status?: AnswerKeyStatus;
  answer_display_value?: string;
  analysis?: {
    area?: string;
    topic?: string;
    what_it_tests?: string;
    program_code?: string;
    secondary_program_code?: string;
    program_link_type?: string;
    analysis_note?: string;
    pareto_group?: string;
    program_reference?: {
      program_code?: string;
      program_area?: string;
      program_item?: string;
      program_content?: string;
      program_questions_direct?: string;
      program_questions_correlated?: string;
      program_adherence_note?: string;
    };
  };
  visual_reference?: {
    may_need_pdf_figure?: boolean;
    pdf_page_bbox_points?: number[];
    pdf_page_size_points?: number[];
    image_path?: string;
    image_format?: string;
    image_width_px?: number;
    image_height_px?: number;
  };
  app_render?: {
    primary_mode?: string;
    show_original_image?: boolean;
    image_path?: string;
    show_context_first?: boolean;
    response_component?: 'multiple_choice' | 'true_false';
  };
  basic_subjects_excluded?: boolean;
  extraction_status?: string;
}

export interface SpecificQuestionsPayload {
  schema?: string;
  generated_at_utc?: string;
  exam_count?: number;
  question_count?: number;
  exams: SpecificExamMetadata[];
  questions: SpecificQuestionItem[];
}

export interface SpecificQuestionIndexEntry {
  question_id: string;
  exam_id: string;
  question_number: number;
  pdf_page_original: number;
  pdf_page_specific_derivative: number;
  question_image_path: string;
  specific_pdf_path: string;
  answer: string;
  answer_status: AnswerKeyStatus;
}

export interface QuestionRecord {
  id: string; // `${prova}::${questao}` (preserved for localStorage/backup compatibility)
  questionId?: string; // Stable ID e.g. TRANSPETRO_2018_OPERACAO_Q021
  appLookupKey?: string; // Composite key e.g. TRANSPETRO_2018_OPERACAO:21
  examId?: string; // e.g. TRANSPETRO_2018_OPERACAO
  prova: string;
  concursoCurto: string;
  empresa: string;
  ano: string;
  enfase: string;
  banca: string;
  questao: number;
  paginaPdf: number;
  paginaPdfOriginalCsv?: number;
  pdfPageCorrected?: boolean;
  areaOriginal: string;
  tema: string;
  topico: string;
  subtopico: string;
  grupoEstudo: string;
  vinculo: LinkType;
  codigoPrograma: string;
  conteudosSecundarios: string[];
  exigencia: string;
  observacaoClassificacao: string;
  observacaoAnalise: string;
  arquivoOrigem: string;
  topicoEditalUnificado: string;
  isCustom?: boolean;
  // Enriched fields from banco_questoes_operacao_dutos_app.json & correlacao_questoes_app.json & questoes_especificas.json
  questionType?: 'multiple_choice' | 'true_false';
  contextText?: string;
  questionText?: string;
  displayText?: string;
  contextTextNormalized?: string;
  questionTextNormalized?: string;
  displayTextNormalized?: string;
  statementWithoutNumber?: string;
  alternatives?: QuestionAlternative[];
  mayNeedPdfFigure?: boolean;
  originalImagePath?: string;
  imageWidthPx?: number;
  imageHeightPx?: number;
  showContextFirst?: boolean;
  specificPdfPath?: string;
  specificPdfPage?: number;
  specificPdfTotalPages?: number;
  sourcePdfPageOriginal?: number;
  referenceMaterialPath?: string;
  basicSubjectsExcluded?: boolean;
  answerKey?: QuestionAnswerKey;
  correctAnswer?: string | null;
  correctOptionLabel?: string | null;
  correctOptionText?: string | null;
  correctJudgment?: 'CERTO' | 'ERRADO' | null;
  answerKeyStatus?: AnswerKeyStatus;
  isAnnulled?: boolean;
}

export interface ParetoRow {
  grupo: string;
  frequencia: number;
  percentual: number;
  acumulado: number;
  isNucleo80: boolean;
  porConcurso: Record<string, number>;
  questoes: QuestionRecord[];
}

export interface RankingRow {
  label: string;
  frequencia: number;
  percentual: number;
  concursosCount: number;
  questoes: QuestionRecord[];
}

export interface SyllabusIncidenceRow {
  id: string;
  titulo: string;
  categoria: string;
  provasCount: number;
  questoesCount: number;
  vinculoDiretoCount: number;
  vinculoCorrelatoCount: number;
  codigosRelacionados: string[];
  provasPresentes: string[];
  questoes: QuestionRecord[];
}

export interface ExamSummary {
  prova: string;
  concursoCurto: string;
  empresa: string;
  ano: string;
  enfase: string;
  banca: string;
  arquivoOrigem: string;
  totalQuestoes: number;
  diretoCount: number;
  correlatoCount: number;
  isCustom?: boolean;
}

export interface LocatorFilters {
  query: string;
  empresa: string;
  prova: string;
  ano: string;
  enfase: string;
  banca: string;
  questaoNumero: string;
  area: string;
  grupo: string;
  vinculo: string;
  statusDesempenho: string;
}

export interface OriginalBankFilters {
  query: string;
  empresa: string;
  prova: string;
  ano: string;
  banca: string;
  enfase: string;
  grupo: string;
  area: string;
  tema: string;
  questaoNumero: string;
}

export interface NewQuestionInput {
  questao: number;
  paginaPdf: number;
  areaOriginal: string;
  tema: string;
  grupoEstudo: string;
  vinculo: LinkType;
  codigoPrograma: string;
  conteudosSecundarios: string;
  exigencia: string;
  observacao?: string;
}

export interface NewExamPayload {
  prova: string;
  banca: string;
  empresa: string;
  ano: string;
  enfase: string;
  arquivoOrigem: string;
  questoes: NewQuestionInput[];
}

export type CognitivePattern = 'calculo' | 'conceitual' | 'interpretacao';

export interface BoardMetricComparison {
  criterio: string;
  descricao: string;
  cesgranrioCount: number;
  cesgranrioPct: number;
  cesgranrioQuestions: QuestionRecord[];
  cebraspeCount: number;
  cebraspePct: number;
  cebraspeQuestions: QuestionRecord[];
}

export interface BoardComparisonSummary {
  cesgranrioTotal: number;
  cebraspeTotal: number;
  cesgranrioExams: string[];
  cebraspeExams: string[];
  criterios: BoardMetricComparison[];
  padroes: {
    padrao: CognitivePattern;
    label: string;
    cesgranrioCount: number;
    cesgranrioPct: number;
    cesgranrioQuestions: QuestionRecord[];
    cebraspeCount: number;
    cebraspePct: number;
    cebraspeQuestions: QuestionRecord[];
  }[];
}

export interface HistoricalPoint {
  prova: string;
  concursoCurto: string;
  empresa: string;
  ano: string;
  banca: string;
  totalProva: number;
  frequencia: number;
  percentual: number;
  questoes: QuestionRecord[];
}

export interface HistoricalTopicEvolution {
  tema: string;
  totalGeral: number;
  pontos: HistoricalPoint[];
  deltaPercentual: number; // recent half vs earlier half (in percentage points)
  tendencia: 'alta' | 'estavel' | 'queda';
}

export type PresenceScope = 'todos' | 'varios' | 'exclusivo';

export interface CommonExclusiveRow {
  tema: string;
  totalQuestoes: number;
  empresasPresentes: string[];
  provasPresentes: string[];
  scopeEmpresa: PresenceScope;
  scopeProva: PresenceScope;
  porEmpresa: Record<string, QuestionRecord[]>;
  porProva: Record<string, QuestionRecord[]>;
  questoes: QuestionRecord[];
}

export type GapStatus =
  | 'cobrado'
  | 'parcial'
  | 'nao_identificado'
  | 'aprofundamento';

export interface SyllabusGapRow {
  codigo: string;
  titulo: string;
  status: GapStatus;
  questoesNaSelecao: QuestionRecord[];
  questoesEmOutrasProvas: QuestionRecord[];
  vinculoDiretoCount: number;
  vinculoCorrelatoCount: number;
  recomendacao: string;
}

export type AdherenceCategory =
  | 'direta'
  | 'correlata'
  | 'revisao'
  | 'sem_correspondencia';

export interface AdherenceAuditRow {
  question: QuestionRecord;
  categoria: AdherenceCategory;
  edital: string;
  itemProgramatico: string;
  justificativa: string;
}

export type DepthLevel = 'basico' | 'aplicacao' | 'calculo_estrutura';

export interface SubtopicDepthRow {
  subtema: string;
  total: number;
  percentualNoGrupo: number;
  basicoCount: number;
  aplicacaoCount: number;
  calculoEstruturaCount: number;
  questoes: QuestionRecord[];
}

export type ReasoningType =
  | 'conceitual'
  | 'calculo'
  | 'interpretacao'
  | 'aplicacao'
  | 'identificacao'
  | 'relacao_conceitos'
  | 'analise_afirmacoes';

export interface ReasoningClassificationRow {
  tipo: ReasoningType;
  label: string;
  exemplo: string;
  total: number;
  percentual: number;
  cesgranrioCount: number;
  cebraspeCount: number;
  questoes: QuestionRecord[];
}

export type DistractorMechanism =
  | 'pegadinha_conceitual'
  | 'troca_unidades'
  | 'inversao_conceitos'
  | 'formula_incorreta'
  | 'generalizacao_indevida'
  | 'parcialmente_correta'
  | 'afirmacao_absoluta'
  | 'confusao_semelhantes';

export interface DistractorRadarRow {
  mecanismo: DistractorMechanism;
  label: string;
  descricao: string;
  questoesCandidatas: QuestionRecord[];
}

export interface QuestionEngineeringStudy {
  questionId: string;
  bancaFormato: 'CESGRANRIO_AE' | 'CEBRASPE_CE';
  enunciadoOriginal: string;
  alternativasOuJulgamento: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
    gabarito?: string;
    alteracaoConceitualCebraspe?: string;
  };
  mecanismos: DistractorMechanism[];
  analiseBanca: string;
  updatedAt: string;
}

// Module 14: Painel de Desempenho Individual
export interface ResolvedAttemptRow {
  attempt: StudentAttemptRecord;
  question: QuestionRecord;
}

export interface PerformanceBucketRow {
  label: string;
  parentGrupo?: string;
  totalRespondidas: number;
  acertos: number;
  erros: number;
  revisar: number;
  taxaAcerto: number;
  tempoMedioSeg: number | null;
  questoesErradas: QuestionRecord[];
  questoesTodas: QuestionRecord[];
}

export interface BlindSpotSubtopicRow {
  subtopico: string;
  materia: string;
  taxaSubtopico: number;
  taxaMateria: number;
  acertos: number;
  totalRespondidas: number;
  questoesErradas: QuestionRecord[];
}

export interface ErrorRecurrenceRow {
  tema: string;
  grupoEstudo: string;
  errosCount: number;
  tentativasTotais: number;
  taxaErro: number;
  bancas: string[];
  questoes: QuestionRecord[];
}

export interface PerformanceTimelinePoint {
  dateKey: string; // YYYY-MM-DD
  label: string;   // DD/MM
  respondidas: number;
  acertos: number;
  erros: number;
  taxaAcerto: number;
  taxaAcumulada: number;
}

export interface StudentPerformanceSummary {
  totalTentativas: number;
  questoesUnicasRespondidas: number;
  totalAcertos: number;
  totalErros: number;
  totalRevisar: number;
  taxaAcertoGeral: number;
  tempoMedioSeg: number | null;
  porMateria: PerformanceBucketRow[];
  porSubtopico: PerformanceBucketRow[];
  pontosCegos: BlindSpotSubtopicRow[];
  porBanca: PerformanceBucketRow[];
  porConcurso: PerformanceBucketRow[];
  reincidenciaErros: ErrorRecurrenceRow[];
  evolucaoTemporal: PerformanceTimelinePoint[];
  historicoOrdenado: ResolvedAttemptRow[];
}

// Module 15: Planejador Inteligente de Estudos e Simulados
export type StudyPriorityLevel = 'alta' | 'media' | 'manutencao';

export interface StudyActivity {
  id: string;
  tipo: 'revisar_erro' | 'resolver_pendente' | 'lacuna_edital' | 'simulado_bloco';
  titulo: string;
  detalhe: string;
  questoesAlvo: QuestionRecord[];
}

export interface StudyPlanBlock {
  grupo: string;
  prioridade: StudyPriorityLevel;
  scorePrioridade: number;
  concentracaoHistoricaPct: number;
  frequenciaHistorica: number;
  isNucleo80: boolean;
  provasPresentesCount: number;
  itensNoEditalCount: number;
  taxaAcertoEstudante: number | null;
  errosCount: number;
  revisaoPendenteCount: number;
  questoesNaoResolvidasCount: number;
  justificativa: string;
  atividades: StudyActivity[];
  questoesDoBloco: QuestionRecord[];
}

export type SimuladoDifficultyFilter =
  | 'todas'
  | 'basico'
  | 'aplicacao'
  | 'calculo_estrutura';

export type SimuladoSelectionMode =
  | 'inteligente_pareto_erros'
  | 'pendentes'
  | 'equilibrado';

export interface SimuladoConfig {
  banca: string;
  prova: string;
  grupo: string;
  dificuldade: SimuladoDifficultyFilter;
  quantidade: number;
  modo: SimuladoSelectionMode;
}

export interface ExamIntelligenceBackupData {
  customQuestions: QuestionRecord[];
  performanceMap: Record<string, QuestionPerformance>;
  studentAttempts: StudentAttemptRecord[];
  reasoningOverrides: Record<string, ReasoningType>;
  studiesMap: Record<string, QuestionEngineeringStudy>;
}

export interface ExamIntelligenceBackup {
  schema: 'central-inteligencia-provas-backup';
  version: 1;
  exportedAt: string;
  counts: {
    customQuestions: number;
    performanceEntries: number;
    studentAttempts: number;
    reasoningOverrides: number;
    distractorStudies: number;
  };
  data: ExamIntelligenceBackupData;
}

export interface BackupRestoreResult {
  data: ExamIntelligenceBackupData;
  skippedOrphans: number;
  exportedAt: string;
}

// Knowledge Atlas & Dynamic BI Visualization Types (Real Data Only)
export interface KnowledgeAtlasNode {
  id: string;
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  code?: string;
  status: GapStatus;
  questionCount: number;
  otherExamCount: number;
  directCount: number;
  correlatoCount: number;
  exams: string[];
  questionRefs: string[];
  questions: QuestionRecord[];
  otherExamQuestions: QuestionRecord[];
  recommendation?: string;
  parentId?: string;
  children: KnowledgeAtlasNode[];
}

export interface KnowledgeAtlasData {
  root: KnowledgeAtlasNode;
  nodeMap: Record<string, KnowledgeAtlasNode>;
  disciplines: string[];
  bancas: string[];
  provas: string[];
}

export interface HeatmapMatrixCell {
  exam: string;
  count: number;
  pct: number;
  questions: QuestionRecord[];
}

export interface HeatmapMatrixRow {
  topic: string;
  total: number;
  cells: HeatmapMatrixCell[];
}

export interface HeatmapMatrixData {
  exams: string[];
  rows: HeatmapMatrixRow[];
  maxCellCount: number;
}

