import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createSeededRandom } from "./seededRandom";
import type { TransitionVisualPhase } from "../motion/transitionTypes";

interface Props {
  reducedMotion: boolean;
  active: boolean;
  transitionPhase: TransitionVisualPhase;
}

export function BackgroundParticles({ reducedMotion, active, transitionPhase }: Props) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const random = createSeededRandom(941);
    const positions = new Float32Array(180 * 3);
    for (let index = 0; index < 180; index += 1) {
      positions[index * 3] = (random() - 0.5) * 22;
      positions[index * 3 + 1] = (random() - 0.5) * 13;
      positions[index * 3 + 2] = -2 - random() * 8;
    }
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return value;
  }, []);
  useFrame((_, delta) => {
    if (!points.current || !material.current || document.hidden) return;
    const transitionActive = ["resolvingChoice", "compacting", "converging", "coreReady", "exiting", "swapping"].includes(transitionPhase);
    material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, active && !transitionActive ? 0.27 : 0, Math.min(1, delta * 5));
    if (active && !reducedMotion) {
      points.current.rotation.z += delta * 0.008;
      points.current.position.x = Math.sin(performance.now() * 0.00008) * 0.16;
    }
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial ref={material} color="#6ecde2" size={0.035} transparent opacity={active ? 0.27 : 0} depthWrite={false} />
    </points>
  );
}
