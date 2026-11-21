import type {
  AdherenceAuditRow,
  AdherenceCategory,
  AnswerKeyStatus,
  BackupRestoreResult,
  BlindSpotSubtopicRow,
  BoardComparisonSummary,
  BoardMetricComparison,
  CognitivePattern,
  CommonExclusiveRow,
  DepthLevel,
  DistractorMechanism,
  DistractorRadarRow,
  ErrorRecurrenceRow,
  ExamIntelligenceBackup,
  ExamIntelligenceBackupData,
  ExamSummary,
  GapStatus,
  HeatmapMatrixData,
  HistoricalPoint,
  HistoricalTopicEvolution,
  KnowledgeAtlasData,
  KnowledgeAtlasNode,
  LinkType,
  LocatorFilters,
  NewExamPayload,
  OriginalBankFilters,
  ParetoRow,
  PerformanceBucketRow,
  PerformanceStatus,
  PerformanceTimelinePoint,
  PresenceScope,
  QuestionAnswerKey,
  QuestionEngineeringStudy,
  QuestionPerformance,
  QuestionRecord,
  RankingRow,
  RawCorrelationLinkItem,
  RawQuestionBankItem,
  RawQuestionBankPayload,
  RawQuestionCorrelationPayload,
  ReasoningClassificationRow,
  ReasoningType,
  ResolvedAttemptRow,
  SimuladoConfig,
  SpecificExamMetadata,
  SpecificQuestionItem,
  SpecificQuestionsPayload,
  StudentAttemptRecord,
  StudentPerformanceSummary,
  StudyActivity,
  StudyPlanBlock,
  StudyPriorityLevel,
  SubtopicDepthRow,
  SyllabusGapRow,
  SyllabusIncidenceRow,
} from '../types/exam';

/**
 * Parses an RFC-4180 CSV string supporting quoted fields, embedded commas,
 * escaped quotes (""), UTF-8 BOM, and CRLF/LF newlines.
 */
export function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      if (clean[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export function extractExamMetadata(prova: string): {
  concursoCurto: string;
  empresa: string;
  ano: string;
  enfase: string;
} {
  const parts = prova.split('—').map((s) => s.trim());
  const head = parts[0] || prova;
  const enfase = parts[1] || 'Geral';

  const tokens = head.split(/\s+/);
  const empresa = tokens[0] || 'Outro';
  const yearMatch = head.match(/\b(20\d{2}(?:\.\d+)?)\b/);
  const ano = yearMatch ? yearMatch[1] : 'N/D';
  const concursoCurto = head;

  return { concursoCurto, empresa, ano, enfase };
}

export function splitTopicSubtopic(tema: string): { topico: string; subtopico: string } {
  const parts = tema.split('—').map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      topico: parts[0],
      subtopico: parts.slice(1).join(' — '),
    };
  }
  return {
    topico: tema.trim(),
    subtopico: 'Conceito geral',
  };
}

export function inferUnifiedSyllabusTopic(
  tema: string,
  area: string,
  codigo: string,
  grupo: string,
  exigencia: string
): string {
  const haystack = `${tema} ${area} ${exigencia}`.toLowerCase();

  if (
    haystack.includes('gás') ||
    haystack.includes('gases') ||
    haystack.includes('boyle') ||
    haystack.includes('gay-lussac') ||
    haystack.includes('charles') ||
    haystack.includes('variáveis de estado') ||
    /\.09$|TP23\.22/.test(codigo) && haystack.includes('gás')
  ) {
    return 'Estudo de gases e leis dos gases ideais';
  }
  if (haystack.includes('estequiometria') || haystack.includes('massa molar') || haystack.includes('rendimento de reação')) {
    return 'Estequiometria e cálculos de reação';
  }
  if (
    haystack.includes('controle') ||
    haystack.includes('pid') ||
    haystack.includes('malha') ||
    haystack.includes('feedforward') ||
    haystack.includes('primeira ordem') ||
    haystack.includes('válvula de controle')
  ) {
    return 'Controle de processos e malhas (PID / feedforward)';
  }
  if (haystack.includes('bomba') || haystack.includes('cavitação') || haystack.includes('impelidor') || haystack.includes('booster')) {
    return 'Bombas industriais (centrífugas, alternativas e cavitação)';
  }
  if (
    haystack.includes('termodinâmica') ||
    haystack.includes('carnot') ||
    haystack.includes('entropia') ||
    haystack.includes('gibbs') ||
    haystack.includes('máquina térmica') ||
    haystack.includes('refrigeração') ||
    haystack.includes('saturação') ||
    haystack.includes('vapor superaquecido') ||
    haystack.includes('primeira lei')
  ) {
    return 'Termodinâmica, ciclos e propriedades do vapor';
  }
  if (
    haystack.includes('equilíbrio químico') ||
    haystack.includes('le chatelier') ||
    haystack.includes('constantes de equilíbrio') ||
    haystack.includes('equilíbrio redox') ||
    haystack.includes('equilíbrio gasoso') ||
    haystack.includes('solubilidade — kps')
  ) {
    return 'Equilíbrio químico e princípio de Le Chatelier';
  }
  if (haystack.includes('oxirredução') || haystack.includes('oxidação') || haystack.includes('corrosão') || haystack.includes('redutor') || haystack.includes('oxidante')) {
    return 'Oxirredução, número de oxidação e corrosão';
  }
  if (
    haystack.includes('polímero') ||
    haystack.includes('polietileno') ||
    haystack.includes('hidrocarboneto') ||
    haystack.includes('alcano') ||
    haystack.includes('alceno') ||
    haystack.includes('aromático') ||
    haystack.includes('amina') ||
    haystack.includes('carbonila') ||
    haystack.includes('petróleo') ||
    haystack.includes('cadeia carbônica')
  ) {
    return 'Química orgânica, hidrocarbonetos e polímeros';
  }
  if (
    haystack.includes('paquímetro') ||
    haystack.includes('metrologia') ||
    haystack.includes('paralaxe') ||
    haystack.includes('histerese') ||
    haystack.includes('repetibilidade') ||
    haystack.includes('precisão') ||
    haystack.includes('exatidão') ||
    haystack.includes('sistema internacional') ||
    haystack.includes('unidades')
  ) {
    return 'Metrologia, erros de medição e Sistema Internacional';
  }
  if (
    haystack.includes('transmissor') ||
    haystack.includes('bourdon') ||
    haystack.includes('rotâmetro') ||
    haystack.includes('4–20 ma') ||
    haystack.includes('sensor') ||
    haystack.includes('range e span') ||
    haystack.includes('coriolis') ||
    haystack.includes('termômetro bimetálico') ||
    haystack.includes('pneumátic')
  ) {
    return 'Instrumentação industrial, sensores e transmissores';
  }
  if (
    haystack.includes('tubulação') ||
    haystack.includes('tubulações') ||
    haystack.includes('válvula') ||
    haystack.includes('permutador') ||
    haystack.includes('flange') ||
    haystack.includes('juntas de expansão') ||
    haystack.includes('caldeira') ||
    haystack.includes('soldagem')
  ) {
    return 'Tubulações, válvulas, permutadores e caldeiras';
  }
  if (
    haystack.includes('hidrostática') ||
    haystack.includes('bernoulli') ||
    haystack.includes('venturi') ||
    haystack.includes('escoamento') ||
    haystack.includes('incompressível') ||
    haystack.includes('vasos comunicantes')
  ) {
    return 'Mecânica dos fluidos, hidrostática e Bernoulli';
  }
  if (
    haystack.includes('calorimetria') ||
    haystack.includes('transferência de calor') ||
    haystack.includes('radiação térmica') ||
    haystack.includes('condução térmica') ||
    haystack.includes('convecção') ||
    haystack.includes('stefan-boltzmann') ||
    haystack.includes('mudança de fase') ||
    haystack.includes('escalas') ||
    haystack.includes('kelvin') ||
    haystack.includes('celsius') ||
    haystack.includes('zero absoluto')
  ) {
    return 'Termologia, escalas termométricas e transferência de calor';
  }
  if (
    haystack.includes('estática') ||
    haystack.includes('dinâmica') ||
    haystack.includes('cinemática') ||
    haystack.includes('energia mecânica') ||
    haystack.includes('trabalho mecânico') ||
    haystack.includes('newton') ||
    haystack.includes('polias') ||
    haystack.includes('roldanas') ||
    haystack.includes('momento de força') ||
    haystack.includes('tensão normal') ||
    haystack.includes('tensão-deformação') ||
    haystack.includes('mancais') ||
    haystack.includes('engrenagens') ||
    haystack.includes('desenho técnico') ||
    haystack.includes('lubrificação')
  ) {
    return 'Mecânica clássica, estática, resistência e elementos de máquinas';
  }
  if (
    haystack.includes('eletrostática') ||
    haystack.includes('eletromagnetismo') ||
    haystack.includes('campo elétrico') ||
    haystack.includes('campo magnético') ||
    haystack.includes('coulomb') ||
    haystack.includes('circuitos') ||
    haystack.includes('capacitores') ||
    haystack.includes('resistência elétrica') ||
    haystack.includes('potencial elétrico')
  ) {
    return 'Eletricidade, eletrostática, circuitos e eletromagnetismo';
  }
  if (
    haystack.includes('soluções') ||
    haystack.includes('dispersões') ||
    haystack.includes('coloid') ||
    haystack.includes('tyndall') ||
    haystack.includes('concentração') ||
    haystack.includes('diluição') ||
    haystack.includes('solubilidade')
  ) {
    return 'Soluções, concentrações e sistemas dispersos';
  }
  if (haystack.includes('ácido') || haystack.includes('neutralização') || haystack.includes('brønsted') || haystack.includes('arrhenius')) {
    return 'Funções inorgânicas, ácidos, bases e neutralização';
  }
  if (haystack.includes('entalpia') || haystack.includes('combustão') || haystack.includes('exotérmica') || haystack.includes('poder calorífico')) {
    return 'Termoquímica, entalpia e reações de combustão';
  }
  if (haystack.includes('operações unitárias') || haystack.includes('agitação') || haystack.includes('destilação') || haystack.includes('sedimentação')) {
    return 'Operações unitárias e separação de misturas';
  }
  if (haystack.includes('sms') || haystack.includes('riscos') || haystack.includes('epi') || haystack.includes('sil') || haystack.includes('atmosferas explosivas') || haystack.includes('ruído')) {
    return 'Segurança, meio ambiente, saúde (SMS) e SIL';
  }
  if (haystack.includes('modelos atômicos') || haystack.includes('configuração eletrônica') || haystack.includes('ligações') || haystack.includes('lewis')) {
    return 'Estrutura atômica, tabela periódica e ligações químicas';
  }
  if (haystack.includes('onda') || haystack.includes('radiação eletromagnética') || haystack.includes('fotoelétrico')) {
    return 'Ondas, óptica e radiações eletromagnéticas';
  }

  return grupo || 'Outros tópicos do programa';
}

function findHeaderRowIndex(rows: string[][], requiredCol: string): number {
  return rows.findIndex((r) => r.some((cell) => cell.toLowerCase() === requiredCol.toLowerCase()));
}

export function buildUnifiedDatabase(
  paretoCsvText: string,
  principalCsvText: string
): QuestionRecord[] {
  const paretoRows = parseCsvRows(paretoCsvText);
  const principalRows = parseCsvRows(principalCsvText);

  const paretoHeaderIdx = findHeaderRowIndex(paretoRows, 'Prova');
  const principalHeaderIdx = findHeaderRowIndex(principalRows, 'Prova');

  if (paretoHeaderIdx === -1) {
    throw new Error('Cabeçalho da planilha Pareto não encontrado.');
  }

  const paretoHeaders = paretoRows[paretoHeaderIdx];
  const paretoCol = (name: string) =>
    paretoHeaders.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const principalMap = new Map<
    string,
    {
      area: string;
      observacaoAnalise: string;
      conteudoSecundario: string;
    }
  >();

  if (principalHeaderIdx !== -1) {
    const pHeaders = principalRows[principalHeaderIdx];
    const pCol = (name: string) =>
      pHeaders.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    for (let i = principalHeaderIdx + 1; i < principalRows.length; i++) {
      const r = principalRows[i];
      const prova = r[pCol('Prova')] || '';
      const questao = r[pCol('Questão')] || '';
      if (!prova || !questao) continue;
      principalMap.set(`${prova}::${questao}`, {
        area: r[pCol('Área')] || '',
        observacaoAnalise: r[pCol('Observação de análise')] || '',
        conteudoSecundario: r[pCol('Conteúdo secundário relacionado')] || '',
      });
    }
  }

  const records: QuestionRecord[] = [];

  for (let i = paretoHeaderIdx + 1; i < paretoRows.length; i++) {
    const r = paretoRows[i];
    const prova = r[paretoCol('Prova')] || '';
    const qRaw = r[paretoCol('Questão')] || '';
    const questao = Number.parseInt(qRaw, 10);
    if (!prova || Number.isNaN(questao)) continue;

    const id = `${prova}::${questao}`;
    const principalMatch = principalMap.get(id);

    const banca = r[paretoCol('Banca')] || '';
    const paginaPdf = Number.parseInt(r[paretoCol('Página PDF')] || '0', 10) || 0;
    const areaOriginal = r[paretoCol('Área original')] || principalMatch?.area || '';
    const tema = r[paretoCol('Tema efetivamente cobrado')] || '';
    const grupoEstudo = r[paretoCol('Grupo de estudo consolidado')] || 'Não classificado';
    const vinculoRaw = r[paretoCol('Vínculo com o edital')] || 'Direto';
    const vinculo: LinkType = vinculoRaw.toLowerCase().includes('correlat') ? 'Correlato' : 'Direto';
    const codigoPrograma = r[paretoCol('Código do programa')] || '';
    const secRaw =
      r[paretoCol('Conteúdo secundário')] || principalMatch?.conteudoSecundario || '';
    const conteudosSecundarios = secRaw
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const exigencia = r[paretoCol('O que a questão exigiu')] || '';
    const observacaoClassificacao = r[paretoCol('Observação da classificação')] || '';
    const observacaoAnalise = principalMatch?.observacaoAnalise || '';
    const arquivoOrigem = r[paretoCol('Arquivo de origem')] || '';

    const meta = extractExamMetadata(prova);
    const { topico, subtopico } = splitTopicSubtopic(tema);
    const topicoEditalUnificado = inferUnifiedSyllabusTopic(
      tema,
      areaOriginal,
      codigoPrograma,
      grupoEstudo,
      exigencia
    );

    records.push({
      id,
      prova,
      concursoCurto: meta.concursoCurto,
      empresa: meta.empresa,
      ano: meta.ano,
      enfase: meta.enfase,
      banca,
      questao,
      paginaPdf,
      areaOriginal,
      tema,
      topico,
      subtopico,
      grupoEstudo,
      vinculo,
      codigoPrograma,
      conteudosSecundarios,
      exigencia,
      observacaoClassificacao,
      observacaoAnalise,
      arquivoOrigem,
      topicoEditalUnificado,
    });
  }

  return records;
}

const EXAM_NAME_TO_ID_FALLBACK: Record<string, string> = {
  'Transpetro 2018 — Técnico(a) de Operação Júnior': 'TRANSPETRO_2018_OPERACAO',
  'Petrobras 2023.1 — Ênfase 7: Operação': 'PETROBRAS_2023_1_OPERACAO',
  'Petrobras 2023.2 — Ênfase 8: Operação': 'PETROBRAS_2023_2_OPERACAO',
  'Transpetro 2023.1 — Ênfase 2: Dutos e Terminais': 'TRANSPETRO_2023_1_DUTOS_TERMINAIS',
  'ANSA 2026 — Ênfase 22: Operação': 'ANSA_2026_OPERACAO',
};

function mapRawAnswerKey(
  rawAk: RawQuestionBankItem['answer_key']
): QuestionAnswerKey | undefined {
  if (!rawAk) return undefined;
  return {
    value: rawAk.value ?? null,
    displayValue: rawAk.display_value,
    status: rawAk.status,
    statusLabel: rawAk.status_label,
    questionType: rawAk.question_type,
    sourcePdf: rawAk.source_pdf,
    sourcePage: rawAk.source_page,
    sourceNote: rawAk.source_note,
    previousValue: rawAk.previous_value,
    adjustmentNote: rawAk.adjustment_note,
    sourceAdjustmentPage: rawAk.source_adjustment_page,
    originalMark: rawAk.original_mark,
  };
}

/**
 * Enriches the unified CSV database with full question statements, alternatives,
 * official/preliminary/adjusted answer keys, and corrected PDF page references from
 * `banco_questoes_operacao_dutos_app.json` (primary) and `correlacao_questoes_app.json`.
 *
 * Joins strictly by `question_id`, `app_lookup_key`, or composite `(exam_id/exam_name, question_number)`.
 * Never alters existing Pareto/syllabus/program correlations or `${prova}::${questao}` IDs.
 */
export function enrichDatabaseWithAnswerBank(
  records: QuestionRecord[],
  bankPayload?: RawQuestionBankPayload | null,
  correlacaoPayload?: RawQuestionCorrelationPayload | null
): QuestionRecord[] {
  if (!bankPayload?.questions?.length && !correlacaoPayload?.question_links?.length) {
    return records;
  }

  const bankByQuestionId = new Map<string, RawQuestionBankItem>();
  const bankByLookupKey = new Map<string, RawQuestionBankItem>();
  const bankByExamAndNumber = new Map<string, RawQuestionBankItem>();

  for (const item of bankPayload?.questions ?? []) {
    if (item.question_id) bankByQuestionId.set(item.question_id, item);
    if (item.app_lookup_key) bankByLookupKey.set(item.app_lookup_key, item);
    if (item.exam_name && typeof item.question_number === 'number') {
      bankByExamAndNumber.set(`${item.exam_name}::${item.question_number}`, item);
    }
    if (item.exam_id && typeof item.question_number === 'number') {
      bankByExamAndNumber.set(`${item.exam_id}:${item.question_number}`, item);
    }
  }

  const linkByQuestionId = new Map<string, RawCorrelationLinkItem>();
  const linkByLookupKey = new Map<string, RawCorrelationLinkItem>();

  for (const link of correlacaoPayload?.question_links ?? []) {
    if (link.question_id) linkByQuestionId.set(link.question_id, link);
    if (link.app_lookup_key) linkByLookupKey.set(link.app_lookup_key, link);
  }

  return records.map((rec) => {
    const inferredExamId = rec.examId || EXAM_NAME_TO_ID_FALLBACK[rec.prova];
    const compositeLookup = inferredExamId ? `${inferredExamId}:${rec.questao}` : undefined;

    const bankItem =
      (rec.questionId ? bankByQuestionId.get(rec.questionId) : undefined) ||
      (rec.appLookupKey ? bankByLookupKey.get(rec.appLookupKey) : undefined) ||
      (compositeLookup ? bankByLookupKey.get(compositeLookup) : undefined) ||
      bankByExamAndNumber.get(`${rec.prova}::${rec.questao}`);

    const linkItem =
      (bankItem?.question_id ? linkByQuestionId.get(bankItem.question_id) : undefined) ||
      (bankItem?.app_lookup_key ? linkByLookupKey.get(bankItem.app_lookup_key) : undefined) ||
      (compositeLookup ? linkByLookupKey.get(compositeLookup) : undefined);

    if (!bankItem && !linkItem) return rec;

    const rawAnswerKey = bankItem?.answer_key || linkItem?.answer_key;
    const status: AnswerKeyStatus | undefined =
      rawAnswerKey?.status || bankItem?.answer_key_status || linkItem?.answer_key_status;
    const rawCorrectAnswer =
      bankItem?.correct_answer !== undefined ? bankItem.correct_answer : linkItem?.correct_answer;

    const isAnnulled =
      status === 'annulled' ||
      rawCorrectAnswer === 'ANULADA' ||
      rawAnswerKey?.value === null;

    const pdfPageCorrected = Boolean(
      bankItem?.page_number_corrected ?? linkItem?.page_number_corrected
    );
    const jsonPdfPage = bankItem?.pdf_page ?? linkItem?.pdf_page;

    const nextPaginaPdf =
      pdfPageCorrected && typeof jsonPdfPage === 'number' && jsonPdfPage > 0
        ? jsonPdfPage
        : rec.paginaPdf;

    return {
      ...rec,
      questionId: bankItem?.question_id || linkItem?.question_id || rec.questionId,
      appLookupKey: bankItem?.app_lookup_key || linkItem?.app_lookup_key || rec.appLookupKey,
      examId: bankItem?.exam_id || linkItem?.exam_id || inferredExamId || rec.examId,
      paginaPdf: nextPaginaPdf,
      paginaPdfOriginalCsv:
        pdfPageCorrected && nextPaginaPdf !== rec.paginaPdf ? rec.paginaPdf : rec.paginaPdfOriginalCsv,
      pdfPageCorrected: pdfPageCorrected || rec.pdfPageCorrected,
      questionType: bankItem?.question_type || linkItem?.question_type || rec.questionType,
      contextText: bankItem?.context_text ?? rec.contextText,
      questionText: bankItem?.question_text ?? rec.questionText,
      displayText: bankItem?.display_text ?? rec.displayText,
      statementWithoutNumber:
        bankItem?.statement_without_number ?? rec.statementWithoutNumber,
      alternatives: bankItem?.alternatives ?? rec.alternatives,
      mayNeedPdfFigure:
        bankItem?.visual_reference?.may_need_pdf_figure ?? rec.mayNeedPdfFigure,
      answerKey: mapRawAnswerKey(rawAnswerKey) ?? rec.answerKey,
      answerKeyStatus: status ?? rec.answerKeyStatus,
      isAnnulled,
      // Do NOT assign an alternative or valid judgment when annulled
      correctAnswer: isAnnulled ? 'ANULADA' : (rawCorrectAnswer ?? rec.correctAnswer),
      correctOptionLabel: isAnnulled
        ? null
        : (bankItem?.correct_option_label ?? linkItem?.correct_option_label ?? null),
      correctOptionText: isAnnulled
        ? null
        : (bankItem?.correct_option_text ?? linkItem?.correct_option_text ?? null),
      correctJudgment: isAnnulled
        ? null
        : (bankItem?.correct_judgment ?? linkItem?.correct_judgment ?? null),
    };
  });
}

export function resolveSpecificPdfUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const clean = path.trim();
  if (!clean) return undefined;
  if (clean.startsWith('/provas-especificas/')) return clean;
  if (clean.startsWith('specific_pdfs/')) {
    return `/provas-especificas/${clean.slice('specific_pdfs/'.length)}`;
  }
  if (clean.startsWith('/specific_pdfs/')) {
    return `/provas-especificas/${clean.slice('/specific_pdfs/'.length)}`;
  }
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function resolveQuestionImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const clean = path.trim();
  if (!clean) return undefined;
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * Looks up a question exclusively by `question_id` (`questionId`) or
 * `app_lookup_key` (`appLookupKey`, i.e., `EXAM_ID:numero`).
 * Never searches by isolated question number.
 */
export function resolveQuestionByKey(
  questions: QuestionRecord[],
  keyOrId: string
): QuestionRecord | undefined {
  const target = keyOrId.trim();
  if (!target) return undefined;
  return questions.find(
    (q) => q.questionId === target || q.appLookupKey === target || q.id === target
  );
}

/**
 * Integrates the official `database/questoes_especificas.json` / `.min.json` and
 * `database/provas.json` package into the unified QuestionRecord database.
 * Joins exclusively by `question_id` or `app_lookup_key` (EXAM_ID:numero),
 * preserving all CSV/Pareto/program correlations and localStorage record IDs.
 */
export function mergeSpecificQuestionsDatabase(
  records: QuestionRecord[],
  specificPayload?: SpecificQuestionsPayload | null,
  provasPayload?: SpecificExamMetadata[] | null
): QuestionRecord[] {
  const specQuestions = specificPayload?.questions ?? [];
  const examsMeta =
    provasPayload && provasPayload.length > 0
      ? provasPayload
      : specificPayload?.exams ?? [];

  if (specQuestions.length === 0 && examsMeta.length === 0) {
    return records;
  }

  const examMetaMap = new Map<string, SpecificExamMetadata>();
  for (const ex of examsMeta) {
    if (ex.exam_id) examMetaMap.set(ex.exam_id, ex);
  }

  const specByQuestionId = new Map<string, SpecificQuestionItem>();
  const specByLookupKey = new Map<string, SpecificQuestionItem>();

  for (const sq of specQuestions) {
    if (sq.question_id) specByQuestionId.set(sq.question_id, sq);
    if (sq.app_lookup_key) specByLookupKey.set(sq.app_lookup_key, sq);
  }

  return records.map((rec) => {
    const inferredExamId = rec.examId || EXAM_NAME_TO_ID_FALLBACK[rec.prova];
    const derivedLookup = inferredExamId ? `${inferredExamId}:${rec.questao}` : undefined;

    const spec =
      (rec.questionId ? specByQuestionId.get(rec.questionId) : undefined) ||
      (rec.appLookupKey ? specByLookupKey.get(rec.appLookupKey) : undefined) ||
      (derivedLookup ? specByLookupKey.get(derivedLookup) : undefined);

    if (!spec) {
      const fallbackMeta = inferredExamId ? examMetaMap.get(inferredExamId) : undefined;
      if (!fallbackMeta) return rec;
      return {
        ...rec,
        specificPdfPath:
          rec.specificPdfPath || resolveSpecificPdfUrl(fallbackMeta.specific_pdf_path),
        specificPdfTotalPages:
          rec.specificPdfTotalPages ?? fallbackMeta.specific_pdf_page_count,
      };
    }

    const examMeta = examMetaMap.get(spec.exam_id);
    const rawAk = spec.answer_key;
    const status: AnswerKeyStatus | undefined =
      rawAk?.status || spec.answer_key_status || rec.answerKeyStatus;
    const rawCorrect =
      spec.correct_answer !== undefined ? spec.correct_answer : rec.correctAnswer;
    const isAnnulled =
      status === 'annulled' || rawCorrect === 'ANULADA' || rawAk?.value === null;

    const origPage = spec.source_pdf_page_original ?? spec.pdf_page ?? rec.paginaPdf;

    return {
      ...rec,
      questionId: spec.question_id || rec.questionId,
      appLookupKey: spec.app_lookup_key || rec.appLookupKey,
      examId: spec.exam_id || rec.examId,
      questionType: spec.question_type || rec.questionType,
      contextText: spec.context_text ?? rec.contextText,
      questionText: spec.question_text ?? rec.questionText,
      displayText: spec.display_text ?? rec.displayText,
      contextTextNormalized:
        spec.context_text_normalized ?? spec.context_text ?? rec.contextTextNormalized,
      questionTextNormalized:
        spec.question_text_normalized ?? spec.question_text ?? rec.questionTextNormalized,
      displayTextNormalized:
        spec.display_text_normalized ?? spec.display_text ?? rec.displayTextNormalized,
      statementWithoutNumber:
        spec.statement_without_number ?? rec.statementWithoutNumber,
      alternatives:
        spec.alternatives && spec.alternatives.length > 0
          ? spec.alternatives
          : rec.alternatives,
      mayNeedPdfFigure:
        spec.visual_reference?.may_need_pdf_figure ?? rec.mayNeedPdfFigure,
      originalImagePath: resolveQuestionImageUrl(
        spec.visual_reference?.image_path || spec.app_render?.image_path
      ),
      imageWidthPx: spec.visual_reference?.image_width_px ?? rec.imageWidthPx,
      imageHeightPx: spec.visual_reference?.image_height_px ?? rec.imageHeightPx,
      showContextFirst:
        spec.app_render?.show_context_first ??
        Boolean(spec.context_text_normalized || spec.context_text),
      specificPdfPath: resolveSpecificPdfUrl(
        spec.specific_pdf_path || examMeta?.specific_pdf_path
      ),
      specificPdfPage: spec.source_pdf_page_specific_derivative,
      specificPdfTotalPages:
        examMeta?.specific_pdf_page_count ?? rec.specificPdfTotalPages,
      sourcePdfPageOriginal: origPage,
      paginaPdf: origPage > 0 ? origPage : rec.paginaPdf,
      referenceMaterialPath:
        spec.exam_id === 'TRANSPETRO_2023_1_DUTOS_TERMINAIS'
          ? '/reference_materials/TRANSPETRO_2023_1_DUTOS_TERMINAIS_tabela_periodica_apoio.pdf'
          : rec.referenceMaterialPath,
      basicSubjectsExcluded: spec.basic_subjects_excluded ?? true,
      answerKey: mapRawAnswerKey(rawAk) ?? rec.answerKey,
      answerKeyStatus: status,
      isAnnulled,
      correctAnswer: isAnnulled ? 'ANULADA' : (rawCorrect ?? rec.correctAnswer),
      correctOptionLabel: isAnnulled
        ? null
        : (spec.correct_option_label ?? rec.correctOptionLabel ?? null),
      correctOptionText: isAnnulled
        ? null
        : (spec.correct_option_text ?? rec.correctOptionText ?? null),
      correctJudgment: isAnnulled
        ? null
        : (spec.correct_judgment ?? rec.correctJudgment ?? null),
    };
  });
}

export interface ExamCountValidationRow {
  examId: string;
  examName: string;
  company: string;
  year: number;
  bank: string;
  emphasis: string;
  expectedCount: number;
  actualCount: number;
  questionNumberRange: [number, number];
  excludedBasicRange: [number, number];
  specificPdfUrl?: string;
  specificPdfPageCount: number;
  answerKeyStatus: AnswerKeyStatus;
  answerKeyStatusLabel: string;
  matchesCount: boolean;
  basicExcludedValid: boolean;
}

export interface ExamPackageValidationSummary {
  exams: ExamCountValidationRow[];
  totalExpected: number;
  totalActual: number;
  isComplete270: boolean;
  allBasicExcluded: boolean;
}

export function buildExamCountValidation(
  provasMeta: SpecificExamMetadata[],
  questions: QuestionRecord[]
): ExamPackageValidationSummary {
  const rows: ExamCountValidationRow[] = provasMeta.map((meta) => {
    const matching = questions.filter((q) => q.examId === meta.exam_id);
    const [minSpec, maxSpec] = meta.question_number_range;
    const basicExcludedValid =
      matching.length > 0 &&
      matching.every((q) => q.questao >= minSpec && q.questao <= maxSpec);

    return {
      examId: meta.exam_id,
      examName: meta.exam_name,
      company: meta.company,
      year: meta.year,
      bank: meta.bank,
      emphasis: meta.emphasis,
      expectedCount: meta.question_count,
      actualCount: matching.length,
      questionNumberRange: meta.question_number_range,
      excludedBasicRange: meta.excluded_basic_question_range,
      specificPdfUrl: resolveSpecificPdfUrl(meta.specific_pdf_path),
      specificPdfPageCount: meta.specific_pdf_page_count,
      answerKeyStatus: meta.answer_key_status,
      answerKeyStatusLabel: meta.answer_key_status_label,
      matchesCount: matching.length === meta.question_count,
      basicExcludedValid,
    };
  });

  const totalExpected = rows.reduce((s, r) => s + r.expectedCount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualCount, 0);

  return {
    exams: rows,
    totalExpected,
    totalActual,
    isComplete270:
      totalActual === 270 &&
      totalExpected === 270 &&
      rows.length === 5 &&
      rows.every((r) => r.matchesCount),
    allBasicExcluded: rows.length > 0 && rows.every((r) => r.basicExcludedValid),
  };
}

export function filterOriginalBankQuestions(
  questions: QuestionRecord[],
  filters: OriginalBankFilters
): QuestionRecord[] {
  const qLower = filters.query.trim().toLowerCase();
  const numQuery = filters.questaoNumero.trim();
  const isAll = (val: string) => !val || val === 'Todas' || val === 'Todos';

  return questions.filter((item) => {
    if (!isAll(filters.empresa) && item.empresa !== filters.empresa) return false;
    if (!isAll(filters.prova) && item.prova !== filters.prova) return false;
    if (!isAll(filters.ano) && item.ano !== filters.ano) return false;
    if (!isAll(filters.banca) && item.banca !== filters.banca) return false;
    if (!isAll(filters.enfase) && item.enfase !== filters.enfase) return false;
    if (!isAll(filters.grupo) && item.grupoEstudo !== filters.grupo) return false;
    if (!isAll(filters.area) && item.areaOriginal !== filters.area) return false;
    if (!isAll(filters.tema) && item.tema !== filters.tema) return false;

    if (numQuery.length > 0 && String(item.questao) !== numQuery) {
      return false;
    }

    if (qLower.length > 0) {
      const altText = (item.alternatives || [])
        .map((a) => `${a.label} ${a.text}`)
        .join(' ');
      const searchable = [
        item.questionId || '',
        item.appLookupKey || '',
        item.examId || '',
        item.prova,
        item.empresa,
        item.banca,
        item.enfase,
        String(item.questao),
        item.areaOriginal,
        item.tema,
        item.grupoEstudo,
        item.codigoPrograma,
        item.exigencia,
        item.contextTextNormalized || item.contextText || '',
        item.questionTextNormalized || item.statementWithoutNumber || item.questionText || '',
        altText,
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(qLower)) return false;
    }

    return true;
  });
}

export interface QuestionAnswerKeyInfo {
  hasOfficialKey: boolean;
  isAnnulled: boolean;
  isPreliminary: boolean;
  isAdjusted: boolean;
  /** Normalized choice value compatible with student inputs ('A'..'E', 'Certo', 'Errado', or null if annulled/missing) */
  expectedChoiceValue: string | null;
  /** Short badge/chip text such as 'C', 'CERTO', 'ERRADO', 'ANULADA' */
  shortAnswerLabel: string;
  /** Human-readable status badge text */
  statusBadgeLabel: string;
  /** Status tone for styling */
  statusTone: 'final' | 'adjusted' | 'preliminary' | 'annulled' | 'none';
  optionText: string | null;
  sourcePdf: string | null;
  sourcePage: number | null;
  sourceNote: string | null;
  adjustmentNote: string | null;
  previousValue: string | null;
}

export function getQuestionAnswerKeyInfo(q: QuestionRecord): QuestionAnswerKeyInfo {
  const status = q.answerKey?.status || q.answerKeyStatus;
  const isAnnulled = Boolean(
    q.isAnnulled || status === 'annulled' || q.correctAnswer === 'ANULADA'
  );

  if (isAnnulled) {
    return {
      hasOfficialKey: true,
      isAnnulled: true,
      isPreliminary: false,
      isAdjusted: false,
      expectedChoiceValue: null,
      shortAnswerLabel: 'ANULADA',
      statusBadgeLabel: 'Anulada no gabarito oficial',
      statusTone: 'annulled',
      optionText: null,
      sourcePdf: q.answerKey?.sourcePdf || null,
      sourcePage: q.answerKey?.sourcePage || null,
      sourceNote: q.answerKey?.sourceNote || null,
      adjustmentNote: q.answerKey?.adjustmentNote || null,
      previousValue: q.answerKey?.previousValue || null,
    };
  }

  const isCebraspe =
    q.questionType === 'true_false' || q.banca.toUpperCase().includes('CEBRASPE');

  let expectedChoiceValue: string | null = null;
  let shortAnswerLabel = '';

  if (isCebraspe) {
    const raw = (q.correctJudgment || q.correctAnswer || q.answerKey?.displayValue || q.answerKey?.value || '')
      .trim()
      .toUpperCase();
    if (raw === 'CERTO' || raw === 'C') {
      expectedChoiceValue = 'Certo';
      shortAnswerLabel = 'CERTO';
    } else if (raw === 'ERRADO' || raw === 'E') {
      expectedChoiceValue = 'Errado';
      shortAnswerLabel = 'ERRADO';
    }
  } else {
    const raw = (q.correctOptionLabel || q.correctAnswer || q.answerKey?.value || '')
      .trim()
      .toUpperCase();
    if (/^[A-E]$/.test(raw)) {
      expectedChoiceValue = raw;
      shortAnswerLabel = raw;
    }
  }

  const isPreliminary = status === 'official_preliminary';
  const isAdjusted = status === 'official_adjusted' || status === 'official_final_adjusted';

  let statusBadgeLabel = 'Sem gabarito vinculado';
  let statusTone: QuestionAnswerKeyInfo['statusTone'] = 'none';

  if (status === 'official_preliminary') {
    statusBadgeLabel = 'Gabarito oficial preliminar';
    statusTone = 'preliminary';
  } else if (status === 'official_final_adjusted') {
    statusBadgeLabel = q.answerKey?.previousValue
      ? `Definitivo (alterado de ${q.answerKey.previousValue} → ${shortAnswerLabel})`
      : 'Definitivo (alterado após recursos)';
    statusTone = 'adjusted';
  } else if (status === 'official_adjusted') {
    statusBadgeLabel = 'Alterado após recursos';
    statusTone = 'adjusted';
  } else if (status === 'official_final' || expectedChoiceValue) {
    statusBadgeLabel = 'Gabarito oficial definitivo';
    statusTone = 'final';
  }

  return {
    hasOfficialKey: Boolean(expectedChoiceValue),
    isAnnulled: false,
    isPreliminary,
    isAdjusted,
    expectedChoiceValue,
    shortAnswerLabel,
    statusBadgeLabel,
    statusTone,
    optionText: q.correctOptionText || null,
    sourcePdf: q.answerKey?.sourcePdf || null,
    sourcePage: q.answerKey?.sourcePage || null,
    sourceNote: q.answerKey?.sourceNote || null,
    adjustmentNote: q.answerKey?.adjustmentNote || null,
    previousValue: q.answerKey?.previousValue || null,
  };
}

export function normalizeAnswerToken(value: string, isCebraspe: boolean): string {
  const clean = value.trim().toUpperCase();
  if (!clean) return '';
  if (isCebraspe) {
    if (clean === 'C' || clean === 'CERTO') return 'CERTO';
    if (clean === 'E' || clean === 'ERRADO') return 'ERRADO';
  }
  return clean;
}

export function isAnswerMatchingGabarito(
  minhaResposta: string,
  gabarito: string,
  question?: QuestionRecord
): boolean {
  if (question?.isAnnulled || gabarito.trim().toUpperCase() === 'ANULADA') {
    return false;
  }
  const isCeb =
    question?.questionType === 'true_false' ||
    Boolean(question?.banca.toUpperCase().includes('CEBRASPE'));
  const nMine = normalizeAnswerToken(minhaResposta, isCeb);
  const nGab = normalizeAnswerToken(gabarito, isCeb);
  return Boolean(nMine && nGab && nMine === nGab);
}

export function buildExamSummaries(questions: QuestionRecord[]): ExamSummary[] {
  const map = new Map<string, ExamSummary>();
  for (const q of questions) {
    const existing = map.get(q.prova);
    if (!existing) {
      map.set(q.prova, {
        prova: q.prova,
        concursoCurto: q.concursoCurto,
        empresa: q.empresa,
        ano: q.ano,
        enfase: q.enfase,
        banca: q.banca,
        arquivoOrigem: q.arquivoOrigem,
        totalQuestoes: 1,
        diretoCount: q.vinculo === 'Direto' ? 1 : 0,
        correlatoCount: q.vinculo === 'Correlato' ? 1 : 0,
        isCustom: q.isCustom,
      });
    } else {
      existing.totalQuestoes++;
      if (q.vinculo === 'Direto') existing.diretoCount++;
      else existing.correlatoCount++;
    }
  }
  return Array.from(map.values());
}

export function filterQuestions(
  questions: QuestionRecord[],
  filters: LocatorFilters,
  performanceMap: Record<string, QuestionPerformance> = {}
): QuestionRecord[] {
  const qLower = filters.query.trim().toLowerCase();
  const numQuery = filters.questaoNumero.trim();

  const isAll = (val: string) => !val || val === 'Todas' || val === 'Todos';

  return questions.filter((item) => {
    if (!isAll(filters.empresa) && item.empresa !== filters.empresa) return false;
    if (!isAll(filters.prova) && item.prova !== filters.prova) return false;
    if (!isAll(filters.ano) && item.ano !== filters.ano) return false;
    if (!isAll(filters.enfase) && item.enfase !== filters.enfase) return false;
    if (!isAll(filters.banca) && item.banca !== filters.banca) return false;
    if (!isAll(filters.area) && item.areaOriginal !== filters.area) return false;
    if (!isAll(filters.grupo) && item.grupoEstudo !== filters.grupo) return false;
    if (!isAll(filters.vinculo) && item.vinculo !== filters.vinculo) return false;

    if (numQuery.length > 0 && String(item.questao) !== numQuery) {
      return false;
    }

    if (!isAll(filters.statusDesempenho)) {
      const perf = performanceMap[item.id]?.status || 'pendente';
      if (perf !== filters.statusDesempenho) return false;
    }

    if (qLower.length > 0) {
      const searchable = [
        item.prova,
        item.banca,
        String(item.questao),
        item.questionId || '',
        item.appLookupKey || '',
        item.areaOriginal,
        item.tema,
        item.grupoEstudo,
        item.codigoPrograma,
        item.conteudosSecundarios.join(' '),
        item.exigencia,
        item.arquivoOrigem,
        item.topicoEditalUnificado,
        item.contextText || '',
        item.statementWithoutNumber || '',
        item.correctOptionText || '',
        item.correctAnswer || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(qLower)) return false;
    }

    return true;
  });
}

export function calculatePareto(
  questions: QuestionRecord[],
  examFilter?: string
): ParetoRow[] {
  const subset =
    examFilter && examFilter !== 'Todas'
      ? questions.filter((q) => q.prova === examFilter)
      : questions;

  const total = subset.length;
  if (total === 0) return [];

  const groupsMap = new Map<
    string,
    {
      questoes: QuestionRecord[];
      porConcurso: Record<string, number>;
    }
  >();

  for (const q of subset) {
    const entry = groupsMap.get(q.grupoEstudo) || {
      questoes: [],
      porConcurso: {},
    };
    entry.questoes.push(q);
    entry.porConcurso[q.concursoCurto] = (entry.porConcurso[q.concursoCurto] || 0) + 1;
    groupsMap.set(q.grupoEstudo, entry);
  }

  const sorted = Array.from(groupsMap.entries())
    .map(([grupo, data]) => ({
      grupo,
      frequencia: data.questoes.length,
      percentual: (data.questoes.length / total) * 100,
      porConcurso: data.porConcurso,
      questoes: data.questoes,
    }))
    .sort((a, b) => b.frequencia - a.frequencia || a.grupo.localeCompare(b.grupo));

  let cumulative = 0;
  let crossed80 = false;

  return sorted.map((row, idx) => {
    cumulative += row.percentual;
    // Include the group that crosses 80% inside the vital 80% core (standard Pareto cutoff)
    const isNucleo80 = !crossed80 || idx === 0;
    if (cumulative >= 80) {
      crossed80 = true;
    }
    return {
      ...row,
      acumulado: Math.min(100, cumulative),
      isNucleo80,
    };
  });
}

export type RankingLevel = 'grupo' | 'area' | 'topico' | 'subtopico';

export function calculateRanking(
  questions: QuestionRecord[],
  level: RankingLevel,
  examFilter?: string
): RankingRow[] {
  const subset =
    examFilter && examFilter !== 'Todas'
      ? questions.filter((q) => q.prova === examFilter)
      : questions;

  const total = subset.length;
  if (total === 0) return [];

  const map = new Map<string, { questoes: QuestionRecord[]; provas: Set<string> }>();

  for (const q of subset) {
    let key = q.grupoEstudo;
    if (level === 'area') key = q.areaOriginal;
    else if (level === 'topico') key = q.topico;
    else if (level === 'subtopico') key = q.tema;

    const entry = map.get(key) || { questoes: [], provas: new Set<string>() };
    entry.questoes.push(q);
    entry.provas.add(q.prova);
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([label, data]) => ({
      label,
      frequencia: data.questoes.length,
      percentual: (data.questoes.length / total) * 100,
      concursosCount: data.provas.size,
      questoes: data.questoes,
    }))
    .sort((a, b) => b.frequencia - a.frequencia || a.label.localeCompare(b.label));
}

export function buildSyllabusIncidenceMap(
  questions: QuestionRecord[],
  mode: 'unificado' | 'codigo' = 'unificado'
): SyllabusIncidenceRow[] {
  const map = new Map<
    string,
    {
      titulo: string;
      categoria: string;
      provas: Set<string>;
      codigos: Set<string>;
      questoes: QuestionRecord[];
      direto: number;
      correlato: number;
    }
  >();

  for (const q of questions) {
    if (mode === 'unificado') {
      const key = q.topicoEditalUnificado;
      const entry = map.get(key) || {
        titulo: key,
        categoria: q.grupoEstudo,
        provas: new Set<string>(),
        codigos: new Set<string>(),
        questoes: [],
        direto: 0,
        correlato: 0,
      };
      entry.provas.add(q.concursoCurto);
      if (q.codigoPrograma) entry.codigos.add(q.codigoPrograma);
      q.conteudosSecundarios.forEach((c) => entry.codigos.add(c));
      entry.questoes.push(q);
      if (q.vinculo === 'Direto') entry.direto++;
      else entry.correlato++;
      map.set(key, entry);
    } else {
      const allCodes = [q.codigoPrograma, ...q.conteudosSecundarios].filter(Boolean);
      const uniqueCodes = Array.from(new Set(allCodes));
      for (const code of uniqueCodes) {
        const entry = map.get(code) || {
          titulo: `${code} — ${q.topicoEditalUnificado}`,
          categoria: q.concursoCurto,
          provas: new Set<string>(),
          codigos: new Set<string>([code]),
          questoes: [],
          direto: 0,
          correlato: 0,
        };
        entry.provas.add(q.concursoCurto);
        entry.questoes.push(q);
        if (q.vinculo === 'Direto') entry.direto++;
        else entry.correlato++;
        map.set(code, entry);
      }
    }
  }

  return Array.from(map.entries())
    .map(([id, data]) => ({
      id,
      titulo: data.titulo,
      categoria: data.categoria,
      provasCount: data.provas.size,
      questoesCount: data.questoes.length,
      vinculoDiretoCount: data.direto,
      vinculoCorrelatoCount: data.correlato,
      codigosRelacionados: Array.from(data.codigos).sort(),
      provasPresentes: Array.from(data.provas),
      questoes: data.questoes,
    }))
    .sort((a, b) => b.questoesCount - a.questoesCount || b.provasCount - a.provasCount);
}

export function createRecordsFromNewExam(payload: NewExamPayload): QuestionRecord[] {
  const concursoCurto = payload.prova.split('—')[0]?.trim() || payload.prova;
  return payload.questoes.map((q) => {
    const { topico, subtopico } = splitTopicSubtopic(q.tema);
    const conteudosSecundarios = q.conteudosSecundarios
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const topicoEditalUnificado = inferUnifiedSyllabusTopic(
      q.tema,
      q.areaOriginal,
      q.codigoPrograma,
      q.grupoEstudo,
      q.exigencia
    );

    return {
      id: `${payload.prova}::${q.questao}`,
      prova: payload.prova,
      concursoCurto,
      empresa: payload.empresa,
      ano: payload.ano,
      enfase: payload.enfase,
      banca: payload.banca,
      questao: q.questao,
      paginaPdf: q.paginaPdf,
      areaOriginal: q.areaOriginal,
      tema: q.tema,
      topico,
      subtopico,
      grupoEstudo: q.grupoEstudo,
      vinculo: q.vinculo,
      codigoPrograma: q.codigoPrograma,
      conteudosSecundarios,
      exigencia: q.exigencia,
      observacaoClassificacao: q.observacao || '',
      observacaoAnalise: q.observacao || '',
      arquivoOrigem: payload.arquivoOrigem,
      topicoEditalUnificado,
      isCustom: true,
    };
  });
}

export function getDefaultPerformanceStatus(
  map: Record<string, QuestionPerformance>,
  id: string
): PerformanceStatus {
  return map[id]?.status || 'pendente';
}

export function classifyCognitivePattern(q: QuestionRecord): CognitivePattern {
  const text = `${q.exigencia} ${q.tema}`.toLowerCase();
  if (
    /\b(calcular|determinar|converter|estimar|quantificar|somar|subtrair|equacionar|proporção|fração molar|rendimento|massa de|volume de|concentração|razão|cálculo|quantas|quanto)\b/.test(
      text
    ) ||
    /\b\d+(?:[.,]\d+)?\s*(mpa|kpa|°c|k|m\/s|mol|kg|ma|v|a|w|j|%)\b/.test(text)
  ) {
    return 'calculo';
  }
  if (
    /\b(analisar|avaliar|relacionar|aplicar|comparar|prever|verificar|interpretar|efeito|consequência|operação|malha|fluxo|processo|cavitação|sintonia|diagrama|comportamento|atuar)\b/.test(
      text
    )
  ) {
    return 'interpretacao';
  }
  return 'conceitual';
}

export function buildBoardComparison(
  questions: QuestionRecord[]
): BoardComparisonSummary {
  const ces = questions.filter((q) => q.banca.toUpperCase().includes('CESGRANRIO'));
  const ceb = questions.filter((q) => q.banca.toUpperCase().includes('CEBRASPE'));

  const pct = (count: number, total: number) => (total > 0 ? (count / total) * 100 : 0);

  const isPhysics = (q: QuestionRecord) =>
    [
      'Mecânica e Resistência dos Materiais',
      'Termologia e Termodinâmica',
      'Eletricidade e Eletromagnetismo',
      'Mecânica dos Fluidos',
      'Ondas e Radiações',
    ].includes(q.grupoEstudo) || q.areaOriginal.toLowerCase().includes('física');

  const isMechanics = (q: QuestionRecord) =>
    q.grupoEstudo === 'Mecânica e Resistência dos Materiais' ||
    q.grupoEstudo === 'Mecânica dos Fluidos';

  const makeMetric = (
    criterio: string,
    descricao: string,
    predicate: (q: QuestionRecord) => boolean
  ): BoardMetricComparison => {
    const cesQ = ces.filter(predicate);
    const cebQ = ceb.filter(predicate);
    return {
      criterio,
      descricao,
      cesgranrioCount: cesQ.length,
      cesgranrioPct: pct(cesQ.length, ces.length),
      cesgranrioQuestions: cesQ,
      cebraspeCount: cebQ.length,
      cebraspePct: pct(cebQ.length, ceb.length),
      cebraspeQuestions: cebQ,
    };
  };

  const criterios: BoardMetricComparison[] = [
    makeMetric(
      'Frequência de Química',
      'Grupo Química e Físico-Química (Geral, Inorgânica, Orgânica, Soluções, Termoquímica).',
      (q) => q.grupoEstudo === 'Química e Físico-Química'
    ),
    makeMetric(
      'Frequência de Física',
      'Termologia/Termodinâmica, Mecânica, Fluidos, Eletricidade e Ondas/Radiações.',
      isPhysics
    ),
    makeMetric(
      'Instrumentação',
      'Grupo Instrumentação, Medição e Controle (sensores, transmissores, metrologia, PID).',
      (q) => q.grupoEstudo === 'Instrumentação, Medição e Controle'
    ),
    makeMetric(
      'Termodinâmica',
      'Grupo Termologia e Termodinâmica (leis, ciclos, vapor, calorimetria, escalas).',
      (q) => q.grupoEstudo === 'Termologia e Termodinâmica'
    ),
    makeMetric(
      'Mecânica',
      'Mecânica clássica, Resistência dos Materiais e Mecânica dos Fluidos.',
      isMechanics
    ),
    makeMetric(
      'Equipamentos e Bombas',
      'Grupo Equipamentos, Tubulações e Bombas (centrífugas, válvulas, permutadores, caldeiras).',
      (q) => q.grupoEstudo === 'Equipamentos, Tubulações e Bombas'
    ),
  ];

  const patternDefs: { padrao: CognitivePattern; label: string }[] = [
    { padrao: 'calculo', label: 'Cálculo e aplicação quantitativa' },
    { padrao: 'conceitual', label: 'Cobrança conceitual e classificação' },
    { padrao: 'interpretacao', label: 'Interpretação de situações técnicas e processo' },
  ];

  const padroes = patternDefs.map((p) => {
    const cesQ = ces.filter((q) => classifyCognitivePattern(q) === p.padrao);
    const cebQ = ceb.filter((q) => classifyCognitivePattern(q) === p.padrao);
    return {
      padrao: p.padrao,
      label: p.label,
      cesgranrioCount: cesQ.length,
      cesgranrioPct: pct(cesQ.length, ces.length),
      cesgranrioQuestions: cesQ,
      cebraspeCount: cebQ.length,
      cebraspePct: pct(cebQ.length, ceb.length),
      cebraspeQuestions: cebQ,
    };
  });

  return {
    cesgranrioTotal: ces.length,
    cebraspeTotal: ceb.length,
    cesgranrioExams: Array.from(new Set(ces.map((q) => q.concursoCurto))),
    cebraspeExams: Array.from(new Set(ceb.map((q) => q.concursoCurto))),
    criterios,
    padroes,
  };
}

const CANONICAL_CHRONOLOGY: Record<string, number> = {
  'Transpetro 2018': 1,
  'Petrobras 2023.1': 2,
  'Petrobras 2023.2': 3,
  'Transpetro 2023.1': 4,
  'ANSA 2026': 5,
};

export function sortExamsChronologically(exams: ExamSummary[]): ExamSummary[] {
  return [...exams].sort((a, b) => {
    const ra = CANONICAL_CHRONOLOGY[a.concursoCurto];
    const rb = CANONICAL_CHRONOLOGY[b.concursoCurto];
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.ano.localeCompare(b.ano) || a.concursoCurto.localeCompare(b.concursoCurto);
  });
}

export function buildHistoricalEvolution(
  questions: QuestionRecord[],
  dimension: 'grupo' | 'edital' = 'grupo'
): HistoricalTopicEvolution[] {
  const chronologicalExams = sortExamsChronologically(buildExamSummaries(questions));
  if (chronologicalExams.length === 0) return [];

  const topicKeys = Array.from(
    new Set(
      questions.map((q) =>
        dimension === 'grupo' ? q.grupoEstudo : q.topicoEditalUnificado
      )
    )
  );

  return topicKeys
    .map((tema) => {
      const pontos: HistoricalPoint[] = chronologicalExams.map((ex) => {
        const matched = questions.filter(
          (q) =>
            q.prova === ex.prova &&
            (dimension === 'grupo' ? q.grupoEstudo : q.topicoEditalUnificado) === tema
        );
        return {
          prova: ex.prova,
          concursoCurto: ex.concursoCurto,
          empresa: ex.empresa,
          ano: ex.ano,
          banca: ex.banca,
          totalProva: ex.totalQuestoes,
          frequencia: matched.length,
          percentual: ex.totalQuestoes > 0 ? (matched.length / ex.totalQuestoes) * 100 : 0,
          questoes: matched,
        };
      });

      const totalGeral = pontos.reduce((acc, p) => acc + p.frequencia, 0);
      const splitIdx = Math.max(1, Math.floor(pontos.length / 2));
      const early = pontos.slice(0, splitIdx);
      const recent = pontos.slice(splitIdx);
      const avg = (arr: HistoricalPoint[]) =>
        arr.length > 0 ? arr.reduce((s, p) => s + p.percentual, 0) / arr.length : 0;

      const deltaPercentual = avg(recent) - avg(early);
      const tendencia: 'alta' | 'estavel' | 'queda' =
        deltaPercentual >= 1.5 ? 'alta' : deltaPercentual <= -1.5 ? 'queda' : 'estavel';

      return {
        tema,
        totalGeral,
        pontos,
        deltaPercentual,
        tendencia,
      };
    })
    .sort((a, b) => b.totalGeral - a.totalGeral || a.tema.localeCompare(b.tema));
}

export function buildCommonAndExclusiveMatrix(
  questions: QuestionRecord[],
  level: 'topico' | 'edital' | 'grupo' = 'topico'
): { empresas: string[]; provas: string[]; rows: CommonExclusiveRow[] } {
  const chronologicalExams = sortExamsChronologically(buildExamSummaries(questions));
  const provas = chronologicalExams.map((e) => e.concursoCurto);
  const empresas = Array.from(new Set(chronologicalExams.map((e) => e.empresa)));

  const map = new Map<
    string,
    {
      porEmpresa: Record<string, QuestionRecord[]>;
      porProva: Record<string, QuestionRecord[]>;
      questoes: QuestionRecord[];
    }
  >();

  for (const q of questions) {
    const key =
      level === 'grupo'
        ? q.grupoEstudo
        : level === 'edital'
          ? q.topicoEditalUnificado
          : q.topico;

    const entry = map.get(key) || {
      porEmpresa: {},
      porProva: {},
      questoes: [],
    };
    entry.questoes.push(q);
    entry.porEmpresa[q.empresa] = entry.porEmpresa[q.empresa] || [];
    entry.porEmpresa[q.empresa].push(q);
    entry.porProva[q.concursoCurto] = entry.porProva[q.concursoCurto] || [];
    entry.porProva[q.concursoCurto].push(q);
    map.set(key, entry);
  }

  const classifyScope = (presentCount: number, totalBuckets: number): PresenceScope => {
    if (totalBuckets > 1 && presentCount >= totalBuckets) return 'todos';
    if (presentCount <= 1) return 'exclusivo';
    return 'varios';
  };

  const rows: CommonExclusiveRow[] = Array.from(map.entries())
    .map(([tema, data]) => {
      const empresasPresentes = empresas.filter(
        (emp) => (data.porEmpresa[emp]?.length || 0) > 0
      );
      const provasPresentes = provas.filter(
        (pr) => (data.porProva[pr]?.length || 0) > 0
      );
      return {
        tema,
        totalQuestoes: data.questoes.length,
        empresasPresentes,
        provasPresentes,
        scopeEmpresa: classifyScope(empresasPresentes.length, empresas.length),
        scopeProva: classifyScope(provasPresentes.length, provas.length),
        porEmpresa: data.porEmpresa,
        porProva: data.porProva,
        questoes: data.questoes,
      };
    })
    .sort(
      (a, b) =>
        b.empresasPresentes.length - a.empresasPresentes.length ||
        b.provasPresentes.length - a.provasPresentes.length ||
        b.totalQuestoes - a.totalQuestoes ||
        a.tema.localeCompare(b.tema)
    );

  return { empresas, provas, rows };
}

export interface EditalScopeOption {
  id: string;
  label: string;
  examPrefix?: string;
}

export function getAvailableEditalScopes(): EditalScopeOption[] {
  return [
    { id: 'ANSA_2026', label: 'ANSA 2026 — Ênfase 22: Operação (ANSA.BI–BIII)', examPrefix: 'ANSA 2026' },
    { id: 'PETRO_2023_1', label: 'Petrobras 2023.1 — Ênfase 7: Operação (B1–B3)', examPrefix: 'Petrobras 2023.1' },
    { id: 'PETRO_2023_2', label: 'Petrobras 2023.2 — Ênfase 8: Operação (B1–B3)', examPrefix: 'Petrobras 2023.2' },
    { id: 'TP_2023', label: 'Transpetro 2023.1 — Dutos e Terminais (TP23.01–37)', examPrefix: 'Transpetro 2023.1' },
    { id: 'TP_2018', label: 'Transpetro 2018 — Operação Júnior (T18.01–24)', examPrefix: 'Transpetro 2018' },
  ];
}

function buildExpectedCodesForEdital(editalId: string): { codigo: string; sibling?: string }[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (editalId === 'ANSA_2026') {
    const items: { codigo: string; sibling?: string }[] = [];
    for (let i = 1; i <= 17; i++) items.push({ codigo: `ANSA.BI.${pad(i)}`, sibling: `B1.${pad(i)}` });
    for (let i = 1; i <= 9; i++) items.push({ codigo: `ANSA.BII.${pad(i)}`, sibling: `B2.${pad(i)}` });
    for (let i = 1; i <= 6; i++) items.push({ codigo: `ANSA.BIII.${pad(i)}`, sibling: `B3.${pad(i)}` });
    return items;
  }
  if (editalId === 'PETRO_2023_1' || editalId === 'PETRO_2023_2') {
    const items: { codigo: string; sibling?: string }[] = [];
    for (let i = 1; i <= 17; i++) items.push({ codigo: `B1.${pad(i)}`, sibling: `ANSA.BI.${pad(i)}` });
    for (let i = 1; i <= 9; i++) items.push({ codigo: `B2.${pad(i)}`, sibling: `ANSA.BII.${pad(i)}` });
    for (let i = 1; i <= 6; i++) items.push({ codigo: `B3.${pad(i)}`, sibling: `ANSA.BIII.${pad(i)}` });
    return items;
  }
  if (editalId === 'TP_2023') {
    return Array.from({ length: 37 }, (_, i) => ({ codigo: `TP23.${pad(i + 1)}` }));
  }
  return Array.from({ length: 24 }, (_, i) => ({ codigo: `T18.${pad(i + 1)}` }));
}

export function buildSyllabusGapMap(
  questions: QuestionRecord[],
  editalId: string,
  customLines: string[] = []
): SyllabusGapRow[] {
  // Custom edital text matching mode
  if (editalId === 'CUSTOM' || customLines.length > 0) {
    return customLines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const stopWords = new Set(['para', 'com', 'dos', 'das', 'sobre', 'entre', 'pelo', 'pela', 'como']);
        const tokens = line
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !stopWords.has(w));

        const matched = questions.filter((q) => {
          const hay = `${q.tema} ${q.topicoEditalUnificado} ${q.exigencia} ${q.areaOriginal} ${q.codigoPrograma}`.toLowerCase();
          return tokens.some((t) => hay.includes(t));
        });

        const direto = matched.filter((q) => q.vinculo === 'Direto').length;
        const correlato = matched.length - direto;
        let status: SyllabusGapRow['status'] = 'cobrado';
        let recomendacao = 'Tópico com incidência histórica direta na base.';
        if (matched.length === 0) {
          status = 'nao_identificado';
          recomendacao = 'Nenhuma questão identificada na amostra; incluir no plano preventivo.';
        } else if (matched.length === 1 || direto === 0) {
          status = 'parcial';
          recomendacao = 'Cobertura pontual ou apenas correlata; revisar fundamentos completos.';
        } else if (matched.length <= 2) {
          status = 'aprofundamento';
          recomendacao = 'Amostra reduzida; aprofundar resolução de exercícios do edital.';
        }

        return {
          codigo: `ITEM.${String(idx + 1).padStart(2, '0')}`,
          titulo: line,
          status,
          questoesNaSelecao: matched,
          questoesEmOutrasProvas: [],
          vinculoDiretoCount: direto,
          vinculoCorrelatoCount: correlato,
          recomendacao,
        };
      });
  }

  const scope = getAvailableEditalScopes().find((s) => s.id === editalId) || getAvailableEditalScopes()[0];
  const expectedCodes = buildExpectedCodesForEdital(scope.id);
  const examQuestions = questions.filter((q) =>
    scope.examPrefix ? q.concursoCurto === scope.examPrefix : true
  );

  const matchByCode = (pool: QuestionRecord[], code: string) =>
    pool.filter(
      (q) => q.codigoPrograma === code || q.conteudosSecundarios.includes(code)
    );

  return expectedCodes.map(({ codigo, sibling }) => {
    const inExam = matchByCode(examQuestions, codigo);
    // Look across other exams using same code (e.g. B1.14 in Petrobras 2023.2) or sibling code
    const elsewhereSame = matchByCode(
      questions.filter((q) => q.concursoCurto !== scope.examPrefix),
      codigo
    );
    const elsewhereSibling = sibling ? matchByCode(questions, sibling) : [];
    const otherQuestions = Array.from(
      new Map([...elsewhereSame, ...elsewhereSibling].map((q) => [q.id, q])).values()
    );

    const sampleForTitle = inExam.length > 0 ? inExam : otherQuestions;
    const topics = Array.from(new Set(sampleForTitle.map((q) => q.topicoEditalUnificado)));
    const titulo =
      topics.length > 0
        ? topics.slice(0, 2).join(' / ')
        : `Item ${codigo} do programa oficial (sem questão catalogada na amostra)`;

    const direto = inExam.filter((q) => q.vinculo === 'Direto').length;
    const correlato = inExam.filter((q) => q.vinculo === 'Correlato').length;

    let status: SyllabusGapRow['status'] = 'cobrado';
    let recomendacao = 'Cobrança consolidada nesta prova.';

    if (inExam.length === 0) {
      status = 'nao_identificado';
      recomendacao =
        otherQuestions.length > 0
          ? `Não caiu nesta prova, mas possui ${otherQuestions.length} questão(ões) em provas correlatas (${Array.from(new Set(otherQuestions.map((q) => q.concursoCurto))).join(', ')}).`
          : 'Ainda não identificado na amostra de questões; lacuna prioritária para estudo preventivo.';
    } else if (correlato > 0 && direto === 0) {
      status = 'aprofundamento';
      recomendacao = 'Apareceu apenas por vínculo correlato; exige aprofundamento conceitual.';
    } else if (inExam.length === 1) {
      status = 'parcial';
      recomendacao =
        otherQuestions.length > 0
          ? 'Cobrança única nesta prova; reforçar com questões equivalentes de outros editais.'
          : 'Cobrança pontual (1 questão); revisar subtemas adjacentes do item.';
    } else if (correlato > 0) {
      status = 'aprofundamento';
      recomendacao = 'Inclui questão de fronteira/correlata; atenção às extensões do tópico.';
    }

    return {
      codigo,
      titulo,
      status,
      questoesNaSelecao: inExam,
      questoesEmOutrasProvas: otherQuestions,
      vinculoDiretoCount: direto,
      vinculoCorrelatoCount: correlato,
      recomendacao,
    };
  });
}

export function buildAdherenceAudit(
  questions: QuestionRecord[]
): AdherenceAuditRow[] {
  return questions.map((q) => {
    const obs = (q.observacaoClassificacao || q.observacaoAnalise || '').trim();
    const obsLower = obs.toLowerCase();

    let categoria: AdherenceCategory = 'direta';
    let justificativa =
      obs ||
      `Enquadramento direto no item ${q.codigoPrograma} (${q.topicoEditalUnificado}).`;

    if (!q.codigoPrograma || q.codigoPrograma === 'N/D') {
      categoria = 'sem_correspondencia';
      justificativa =
        obs || 'Questão sem código programático vinculado no edital informado.';
    } else if (q.vinculo === 'Correlato') {
      categoria = 'correlata';
      justificativa =
        obs ||
        `A questão exige conhecimento próximo ao item ${q.codigoPrograma}, porém fora da literalidade estrita do edital.`;
    } else if (
      obsLower.includes('também mobiliza') ||
      obsLower.includes('mecanismo cobrado') ||
      q.conteudosSecundarios.length >= 2
    ) {
      categoria = 'revisao';
      justificativa =
        obs ||
        `Mobiliza 3+ itens simultaneamente (${[q.codigoPrograma, ...q.conteudosSecundarios].join(' + ')}); recomenda-se validar o item predominante.`;
    }

    return {
      question: q,
      categoria,
      edital: `${q.empresa} ${q.ano} (${q.enfase})`,
      itemProgramatico: q.codigoPrograma || 'Sem código',
      justificativa,
    };
  });
}

// ============================================================================
// Module 11: Análise de Profundidade dos Assuntos
// ============================================================================

export function classifyDepthLevel(q: QuestionRecord): DepthLevel {
  const text = `${q.exigencia} ${q.tema}`.toLowerCase();
  if (
    /\b(calcular|determinar|converter|somar|subtrair|equacionar|estequiometria|balanço|rendimento|fração molar|fórmula|estrutura|configuração eletrônica|hibridização|isomeria|diagrama|tabela|lei de|stefan-boltzmann|razão|proporção)\b/.test(
      text
    )
  ) {
    return 'calculo_estrutura';
  }
  if (
    /\b(analisar|avaliar|aplicar|comparar|prever|relacionar|efeito|consequência|operação|processo|malha|cavitação|sintonia|comportamento)\b/.test(
      text
    )
  ) {
    return 'aplicacao';
  }
  return 'basico';
}

export function inferDepthSubtheme(
  q: QuestionRecord,
  focusArea?: string
): string {
  const hay = `${q.tema} ${q.exigencia} ${q.areaOriginal}`.toLowerCase();

  // Granular Química Orgânica taxonomy requested explicitly
  if (
    focusArea === 'Química Orgânica' ||
    q.areaOriginal.toLowerCase().includes('orgânica')
  ) {
    if (hay.includes('polímero') || hay.includes('polietileno') || hay.includes('polimerização')) {
      return 'Polímeros';
    }
    if (hay.includes('alcano') || hay.includes('alceno') || hay.includes('alcino') || hay.includes('eteno')) {
      return 'Alcanos e alcenos';
    }
    if (hay.includes('hidrocarboneto') || hay.includes('aromático') || hay.includes('petróleo') || hay.includes('combustão completa do n-heptano')) {
      return 'Hidrocarbonetos';
    }
    if (hay.includes('função') || hay.includes('amina') || hay.includes('carbonila') || hay.includes('álcool') || hay.includes('éster') || hay.includes('ácido carboxílico')) {
      return 'Funções orgânicas';
    }
    if (hay.includes('reação') || hay.includes('adição') || hay.includes('substituição') || hay.includes('eliminação') || hay.includes('oxidação')) {
      return 'Reações orgânicas';
    }
    if (hay.includes('cadeia') || hay.includes('estrutura') || hay.includes('forças intermoleculares') || hay.includes('massa molecular') || hay.includes('isomeria') || hay.includes('saturação')) {
      return 'Estrutura molecular e propriedades';
    }
    return q.topico || 'Outros tópicos orgânicos';
  }

  // Granular Química e Físico-Química general buckets
  if (q.grupoEstudo === 'Química e Físico-Química') {
    if (hay.includes('polímero') || hay.includes('hidrocarboneto') || hay.includes('alcano') || hay.includes('alceno') || hay.includes('orgânica') || hay.includes('carbonila') || hay.includes('amina')) {
      return 'Química Orgânica (Hidrocarbonetos, Polímeros e Funções)';
    }
    if (hay.includes('estequiometria') || hay.includes('massa molar') || hay.includes('rendimento')) {
      return 'Estequiometria e Cálculos de Reação';
    }
    if (hay.includes('equilíbrio') || hay.includes('le chatelier') || hay.includes('kps')) {
      return 'Equilíbrio Químico e Solubilidade (Kps)';
    }
    if (hay.includes('soluções') || hay.includes('solução') || hay.includes('coloid') || hay.includes('dispers') || hay.includes('concentração') || hay.includes('fração molar')) {
      return 'Soluções, Concentrações e Sistemas Dispersos';
    }
    if (hay.includes('oxirredução') || hay.includes('oxidação') || hay.includes('redox') || hay.includes('nox') || hay.includes('corrosão')) {
      return 'Oxirredução, Eletroquímica e Corrosão';
    }
    if (hay.includes('ácido') || hay.includes('base') || hay.includes('neutralização') || hay.includes('ph') || hay.includes('brønsted')) {
      return 'Ácidos, Bases, pH e Neutralização';
    }
    if (hay.includes('entalpia') || hay.includes('combustão') || hay.includes('termoquímica') || hay.includes('exotérmica')) {
      return 'Termoquímica e Entalpia de Reação';
    }
    if (hay.includes('átomo') || hay.includes('atômico') || hay.includes('ligação') || hay.includes('periódica') || hay.includes('elétron')) {
      return 'Estrutura Atômica e Ligações Químicas';
    }
    return q.topico;
  }

  return q.topico || q.tema;
}

export function buildSubjectDepthAnalysis(
  questions: QuestionRecord[],
  grupoFilter: string,
  subFilter?: string
): { total: number; rows: SubtopicDepthRow[] } {
  let subset =
    grupoFilter && grupoFilter !== 'Todos'
      ? questions.filter((q) => q.grupoEstudo === grupoFilter)
      : questions;

  if (subFilter === 'Química Orgânica') {
    subset = subset.filter((q) =>
      q.areaOriginal.toLowerCase().includes('orgânica') ||
      /polímero|hidrocarboneto|alcano|alceno|eteno|amina|carbonila|cadeia carbônica/i.test(
        `${q.tema} ${q.exigencia}`
      )
    );
  }

  const total = subset.length;
  if (total === 0) return { total: 0, rows: [] };

  const map = new Map<
    string,
    {
      questoes: QuestionRecord[];
      basico: number;
      aplicacao: number;
      calculoEstrutura: number;
    }
  >();

  for (const q of subset) {
    const key = inferDepthSubtheme(q, subFilter);
    const depth = classifyDepthLevel(q);
    const entry = map.get(key) || {
      questoes: [],
      basico: 0,
      aplicacao: 0,
      calculoEstrutura: 0,
    };
    entry.questoes.push(q);
    if (depth === 'basico') entry.basico++;
    else if (depth === 'aplicacao') entry.aplicacao++;
    else entry.calculoEstrutura++;
    map.set(key, entry);
  }

  const rows: SubtopicDepthRow[] = Array.from(map.entries())
    .map(([subtema, data]) => ({
      subtema,
      total: data.questoes.length,
      percentualNoGrupo: (data.questoes.length / total) * 100,
      basicoCount: data.basico,
      aplicacaoCount: data.aplicacao,
      calculoEstruturaCount: data.calculoEstrutura,
      questoes: data.questoes,
    }))
    .sort((a, b) => b.total - a.total || a.subtema.localeCompare(b.subtema));

  return { total, rows };
}

// ============================================================================
// Module 12: Classificação do Tipo de Raciocínio Exigido
// ============================================================================

export const REASONING_DEFINITIONS: {
  tipo: ReasoningType;
  label: string;
  exemplo: string;
}[] = [
  {
    tipo: 'conceitual',
    label: 'Conceitual',
    exemplo: 'Definir um fenômeno ou distinguir propriedades fundamentais',
  },
  {
    tipo: 'calculo',
    label: 'Cálculo',
    exemplo: 'Aplicar fórmulas, conversões e relações quantitativas',
  },
  {
    tipo: 'interpretacao',
    label: 'Interpretação',
    exemplo: 'Analisar enunciados, gráficos, tabelas ou diagramas',
  },
  {
    tipo: 'aplicacao',
    label: 'Aplicação',
    exemplo: 'Resolver uma situação industrial ou de processo operacional',
  },
  {
    tipo: 'identificacao',
    label: 'Identificação',
    exemplo: 'Reconhecer equipamentos, instrumentos e componentes',
  },
  {
    tipo: 'relacao_conceitos',
    label: 'Relação entre conceitos',
    exemplo: 'Associar duas ou mais matérias ou itens do edital',
  },
  {
    tipo: 'analise_afirmacoes',
    label: 'Análise de afirmações',
    exemplo: 'Julgar proposições técnicas como certas ou erradas',
  },
];

export function classifyReasoningType(
  q: QuestionRecord,
  overrides: Record<string, ReasoningType> = {}
): ReasoningType {
  if (overrides[q.id]) return overrides[q.id];

  const text = `${q.exigencia} ${q.tema}`.toLowerCase();

  // 1. Cálculo
  if (
    /\b(calcular|determinar|converter|somar|subtrair|equacionar|fração molar|rendimento|massa de|volume de|concentração|razão entre|ponto de coincidência|balanço de energia)\b/.test(
      text
    ) ||
    /\b\d+(?:[.,]\d+)?\s*(mpa|kpa|°c|k|m\/s|mol|kg|ma|v|a|w|j|%)\b/.test(text)
  ) {
    return 'calculo';
  }

  // 2. Relação entre conceitos (cross-syllabus or multi-topic bridge)
  if (
    q.conteudosSecundarios.length > 0 ||
    /\b(associar|combinando|também mobiliza|relacionar .* com |relacionar .* à )\b/.test(
      `${text} ${q.observacaoClassificacao}`.toLowerCase()
    )
  ) {
    return 'relacao_conceitos';
  }

  // 3. Identificação de equipamentos e instrumentos
  if (
    /\b(identificar|reconhecer|classificar|função de|distinguir)\b/.test(text) &&
    /\b(bomba|válvula|transmissor|paquímetro|rotâmetro|bourdon|atuador|impelidor|caldeira|permutador|flange|mancal|engrenagem|termômetro|instrumento|sensor|tubulação|tubo|equipamento)\b/.test(
      text
    )
  ) {
    return 'identificacao';
  }

  // 4. Aplicação industrial / operacional
  if (
    /\b(aplicar|resolver|controlar|prever|reduzir|efeito|malha|pid|feedforward|cavitação|sintonia|operação|ciclo|compressão|refrigeração|processo|destilação|corrosão)\b/.test(
      text
    )
  ) {
    return 'aplicacao';
  }

  // 5. Análise de afirmações (CEBRASPE items focused on proposition checking)
  if (
    q.banca.toUpperCase().includes('CEBRASPE') &&
    /\b(avaliar|verificar|comparar|julgar|compatibilidade)\b/.test(text)
  ) {
    return 'analise_afirmacoes';
  }

  // 6. Interpretação de enunciado / diagramas / tabelas
  if (
    /\b(analisar|interpretar|diagrama|tabela|gráfico|leitura|comportamento|cenário|avaliar)\b/.test(
      text
    )
  ) {
    return 'interpretacao';
  }

  // 7. Conceitual (default)
  return 'conceitual';
}

export function buildReasoningBreakdown(
  questions: QuestionRecord[],
  overrides: Record<string, ReasoningType> = {}
): ReasoningClassificationRow[] {
  const total = questions.length;
  return REASONING_DEFINITIONS.map((def) => {
    const matched = questions.filter(
      (q) => classifyReasoningType(q, overrides) === def.tipo
    );
    return {
      tipo: def.tipo,
      label: def.label,
      exemplo: def.exemplo,
      total: matched.length,
      percentual: total > 0 ? (matched.length / total) * 100 : 0,
      cesgranrioCount: matched.filter((q) =>
        q.banca.toUpperCase().includes('CESGRANRIO')
      ).length,
      cebraspeCount: matched.filter((q) =>
        q.banca.toUpperCase().includes('CEBRASPE')
      ).length,
      questoes: matched,
    };
  });
}

// ============================================================================
// Module 13: Engenharia das Questões e Análise de Distratores
// ============================================================================

export const DISTRACTOR_MECHANISMS: {
  id: DistractorMechanism;
  label: string;
  descricao: string;
}[] = [
  {
    id: 'confusao_semelhantes',
    label: 'Confusão entre conceitos semelhantes',
    descricao:
      'Explora fronteiras próximas: calor × temperatura × energia interna, precisão × exatidão, pressão absoluta × manométrica.',
  },
  {
    id: 'troca_unidades',
    label: 'Troca de unidades',
    descricao:
      'Conversões críticas entre °C/K/°F, MPa/Pa/bar/psi, mol/massa ou intervalos vs valores absolutos.',
  },
  {
    id: 'inversao_conceitos',
    label: 'Inversão de conceitos',
    descricao:
      'Troca causa/efeito, direta/inversa, ação do controlador, oxidação/redução ou sentido de deslocamento de equilíbrio.',
  },
  {
    id: 'formula_incorreta',
    label: 'Fórmulas aplicadas incorretamente',
    descricao:
      'Uso de temperaturas em °C em Carnot/gases ideais, erro de expoente em Stefan-Boltzmann ou calor sensível vs latente.',
  },
  {
    id: 'pegadinha_conceitual',
    label: 'Pegadinhas conceituais',
    descricao:
      'Detalhes sutis de definição (ex.: rendimento máximo de Carnot ≠ 100%, zero absoluto, cavitação por pressão de vapor).',
  },
  {
    id: 'generalizacao_indevida',
    label: 'Generalizações indevidas',
    descricao:
      'Estende uma regra válida apenas em regime específico (ex.: gás ideal, processo isotérmico) para qualquer condição.',
  },
  {
    id: 'parcialmente_correta',
    label: 'Alternativas com conceitos parcialmente corretos',
    descricao:
      'Afirmação ou alternativa com primeira metade verdadeira e conclusão ou condição falsa (típico CESGRANRIO/CEBRASPE).',
  },
  {
    id: 'afirmacao_absoluta',
    label: 'Afirmações absolutas',
    descricao:
      'Uso de termos restritivos ("sempre", "nunca", "exclusivamente", "todos", "somente") invalidando o item no CEBRASPE.',
  },
];

export function buildDistractorRadar(
  questions: QuestionRecord[]
): DistractorRadarRow[] {
  const hay = (q: QuestionRecord) =>
    `${q.tema} ${q.exigencia} ${q.observacaoAnalise} ${q.observacaoClassificacao}`.toLowerCase();

  const rules: Record<DistractorMechanism, (q: QuestionRecord) => boolean> = {
    confusao_semelhantes: (q) =>
      /\b(calor|temperatura|energia interna|precisão|exatidão|repetibilidade|histerese|pressão absoluta|pressão de vapor|manométrica|distinguir|diferenciar|intervalo)\b/.test(
        hay(q)
      ),
    troca_unidades: (q) =>
      /\b(converter|conversão|celsius|kelvin|fahrenheit|mpa|kpa|bar|psi|sistema internacional|unidades|escala|intervalo\/variação)\b/.test(
        hay(q)
      ),
    inversao_conceitos: (q) =>
      /\b(invers|sentidos opostos|le chatelier|oxidação|redução|direta|reversa|equilíbrio|ação|atuador|deslocamento)\b/.test(
        hay(q)
      ),
    formula_incorreta: (q) =>
      /\b(carnot|stefan-boltzmann|boyle|charles|gay-lussac|bernoulli|primeira lei|rendimento|coeficiente de eficácia|calor sensível|latente|estequiometria)\b/.test(
        hay(q)
      ),
    pegadinha_conceitual: (q) =>
      /\b(zero absoluto|100%|cavitação|vácuo|coloid|tyndall|brønsted|espalhamento|regime estacionário|fluxo único)\b/.test(
        hay(q)
      ),
    generalizacao_indevida: (q) =>
      /\b(gás ideal|isotérmic|adiabátic|isocóric|isobáric|padrões de referência|propriedades físicas)\b/.test(
        hay(q)
      ),
    parcialmente_correta: (q) =>
      q.banca.toUpperCase().includes('CESGRANRIO') &&
      /\b(identificar|distinguir|reconhecer|classificar)\b/.test(hay(q)),
    afirmacao_absoluta: (q) =>
      q.banca.toUpperCase().includes('CEBRASPE') &&
      /\b(avaliar|verificar|reconhecer|distinguir|sempre|único|somente)\b/.test(
        hay(q)
      ),
  };

  return DISTRACTOR_MECHANISMS.map((m) => ({
    mecanismo: m.id,
    label: m.label,
    descricao: m.descricao,
    questoesCandidatas: questions.filter(rules[m.id]),
  }));
}

export interface TextTrapDetection {
  mecanismo: DistractorMechanism;
  label: string;
  trechosEncontrados: string[];
}

export function analyzePastedTextTraps(rawText: string): TextTrapDetection[] {
  const text = rawText.trim();
  if (!text) return [];
  const detections: TextTrapDetection[] = [];

  const collectMatches = (regex: RegExp): string[] => {
    const matches = text.match(regex) || [];
    return Array.from(new Set(matches.map((m) => m.trim())));
  };

  const absolutes = collectMatches(
    /\b(sempre|nunca|jamais|exclusivamente|somente|apenas|todos os|todas as|nenhum|nenhuma|independentemente)\b/gi
  );
  if (absolutes.length > 0) {
    detections.push({
      mecanismo: 'afirmacao_absoluta',
      label: 'Afirmações absolutas (sinal de alerta CEBRASPE)',
      trechosEncontrados: absolutes,
    });
  }

  const units = collectMatches(
    /\b(°C|°F|Kelvin|K\b|MPa|kPa|Pa\b|bar|psi|atm|mmHg|mA|kW|MW|J\/kg|mol\/L)\b/g
  );
  if (units.length >= 2) {
    detections.push({
      mecanismo: 'troca_unidades',
      label: 'Múltiplas unidades detectadas (risco de troca de escala/unidade)',
      trechosEncontrados: units,
    });
  }

  const confused = collectMatches(
    /\b(calor|temperatura|energia interna|entalpia|pressão absoluta|pressão manométrica|pressão de vapor|precisão|exatidão|erro sistemático|erro aleatório)\b/gi
  );
  if (confused.length >= 2) {
    detections.push({
      mecanismo: 'confusao_semelhantes',
      label: 'Pares conceituais próximos no enunciado/alternativas',
      trechosEncontrados: confused,
    });
  }

  const inversions = collectMatches(
    /\b(exceto|incorreto|incorreta|errado|não se aplica|inversamente proporcional|proporcional ao quadrado|diminui|aumenta)\b/gi
  );
  if (inversions.length > 0) {
    detections.push({
      mecanismo: 'inversao_conceitos',
      label: 'Termos de inversão, negação ou relação direcional',
      trechosEncontrados: inversions,
    });
  }

  return detections;
}

// ============================================================================
// Module 14: Painel de Desempenho Individual
// ============================================================================

export function filterOriginalBankScoringAttempts(
  attempts: StudentAttemptRecord[]
): StudentAttemptRecord[] {
  return attempts.filter(
    (att) =>
      (att.source === 'original_bank' || att.id.startsWith('orig-')) &&
      (att.status === 'acerto' || att.status === 'erro')
  );
}

export function resolveEffectiveAttempts(
  questions: QuestionRecord[],
  performanceMap: Record<string, QuestionPerformance>,
  attempts: StudentAttemptRecord[]
): ResolvedAttemptRow[] {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const resolved: ResolvedAttemptRow[] = [];
  const coveredQuestionIds = new Set<string>();

  for (const att of attempts) {
    const q = qMap.get(att.questionId);
    if (!q) continue;
    coveredQuestionIds.add(q.id);
    resolved.push({ attempt: att, question: q });
  }

  // Merge any direct performanceMap statuses logged via the drawer/module 6 that don't have an attempt entry yet
  for (const q of questions) {
    if (coveredQuestionIds.has(q.id)) continue;
    const perf = performanceMap[q.id];
    if (!perf || perf.status === 'pendente') continue;
    resolved.push({
      question: q,
      attempt: {
        id: `sync-${q.id}`,
        questionId: q.id,
        minhaResposta: perf.minhaResposta || (perf.status === 'acerto' ? 'Acertou' : perf.status === 'erro' ? 'Errou' : 'Revisar'),
        gabarito: perf.gabarito || '—',
        status: perf.status,
        timeSeconds: perf.timeSeconds,
        confianca: perf.confianca || 'media',
        dificuldade: perf.dificuldade || 'media',
        revisaoNecessaria: perf.revisaoNecessaria ?? perf.status === 'revisar',
        notes: perf.notes,
        answeredAt: perf.answeredAt || perf.updatedAt || new Date().toISOString(),
      },
    });
  }

  return resolved.sort(
    (a, b) =>
      b.attempt.answeredAt.localeCompare(a.attempt.answeredAt) ||
      a.question.questao - b.question.questao
  );
}

function aggregateBuckets(
  rows: ResolvedAttemptRow[],
  getKey: (q: QuestionRecord) => { key: string; parentGrupo?: string }
): PerformanceBucketRow[] {
  const map = new Map<
    string,
    {
      parentGrupo?: string;
      total: number;
      acertos: number;
      erros: number;
      revisar: number;
      timeSum: number;
      timeCount: number;
      erradas: Map<string, QuestionRecord>;
      todas: Map<string, QuestionRecord>;
    }
  >();

  for (const { attempt, question } of rows) {
    const { key, parentGrupo } = getKey(question);
    const entry = map.get(key) || {
      parentGrupo,
      total: 0,
      acertos: 0,
      erros: 0,
      revisar: 0,
      timeSum: 0,
      timeCount: 0,
      erradas: new Map<string, QuestionRecord>(),
      todas: new Map<string, QuestionRecord>(),
    };
    entry.total++;
    entry.todas.set(question.id, question);
    if (attempt.status === 'acerto') entry.acertos++;
    else if (attempt.status === 'erro') {
      entry.erros++;
      entry.erradas.set(question.id, question);
    } else if (attempt.status === 'revisar') {
      entry.revisar++;
      entry.erradas.set(question.id, question);
    }
    if (typeof attempt.timeSeconds === 'number' && attempt.timeSeconds > 0) {
      entry.timeSum += attempt.timeSeconds;
      entry.timeCount++;
    }
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([label, d]) => {
      const denom = d.acertos + d.erros > 0 ? d.acertos + d.erros : d.total;
      return {
        label,
        parentGrupo: d.parentGrupo,
        totalRespondidas: d.total,
        acertos: d.acertos,
        erros: d.erros,
        revisar: d.revisar,
        taxaAcerto: denom > 0 ? (d.acertos / denom) * 100 : 0,
        tempoMedioSeg: d.timeCount > 0 ? Math.round(d.timeSum / d.timeCount) : null,
        questoesErradas: Array.from(d.erradas.values()),
        questoesTodas: Array.from(d.todas.values()),
      };
    })
    .sort((a, b) => b.totalRespondidas - a.totalRespondidas || a.label.localeCompare(b.label));
}

export function buildStudentPerformanceSummary(
  questions: QuestionRecord[],
  performanceMap: Record<string, QuestionPerformance>,
  attempts: StudentAttemptRecord[]
): StudentPerformanceSummary {
  const historicoOrdenado = resolveEffectiveAttempts(questions, performanceMap, attempts);
  const uniqueIds = new Set(historicoOrdenado.map((r) => r.question.id));

  let totalAcertos = 0;
  let totalErros = 0;
  let totalRevisar = 0;
  let timeSum = 0;
  let timeCount = 0;

  for (const { attempt } of historicoOrdenado) {
    if (attempt.status === 'acerto') totalAcertos++;
    else if (attempt.status === 'erro') totalErros++;
    else if (attempt.status === 'revisar') totalRevisar++;
    if (typeof attempt.timeSeconds === 'number' && attempt.timeSeconds > 0) {
      timeSum += attempt.timeSeconds;
      timeCount++;
    }
  }

  const denomGeral =
    totalAcertos + totalErros > 0 ? totalAcertos + totalErros : historicoOrdenado.length;
  const taxaAcertoGeral = denomGeral > 0 ? (totalAcertos / denomGeral) * 100 : 0;

  const porMateria = aggregateBuckets(historicoOrdenado, (q) => ({
    key: q.grupoEstudo,
  }));

  const porSubtopico = aggregateBuckets(historicoOrdenado, (q) => ({
    key: q.subtopico || q.topico,
    parentGrupo: q.grupoEstudo,
  }));

  // Detect blind spots: subtopics with low accuracy even when parent subject looks strong
  const materiaRateMap = new Map(porMateria.map((m) => [m.label, m.taxaAcerto]));
  const pontosCegos: BlindSpotSubtopicRow[] = [];
  for (const sub of porSubtopico) {
    if (!sub.parentGrupo) continue;
    const matRate = materiaRateMap.get(sub.parentGrupo) ?? 0;
    const isBelowHalf = sub.taxaAcerto <= 55 && (sub.erros > 0 || sub.revisar > 0);
    const significantDrop = matRate - sub.taxaAcerto >= 20 && sub.erros > 0;
    if (isBelowHalf || significantDrop) {
      pontosCegos.push({
        subtopico: sub.label,
        materia: sub.parentGrupo,
        taxaSubtopico: sub.taxaAcerto,
        taxaMateria: matRate,
        acertos: sub.acertos,
        totalRespondidas: sub.totalRespondidas,
        questoesErradas: sub.questoesErradas,
      });
    }
  }
  pontosCegos.sort((a, b) => a.taxaSubtopico - b.taxaSubtopico || b.totalRespondidas - a.totalRespondidas);

  const porBanca = aggregateBuckets(historicoOrdenado, (q) => ({
    key: q.banca,
  }));

  const porConcurso = aggregateBuckets(historicoOrdenado, (q) => ({
    key: q.concursoCurto,
  }));

  // Error recurrence by tema
  const themeMap = new Map<
    string,
    {
      grupoEstudo: string;
      errosCount: number;
      tentativasTotais: number;
      bancas: Set<string>;
      questoes: Map<string, QuestionRecord>;
    }
  >();

  for (const { attempt, question } of historicoOrdenado) {
    const entry = themeMap.get(question.tema) || {
      grupoEstudo: question.grupoEstudo,
      errosCount: 0,
      tentativasTotais: 0,
      bancas: new Set<string>(),
      questoes: new Map<string, QuestionRecord>(),
    };
    entry.tentativasTotais++;
    if (attempt.status === 'erro' || attempt.status === 'revisar') {
      entry.errosCount++;
      entry.bancas.add(question.banca);
      entry.questoes.set(question.id, question);
    }
    themeMap.set(question.tema, entry);
  }

  const reincidenciaErros: ErrorRecurrenceRow[] = Array.from(themeMap.entries())
    .filter(([, d]) => d.errosCount > 0)
    .map(([tema, d]) => ({
      tema,
      grupoEstudo: d.grupoEstudo,
      errosCount: d.errosCount,
      tentativasTotais: d.tentativasTotais,
      taxaErro: (d.errosCount / d.tentativasTotais) * 100,
      bancas: Array.from(d.bancas),
      questoes: Array.from(d.questoes.values()),
    }))
    .sort((a, b) => b.errosCount - a.errosCount || b.taxaErro - a.taxaErro);

  // Chronological timeline grouped by YYYY-MM-DD
  const dateMap = new Map<string, { resp: number; acertos: number; erros: number }>();
  for (const { attempt } of [...historicoOrdenado].reverse()) {
    const dateKey = (attempt.answeredAt || '').slice(0, 10) || '2026-01-01';
    const d = dateMap.get(dateKey) || { resp: 0, acertos: 0, erros: 0 };
    d.resp++;
    if (attempt.status === 'acerto') d.acertos++;
    else if (attempt.status === 'erro') d.erros++;
    dateMap.set(dateKey, d);
  }

  const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cumAcertos = 0;
  let cumDenom = 0;
  const evolucaoTemporal: PerformanceTimelinePoint[] = sortedDates.map(([dateKey, d]) => {
    const denom = d.acertos + d.erros > 0 ? d.acertos + d.erros : d.resp;
    cumAcertos += d.acertos;
    cumDenom += denom;
    const parts = dateKey.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;
    return {
      dateKey,
      label,
      respondidas: d.resp,
      acertos: d.acertos,
      erros: d.erros,
      taxaAcerto: denom > 0 ? (d.acertos / denom) * 100 : 0,
      taxaAcumulada: cumDenom > 0 ? (cumAcertos / cumDenom) * 100 : 0,
    };
  });

  return {
    totalTentativas: historicoOrdenado.length,
    questoesUnicasRespondidas: uniqueIds.size,
    totalAcertos,
    totalErros,
    totalRevisar,
    taxaAcertoGeral,
    tempoMedioSeg: timeCount > 0 ? Math.round(timeSum / timeCount) : null,
    porMateria,
    porSubtopico,
    pontosCegos,
    porBanca,
    porConcurso,
    reincidenciaErros,
    evolucaoTemporal,
    historicoOrdenado,
  };
}

// ============================================================================
// Module 15: Planejador Inteligente de Estudos e Simulados
// ============================================================================

export function buildSmartStudyPlan(
  questions: QuestionRecord[],
  performanceMap: Record<string, QuestionPerformance>,
  attempts: StudentAttemptRecord[],
  editalScopeId: string = 'ALL'
): StudyPlanBlock[] {
  if (questions.length === 0) return [];

  const paretoRows = calculatePareto(questions);
  const perfSummary = buildStudentPerformanceSummary(questions, performanceMap, attempts);
  const materiaPerfMap = new Map(perfSummary.porMateria.map((m) => [m.label, m]));

  // Latest attempt status per question
  const latestStatusByQ = new Map<string, PerformanceStatus>();
  for (const { attempt, question } of perfSummary.historicoOrdenado) {
    if (!latestStatusByQ.has(question.id)) {
      latestStatusByQ.set(question.id, attempt.status);
    }
  }
  for (const q of questions) {
    if (!latestStatusByQ.has(q.id) && performanceMap[q.id]) {
      latestStatusByQ.set(q.id, performanceMap[q.id].status);
    }
  }

  const scope = getAvailableEditalScopes().find((s) => s.id === editalScopeId);
  const gapRows =
    editalScopeId !== 'ALL' ? buildSyllabusGapMap(questions, editalScopeId) : [];

  const blocks: StudyPlanBlock[] = paretoRows.map((pRow) => {
    const qs = pRow.questoes;
    const provasPresentesCount = new Set(qs.map((q) => q.concursoCurto)).size;

    const editalMatchedQuestions = scope?.examPrefix
      ? qs.filter((q) => q.concursoCurto === scope.examPrefix)
      : qs;
    const itensNoEditalCount = new Set(
      editalMatchedQuestions.map((q) => q.codigoPrograma).filter(Boolean)
    ).size;

    const mPerf = materiaPerfMap.get(pRow.grupo);
    const taxaAcertoEstudante = mPerf ? mPerf.taxaAcerto : null;
    const errosQuestions = qs.filter((q) => latestStatusByQ.get(q.id) === 'erro');
    const revisarQuestions = qs.filter((q) => latestStatusByQ.get(q.id) === 'revisar');
    const pendentesQuestions = qs.filter(
      (q) => !latestStatusByQ.get(q.id) || latestStatusByQ.get(q.id) === 'pendente'
    );

    const errosCount = errosQuestions.length;
    const revisaoPendenteCount = revisarQuestions.length;
    const questoesNaoResolvidasCount = pendentesQuestions.length;

    // Subtopic blind spots within this group
    const subtopicBlindSpots = perfSummary.pontosCegos.filter(
      (b) => b.materia === pRow.grupo
    );

    // Compute combined priority score
    let score =
      pRow.percentual * 1.4 +
      (pRow.isNucleo80 ? 20 : 0) +
      provasPresentesCount * 3 +
      (itensNoEditalCount > 0 ? 12 : 0) +
      errosCount * 10 +
      revisaoPendenteCount * 7;

    if (taxaAcertoEstudante !== null) {
      if (taxaAcertoEstudante < 75) {
        score += (75 - taxaAcertoEstudante) * 0.6;
      } else if (
        taxaAcertoEstudante >= 85 &&
        errosCount === 0 &&
        subtopicBlindSpots.length === 0
      ) {
        score -= 15;
      }
    }

    let prioridade: StudyPriorityLevel = 'media';
    if (
      (pRow.isNucleo80 &&
        (taxaAcertoEstudante === null ||
          taxaAcertoEstudante < 80 ||
          errosCount > 0 ||
          subtopicBlindSpots.length > 0)) ||
      score >= 45
    ) {
      prioridade = 'alta';
    } else if (
      taxaAcertoEstudante !== null &&
      taxaAcertoEstudante >= 80 &&
      errosCount === 0 &&
      subtopicBlindSpots.length === 0 &&
      !pRow.isNucleo80
    ) {
      prioridade = 'manutencao';
    }

    const atividades: StudyActivity[] = [];

    // 1. Revision activities for errors / low-accuracy subtopics
    const subtopicErrors = new Map<string, QuestionRecord[]>();
    for (const q of [...errosQuestions, ...revisarQuestions]) {
      const sub = q.subtopico || q.topico;
      const arr = subtopicErrors.get(sub) || [];
      arr.push(q);
      subtopicErrors.set(sub, arr);
    }
    for (const [sub, errQs] of Array.from(subtopicErrors.entries()).slice(0, 2)) {
      atividades.push({
        id: `${pRow.grupo}-rev-${sub}`,
        tipo: 'revisar_erro',
        titulo: `Revisar ${sub}`,
        detalhe: `${errQs.length} questão(ões) com erro ou revisão pendente.`,
        questoesAlvo: errQs,
      });
    }

    // 2. High-incidence pending subtopics to practice
    const pendingBySub = new Map<string, QuestionRecord[]>();
    for (const q of pendentesQuestions) {
      const sub = q.subtopico || q.topico;
      const arr = pendingBySub.get(sub) || [];
      arr.push(q);
      pendingBySub.set(sub, arr);
    }
    const topPendingSubs = Array.from(pendingBySub.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    for (const [sub, pendQs] of topPendingSubs) {
      atividades.push({
        id: `${pRow.grupo}-pend-${sub}`,
        tipo: 'resolver_pendente',
        titulo: `Resolver questões de ${sub}`,
        detalhe: `${pendQs.length} questão(ões) ainda pendente(s) na amostra histórica.`,
        questoesAlvo: pendQs.slice(0, 5),
      });
    }

    // 3. Syllabus gap / correlato reinforcement when an edital is selected
    if (gapRows.length > 0) {
      const relatedGaps = gapRows.filter(
        (g) =>
          (g.status === 'nao_identificado' || g.status === 'aprofundamento' || g.status === 'parcial') &&
          [...g.questoesNaSelecao, ...g.questoesEmOutrasProvas].some(
            (q) => q.grupoEstudo === pRow.grupo
          )
      );
      if (relatedGaps.length > 0) {
        const gapQs = Array.from(
          new Map(
            relatedGaps
              .flatMap((g) => [...g.questoesNaSelecao, ...g.questoesEmOutrasProvas])
              .filter((q) => q.grupoEstudo === pRow.grupo)
              .map((q) => [q.id, q])
          ).values()
        );
        atividades.push({
          id: `${pRow.grupo}-gap-${editalScopeId}`,
          tipo: 'lacuna_edital',
          titulo: `Cobrir lacunas/correlatos do edital (${relatedGaps
            .slice(0, 2)
            .map((g) => g.codigo)
            .join(', ')})`,
          detalhe: `${relatedGaps.length} item(ns) do edital selecionado requerem reforço preventivo.`,
          questoesAlvo: gapQs.slice(0, 4),
        });
      }
    }

    // 4. Specific block simulado activity
    const simuladoTargets = [
      ...errosQuestions,
      ...revisarQuestions,
      ...pendentesQuestions,
      ...qs,
    ];
    const uniqueSimuladoTargets = Array.from(
      new Map(simuladoTargets.map((q) => [q.id, q])).values()
    ).slice(0, 5);

    atividades.push({
      id: `${pRow.grupo}-sim`,
      tipo: 'simulado_bloco',
      titulo: `Fazer simulado específico de ${pRow.grupo}`,
      detalhe: `Bloco misto priorizando erros recentes e itens de maior recorrência histórica.`,
      questoesAlvo: uniqueSimuladoTargets,
    });

    const parts: string[] = [
      `Concentração histórica de ${pRow.percentual.toFixed(1)}% (${pRow.frequencia} questões em ${provasPresentesCount} prova(s))`,
      pRow.isNucleo80 ? 'Núcleo Pareto 80/20' : 'Bloco Complementar (20%)',
    ];
    if (taxaAcertoEstudante !== null) {
      parts.push(`Seu acerto atual: ${taxaAcertoEstudante.toFixed(0)}%`);
    } else {
      parts.push('Sem questões respondidas ainda');
    }
    if (errosCount > 0 || revisaoPendenteCount > 0) {
      parts.push(`${errosCount} erro(s) e ${revisaoPendenteCount} revisão(ões)`);
    }

    return {
      grupo: pRow.grupo,
      prioridade,
      scorePrioridade: Math.round(score * 10) / 10,
      concentracaoHistoricaPct: pRow.percentual,
      frequenciaHistorica: pRow.frequencia,
      isNucleo80: pRow.isNucleo80,
      provasPresentesCount,
      itensNoEditalCount,
      taxaAcertoEstudante,
      errosCount,
      revisaoPendenteCount,
      questoesNaoResolvidasCount,
      justificativa: `${parts.join(' · ')}.`,
      atividades,
      questoesDoBloco: qs,
    };
  });

  return blocks.sort((a, b) => b.scorePrioridade - a.scorePrioridade);
}

export function generateCustomSimulado(
  questions: QuestionRecord[],
  config: SimuladoConfig,
  performanceMap: Record<string, QuestionPerformance> = {},
  attempts: StudentAttemptRecord[] = []
): QuestionRecord[] {
  let pool = questions.filter((q) => {
    if (config.banca !== 'Todas' && q.banca !== config.banca) return false;
    if (config.prova !== 'Todas' && q.concursoCurto !== config.prova) return false;
    if (config.grupo !== 'Todas' && q.grupoEstudo !== config.grupo) return false;
    if (config.dificuldade !== 'todas' && classifyDepthLevel(q) !== config.dificuldade) {
      return false;
    }
    return true;
  });

  const validPool = pool.filter((q) => !q.isAnnulled);
  if (validPool.length > 0) {
    pool = validPool;
  }

  if (pool.length === 0) return [];

  const statusMap = new Map<string, PerformanceStatus>();
  for (const att of attempts) {
    if (!statusMap.has(att.questionId)) statusMap.set(att.questionId, att.status);
  }
  for (const q of pool) {
    if (!statusMap.has(q.id) && performanceMap[q.id]) {
      statusMap.set(q.id, performanceMap[q.id].status);
    }
  }

  if (config.modo === 'pendentes') {
    const onlyPending = pool.filter(
      (q) => !statusMap.get(q.id) || statusMap.get(q.id) === 'pendente'
    );
    if (onlyPending.length > 0) pool = onlyPending;
  }

  const limit = Math.max(1, Math.min(config.quantidade, pool.length));

  if (config.modo === 'inteligente_pareto_erros') {
    const pareto = calculatePareto(questions);
    const coreGroups = new Set(pareto.filter((r) => r.isNucleo80).map((r) => r.grupo));
    const scored = [...pool].sort((a, b) => {
      const weight = (q: QuestionRecord) => {
        const st = statusMap.get(q.id);
        let w = 0;
        if (st === 'erro') w += 40;
        else if (st === 'revisar') w += 30;
        else if (!st || st === 'pendente') w += 20;
        if (coreGroups.has(q.grupoEstudo)) w += 10;
        if (q.vinculo === 'Direto') w += 3;
        return w;
      };
      return weight(b) - weight(a) || a.questao - b.questao;
    });
    return scored.slice(0, limit);
  }

  // 'equilibrado' or 'pendentes': round-robin across grupoEstudo so topics are evenly distributed
  const buckets = new Map<string, QuestionRecord[]>();
  for (const q of pool) {
    const arr = buckets.get(q.grupoEstudo) || [];
    arr.push(q);
    buckets.set(q.grupoEstudo, arr);
  }
  const bucketLists = Array.from(buckets.values());
  const selected: QuestionRecord[] = [];
  let idx = 0;
  while (selected.length < limit) {
    let addedInPass = false;
    for (const list of bucketLists) {
      if (idx < list.length && selected.length < limit) {
        selected.push(list[idx]);
        addedInPass = true;
      }
    }
    if (!addedInPass) break;
    idx++;
  }
  return selected;
}

// ============================================================================
// Backup & Restore JSON (Consistência Global)
// ============================================================================

const VALID_REASONING_TYPES = new Set<ReasoningType>([
  'conceitual',
  'calculo',
  'interpretacao',
  'aplicacao',
  'identificacao',
  'relacao_conceitos',
  'analise_afirmacoes',
]);

const VALID_PERF_STATUSES = new Set<PerformanceStatus>([
  'pendente',
  'acerto',
  'erro',
  'revisar',
]);

export function createBackupPayload(
  data: ExamIntelligenceBackupData
): ExamIntelligenceBackup {
  return {
    schema: 'central-inteligencia-provas-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      customQuestions: data.customQuestions.length,
      performanceEntries: Object.keys(data.performanceMap).length,
      studentAttempts: data.studentAttempts.length,
      reasoningOverrides: Object.keys(data.reasoningOverrides).length,
      distractorStudies: Object.keys(data.studiesMap).length,
    },
    data: {
      customQuestions: data.customQuestions,
      performanceMap: data.performanceMap,
      studentAttempts: data.studentAttempts,
      reasoningOverrides: data.reasoningOverrides,
      studiesMap: data.studiesMap,
    },
  };
}

export function parseAndReconcileBackup(
  rawJson: string,
  baseQuestions: QuestionRecord[]
): BackupRestoreResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('O arquivo selecionado não contém um JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Estrutura de backup inválida.');
  }

  const record = parsed as Record<string, unknown>;
  if (record.schema !== 'central-inteligencia-provas-backup') {
    throw new Error(
      'Arquivo incompatível: este JSON não é um backup da Central de Inteligência de Provas.'
    );
  }
  if (record.version !== 1 || !record.data || typeof record.data !== 'object') {
    throw new Error('Versão ou bloco de dados do backup incompatível.');
  }

  const rawData = record.data as Record<string, unknown>;
  let skippedOrphans = 0;

  // 1. Validate customQuestions (deduplicated by id)
  const rawCustom = Array.isArray(rawData.customQuestions)
    ? rawData.customQuestions
    : [];
  const customMap = new Map<string, QuestionRecord>();
  for (const item of rawCustom) {
    if (!item || typeof item !== 'object') continue;
    const q = item as QuestionRecord;
    if (
      typeof q.id === 'string' &&
      q.id.trim() &&
      typeof q.prova === 'string' &&
      typeof q.questao === 'number' &&
      Number.isFinite(q.questao) &&
      typeof q.tema === 'string' &&
      typeof q.grupoEstudo === 'string'
    ) {
      customMap.set(q.id, { ...q, isCustom: true });
    }
  }
  const customQuestions = Array.from(customMap.values());

  // 2. Build authoritative set of valid question IDs (base + restored custom exams)
  const validIds = new Set<string>([
    ...baseQuestions.map((q) => q.id),
    ...customQuestions.map((q) => q.id),
  ]);
  const enforceRefCheck = baseQuestions.length > 0 || customQuestions.length > 0;

  // 3. Validate and deduplicate studentAttempts
  const rawAttempts = Array.isArray(rawData.studentAttempts)
    ? rawData.studentAttempts
    : [];
  const attemptMap = new Map<string, StudentAttemptRecord>();
  for (const item of rawAttempts) {
    if (!item || typeof item !== 'object') continue;
    const a = item as StudentAttemptRecord;
    if (
      typeof a.id !== 'string' ||
      typeof a.questionId !== 'string' ||
      !VALID_PERF_STATUSES.has(a.status) ||
      (a.status as PerformanceStatus) === 'pendente'
    ) {
      continue;
    }
    if (enforceRefCheck && !validIds.has(a.questionId)) {
      skippedOrphans++;
      continue;
    }
    attemptMap.set(a.id, {
      ...a,
      minhaResposta: typeof a.minhaResposta === 'string' ? a.minhaResposta : '—',
      gabarito: typeof a.gabarito === 'string' ? a.gabarito : '—',
      confianca:
        a.confianca === 'alta' || a.confianca === 'baixa' ? a.confianca : 'media',
      dificuldade:
        a.dificuldade === 'facil' || a.dificuldade === 'dificil'
          ? a.dificuldade
          : 'media',
      revisaoNecessaria: Boolean(a.revisaoNecessaria),
      answeredAt:
        typeof a.answeredAt === 'string' && a.answeredAt
          ? a.answeredAt
          : new Date().toISOString(),
    });
  }
  const studentAttempts = Array.from(attemptMap.values()).sort((a, b) =>
    b.answeredAt.localeCompare(a.answeredAt)
  );

  // 4. Validate performanceMap & reconcile with latest studentAttempts
  const performanceMap: Record<string, QuestionPerformance> = {};
  const rawPerf =
    rawData.performanceMap && typeof rawData.performanceMap === 'object'
      ? (rawData.performanceMap as Record<string, unknown>)
      : {};

  for (const [qId, val] of Object.entries(rawPerf)) {
    if (enforceRefCheck && !validIds.has(qId)) {
      skippedOrphans++;
      continue;
    }
    if (!val || typeof val !== 'object') continue;
    const p = val as QuestionPerformance;
    if (!VALID_PERF_STATUSES.has(p.status)) continue;
    performanceMap[qId] = {
      ...p,
      updatedAt:
        typeof p.updatedAt === 'string' && p.updatedAt
          ? p.updatedAt
          : new Date().toISOString(),
    };
  }

  // Ensure performanceMap reflects the newest attempt for every questionId
  for (const att of studentAttempts) {
    const existing = performanceMap[att.questionId];
    const existingDate = existing?.answeredAt || existing?.updatedAt || '';
    if (!existing || att.answeredAt >= existingDate) {
      performanceMap[att.questionId] = {
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
  }

  // 5. Validate reasoningOverrides
  const reasoningOverrides: Record<string, ReasoningType> = {};
  const rawOverrides =
    rawData.reasoningOverrides && typeof rawData.reasoningOverrides === 'object'
      ? (rawData.reasoningOverrides as Record<string, unknown>)
      : {};
  for (const [qId, tipo] of Object.entries(rawOverrides)) {
    if (enforceRefCheck && !validIds.has(qId)) {
      skippedOrphans++;
      continue;
    }
    if (typeof tipo === 'string' && VALID_REASONING_TYPES.has(tipo as ReasoningType)) {
      reasoningOverrides[qId] = tipo as ReasoningType;
    }
  }

  // 6. Validate studiesMap
  const studiesMap: Record<string, QuestionEngineeringStudy> = {};
  const rawStudies =
    rawData.studiesMap && typeof rawData.studiesMap === 'object'
      ? (rawData.studiesMap as Record<string, unknown>)
      : {};
  for (const [qId, st] of Object.entries(rawStudies)) {
    if (enforceRefCheck && !validIds.has(qId)) {
      skippedOrphans++;
      continue;
    }
    if (!st || typeof st !== 'object') continue;
    const study = st as QuestionEngineeringStudy;
    if (typeof study.questionId === 'string' && Array.isArray(study.mecanismos)) {
      studiesMap[qId] = study;
    }
  }

  return {
    data: {
      customQuestions,
      performanceMap,
      studentAttempts,
      reasoningOverrides,
      studiesMap,
    },
    skippedOrphans,
    exportedAt:
      typeof record.exportedAt === 'string'
        ? record.exportedAt
        : new Date().toISOString(),
  };
}

// ============================================================================
// Knowledge Atlas (4-Level Real Hierarchy) & Heatmap Matrix Builders
// ============================================================================

function mostFrequentLabel(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const v of values) {
    const clean = v.trim();
    if (!clean) continue;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }
  let best = fallback;
  let bestCount = -1;
  for (const [label, c] of counts.entries()) {
    if (c > bestCount) {
      best = label;
      bestCount = c;
    }
  }
  return best;
}

function inferUnmatchedDiscipline(code: string): string {
  if (/^(ANSA\.BI|B1)\./i.test(code)) {
    return 'Bloco I — Itens sem questão na amostra';
  }
  if (/^(ANSA\.BII|B2)\./i.test(code)) {
    return 'Bloco II — Itens sem questão na amostra';
  }
  if (/^(ANSA\.BIII|B3)\./i.test(code)) {
    return 'Bloco III — Itens sem questão na amostra';
  }
  return 'Itens do edital sem questão na amostra';
}

function aggregateBranchStatus(children: KnowledgeAtlasNode[]): GapStatus {
  if (children.length === 0) return 'nao_identificado';
  const statuses = new Set(children.map((c) => c.status));
  if (statuses.size === 1) {
    return children[0].status;
  }
  if (statuses.has('nao_identificado')) {
    return 'parcial';
  }
  if (statuses.has('aprofundamento')) {
    return 'aprofundamento';
  }
  if (statuses.has('parcial')) {
    return 'parcial';
  }
  return 'cobrado';
}

function formatQuestionReference(q: QuestionRecord): string {
  return `${q.concursoCurto} · Q${q.questao} (Pág. ${q.paginaPdf})`;
}

function computeStatusForFilteredSlice(
  inSlice: QuestionRecord[],
  otherSlice: QuestionRecord[],
  originalStatus: GapStatus,
  hasActiveExamOrBoardFilter: boolean
): GapStatus {
  if (!hasActiveExamOrBoardFilter) return originalStatus;
  if (inSlice.length === 0) return 'nao_identificado';
  const direto = inSlice.filter((q) => q.vinculo === 'Direto').length;
  const correlato = inSlice.length - direto;
  if (correlato > 0 && direto === 0) return 'aprofundamento';
  if (inSlice.length === 1) return 'parcial';
  if (correlato > 0) return 'aprofundamento';
  if (otherSlice.length > 0 && direto < 2) return 'parcial';
  return 'cobrado';
}

export interface KnowledgeAtlasFilterOptions {
  banca?: string;
  prova?: string;
  disciplina?: string;
  status?: 'all' | GapStatus;
}

export function buildKnowledgeAtlasTree(
  gapRows: SyllabusGapRow[],
  allQuestions: QuestionRecord[],
  rootLabel: string,
  filters: KnowledgeAtlasFilterOptions = {}
): KnowledgeAtlasData {
  const bancaFilter = filters.banca && filters.banca !== 'Todas' ? filters.banca : null;
  const provaFilter = filters.prova && filters.prova !== 'Todas' ? filters.prova : null;
  const discFilter =
    filters.disciplina && filters.disciplina !== 'Todas' ? filters.disciplina : null;
  const statusFilter =
    filters.status && filters.status !== 'all' ? filters.status : null;

  const bancas = Array.from(new Set(allQuestions.map((q) => q.banca))).filter(Boolean).sort();
  const provas = Array.from(new Set(allQuestions.map((q) => q.concursoCurto))).filter(Boolean);

  const hasSliceFilter = Boolean(bancaFilter || provaFilter);

  const matchesQuestionFilter = (q: QuestionRecord) => {
    if (bancaFilter && q.banca !== bancaFilter) return false;
    if (provaFilter && q.concursoCurto !== provaFilter) return false;
    return true;
  };

  interface LeafEntry {
    row: SyllabusGapRow;
    disc: string;
    assunto: string;
    subtopico: string;
    inSlice: QuestionRecord[];
    otherSlice: QuestionRecord[];
    status: GapStatus;
  }

  const rawEntries: LeafEntry[] = gapRows.map((row) => {
    const combinedPool = Array.from(
      new Map(
        [...row.questoesNaSelecao, ...row.questoesEmOutrasProvas].map((q) => [q.id, q])
      ).values()
    );

    const inSlice = provaFilter
      ? combinedPool.filter(matchesQuestionFilter)
      : bancaFilter
        ? row.questoesNaSelecao.filter((q) => q.banca === bancaFilter)
        : row.questoesNaSelecao;

    const inSliceIds = new Set(inSlice.map((q) => q.id));
    const otherSlice = combinedPool.filter((q) => !inSliceIds.has(q.id));

    const refPool =
      inSlice.length > 0
        ? inSlice
        : otherSlice.length > 0
          ? otherSlice
          : combinedPool;

    const disc =
      refPool.length > 0
        ? mostFrequentLabel(
            refPool.map((q) => q.grupoEstudo),
            'Outros tópicos'
          )
        : inferUnmatchedDiscipline(row.codigo);

    const assunto =
      refPool.length > 0
        ? mostFrequentLabel(
            refPool.map((q) => q.topicoEditalUnificado),
            row.titulo
          )
        : row.codigo.startsWith('ITEM.')
          ? row.titulo
          : 'Lacuna sem questão catalogada';

    const subtopico =
      refPool.length > 0
        ? mostFrequentLabel(
            refPool.map((q) =>
              q.subtopico && q.subtopico !== 'Conceito geral'
                ? `${q.topico} — ${q.subtopico}`
                : q.topico || q.tema
            ),
            row.titulo
          )
        : 'Item aguardando ocorrência em prova';

    const status = computeStatusForFilteredSlice(
      inSlice,
      otherSlice,
      row.status,
      hasSliceFilter
    );

    return {
      row,
      disc,
      assunto,
      subtopico,
      inSlice,
      otherSlice,
      status,
    };
  });

  const disciplines = Array.from(new Set(rawEntries.map((e) => e.disc))).sort();

  const filteredEntries = rawEntries.filter((e) => {
    if (discFilter && e.disc !== discFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  });

  const nodeMap: Record<string, KnowledgeAtlasNode> = {};

  // Build hierarchical tree: Level 1 -> Level 2 -> Level 3 -> Level 4
  const discMap = new Map<
    string,
    Map<string, Map<string, LeafEntry[]>>
  >();

  for (const entry of filteredEntries) {
    let assuntoMap = discMap.get(entry.disc);
    if (!assuntoMap) {
      assuntoMap = new Map();
      discMap.set(entry.disc, assuntoMap);
    }
    let subMap = assuntoMap.get(entry.assunto);
    if (!subMap) {
      subMap = new Map();
      assuntoMap.set(entry.assunto, subMap);
    }
    const list = subMap.get(entry.subtopico) || [];
    list.push(entry);
    subMap.set(entry.subtopico, list);
  }

  const rollupNode = (
    id: string,
    level: 0 | 1 | 2 | 3,
    label: string,
    children: KnowledgeAtlasNode[],
    parentId?: string
  ): KnowledgeAtlasNode => {
    const qMap = new Map<string, QuestionRecord>();
    const otherMap = new Map<string, QuestionRecord>();
    for (const child of children) {
      for (const q of child.questions) qMap.set(q.id, q);
      for (const o of child.otherExamQuestions) {
        if (!qMap.has(o.id)) otherMap.set(o.id, o);
      }
    }
    const mergedQuestions = Array.from(qMap.values());
    const mergedOthers = Array.from(otherMap.values());
    const directCount = mergedQuestions.filter((q) => q.vinculo === 'Direto').length;
    const correlatoCount = mergedQuestions.length - directCount;
    const exams = Array.from(new Set(mergedQuestions.map((q) => q.concursoCurto)));
    const questionRefs = mergedQuestions.slice(0, 12).map(formatQuestionReference);

    const node: KnowledgeAtlasNode = {
      id,
      level,
      label,
      status: aggregateBranchStatus(children),
      questionCount: mergedQuestions.length,
      otherExamCount: mergedOthers.length,
      directCount,
      correlatoCount,
      exams,
      questionRefs,
      questions: mergedQuestions,
      otherExamQuestions: mergedOthers,
      parentId,
      children,
    };
    nodeMap[id] = node;
    return node;
  };

  const rootId = 'atlas-root';
  const level1Nodes: KnowledgeAtlasNode[] = [];

  let dIdx = 0;
  for (const [discLabel, assuntoMap] of discMap.entries()) {
    const discId = `l1-${dIdx++}`;
    const level2Nodes: KnowledgeAtlasNode[] = [];

    let aIdx = 0;
    for (const [assuntoLabel, subMap] of assuntoMap.entries()) {
      const assuntoId = `${discId}-l2-${aIdx++}`;
      const level3Nodes: KnowledgeAtlasNode[] = [];

      let sIdx = 0;
      for (const [subLabel, entries] of subMap.entries()) {
        const subId = `${assuntoId}-l3-${sIdx++}`;
        const level4Nodes: KnowledgeAtlasNode[] = entries.map((entry) => {
          const l4Id = `l4-${entry.row.codigo}`;
          const directCount = entry.inSlice.filter((q) => q.vinculo === 'Direto').length;
          const correlatoCount = entry.inSlice.length - directCount;
          const node: KnowledgeAtlasNode = {
            id: l4Id,
            level: 4,
            code: entry.row.codigo,
            label: entry.row.titulo,
            status: entry.status,
            questionCount: entry.inSlice.length,
            otherExamCount: entry.otherSlice.length,
            directCount,
            correlatoCount,
            exams: Array.from(
              new Set(
                (entry.inSlice.length > 0 ? entry.inSlice : entry.otherSlice).map(
                  (q) => q.concursoCurto
                )
              )
            ),
            questionRefs: (entry.inSlice.length > 0 ? entry.inSlice : entry.otherSlice)
              .slice(0, 12)
              .map(formatQuestionReference),
            questions: entry.inSlice,
            otherExamQuestions: entry.otherSlice,
            recommendation: entry.row.recomendacao,
            parentId: subId,
            children: [],
          };
          nodeMap[l4Id] = node;
          return node;
        });

        level3Nodes.push(rollupNode(subId, 3, subLabel, level4Nodes, assuntoId));
      }

      level2Nodes.push(rollupNode(assuntoId, 2, assuntoLabel, level3Nodes, discId));
    }

    level1Nodes.push(rollupNode(discId, 1, discLabel, level2Nodes, rootId));
  }

  level1Nodes.sort((a, b) => b.questionCount - a.questionCount || a.label.localeCompare(b.label));
  const root = rollupNode(rootId, 0, rootLabel, level1Nodes);

  return {
    root,
    nodeMap,
    disciplines,
    bancas,
    provas,
  };
}

export function buildTopicExamHeatmap(
  questions: QuestionRecord[],
  dimension: 'grupo' | 'edital' = 'edital',
  maxTopics: number = 14
): HeatmapMatrixData {
  if (questions.length === 0) {
    return { exams: [], rows: [], maxCellCount: 0 };
  }

  const orderedExams = sortExamsChronologically(buildExamSummaries(questions));
  const exams = orderedExams.map((e) => e.concursoCurto);
  const examTotalMap = new Map(orderedExams.map((e) => [e.concursoCurto, e.totalQuestoes]));

  const topicMap = new Map<string, Map<string, QuestionRecord[]>>();
  for (const q of questions) {
    const topic =
      dimension === 'grupo' ? q.grupoEstudo : q.topicoEditalUnificado;
    let byExam = topicMap.get(topic);
    if (!byExam) {
      byExam = new Map();
      topicMap.set(topic, byExam);
    }
    const list = byExam.get(q.concursoCurto) || [];
    list.push(q);
    byExam.set(q.concursoCurto, list);
  }

  let maxCellCount = 0;
  const rows = Array.from(topicMap.entries())
    .map(([topic, byExam]) => {
      let total = 0;
      const cells = exams.map((exam) => {
        const list = byExam.get(exam) || [];
        total += list.length;
        if (list.length > maxCellCount) maxCellCount = list.length;
        const examTotal = examTotalMap.get(exam) || 1;
        return {
          exam,
          count: list.length,
          pct: (list.length / examTotal) * 100,
          questions: list,
        };
      });
      return { topic, total, cells };
    })
    .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic))
    .slice(0, maxTopics);

  return {
    exams,
    rows,
    maxCellCount,
  };
}

