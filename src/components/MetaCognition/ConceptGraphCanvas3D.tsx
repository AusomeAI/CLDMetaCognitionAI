import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, QuadraticBezierLine, Html, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { ConceptNode, GraphEdge, NodeMasteryStatus } from '../../types';

interface ConceptGraphCanvas3DProps {
  nodes: ConceptNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  focusMode: boolean;
  reduceMotion: boolean;
  onSelectNode: (nodeId: string) => void;
}

const STATUS_COLOR: Record<NodeMasteryStatus, string> = {
  unexplored: '#06B6D4',
  in_dialogue: '#8B5CF6',
  gap_detected: '#F59E0B',
  mastered: '#10B981',
};

/** Maps the app's flat 2D layout coordinates into a gently staggered 3D scene. */
function toScenePosition(node: ConceptNode, index: number): [number, number, number] {
  return [(node.x - 500) / 22, -(node.y - 220) / 22 + Math.sin(index * 1.7) * 1.6, Math.cos(index * 1.3) * 4];
}

function NodeSphere({
  node,
  position,
  isSelected,
  dimmed,
  reduceMotion,
  onSelect,
}: {
  node: ConceptNode;
  position: [number, number, number];
  isSelected: boolean;
  dimmed: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLOR[node.masteryStatus];
  const isActive = node.masteryStatus === 'gap_detected' || node.masteryStatus === 'in_dialogue';
  const baseScale = isSelected ? 1.35 : hovered ? 1.15 : 1;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      meshRef.current.position.y = position[1] + Math.sin(t * 0.6 + position[0]) * 0.25;
      if (isActive) {
        const pulse = 1 + Math.sin(t * 2.2) * 0.08;
        meshRef.current.scale.setScalar(baseScale * pulse);
      } else {
        meshRef.current.scale.setScalar(baseScale);
      }
    } else {
      meshRef.current.scale.setScalar(baseScale);
    }

    if (materialRef.current) {
      const targetIntensity = isActive && !reduceMotion ? 1.6 + Math.sin(t * 2.2) * 0.5 : isSelected ? 1.8 : 0.9;
      materialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        materialRef.current.emissiveIntensity,
        targetIntensity,
        6,
        0.02,
      );
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={1}
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={dimmed ? 0.15 : 0.92}
        />
      </mesh>
      <Html position={[0, -2.6, 0]} center distanceFactor={16} occlude={false}>
        <span
          className="pointer-events-none select-none whitespace-nowrap text-xs font-semibold"
          style={{ color: dimmed ? '#334155' : '#e2e8f0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
          {node.label}
        </span>
      </Html>
    </group>
  );
}

function EdgeCurve({
  start,
  end,
  isVerified,
  dimmed,
  reduceMotion,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isVerified: boolean;
  dimmed: boolean;
  reduceMotion: boolean;
}) {
  const flowRef = useRef<THREE.Mesh>(null);
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + 1.2,
    (start[2] + end[2]) / 2,
  ];

  useFrame(({ clock }) => {
    if (!flowRef.current || !isVerified || reduceMotion) return;
    const t = (clock.getElapsedTime() * 0.25) % 1;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    );
    const point = curve.getPoint(t);
    flowRef.current.position.copy(point);
  });

  return (
    <group>
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color={isVerified ? '#10B981' : '#334155'}
        lineWidth={isVerified ? 2.5 : 1.5}
        dashed={!isVerified}
        dashScale={4}
        transparent
        opacity={dimmed ? 0.08 : isVerified ? 0.9 : 0.5}
      />
      {isVerified && !dimmed && (
        <mesh ref={flowRef}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="#6EE7B7" />
        </mesh>
      )}
    </group>
  );
}

function FocusSpotlight({
  position,
  reduceMotion,
}: {
  position: [number, number, number];
  reduceMotion: boolean;
}) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame(({ clock }) => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
    if (lightRef.current && !reduceMotion) {
      const t = clock.getElapsedTime();
      lightRef.current.intensity = 230 + Math.sin(t * 1.1) * 35;
    }
  });

  return (
    <>
      <object3D ref={targetRef} position={position} />
      <spotLight
        ref={lightRef}
        position={[position[0] + 3, position[1] + 7, position[2] + 5]}
        angle={0.4}
        penumbra={0.65}
        intensity={230}
        distance={45}
        color="#e0f2fe"
      />
    </>
  );
}

function Scene({ nodes, edges, selectedNodeId, focusMode, reduceMotion, onSelectNode }: ConceptGraphCanvas3DProps) {
  const nodePositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    nodes.forEach((node, i) => map.set(node.id, toScenePosition(node, i)));
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

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={80} color="#8B5CF6" />
      <pointLight position={[-10, -5, -10]} intensity={60} color="#06B6D4" />

      <Stars radius={80} depth={40} count={1200} factor={2} fade speed={reduceMotion ? 0 : 0.4} />

      {focusMode && selectedNodeId && nodePositions.get(selectedNodeId) && (
        <FocusSpotlight position={nodePositions.get(selectedNodeId)!} reduceMotion={reduceMotion} />
      )}

      {edges.map((edge) => {
        const start = nodePositions.get(edge.sourceNodeId);
        const end = nodePositions.get(edge.targetNodeId);
        if (!start || !end) return null;
        const dimmed = focusMode && selectedNodeId
          ? edge.sourceNodeId !== selectedNodeId &&
            edge.targetNodeId !== selectedNodeId &&
            !(neighborIds.has(edge.sourceNodeId) && neighborIds.has(edge.targetNodeId))
          : false;
        return (
          <EdgeCurve
            key={edge.id}
            start={start}
            end={end}
            isVerified={edge.isVerified}
            dimmed={dimmed}
            reduceMotion={reduceMotion}
          />
        );
      })}

      {nodes.map((node) => {
        const position = nodePositions.get(node.id)!;
        const isSelected = node.id === selectedNodeId;
        const dimmed = focusMode && selectedNodeId ? !isSelected && !neighborIds.has(node.id) : false;
        return (
          <NodeSphere
            key={node.id}
            node={node}
            position={position}
            isSelected={isSelected}
            dimmed={dimmed}
            reduceMotion={reduceMotion}
            onSelect={() => onSelectNode(node.id)}
          />
        );
      })}

      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={70}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.08}
        target={[2, 0, 0]}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.1} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={focusMode && selectedNodeId ? 0.82 : 0.6} />
      </EffectComposer>
    </>
  );
}

export default function ConceptGraphCanvas3D(props: ConceptGraphCanvas3DProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#05070d]">
      <Canvas
        camera={{ position: [2, 6, 34], fov: 55 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 30, 90]} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
