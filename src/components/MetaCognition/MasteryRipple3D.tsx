import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MasteryRipple3DProps {
  color: string;
  onComplete: () => void;
}

const DURATION_SECONDS = 1.3;
const PARTICLE_COUNT = 90;

function RippleScene({ color, onComplete }: MasteryRipple3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const elapsed = useRef(0);
  const doneRef = useRef(false);

  // Lazy-initialized once via useState (the sanctioned spot for one-time
  // non-deterministic setup) rather than computed inline during render.
  const [{ positions, radii, angles }] = useState(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const radii = new Float32Array(PARTICLE_COUNT);
    const angles = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      angles[i] = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.15;
      radii[i] = 0.85 + Math.random() * 0.3;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    return { positions, radii, angles };
  });

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = Math.min(1, elapsed.current / DURATION_SECONDS);
    const eased = 1 - (1 - t) * (1 - t);

    const posAttr = pointsRef.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (posAttr) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const r = eased * radii[i] * 3.2;
        posAttr.setXYZ(i, Math.cos(angles[i]) * r, Math.sin(angles[i]) * r * 0.6, 0);
      }
      posAttr.needsUpdate = true;
    }

    if (materialRef.current) {
      materialRef.current.opacity = 1 - eased;
    }

    if (t >= 1 && !doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={0.12}
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/**
 * A brief, gentle ripple of light — the visual counterpart to the existing
 * gap-resolved audio/haptic pulse. Deliberately understated (no flashing, no
 * screen shake, sub-1.5s) per the app's zero-gamification sensory design rules.
 * Callers should skip mounting this entirely when Reduce Motion is on.
 */
export default function MasteryRipple3D({ color, onComplete }: MasteryRipple3DProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Safety net in case the WebGL frame loop never reaches completion (e.g. tab hidden).
    timeoutRef.current = setTimeout(onComplete, (DURATION_SECONDS + 0.5) * 1000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div className="h-64 w-64">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
          <RippleScene color={color} onComplete={onComplete} />
        </Canvas>
      </div>
    </div>
  );
}
