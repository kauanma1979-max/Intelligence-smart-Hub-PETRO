import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileText,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  GapStatus,
  KnowledgeAtlasNode,
  QuestionRecord,
  SyllabusGapRow,
} from '../types/exam';
import { buildKnowledgeAtlasTree } from '../utils/examIntelligence';

interface KnowledgeAtlasMapProps {
  gapRows: SyllabusGapRow[];
  allQuestions: QuestionRecord[];
  editalLabel: string;
  onInspectQuestions: (
    title: string,
    subtitle: string,
    list: QuestionRecord[]
  ) => void;
}

const STATUS_STYLE: Record<
  GapStatus,
  {
    label: string;
    shortLabel: string;
    border: string;
    bg: string;
    accent: string;
    text: string;
  }
> = {
  cobrado: {
    label: 'Já cobrado',
    shortLabel: 'Cobrado',
    border: '#A7F3D0',
    bg: '#ECFDF5',
    accent: '#059669',
    text: '#047857',
  },
  parcial: {
    label: 'Cobrado parcialmente',
    shortLabel: 'Parcial',
    border: '#BFDBFE',
    bg: '#EFF6FF',
    accent: '#2563EB',
    text: '#1E3A8A',
  },
  nao_identificado: {
    label: 'Ainda não identificado',
    shortLabel: 'Não identificado',
    border: '#FECACA',
    bg: '#FEF2F2',
    accent: '#DC2626',
    text: '#B91C1C',
  },
  aprofundamento: {
    label: 'Precisa de aprofundamento',
    shortLabel: 'Aprofundamento',
    border: '#FDE68A',
    bg: '#FFFBEB',
    accent: '#D97706',
    text: '#B45309',
  },
};

const LEVEL_NAMES: Record<KnowledgeAtlasNode['level'], string> = {
  0: 'Edital em Foco',
  1: 'Nível 1 · Disciplina / Macroassunto',
  2: 'Nível 2 · Assunto Principal',
  3: 'Nível 3 · Subtópico',
  4: 'Nível 4 · Item do Edital',
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

interface LayoutNode {
  node: KnowledgeAtlasNode;
  x: number;
  y: number;
}

interface LayoutEdge {
  id: string;
  from: LayoutNode;
  to: LayoutNode;
}

const NODE_W = 228;
const NODE_H = 68;
const COL_GAP = 276;
const ROW_GAP = 86;

export const KnowledgeAtlasMap: React.FC<KnowledgeAtlasMapProps> = ({
  gapRows,
  allQuestions,
  editalLabel,
  onInspectQuestions,
}) => {
  const [search, setSearch] = useState('');
  const [bancaFilter, setBancaFilter] = useState('Todas');
  const [provaFilter, setProvaFilter] = useState('Todas');
  const [disciplinaFilter, setDisciplinaFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | GapStatus>('all');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(['atlas-root'])
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan & Zoom State
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );

  const atlas = useMemo(
    () =>
      buildKnowledgeAtlasTree(gapRows, allQuestions, editalLabel, {
        banca: bancaFilter,
        prova: provaFilter,
        disciplina: disciplinaFilter,
        status: statusFilter,
      }),
    [gapRows, allQuestions, editalLabel, bancaFilter, provaFilter, disciplinaFilter, statusFilter]
  );

  // Default expand root + top 3 disciplines when edital changes
  useEffect(() => {
    const initial = new Set<string>(['atlas-root']);
    atlas.root.children.slice(0, 3).forEach((l1) => {
      initial.add(l1.id);
    });
    setExpandedIds(initial);
    setSelectedNodeId(null);
    setPan({ x: 24, y: 24 });
    setZoom(0.92);
  }, [editalLabel, atlas.root.children.length]);

  // Auto-expand matching branches on search
  const matchedNodeIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = new Set<string>();
    if (!q) return matches;
    for (const node of Object.values(atlas.nodeMap)) {
      const hay = `${node.label} ${node.code || ''} ${node.exams.join(' ')}`.toLowerCase();
      if (hay.includes(q)) {
        matches.add(node.id);
      }
    }
    return matches;
  }, [atlas.nodeMap, search]);

  const effectiveExpandedIds = useMemo(() => {
    if (matchedNodeIds.size === 0) return expandedIds;
    const next = new Set(expandedIds);
    for (const id of matchedNodeIds) {
      let cur: KnowledgeAtlasNode | undefined = atlas.nodeMap[id];
      while (cur?.parentId) {
        next.add(cur.parentId);
        cur = atlas.nodeMap[cur.parentId];
      }
    }
    next.add('atlas-root');
    return next;
  }, [expandedIds, matchedNodeIds, atlas.nodeMap]);

  // Compute tidy hierarchical coordinates for visible nodes
  const { layoutNodes, layoutEdges, canvasW, canvasH } = useMemo(() => {
    const nodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];
    let leafRow = 0;

    const place = (node: KnowledgeAtlasNode): LayoutNode => {
      const isExpanded = effectiveExpandedIds.has(node.id);
      const visibleChildren =
        isExpanded && node.children.length > 0 ? node.children : [];

      let yCenter: number;
      const placedChildren: LayoutNode[] = [];

      if (visibleChildren.length === 0) {
        yCenter = leafRow * ROW_GAP + 40;
        leafRow++;
      } else {
        for (const ch of visibleChildren) {
          placedChildren.push(place(ch));
        }
        const firstY = placedChildren[0].y;
        const lastY = placedChildren[placedChildren.length - 1].y;
        yCenter = (firstY + lastY) / 2;
      }

      const x = node.level * COL_GAP + 28;
      const placed: LayoutNode = { node, x, y: yCenter };
      nodes.push(placed);

      for (const chLayout of placedChildren) {
        edges.push({
          id: `${node.id}->${chLayout.node.id}`,
          from: placed,
          to: chLayout,
        });
      }

      return placed;
    };

    if (atlas.root.children.length > 0) {
      place(atlas.root);
    }

    const maxLevel = nodes.reduce((m, n) => Math.max(m, n.node.level), 0);
    return {
      layoutNodes: nodes,
      layoutEdges: edges,
      canvasW: (maxLevel + 1) * COL_GAP + 140,
      canvasH: Math.max(360, leafRow * ROW_GAP + 80),
    };
  }, [atlas.root, effectiveExpandedIds]);

  // Lineage highlight set (ancestors + descendants of hovered or selected node)
  const highlightedIds = useMemo(() => {
    const targetId = hoveredNodeId || selectedNodeId;
    const set = new Set<string>();
    if (!targetId || !atlas.nodeMap[targetId]) return set;

    // Ancestors
    let cur: KnowledgeAtlasNode | undefined = atlas.nodeMap[targetId];
    while (cur) {
      set.add(cur.id);
      cur = cur.parentId ? atlas.nodeMap[cur.parentId] : undefined;
    }

    // Descendants
    const walkDown = (n: KnowledgeAtlasNode) => {
      set.add(n.id);
      n.children.forEach(walkDown);
    };
    walkDown(atlas.nodeMap[targetId]);

    return set;
  }, [hoveredNodeId, selectedNodeId, atlas.nodeMap]);

  const selectedNode = selectedNodeId ? atlas.nodeMap[selectedNodeId] || null : null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>(Object.keys(atlas.nodeMap));
    setExpandedIds(all);
  };

  const handleCollapseToL2 = () => {
    const next = new Set<string>(['atlas-root']);
    atlas.root.children.forEach((l1) => next.add(l1.id));
    setExpandedIds(next);
  };

  const handleResetView = () => {
    setZoom(0.92);
    setPan({ x: 24, y: 24 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    setIsDragging(true);
    dragOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    setPan({
      x: dragOrigin.current.panX + dx,
      y: dragOrigin.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragOrigin.current = null;
  };

  return (
    <section
      aria-label="Mapa Interativo de Conhecimento do Edital"
      className="ui-card overflow-hidden"
    >
      {/* Header & Controls Bar */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="ui-kicker text-[var(--brand-indigo)]">
              Knowledge Atlas · 4 Níveis Hierárquicos
            </div>
            <h2 className="ui-section-title mt-0.5">
              Mapa Interativo de Conhecimento e Lacunas do Edital
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Explore da disciplina até os itens numerados do edital. Arraste para mover, expanda ramos e clique em qualquer nó para abrir o painel de evidências.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleExpandAll}
              className="ui-btn-secondary !min-h-[34px] !px-2.5 !py-1"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir tudo
            </button>
            <button
              type="button"
              onClick={handleCollapseToL2}
              className="ui-btn-secondary !min-h-[34px] !px-2.5 !py-1"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Níveis 1–2
            </button>
            <div className="inline-flex items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)]">
              <button
                type="button"
                aria-label="Diminuir zoom do mapa"
                onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.12).toFixed(2)))}
                className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[46px] text-center font-mono text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Aumentar zoom do mapa"
                onClick={() => setZoom((z) => Math.min(1.55, +(z + 0.12).toFixed(2)))}
                className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleResetView}
              aria-label="Centralizar visualização do mapa"
              title="Centralizar mapa"
              className="ui-btn-secondary !min-h-[34px] !px-2.5 !py-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ajustar
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar assunto ou código no mapa de conhecimento"
              placeholder="Buscar nó, código (ex: B3.03, ANSA) ou assunto..."
              className="ui-input !pl-9 text-xs"
            />
          </div>

          <select
            aria-label="Filtrar mapa por disciplina"
            value={disciplinaFilter}
            onChange={(e) => setDisciplinaFilter(e.target.value)}
            className="ui-select text-xs"
          >
            <option value="Todas">Todas as disciplinas ({atlas.disciplines.length})</option>
            {atlas.disciplines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar mapa por banca"
            value={bancaFilter}
            onChange={(e) => setBancaFilter(e.target.value)}
            className="ui-select text-xs"
          >
            <option value="Todas">Todas as bancas</option>
            {atlas.bancas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar mapa por prova"
            value={provaFilter}
            onChange={(e) => setProvaFilter(e.target.value)}
            className="ui-select text-xs"
          >
            <option value="Todas">Edital selecionado (padrão)</option>
            {atlas.provas.map((p) => (
              <option key={p} value={p}>
                Prova: {p}
              </option>
            ))}
          </select>
        </div>

        {/* Legend & Status Quick Filter */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {(['cobrado', 'parcial', 'nao_identificado', 'aprofundamento'] as GapStatus[]).map(
              (st) => {
                const meta = STATUS_STYLE[st];
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(isActive ? 'all' : st)}
                    className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary-ink)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <StatusIcon status={st} />
                    <span>{meta.label}</span>
                  </button>
                );
              }
            )}
          </div>
          {search.trim() && (
            <span className="font-mono text-xs text-[var(--brand-indigo)] tabular-nums">
              {matchedNodeIds.size} nó(s) correspondem à busca
            </span>
          )}
        </div>
      </div>

      {/* Main Atlas Split: Interactive Pan/Zoom Map + Side Detail Panel */}
      <div className="flex flex-col lg:flex-row">
        {/* Interactive Canvas */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`atlas-dot-grid relative h-[480px] min-w-0 flex-1 overflow-auto select-none lg:h-[560px] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {atlas.root.children.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--text-muted)]" />
              <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                Nenhum ramo corresponde aos filtros aplicados
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Limpe os filtros de disciplina, banca ou situação para visualizar a árvore completa do edital.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBancaFilter('Todas');
                  setProvaFilter('Todas');
                  setDisciplinaFilter('Todas');
                  setStatusFilter('all');
                  setSearch('');
                }}
                className="ui-btn-secondary mt-3"
              >
                Limpar filtros do mapa
              </button>
            </div>
          ) : (
            <div
              style={{
                width: Math.max(canvasW * zoom + 80, 680),
                height: Math.max(canvasH * zoom + 80, 440),
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  width: canvasW,
                  height: canvasH,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              >
                {/* SVG Relationship Edges */}
                <svg
                  width={canvasW}
                  height={canvasH}
                  className="pointer-events-none absolute inset-0 overflow-visible"
                >
                  {layoutEdges.map((edge) => {
                    const x1 = edge.from.x + NODE_W;
                    const y1 = edge.from.y + NODE_H / 2;
                    const x2 = edge.to.x;
                    const y2 = edge.to.y + NODE_H / 2;
                    const midX = (x1 + x2) / 2;
                    const isActive =
                      highlightedIds.size > 0 &&
                      highlightedIds.has(edge.from.node.id) &&
                      highlightedIds.has(edge.to.node.id);
                    const isDimmed = highlightedIds.size > 0 && !isActive;

                    return (
                      <path
                        key={edge.id}
                        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke={
                          isActive
                            ? '#4338CA'
                            : STATUS_STYLE[edge.to.node.status].accent
                        }
                        strokeWidth={isActive ? 2.5 : 1.5}
                        strokeOpacity={isDimmed ? 0.2 : isActive ? 0.95 : 0.45}
                      />
                    );
                  })}
                </svg>

                {/* Interactive Tree Nodes */}
                {layoutNodes.map(({ node, x, y }) => {
                  const st = STATUS_STYLE[node.status];
                  const isExpanded = effectiveExpandedIds.has(node.id);
                  const hasChildren = node.children.length > 0;
                  const isSelected = selectedNodeId === node.id;
                  const isSearchMatch = matchedNodeIds.has(node.id);
                  const isInHighlight =
                    highlightedIds.size === 0 || highlightedIds.has(node.id);

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: NODE_W,
                        height: NODE_H,
                        opacity: isInHighlight ? 1 : 0.42,
                        borderColor: isSelected
                          ? '#4338CA'
                          : isSearchMatch
                            ? '#2563EB'
                            : st.border,
                        boxShadow: isSelected
                          ? '0 0 0 2px rgba(67, 56, 202, 0.28)'
                          : isSearchMatch
                            ? '0 0 0 2px rgba(37, 99, 235, 0.22)'
                            : '0 1px 3px rgba(20, 33, 61, 0.08)',
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="flex items-stretch overflow-hidden rounded-lg border bg-white transition-opacity duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2 text-left hover:bg-[var(--bg-surface-hover)]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <StatusIcon status={node.status} className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {node.code ? node.code : `Nível ${node.level}`}
                            </span>
                          </span>
                          <span
                            style={{ backgroundColor: st.bg, color: st.text }}
                            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums"
                          >
                            {node.questionCount}q
                          </span>
                        </div>

                        <div
                          className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)]"
                          title={node.label}
                        >
                          {node.label}
                        </div>
                      </button>

                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(node.id)}
                          aria-label={
                            isExpanded
                              ? `Recolher ${node.label}`
                              : `Expandir ${node.label}`
                          }
                          aria-expanded={isExpanded}
                          className="flex w-8 shrink-0 flex-col items-center justify-center border-l border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/60 text-[var(--text-secondary)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)]"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          <span className="font-mono text-[9px] tabular-nums">
                            {node.children.length}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Side Slide-Over / Context Detail Panel */}
        <aside
          aria-label="Detalhes do nó selecionado no mapa"
          className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:w-[360px] lg:shrink-0 lg:border-t-0 lg:border-l"
        >
          {!selectedNode ? (
            <div className="flex h-full flex-col justify-center text-center lg:py-10">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-indigo-soft)] text-[var(--brand-indigo)]">
                <CircleDot className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                Selecione um nó do mapa
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Clique em qualquer disciplina, assunto, subtópico ou item do edital para ver código programático, situação, provas relacionadas e abrir as questões originais.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-indigo)]">
                    {LEVEL_NAMES[selectedNode.level]}
                  </span>
                  <h3 className="mt-1 text-sm font-bold leading-snug text-[var(--text-primary)]">
                    {selectedNode.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Fechar detalhes do nó"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status & Code Strip */}
              <div
                style={{
                  backgroundColor: STATUS_STYLE[selectedNode.status].bg,
                  borderColor: STATUS_STYLE[selectedNode.status].border,
                }}
                className="rounded-lg border p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={{ color: STATUS_STYLE[selectedNode.status].text }}
                    className="inline-flex items-center gap-1.5 font-semibold"
                  >
                    <StatusIcon status={selectedNode.status} />
                    {STATUS_STYLE[selectedNode.status].label}
                  </span>
                  {selectedNode.code && (
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {selectedNode.code}
                    </span>
                  )}
                </div>
                {selectedNode.recommendation && (
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    {selectedNode.recommendation}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <dl className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="ui-surface-subtle p-3">
                  <dt className="text-[11px] text-[var(--text-muted)]">
                    Questões no escopo
                  </dt>
                  <dd className="mt-0.5 font-mono text-lg font-bold text-[var(--text-primary)] tabular-nums">
                    {selectedNode.questionCount}
                  </dd>
                </div>
                <div className="ui-surface-subtle p-3">
                  <dt className="text-[11px] text-[var(--text-muted)]">
                    Diretas / Correlatas
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                    {selectedNode.directCount} / {selectedNode.correlatoCount}
                  </dd>
                </div>
              </dl>

              {/* Related Exams */}
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Provas relacionadas
                </div>
                {selectedNode.exams.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Nenhuma prova catalogada na amostra para este item.
                  </p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedNode.exams.map((ex) => (
                      <span
                        key={ex}
                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Exact Question References */}
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Referências de questões ({selectedNode.questionRefs.length})
                </div>
                {selectedNode.questionRefs.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Sem ocorrências catalogadas até o momento.
                  </p>
                ) : (
                  <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto pr-1 font-mono text-[11px] text-[var(--text-secondary)]">
                    {selectedNode.questionRefs.map((ref) => (
                      <li
                        key={ref}
                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] px-2 py-1"
                      >
                        {ref}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Button */}
              {(() => {
                const inspectList =
                  selectedNode.questions.length > 0
                    ? selectedNode.questions
                    : selectedNode.otherExamQuestions;
                if (inspectList.length === 0) {
                  return (
                    <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-3 text-center text-xs text-[var(--text-muted)]">
                      Lacuna pura: nenhuma questão equivalente na base atual para inspeção direta.
                    </div>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() =>
                      onInspectQuestions(
                        selectedNode.code
                          ? `${selectedNode.code} — ${selectedNode.label}`
                          : selectedNode.label,
                        selectedNode.questions.length > 0
                          ? `${selectedNode.questions.length} questão(ões) no recorte selecionado`
                          : `${selectedNode.otherExamQuestions.length} questão(ões) equivalentes em outras provas`,
                        inspectList
                      )
                    }
                    className="ui-btn-primary w-full"
                  >
                    <FileText className="h-4 w-4" />
                    {selectedNode.questions.length > 0
                      ? `Consultar questões (${selectedNode.questions.length})`
                      : `Ver equivalentes (${selectedNode.otherExamQuestions.length})`}
                  </button>
                );
              })()}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
