import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzePastedTextTraps,
  buildAdherenceAudit,
  buildBoardComparison,
  buildCommonAndExclusiveMatrix,
  buildDistractorRadar,
  buildExamCountValidation,
  buildExamSummaries,
  buildHistoricalEvolution,
  buildKnowledgeAtlasTree,
  buildReasoningBreakdown,
  buildSmartStudyPlan,
  buildStudentPerformanceSummary,
  buildSubjectDepthAnalysis,
  buildSyllabusGapMap,
  buildSyllabusIncidenceMap,
  buildTopicExamHeatmap,
  buildUnifiedDatabase,
  calculatePareto,
  calculateRanking,
  createBackupPayload,
  createRecordsFromNewExam,
  enrichDatabaseWithAnswerBank,
  filterOriginalBankQuestions,
  filterOriginalBankScoringAttempts,
  filterQuestions,
  generateCustomSimulado,
  getQuestionAnswerKeyInfo,
  isAnswerMatchingGabarito,
  mergeSpecificQuestionsDatabase,
  parseAndReconcileBackup,
  resolveQuestionByKey,
} from './examIntelligence';
import type {
  LocatorFilters,
  RawQuestionBankPayload,
  RawQuestionCorrelationPayload,
  SpecificExamMetadata,
  SpecificQuestionsPayload,
  StudentAttemptRecord,
} from '../types/exam';

const paretoCsv = fs.readFileSync(
  path.resolve('public/assets/aistudio/Base_Questoes_Pareto_0ab26850.csv'),
  'utf-8'
);
const principalCsv = fs.readFileSync(
  path.resolve('public/assets/aistudio/Questoes_270_base_principal_8e6a3811.csv'),
  'utf-8'
);
const bankJson = JSON.parse(
  fs.readFileSync(
    path.resolve('public/assets/aistudio/banco_questoes_operacao_dutos_app_63a3f59b.json'),
    'utf-8'
  )
) as RawQuestionBankPayload;
const correlacaoJson = JSON.parse(
  fs.readFileSync(
    path.resolve('public/assets/aistudio/correlacao_questoes_app_53d7bc78.json'),
    'utf-8'
  )
) as RawQuestionCorrelationPayload;
const specificJson = JSON.parse(
  fs.readFileSync(
    path.resolve('public/data/questoes_especificas.min.json'),
    'utf-8'
  )
) as SpecificQuestionsPayload;
const provasJson = JSON.parse(
  fs.readFileSync(
    path.resolve('public/data/provas.json'),
    'utf-8'
  )
) as SpecificExamMetadata[];

const DEFAULT_FILTERS: LocatorFilters = {
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

test('unifies both CSVs into exactly 270 traceable questions across 5 exams', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  assert.equal(db.length, 270);

  const exams = buildExamSummaries(db);
  assert.equal(exams.length, 5);

  const totalByExam = exams.reduce((acc, e) => acc + e.totalQuestoes, 0);
  assert.equal(totalByExam, 270);

  // Verify unique exam + question combination
  const uniqueIds = new Set(db.map((q) => q.id));
  assert.equal(uniqueIds.size, 270);
});

test('traceability resolves Question 96 unambiguously by exam + number', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const q96Results = filterQuestions(db, {
    ...DEFAULT_FILTERS,
    questaoNumero: '96',
  });

  // Question 96 exists in Petrobras 2023.1, Petrobras 2023.2, and ANSA 2026
  assert.equal(q96Results.length, 3);

  const ansa96 = q96Results.find((q) => q.prova.includes('ANSA 2026'));
  assert.ok(ansa96);
  assert.equal(ansa96.banca, 'CEBRASPE');
  assert.equal(ansa96.paginaPdf, 7);
  assert.equal(ansa96.arquivoOrigem, '2026 - ANSA - OPERAÇÃO PROVA.pdf');
  assert.equal(ansa96.codigoPrograma, 'ANSA.BIII.03');
  assert.match(ansa96.tema, /Bombas centrífugas — cavitação/);
});

test('smart locator query for "Bombas centrífugas" finds matching traceable items', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const results = filterQuestions(db, {
    ...DEFAULT_FILTERS,
    query: 'Bombas centrífugas',
  });
  assert.ok(results.length >= 3);
  assert.ok(results.some((q) => q.prova.includes('ANSA 2026') && q.questao === 96));
});

test('Pareto 80/20 calculation sums to 270 and identifies vital 80% core vs complementary', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const pareto = calculatePareto(db);

  assert.ok(pareto.length > 0);
  const freqSum = pareto.reduce((sum, r) => sum + r.frequencia, 0);
  assert.equal(freqSum, 270);

  const pctSum = pareto.reduce((sum, r) => sum + r.percentual, 0);
  assert.ok(Math.abs(pctSum - 100) < 0.01);

  assert.equal(pareto[pareto.length - 1].acumulado, 100);
  assert.ok(pareto.some((r) => r.isNucleo80));
  assert.ok(pareto.some((r) => !r.isNucleo80));
});

test('individual exam Pareto filters strictly by exam and preserves totals', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const ansaPareto = calculatePareto(db, 'ANSA 2026 — Ênfase 22: Operação');
  const ansaTotal = ansaPareto.reduce((sum, r) => sum + r.frequencia, 0);
  assert.equal(ansaTotal, 70);

  const transpetro18Pareto = calculatePareto(
    db,
    'Transpetro 2018 — Técnico(a) de Operação Júnior'
  );
  assert.equal(
    transpetro18Pareto.reduce((sum, r) => sum + r.frequencia, 0),
    40
  );
});

test('3-level ranking calculates descending order across grupo, area, and subtopico', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const byGrupo = calculateRanking(db, 'grupo');
  const byArea = calculateRanking(db, 'area');
  const bySubtopico = calculateRanking(db, 'subtopico');

  assert.ok(byGrupo[0].frequencia >= byGrupo[1].frequencia);
  assert.ok(byArea[0].frequencia >= byArea[1].frequencia);
  assert.ok(bySubtopico[0].frequencia >= bySubtopico[1].frequencia);
  assert.equal(
    byGrupo.reduce((s, r) => s + r.frequencia, 0),
    270
  );
});

test('syllabus incidence map covers all questions and links exams + program codes', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const unifiedMap = buildSyllabusIncidenceMap(db, 'unificado');

  assert.ok(unifiedMap.length >= 10);
  const gases = unifiedMap.find((r) => r.titulo.includes('Estudo de gases'));
  assert.ok(gases);
  assert.ok(gases.provasCount >= 4);
  assert.ok(gases.questoesCount >= 6);

  const codeMap = buildSyllabusIncidenceMap(db, 'codigo');
  assert.ok(codeMap.some((c) => c.id === 'ANSA.BIII.03'));
});

test('adding a new exam recalculates total questions and Pareto distribution', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const extraRecords = createRecordsFromNewExam({
    prova: 'Petrobras 2026 — Ênfase 10: Operação',
    banca: 'CEBRASPE',
    empresa: 'Petrobras',
    ano: '2026',
    enfase: 'Ênfase 10: Operação',
    arquivoOrigem: '2026 - Petrobras Operacao.pdf',
    questoes: [
      {
        questao: 1,
        paginaPdf: 2,
        areaOriginal: 'Equipamentos de processo',
        tema: 'Bombas centrífugas — NPSH e cavitação',
        grupoEstudo: 'Equipamentos, Tubulações e Bombas',
        vinculo: 'Direto',
        codigoPrograma: 'P26.01',
        conteudosSecundarios: 'P26.05',
        exigencia: 'Determinar NPSH disponível na sucção da bomba.',
      },
      {
        questao: 2,
        paginaPdf: 2,
        areaOriginal: 'Operação/Controle',
        tema: 'Controle de processos — sintonia PID',
        grupoEstudo: 'Instrumentação, Medição e Controle',
        vinculo: 'Direto',
        codigoPrograma: 'P26.02',
        conteudosSecundarios: '',
        exigencia: 'Avaliar efeito do ganho derivativo na estabilidade da malha.',
      },
    ],
  });

  const updatedDb = [...db, ...extraRecords];
  assert.equal(updatedDb.length, 272);

  const updatedPareto = calculatePareto(updatedDb);
  assert.equal(
    updatedPareto.reduce((s, r) => s + r.frequencia, 0),
    272
  );
  const equipRow = updatedPareto.find(
    (r) => r.grupo === 'Equipamentos, Tubulações e Bombas'
  );
  assert.ok(equipRow);
  assert.equal(equipRow.porConcurso['Petrobras 2026'], 1);
});

test('board comparison contrasts CESGRANRIO vs CEBRASPE across all 5 technical criteria', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const comp = buildBoardComparison(db);

  assert.equal(comp.cesgranrioTotal, 80);
  assert.equal(comp.cebraspeTotal, 190);
  assert.equal(comp.cesgranrioTotal + comp.cebraspeTotal, 270);
  assert.ok(comp.criterios.some((c) => c.criterio === 'Frequência de Química'));
  assert.ok(comp.criterios.some((c) => c.criterio === 'Frequência de Física'));
  assert.ok(comp.criterios.some((c) => c.criterio === 'Instrumentação'));
  assert.ok(comp.criterios.some((c) => c.criterio === 'Termodinâmica'));
  assert.ok(comp.criterios.some((c) => c.criterio === 'Mecânica'));

  const patternSumCes = comp.padroes.reduce((s, p) => s + p.cesgranrioCount, 0);
  const patternSumCeb = comp.padroes.reduce((s, p) => s + p.cebraspeCount, 0);
  assert.equal(patternSumCes, 80);
  assert.equal(patternSumCeb, 190);
});

test('historical evolution tracks chronological sequence across all 5 exams', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const evo = buildHistoricalEvolution(db, 'grupo');

  assert.ok(evo.length >= 8);
  const thermo = evo.find((e) => e.tema === 'Termologia e Termodinâmica');
  assert.ok(thermo);
  assert.deepEqual(
    thermo.pontos.map((p) => p.concursoCurto),
    ['Transpetro 2018', 'Petrobras 2023.1', 'Petrobras 2023.2', 'Transpetro 2023.1', 'ANSA 2026']
  );
  assert.equal(
    thermo.pontos.reduce((s, p) => s + p.frequencia, 0),
    thermo.totalGeral
  );
});

test('common and exclusive matrix classifies topics across companies and exams', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const editalMatrix = buildCommonAndExclusiveMatrix(db, 'edital');

  assert.deepEqual(editalMatrix.empresas, ['Transpetro', 'Petrobras', 'ANSA']);
  assert.equal(editalMatrix.provas.length, 5);

  const estequio = editalMatrix.rows.find((r) => r.tema.includes('Estequiometria'));
  assert.ok(estequio);
  assert.equal(estequio.scopeEmpresa, 'todos');

  const topicoMatrix = buildCommonAndExclusiveMatrix(db, 'topico');
  assert.ok(topicoMatrix.rows.some((r) => r.scopeProva === 'exclusivo'));
});

test('syllabus gap map identifies covered, partial, and unseen syllabus items', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const ansaGaps = buildSyllabusGapMap(db, 'ANSA_2026');

  assert.equal(ansaGaps.length, 32); // 17 BI + 9 BII + 6 BIII
  const bi07 = ansaGaps.find((g) => g.codigo === 'ANSA.BI.07');
  assert.ok(bi07);
  assert.equal(bi07.status, 'nao_identificado');

  const customGaps = buildSyllabusGapMap(db, 'CUSTOM', [
    'Bombas centrífugas e cavitação',
    'Tópico inexistente XYZ999',
  ]);
  assert.equal(customGaps.length, 2);
  assert.ok(customGaps[0].questoesNaSelecao.length > 0);
  assert.equal(customGaps[1].status, 'nao_identificado');
});

test('adherence audit classifies direct, correlata, and review-needed items with justification', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const audit = buildAdherenceAudit(db);

  assert.equal(audit.length, 270);
  const correlatas = audit.filter((a) => a.categoria === 'correlata');
  assert.equal(correlatas.length, 4);
  assert.ok(correlatas.every((c) => c.justificativa.length > 10));

  const revisao = audit.filter((a) => a.categoria === 'revisao');
  assert.ok(revisao.length > 0);
});

test('subject depth decomposes Química e Físico-Química (89q) and Química Orgânica subtopics', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const qfq = buildSubjectDepthAnalysis(db, 'Química e Físico-Química');
  assert.equal(qfq.total, 89);
  assert.equal(
    qfq.rows.reduce((s, r) => s + r.total, 0),
    89
  );

  const organic = buildSubjectDepthAnalysis(
    db,
    'Química e Físico-Química',
    'Química Orgânica'
  );
  assert.ok(organic.total >= 15);
  assert.ok(organic.rows.some((r) => r.subtema === 'Polímeros'));
  assert.ok(organic.rows.some((r) => r.subtema === 'Hidrocarbonetos'));
});

test('reasoning breakdown partitions all 270 questions into 7 types and honors overrides', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const breakdown = buildReasoningBreakdown(db);

  assert.equal(breakdown.length, 7);
  assert.equal(
    breakdown.reduce((s, r) => s + r.total, 0),
    270
  );

  const sampleId = db[0].id;
  const overridden = buildReasoningBreakdown(db, { [sampleId]: 'aplicacao' });
  const appRow = overridden.find((r) => r.tipo === 'aplicacao');
  assert.ok(appRow);
  assert.ok(appRow.questoes.some((q) => q.id === sampleId));
});

test('distractor radar and lexical trap analyzer identify unit swaps, absolutes, and concept confusion', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const radar = buildDistractorRadar(db);

  assert.equal(radar.length, 8);
  const confusao = radar.find((r) => r.mecanismo === 'confusao_semelhantes');
  assert.ok(confusao);
  assert.ok(confusao.questoesCandidatas.length > 5);

  const traps = analyzePastedTextTraps(
    'Em qualquer processo isotérmico, o calor sempre equivale à temperatura em °C ou Kelvin (MPa).'
  );
  assert.ok(traps.some((t) => t.mecanismo === 'afirmacao_absoluta'));
  assert.ok(traps.some((t) => t.mecanismo === 'troca_unidades'));
  assert.ok(traps.some((t) => t.mecanismo === 'confusao_semelhantes'));
});

test('student performance dashboard aggregates subject, subtopic blind spots, board/exam errors, recurrence, and timeline', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const chemQs = db.filter((q) => q.grupoEstudo === 'Química e Físico-Química');
  const eqQ = chemQs.find((q) => `${q.tema} ${q.subtopico}`.toLowerCase().includes('equilíbrio')) || chemQs[0];
  const otherChemQs = chemQs.filter((q) => q.id !== eqQ.id).slice(0, 4);

  const attempts: StudentAttemptRecord[] = [
    ...otherChemQs.map((q, i) => ({
      id: `att-ok-${i}`,
      questionId: q.id,
      minhaResposta: 'A',
      gabarito: 'A',
      status: 'acerto' as const,
      timeSeconds: 90,
      confianca: 'alta' as const,
      dificuldade: 'facil' as const,
      revisaoNecessaria: false,
      answeredAt: '2026-11-10T10:00:00Z',
    })),
    {
      id: 'att-err-1',
      questionId: eqQ.id,
      minhaResposta: 'B',
      gabarito: 'C',
      status: 'erro' as const,
      timeSeconds: 180,
      confianca: 'baixa' as const,
      dificuldade: 'dificil' as const,
      revisaoNecessaria: true,
      answeredAt: '2026-11-12T10:00:00Z',
    },
  ];

  const summary = buildStudentPerformanceSummary(db, {}, attempts);
  assert.equal(summary.totalTentativas, 5);
  assert.equal(summary.totalAcertos, 4);
  assert.equal(summary.totalErros, 1);
  assert.equal(summary.taxaAcertoGeral, 80);
  assert.equal(summary.porMateria[0].label, 'Química e Físico-Química');
  assert.ok(summary.pontosCegos.length >= 1);
  assert.ok(summary.reincidenciaErros.some((e) => e.tema === eqQ.tema));
  assert.equal(summary.evolucaoTemporal.length, 2);
  assert.equal(summary.evolucaoTemporal[0].taxaAcerto, 100);
  assert.equal(summary.evolucaoTemporal[1].taxaAcumulada, 80);
});

test('smart study planner combines Pareto, syllabus, and performance; custom simulado respects filters', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const chemQ = db.find((q) => q.grupoEstudo === 'Química e Físico-Química')!;

  const plan = buildSmartStudyPlan(
    db,
    { [chemQ.id]: { status: 'erro', updatedAt: '2026-11-18T10:00:00Z' } },
    [],
    'ANSA_2026'
  );
  assert.ok(plan.length >= 8);
  assert.equal(plan[0].prioridade, 'alta');
  assert.ok(plan[0].atividades.length >= 2);
  assert.ok(plan[0].atividades.every((a) => a.questoesAlvo.length > 0));

  const simulado = generateCustomSimulado(
    db,
    {
      banca: 'CESGRANRIO',
      prova: 'Todas',
      grupo: 'Química e Físico-Química',
      dificuldade: 'todas',
      quantidade: 8,
      modo: 'inteligente_pareto_erros',
    },
    { [chemQ.id]: { status: 'erro', updatedAt: '2026-11-18T10:00:00Z' } },
    []
  );
  assert.equal(simulado.length, 8);
  assert.ok(simulado.every((q) => q.banca === 'CESGRANRIO'));
  assert.ok(simulado.every((q) => q.grupoEstudo === 'Química e Físico-Química'));
});

test('backup payload exports and restores consistently while rejecting invalid schemas and orphan IDs', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const q1 = db[0];
  const custom = createRecordsFromNewExam({
    prova: 'Simulado Extra 2026',
    banca: 'CESGRANRIO',
    empresa: 'Petrobras',
    ano: '2026',
    enfase: 'Operação',
    arquivoOrigem: 'extra.pdf',
    questoes: [
      {
        questao: 1,
        paginaPdf: 1,
        areaOriginal: 'Química',
        tema: 'Termoquímica',
        grupoEstudo: 'Química e Físico-Química',
        vinculo: 'Direto',
        codigoPrograma: 'B1.01',
        conteudosSecundarios: '',
        exigencia: 'Calcular entalpia de reação.',
      },
    ],
  });

  const payload = createBackupPayload({
    customQuestions: custom,
    performanceMap: {
      [q1.id]: { status: 'erro', updatedAt: '2026-11-10T10:00:00Z' },
    },
    studentAttempts: [
      {
        id: 'att-1',
        questionId: q1.id,
        minhaResposta: 'A',
        gabarito: 'A',
        status: 'acerto',
        confianca: 'alta',
        dificuldade: 'facil',
        revisaoNecessaria: false,
        answeredAt: '2026-11-15T12:00:00Z',
      },
      {
        id: 'att-orphan',
        questionId: 'PROVA_INEXISTENTE::999',
        minhaResposta: 'B',
        gabarito: 'C',
        status: 'erro',
        confianca: 'baixa',
        dificuldade: 'dificil',
        revisaoNecessaria: true,
        answeredAt: '2026-11-15T12:00:00Z',
      },
    ],
    reasoningOverrides: {
      [custom[0].id]: 'calculo',
    },
    studiesMap: {},
  });

  const restored = parseAndReconcileBackup(JSON.stringify(payload), db);
  assert.equal(restored.data.customQuestions.length, 1);
  assert.equal(restored.data.studentAttempts.length, 1);
  assert.equal(restored.skippedOrphans, 1);
  // Newer attempt (acerto on 2026-11-15) reconciles performanceMap over older status (erro on 2026-11-10)
  assert.equal(restored.data.performanceMap[q1.id].status, 'acerto');
  assert.equal(restored.data.reasoningOverrides[custom[0].id], 'calculo');

  assert.throws(
    () => parseAndReconcileBackup('{"schema":"other","version":1}', db),
    /Arquivo incompatível/
  );
  assert.throws(
    () => parseAndReconcileBackup('not-json', db),
    /JSON válido/
  );
});

test('buildKnowledgeAtlasTree builds 4 levels, respects filters, deduplicates question counts, and handles unmapped gaps', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const ansaGaps = buildSyllabusGapMap(db, 'ANSA_2026');

  const atlas = buildKnowledgeAtlasTree(ansaGaps, db, 'ANSA 2026 — Edital');
  assert.equal(atlas.root.level, 0);
  assert.ok(atlas.root.children.length >= 3);
  assert.ok(atlas.disciplines.length >= 3);
  assert.deepEqual(atlas.bancas, ['CEBRASPE', 'CESGRANRIO']);

  // Verify 4-level hierarchy: 0 -> 1 -> 2 -> 3 -> 4
  const firstDisc = atlas.root.children[0];
  assert.equal(firstDisc.level, 1);
  const firstAssunto = firstDisc.children[0];
  assert.equal(firstAssunto.level, 2);
  const firstSub = firstAssunto.children[0];
  assert.equal(firstSub.level, 3);
  const firstLeaf = firstSub.children[0];
  assert.equal(firstLeaf.level, 4);
  assert.ok(firstLeaf.code);

  // Deduplicated count matches root.questions.length
  assert.equal(atlas.root.questionCount, atlas.root.questions.length);

  // Unmapped gap item (ANSA.BI.07) still appears at level 4
  const bi07Node = atlas.nodeMap['l4-ANSA.BI.07'];
  assert.ok(bi07Node);
  assert.equal(bi07Node.status, 'nao_identificado');
  assert.equal(bi07Node.questionCount, 0);

  // Filtering by status 'nao_identificado' isolates unseen items
  const unseenAtlas = buildKnowledgeAtlasTree(ansaGaps, db, 'ANSA 2026', {
    status: 'nao_identificado',
  });
  const leafStatuses = Object.values(unseenAtlas.nodeMap)
    .filter((n) => n.level === 4)
    .map((n) => n.status);
  assert.ok(leafStatuses.length >= 1);
  assert.ok(leafStatuses.every((s) => s === 'nao_identificado'));

  // Filtering by banca + prova narrows scope cleanly
  const cebraspeAtlas = buildKnowledgeAtlasTree(ansaGaps, db, 'ANSA 2026', {
    banca: 'CEBRASPE',
    prova: 'ANSA 2026',
  });
  assert.ok(
    cebraspeAtlas.root.questions.every(
      (q) => q.banca === 'CEBRASPE' && q.concursoCurto === 'ANSA 2026'
    )
  );
});

test('buildTopicExamHeatmap builds chronological exam columns and topic rows without empty errors', () => {
  const db = buildUnifiedDatabase(paretoCsv, principalCsv);
  const heatmap = buildTopicExamHeatmap(db, 'grupo', 10);

  assert.deepEqual(heatmap.exams, [
    'Transpetro 2018',
    'Petrobras 2023.1',
    'Petrobras 2023.2',
    'Transpetro 2023.1',
    'ANSA 2026',
  ]);
  assert.equal(heatmap.rows.length, 10);
  assert.ok(heatmap.maxCellCount > 0);
  for (const row of heatmap.rows) {
    assert.equal(
      row.cells.reduce((sum, c) => sum + c.count, 0),
      row.total
    );
  }

  const emptyHeatmap = buildTopicExamHeatmap([], 'edital', 10);
  assert.equal(emptyHeatmap.rows.length, 0);
  assert.equal(emptyHeatmap.exams.length, 0);
  assert.equal(emptyHeatmap.maxCellCount, 0);
});

test('enrichDatabaseWithAnswerBank preserves all CSV correlations while integrating 270 answer keys, statements, and caveats', () => {
  const base = buildUnifiedDatabase(paretoCsv, principalCsv);
  const enriched = enrichDatabaseWithAnswerBank(base, bankJson, correlacaoJson);

  assert.equal(enriched.length, 270);

  // Preserve original Pareto distribution & IDs identically
  const basePareto = calculatePareto(base).map((r) => [r.grupo, r.frequencia]);
  const enrichedPareto = calculatePareto(enriched).map((r) => [r.grupo, r.frequencia]);
  assert.deepEqual(enrichedPareto, basePareto);

  for (let i = 0; i < base.length; i++) {
    assert.equal(enriched[i].id, base[i].id);
    assert.equal(enriched[i].grupoEstudo, base[i].grupoEstudo);
    assert.equal(enriched[i].codigoPrograma, base[i].codigoPrograma);
    assert.equal(enriched[i].vinculo, base[i].vinculo);
    assert.equal(enriched[i].tema, base[i].tema);
    assert.ok(enriched[i].questionId, `Missing questionId on ${enriched[i].id}`);
    assert.ok(enriched[i].appLookupKey, `Missing appLookupKey on ${enriched[i].id}`);
  }

  // Exactly 265 valid answer keys + 5 annulled items
  const annulled = enriched.filter((q) => q.isAnnulled);
  const valid = enriched.filter((q) => !q.isAnnulled);
  assert.equal(annulled.length, 5);
  assert.equal(valid.length, 265);
  for (const aq of annulled) {
    assert.equal(aq.correctAnswer, 'ANULADA');
    assert.equal(aq.correctOptionLabel, null);
    assert.equal(aq.correctJudgment, null);
    assert.equal(getQuestionAnswerKeyInfo(aq).expectedChoiceValue, null);
  }

  // Preliminary keys remain marked preliminary (never promoted to definitive)
  const pet231 = enriched.filter((q) => q.examId === 'PETROBRAS_2023_1_OPERACAO');
  const ansa26 = enriched.filter((q) => q.examId === 'ANSA_2026_OPERACAO');
  assert.ok(pet231.every((q) => q.answerKeyStatus === 'official_preliminary'));
  assert.ok(ansa26.every((q) => q.answerKeyStatus === 'official_preliminary'));

  // Special check: Transpetro 2018 Q49 (PDF image alternatives transcribed, D = 0,75)
  const t18q49 = enriched.find((q) => q.questionId === 'TRANSPETRO_2018_OPERACAO_Q049');
  assert.ok(t18q49);
  assert.equal(t18q49.correctOptionLabel, 'D');
  assert.equal(t18q49.alternatives?.find((a) => a.label === 'D')?.text, '0,75');

  // Special check: Transpetro 2023.1 Q49 adjusted C -> E
  const t23q49 = enriched.find(
    (q) => q.questionId === 'TRANSPETRO_2023_1_DUTOS_TERMINAIS_Q049'
  );
  assert.ok(t23q49);
  assert.equal(t23q49.correctOptionLabel, 'E');
  assert.equal(t23q49.answerKey?.previousValue, 'C');

  // Special check: Transpetro 2023.1 Q25 page correction (9 -> 8)
  const t23q25 = enriched.find(
    (q) => q.questionId === 'TRANSPETRO_2023_1_DUTOS_TERMINAIS_Q025'
  );
  assert.ok(t23q25);
  assert.equal(t23q25.paginaPdf, 8);
  assert.equal(t23q25.pdfPageCorrected, true);
  assert.equal(t23q25.paginaPdfOriginalCsv, 9);

  // CEBRASPE answer matching normalizes 'Certo' / 'CERTO' / 'C'
  const cebQ = pet231[0];
  assert.equal(isAnswerMatchingGabarito('Certo', 'CERTO', cebQ), true);
  assert.equal(isAnswerMatchingGabarito('Errado', 'CERTO', cebQ), false);

  // Simulado skips annulled items when non-annulled candidates are available
  const sim = generateCustomSimulado(enriched, {
    banca: 'Todas',
    prova: 'Petrobras 2023.2',
    grupo: 'Todas',
    dificuldade: 'todas',
    quantidade: 60,
    modo: 'equilibrado',
  });
  assert.ok(sim.every((q) => !q.isAnnulled));
});

test('mergeSpecificQuestionsDatabase integrates 270 specific questions, WebP images, reduced PDFs, and key-only lookups without basic subjects', () => {
  const base = buildUnifiedDatabase(paretoCsv, principalCsv);
  const enriched = enrichDatabaseWithAnswerBank(base, bankJson, correlacaoJson);
  const merged = mergeSpecificQuestionsDatabase(enriched, specificJson, provasJson);

  assert.equal(merged.length, 270);

  // Unique question_id and app_lookup_key
  const qIds = new Set(merged.map((q) => q.questionId));
  const lookupKeys = new Set(merged.map((q) => q.appLookupKey));
  assert.equal(qIds.size, 270);
  assert.equal(lookupKeys.size, 270);

  // Exact exam count validation (40 + 60 + 60 + 40 + 70 = 270) and basic subjects excluded
  const validation = buildExamCountValidation(provasJson, merged);
  assert.equal(validation.isComplete270, true);
  assert.equal(validation.allBasicExcluded, true);
  assert.equal(validation.totalActual, 270);
  assert.deepEqual(
    validation.exams.map((e) => [e.examId, e.actualCount]),
    [
      ['TRANSPETRO_2018_OPERACAO', 40],
      ['PETROBRAS_2023_1_OPERACAO', 60],
      ['PETROBRAS_2023_2_OPERACAO', 60],
      ['TRANSPETRO_2023_1_DUTOS_TERMINAIS', 40],
      ['ANSA_2026_OPERACAO', 70],
    ]
  );

  // Every referenced WebP image and reduced PDF exists in public/
  for (const q of merged) {
    assert.ok(q.originalImagePath, `Missing originalImagePath on ${q.appLookupKey}`);
    assert.ok(q.specificPdfPath, `Missing specificPdfPath on ${q.appLookupKey}`);
    assert.ok(
      typeof q.specificPdfPage === 'number' && q.specificPdfPage >= 1,
      `Missing specificPdfPage on ${q.appLookupKey}`
    );
    const imgOnDisk = path.resolve('public', q.originalImagePath.replace(/^\//, ''));
    const pdfOnDisk = path.resolve('public', q.specificPdfPath.replace(/^\//, ''));
    assert.ok(fs.existsSync(imgOnDisk), `WebP missing on disk: ${imgOnDisk}`);
    assert.ok(fs.existsSync(pdfOnDisk), `Specific PDF missing on disk: ${pdfOnDisk}`);
  }

  // Spot checks required by PROMPT_GOOGLE_AI_STUDIO.md
  const t18q21 = resolveQuestionByKey(merged, 'TRANSPETRO_2018_OPERACAO:21');
  assert.ok(t18q21);
  assert.equal(t18q21.specificPdfPage, 1);
  assert.equal(t18q21.sourcePdfPageOriginal, 6);
  assert.equal(t18q21.correctOptionLabel, 'C');

  const pet231q41 = resolveQuestionByKey(merged, 'PETROBRAS_2023_1_OPERACAO_Q041');
  assert.ok(pet231q41);
  assert.ok((pet231q41.contextTextNormalized || '').includes('Asfaltenos'));
  assert.equal(pet231q41.showContextFirst, true);
  assert.equal(pet231q41.answerKeyStatus, 'official_preliminary');

  const tp23q21 = resolveQuestionByKey(merged, 'TRANSPETRO_2023_1_DUTOS_TERMINAIS:21');
  assert.ok(tp23q21);
  assert.ok(tp23q21.referenceMaterialPath?.endsWith('tabela_periodica_apoio.pdf'));
  assert.equal(tp23q21.alternatives?.length, 5);

  const ansa100 = resolveQuestionByKey(merged, 'ANSA_2026_OPERACAO:100');
  assert.ok(ansa100);
  assert.equal(ansa100.specificPdfPage, 5);
  assert.equal(ansa100.correctJudgment, 'ERRADO');
  assert.equal(ansa100.answerKeyStatus, 'official_preliminary');

  // Filtering by questaoNumero 41 without exam filter returns all distinct exams having Q41
  const q41Matches = filterOriginalBankQuestions(merged, {
    query: '',
    empresa: 'Todas',
    prova: 'Todas',
    ano: 'Todos',
    banca: 'Todas',
    enfase: 'Todas',
    grupo: 'Todas',
    area: 'Todas',
    tema: 'Todas',
    questaoNumero: '41',
  });
  assert.equal(q41Matches.length, 5);
  assert.equal(new Set(q41Matches.map((q) => q.appLookupKey)).size, 5);
});

test('Desempenho Individual counts exclusively original_bank acertos/erros and clears to zero when reset', () => {
  const base = buildUnifiedDatabase(paretoCsv, principalCsv);
  const q1 = base[0];
  const q2 = base[1];
  const q3 = base[2];

  const mixedAttempts: StudentAttemptRecord[] = [
    {
      id: 'orig-1',
      questionId: q1.id,
      minhaResposta: 'C',
      gabarito: 'C',
      status: 'acerto',
      source: 'original_bank',
      confianca: 'alta',
      dificuldade: 'media',
      revisaoNecessaria: false,
      answeredAt: '2026-11-20T10:00:00Z',
    },
    {
      id: 'orig-2',
      questionId: q2.id,
      minhaResposta: 'A',
      gabarito: 'D',
      status: 'erro',
      source: 'original_bank',
      confianca: 'media',
      dificuldade: 'media',
      revisaoNecessaria: true,
      answeredAt: '2026-11-20T10:05:00Z',
    },
    {
      id: 'orig-revisar',
      questionId: q3.id,
      minhaResposta: 'B',
      gabarito: 'B',
      status: 'revisar',
      source: 'original_bank',
      confianca: 'baixa',
      dificuldade: 'dificil',
      revisaoNecessaria: true,
      answeredAt: '2026-11-20T10:10:00Z',
    },
    {
      id: 'att-manual-1',
      questionId: q3.id,
      minhaResposta: 'A',
      gabarito: 'A',
      status: 'acerto',
      source: 'manual',
      confianca: 'alta',
      dificuldade: 'facil',
      revisaoNecessaria: false,
      answeredAt: '2026-11-20T10:15:00Z',
    },
    {
      id: 'sim-1',
      questionId: q3.id,
      minhaResposta: 'B',
      gabarito: 'A',
      status: 'erro',
      source: 'simulado',
      confianca: 'media',
      dificuldade: 'media',
      revisaoNecessaria: true,
      answeredAt: '2026-11-20T10:20:00Z',
    },
  ];

  const scoped = filterOriginalBankScoringAttempts(mixedAttempts);
  assert.deepEqual(
    scoped.map((a) => a.id),
    ['orig-1', 'orig-2']
  );

  // Even when performanceMap has other drawer flags, passing {} ensures only Banco de Questões counts
  const summary = buildStudentPerformanceSummary(base, {}, scoped);
  assert.equal(summary.totalTentativas, 2);
  assert.equal(summary.totalAcertos, 1);
  assert.equal(summary.totalErros, 1);
  assert.equal(summary.totalRevisar, 0);
  assert.equal(summary.taxaAcertoGeral, 50);

  // Resetting all records yields a clean zero summary
  const emptySummary = buildStudentPerformanceSummary(
    base,
    {},
    filterOriginalBankScoringAttempts([])
  );
  assert.equal(emptySummary.totalTentativas, 0);
  assert.equal(emptySummary.totalAcertos, 0);
  assert.equal(emptySummary.totalErros, 0);
  assert.equal(emptySummary.taxaAcertoGeral, 0);
});

test('Full 270-question database audit: zero PUA/control glyphs, clean equations, complete 5 alternatives, and no trailing CEBRASPE context leaks', () => {
  const specificJson = JSON.parse(
    fs.readFileSync(path.resolve('public/data/questoes_especificas.min.json'), 'utf8')
  );
  const provasJson = JSON.parse(
    fs.readFileSync(path.resolve('public/data/provas.json'), 'utf8')
  );
  const merged = mergeSpecificQuestionsDatabase(
    buildUnifiedDatabase(paretoCsv, principalCsv),
    specificJson,
    provasJson
  );

  const specificQuestions = merged.filter((q) => Boolean(q.appLookupKey));
  assert.equal(specificQuestions.length, 270);

  const badCharRe = /[\uE000-\uF8FF\uFFFD\uFB00-\uFB06\x00-\x08\x0B\x0C\x0E-\x1F]/;

  for (const q of specificQuestions) {
    const joined = [
      q.contextText,
      q.contextTextNormalized,
      q.questionText,
      q.questionTextNormalized,
      q.statementWithoutNumber,
      q.correctOptionText,
      ...(q.alternatives || []).map((a) => a.text),
    ]
      .filter(Boolean)
      .join('\n');

    assert.equal(
      badCharRe.test(joined),
      false,
      `PUA or control character found in ${q.questionId}`
    );

    if (q.questionType === 'multiple_choice') {
      assert.equal(
        q.alternatives?.length,
        5,
        `Expected 5 alternatives on ${q.questionId}`
      );
      for (const alt of q.alternatives || []) {
        assert.ok(alt.text.trim().length > 0, `Empty alt on ${q.questionId}`);
        assert.equal(
          /\bDado\b|\bTERRA\b/i.test(alt.text),
          false,
          `Dado/TERRA leak in alternative ${alt.label} of ${q.questionId}`
        );
      }
      assert.equal(
        /\n\(A\)/.test(q.statementWithoutNumber || ''),
        false,
        `Duplicated (A) option list in statementWithoutNumber of ${q.questionId}`
      );
    } else {
      assert.equal(
        /julgue/i.test(q.statementWithoutNumber || ''),
        false,
        `Trailing next-block context leaked into ${q.questionId}`
      );
    }
  }

  // Regression spot checks for previously broken questions
  const t18q25 = resolveQuestionByKey(merged, 'TRANSPETRO_2018_OPERACAO_Q025');
  assert.ok(t18q25);
  assert.equal(t18q25.alternatives?.length, 5);
  assert.ok((t18q25.alternatives?.[1]?.text || '').includes('μ₀I / (2πL)'));
  assert.equal(t18q25.alternatives?.[4]?.text, 'B₀ î');

  const t18q47 = resolveQuestionByKey(merged, 'TRANSPETRO_2018_OPERACAO_Q047');
  assert.ok(t18q47);
  assert.equal(t18q47.alternatives?.find((a) => a.label === 'A')?.text, '575');
  assert.equal(t18q47.alternatives?.find((a) => a.label === 'B')?.text, '863');

  const t18q60 = resolveQuestionByKey(merged, 'TRANSPETRO_2018_OPERACAO_Q060');
  assert.ok(t18q60);
  assert.ok((t18q60.statementWithoutNumber || '').includes('ΔH = variação de entalpia'));
  assert.equal(t18q60.correctOptionText, 'ΔH < 0, ΔS > 0 e ΔG < 0');

  const pet231q53 = resolveQuestionByKey(merged, 'PETROBRAS_2023_1_OPERACAO_Q053');
  assert.ok(pet231q53);
  assert.ok((pet231q53.statementWithoutNumber || '').includes('K₂ = K₁⁻²'));

  const ansa42 = resolveQuestionByKey(merged, 'ANSA_2026_OPERACAO_Q042');
  assert.ok(ansa42);
  assert.ok((ansa42.statementWithoutNumber || '').includes('q₁/q₂ = r₁/r₂'));

  const ansa43 = resolveQuestionByKey(merged, 'ANSA_2026_OPERACAO_Q043');
  assert.ok(ansa43);
  assert.ok((ansa43.statementWithoutNumber || '').includes("v = [(2kq²/m)(1/d' − 1/d)]^(1/2)"));
});





