import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChoiceFixture } from "../data/scenarioTypes";
import type { PredictionPhase } from "../app/experienceReducer";
import type { TransitionVisualPhase } from "../motion/transitionTypes";
import { candidateAnchors } from "./visualConfig";
import { createSeededRandom } from "./seededRandom";
import { cubicBezier, easeInOut } from "./particlePaths";

interface LayerProps {
  count: number;
  layer: 0 | 1 | 2;
  seed: number;
  phase: PredictionPhase;
  candidates: ChoiceFixture[];
  selectedId: string | null;
  reducedMotion: boolean;
  transitionPhase: TransitionVisualPhase;
}

const phaseTargets: Record<PredictionPhase, number> = {
  arrival: 0.08,
  influx: 0.36,
  compression: 0.54,
  distribution: 0.77,
  awaitingChoice: 0.84,
  commit: 0.84,
  complete: 0.84,
};

let sharedParticleTexture: THREE.CanvasTexture | null = null;

function getParticleTexture(): THREE.CanvasTexture {
  if (sharedParticleTexture) return sharedParticleTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,.92)");
    gradient.addColorStop(0.5, "rgba(255,255,255,.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  sharedParticleTexture = new THREE.CanvasTexture(canvas);
  sharedParticleTexture.colorSpace = THREE.SRGBColorSpace;
  return sharedParticleTexture;
}

function ParticleLayer({ count, layer, seed, phase, candidates, selectedId, reducedMotion, transitionPhase }: LayerProps) {
  const points = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const progress = useRef({ value: phase === "arrival" ? 0 : phaseTargets[phase] });
  const discardProgress = useRef({ value: 0 });
  const retainProgress = useRef({ value: 0 });
  const texture = useMemo(() => getParticleTexture(), []);
  const data = useMemo(() => {
    const random = createSeededRandom(seed + layer * 101);
    const start = new Float32Array(count * 3);
    const offset = new Float32Array(count * 3);
    const candidate = new Uint8Array(count);
    const weights = candidates.length === 3 ? candidates.map((item) => item.weight) : [0.34, 0.33, 0.33];
    const limits = [Math.floor(count * weights[0]), Math.floor(count * (weights[0] + weights[1]))];
    for (let i = 0; i < count; i += 1) {
      const fromTopBottom = i % 7 === 0;
      start[i * 3] = fromTopBottom ? (random() - 0.5) * 14 : -9 - random() * 6;
      start[i * 3 + 1] = fromTopBottom ? (i % 2 ? 7 : -7) : (random() - 0.5) * 9;
      start[i * 3 + 2] = -2 - random() * (5 + layer * 2);
      offset[i * 3] = (random() - 0.5) * (0.8 + layer * 0.4);
      offset[i * 3 + 1] = (random() - 0.5) * (0.9 + layer * 0.35);
      offset[i * 3 + 2] = (random() - 0.5) * 2;
      candidate[i] = i < limits[0] ? 0 : i < limits[1] ? 1 : 2;
    }
    return { start, offset, candidate };
  }, [candidates, count, layer, seed]);
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    value.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return value;
  }, [count]);

  useEffect(() => {
    if (phase === "arrival") progress.current.value = 0;
    const duration = reducedMotion ? 0.12 : phase === "commit" ? 0.8 : phase === "distribution" ? 1.2 : 0.65;
    const tween = gsap.to(progress.current, { value: phaseTargets[phase], duration, ease: "power2.inOut" });
    return () => { tween.kill(); };
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (transitionPhase === "idle" || transitionPhase === "locking" || transitionPhase === "entering" || transitionPhase === "expanding") {
      discardProgress.current.value = 0;
      retainProgress.current.value = 0;
      return;
    }

    const tweens: gsap.core.Tween[] = [];
    if (transitionPhase === "resolvingChoice") {
      tweens.push(gsap.to(discardProgress.current, {
        value: 1,
        duration: reducedMotion ? 0.12 : 0.48,
        ease: "power2.out",
        overwrite: true,
      }));
    }
    if (transitionPhase === "compacting") {
      tweens.push(gsap.to(retainProgress.current, {
        value: 0.18,
        duration: reducedMotion ? 0.1 : 0.3,
        ease: "power2.in",
        overwrite: true,
      }));
    }
    if (transitionPhase === "converging") {
      tweens.push(gsap.to(retainProgress.current, {
        value: 1,
        duration: reducedMotion ? 0.16 : 0.68,
        ease: "power3.inOut",
        overwrite: true,
      }));
    }
    if (transitionPhase === "coreReady" || transitionPhase === "exiting" || transitionPhase === "swapping") {
      discardProgress.current.value = 1;
      retainProgress.current.value = 1;
    }
    return () => { tweens.forEach((tween) => tween.kill()); };
  }, [reducedMotion, transitionPhase]);

  useFrame(({ clock }) => {
    if (!points.current?.visible || document.hidden) return;
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const colorAttribute = geometry.getAttribute("color") as THREE.BufferAttribute;
    const colorArray = colorAttribute.array as Float32Array;
    const t = progress.current.value;
    const selectedIndex = candidates.findIndex((item) => item.id === selectedId);
    const baseColor = layer === 2 ? [0.78, 0.97, 1] : layer === 1 ? [0.56, 0.92, 1] : [0.29, 0.55, 0.64];
    for (let i = 0; i < count; i += 1) {
      const startX = data.start[i * 3];
      const startY = data.start[i * 3 + 1];
      const startZ = data.start[i * 3 + 2];
      const wobble = Math.sin(clock.elapsedTime * (0.25 + layer * 0.15) + i * 0.37);
      const assigned = data.candidate[i];
      const anchor = candidateAnchors[assigned];
      const targetX = (anchor.x - 0.5) * viewport.width;
      const targetY = (0.5 - anchor.y) * viewport.height;
      let x: number;
      let y: number;
      let z: number;
      if (t < 0.54) {
        const local = easeInOut(t / 0.54);
        x = cubicBezier(startX, -5, -1.3, 0, local);
        y = cubicBezier(startY, startY * 0.2, data.offset[i * 3 + 1], 0, local) + wobble * 0.18;
        z = startZ + (data.offset[i * 3 + 2] - startZ) * local;
      } else {
        const local = easeInOut((t - 0.54) / 0.46);
        const orbit = t < 0.87 ? 0.38 : Math.max(0.04, 0.38 * (1 - local));
        x = cubicBezier(0, data.offset[i * 3], targetX * 0.72, targetX, local) + Math.cos(i * 0.43 + clock.elapsedTime * 0.22) * orbit;
        y = cubicBezier(0, data.offset[i * 3 + 1], targetY * 0.7, targetY, local) + Math.sin(i * 0.31 + clock.elapsedTime * 0.2) * orbit;
        z = data.offset[i * 3 + 2] * (1 - local) + (layer - 1) * 0.32;
      }

      let brightness = 1;
      if (selectedIndex >= 0 && transitionPhase !== "idle" && transitionPhase !== "locking" && transitionPhase !== "entering" && transitionPhase !== "expanding") {
        if (assigned === selectedIndex) {
          const retained = easeInOut(retainProgress.current.value);
          x *= 1 - retained;
          y *= 1 - retained;
          z *= 1 - retained;
          brightness = Math.max(0.05, 1 - retained * 0.88);
        } else {
          const discarded = easeInOut(discardProgress.current.value);
          const length = Math.max(0.35, Math.hypot(targetX, targetY));
          const directionX = targetX / length;
          const directionY = targetY / length;
          x += directionX * viewport.width * 0.72 * discarded;
          y += directionY * viewport.height * 0.72 * discarded;
          z += Math.sin(i * 0.71) * 1.6 * discarded;
          brightness = Math.max(0, 1 - discarded);
        }
      }
      array[i * 3] = x;
      array[i * 3 + 1] = y;
      array[i * 3 + 2] = z;
      colorArray[i * 3] = baseColor[0] * brightness;
      colorArray[i * 3 + 1] = baseColor[1] * brightness;
      colorArray[i * 3 + 2] = baseColor[2] * brightness;
    }
    attribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#ffffff"
        vertexColors
        map={texture}
        size={layer === 2 ? 0.095 : layer === 1 ? 0.055 : 0.025}
        sizeAttenuation
        transparent
        opacity={layer === 2 ? 0.66 : layer === 1 ? 0.58 : 0.36}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface Props {
  phase: PredictionPhase;
  round: 1 | 2;
  candidates: ChoiceFixture[];
  selectedId: string | null;
  total: number;
  seed: number;
  reducedMotion: boolean;
  transitionPhase: TransitionVisualPhase;
}

export function PredictionParticles({ phase, round, candidates, selectedId, total, seed, reducedMotion, transitionPhase }: Props) {
  const effectiveTotal = reducedMotion ? Math.min(280, total) : total;
  const far = Math.floor(effectiveTotal * 0.3);
  const mid = Math.floor(effectiveTotal * 0.57);
  const near = effectiveTotal - far - mid;
  return (
    <group>
      <ParticleLayer count={far} layer={0} seed={seed + round * 17} phase={phase} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
      <ParticleLayer count={mid} layer={1} seed={seed + round * 37} phase={phase} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
      <ParticleLayer count={near} layer={2} seed={seed + round * 67} phase={phase} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
    </group>
  );
}
