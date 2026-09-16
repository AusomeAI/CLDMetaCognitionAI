import { useCallback, useMemo, useRef, useState } from 'react';
import type { ConceptNode, GraphEdge, NodeMasteryStatus } from '../../types';

interface ConceptGraphCanvasProps {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  focusMode: boolean;
  onSelectNode: (nodeId: string) => void;
  onDragNode: (nodeId: string, x: number, y: number) => void;
}

const STATUS_COLOR: Record<NodeMasteryStatus, string> = {
  unexplored: '#06B6D4',
  in_dialogue: '#8B5CF6',
  gap_detected: '#F59E0B',
  mastered: '#10B981',
};

const STATUS_LABEL: Record<NodeMasteryStatus, string> = {
  unexplored: 'Unexplored',
  in_dialogue: 'In Dialogue',
  gap_detected: 'Gap Detected',
  mastered: 'Mastered',
};

const NODE_RADIUS = 42;

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

export default function ConceptGraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  focusMode,
  onSelectNode,
  onDragNode,
}: ConceptGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const nodeById = useMemo(() => {
    const map = new Map<string, ConceptNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    edges.forEach((e) => {
      if (e.sourceNodeId === selectedNodeId) set.add(e.targetNodeId);
      if (e.targetNodeId === selectedNodeId) set.add(e.sourceNodeId);
    });
    return set;
  }, [edges, selectedNodeId]);

  const screenToSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom],
  );

  const handlePointerDown = (e: React.PointerEvent, node: ConceptNode) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = screenToSvg(e.clientX, e.clientY);
    dragOffset.current = { x: pt.x - node.x, y: pt.y - node.y };
    setDraggingId(node.id);
    onSelectNode(node.id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const pt = screenToSvg(e.clientX, e.clientY);
    onDragNode(draggingId, pt.x - dragOffset.current.x, pt.y - dragOffset.current.y);
  };

  const handlePointerUp = () => setDraggingId(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(2.2, Math.max(0.4, zoom - e.deltaY * 0.001));
    setZoom(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent, node: ConceptNode) => {
    const step = 24;
    if (e.key === 'ArrowRight' || e.key === 'd') onDragNode(node.id, node.x + step, node.y);
    if (e.key === 'ArrowLeft' || e.key === 'a') onDragNode(node.id, node.x - step, node.y);
    if (e.key === 'ArrowUp' || e.key === 'w') onDragNode(node.id, node.x, node.y - step);
    if (e.key === 'ArrowDown' || e.key === 's') onDragNode(node.id, node.x, node.y + step);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectNode(node.id);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(ellipse_at_top,_#111a2e_0%,_#0b0f19_70%)]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,_#1e293b_1px,_transparent_1px)] [background-size:28px_28px]" />

      <svg
        ref={svgRef}
        role="group"
        aria-label="Interactive concept knowledge graph"
        className="h-full w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {edges.map((edge) => {
            const source = nodeById.get(edge.sourceNodeId);
            const target = nodeById.get(edge.targetNodeId);
            if (!source || !target) return null;
            const dimmed =
              focusMode && selectedNodeId
                ? source.id !== selectedNodeId &&
                  target.id !== selectedNodeId &&
                  !(neighborIds.has(source.id) && neighborIds.has(target.id))
                : false;
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            return (
              <g key={edge.id} opacity={dimmed ? 0.15 : 1}>
                <path
                  d={bezierPath(source.x, source.y, target.x, target.y)}
                  fill="none"
                  stroke={edge.isVerified ? '#10B981' : '#334155'}
                  strokeWidth={edge.isVerified ? 3 : 2}
                  strokeDasharray={edge.isVerified ? undefined : '6 6'}
                />
                <text
                  x={midX}
                  y={midY - 8}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px] font-medium"
                >
                  {edge.relationLabel}
                </text>
              </g>
            );
          })}

          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const dimmed =
              focusMode && selectedNodeId ? !isSelected && !neighborIds.has(node.id) : false;
            const color = STATUS_COLOR[node.masteryStatus];
            const shouldPulse = node.masteryStatus === 'gap_detected' || node.masteryStatus === 'in_dialogue';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                opacity={dimmed ? 0.2 : 1}
                className="cursor-pointer transition-opacity duration-300"
                onPointerDown={(e) => handlePointerDown(e, node)}
                tabIndex={0}
                role="button"
                aria-label={`${node.label}, status ${STATUS_LABEL[node.masteryStatus]}`}
                onKeyDown={(e) => handleKeyDown(e, node)}
              >
                <circle
                  r={NODE_RADIUS + 14}
                  fill="transparent"
                  stroke="none"
                  className="focus:outline-none"
                />
                <circle
                  r={NODE_RADIUS}
                  fill="#0f172a"
                  stroke={color}
                  strokeWidth={isSelected ? 4 : 2.5}
                  className={shouldPulse ? 'node-pulse' : ''}
                  style={{ color }}
                />
                <circle r={NODE_RADIUS} fill={color} opacity={isSelected ? 0.18 : 0.08} />
                <foreignObject x={-NODE_RADIUS} y={-NODE_RADIUS} width={NODE_RADIUS * 2} height={NODE_RADIUS * 2}>
                  <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
                    <span className="text-[11px] font-semibold leading-tight text-slate-100">{node.label}</span>
                  </div>
                </foreignObject>
                <text
                  y={NODE_RADIUS + 18}
                  textAnchor="middle"
                  className="text-[10px] font-medium uppercase tracking-wide"
                  fill={color}
                >
                  {STATUS_LABEL[node.masteryStatus]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 flex gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 backdrop-blur">
        <button
          type="button"
          className="h-8 w-8 rounded-md text-slate-300 hover:bg-slate-800"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-md text-slate-300 hover:bg-slate-800"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          aria-label="Reset zoom"
        >
          ⟳
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-md text-slate-300 hover:bg-slate-800"
          onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
