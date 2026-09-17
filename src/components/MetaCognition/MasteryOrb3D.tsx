import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface MasteryOrb3DProps {
  masteryPercent: number;
  reduceMotion: boolean;
}

const LOW_COLOR = new THREE.Color('#F59E0B');
const HIGH_COLOR = new THREE.Color('#10B981');

function Orb({ masteryPercent, reduceMotion }: MasteryOrb3DProps) {
  const coreGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringGroupRef = useRef<THREE.Group>(null);

  const color = useMemo(() => {
    const t = Math.max(0, Math.min(1, masteryPercent / 100));
    return LOW_COLOR.clone().lerp(HIGH_COLOR, t);
  }, [masteryPercent]);

  // Start the fill arc at 12 o'clock and sweep clockwise.
  const fillAngle = Math.max(0.001, (masteryPercent / 100) * Math.PI * 2);

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.getElapsedTime();
    if (coreGroupRef.current) coreGroupRef.current.rotation.y = t * 0.35;
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.04;
      coreRef.current.scale.setScalar(pulse);
    }
    // The progress ring stays camera-facing and legible; only a gentle shared
    // tilt drift, decoupled from the faster-spinning core, keeps it feeling 3D.
    if (ringGroupRef.current) ringGroupRef.current.rotation.z = Math.sin(t * 0.2) * 0.06;
  });

  return (
    <group>
      <group ref={coreGroupRef}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.1}
            roughness={0.25}
            metalness={0.2}
            wireframe
          />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.03, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} />
        </mesh>
      </group>

      <group ref={ringGroupRef} rotation={[0, 0, -Math.PI / 2]}>
        <mesh>
          <ringGeometry args={[1.55, 1.68, 64]} />
          <meshBasicMaterial color="#1e293b" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.55, 1.68, 64, 1, 0, fillAngle]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

export default function MasteryOrb3D({ masteryPercent, reduceMotion }: MasteryOrb3DProps) {
  return (
    <div className="relative h-40 w-40 shrink-0">
      <Canvas
        camera={{ position: [0, 0.6, 4.2], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={40} color="#8B5CF6" />
        <Suspense fallback={null}>
          <Orb masteryPercent={masteryPercent} reduceMotion={reduceMotion} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={0.9} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-slate-950/55">
          <span className="text-2xl font-bold text-slate-50">{Math.round(masteryPercent)}%</span>
          <span className="text-[9px] uppercase tracking-wide text-slate-400">Mastered</span>
        </div>
      </div>
    </div>
  );
}
