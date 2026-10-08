import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PredictionPhase } from "../app/experienceReducer";
import type { ChoiceFixture } from "../data/scenarioTypes";
import type { TransitionVisualPhase } from "../motion/transitionTypes";
import { motionDurations } from "./visualConfig";
import { createSeededRandom } from "./seededRandom";
import { cubicBezier, easeInOut } from "./particlePaths";

interface LayerProps {
  count: number;
  layer: 0 | 1 | 2;
  seed: number;
  phase: PredictionPhase;
  round: 1 | 2;
  candidates: ChoiceFixture[];
  selectedId: string | null;
  reducedMotion: boolean;
  transitionPhase: TransitionVisualPhase;
  onAbsorbed?: () => void;
}

const phaseTargets: Record<PredictionPhase, number> = {
  arrival: 0,
  influx: 0.55,
  compression: 0.7,
  distribution: 1,
  awaitingChoice: 1,
  commit: 1,
  complete: 1,
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

function ParticleLayer({ count, layer, seed, phase, round, candidates, selectedId, reducedMotion, transitionPhase, onAbsorbed }: LayerProps) {
  const points = useRef<THREE.Points>(null);
  const { camera, gl } = useThree();
  const progress = useRef({ value: phase === "arrival" ? 0 : phaseTargets[phase] });
  const discardProgress = useRef({ value: 0 });
  const retainProgress = useRef({ value: 0 });
  const anchors = useRef([new THREE.Vector3(-2.2, -1, 0), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(2.2, -1, 0)]);
  const texture = useMemo(() => getParticleTexture(), []);
  const data = useMemo(() => {
    const random = createSeededRandom(seed + layer * 101);
    const start = new Float32Array(count * 3);
    const offset = new Float32Array(count * 3);
    const candidate = new Uint8Array(count);
    const delay = new Float32Array(count);
    const weights = candidates.length === 3 ? candidates.map((item) => item.weight) : [0.34, 0.33, 0.33];
    const limits = [Math.floor(count * weights[0]), Math.floor(count * (weights[0] + weights[1]))];
    for (let i = 0; i < count; i += 1) {
      const entrance = i % 3;
      start[i * 3] = entrance === 0 ? -10 - random() * 5 : entrance === 1 ? 10 + random() * 5 : (random() - 0.5) * 10;
      start[i * 3 + 1] = entrance === 2 ? 7 + random() * 4 : (random() - 0.5) * 8;
      start[i * 3 + 2] = -2 - random() * (5 + layer * 2);
      offset[i * 3] = (random() - 0.5) * (0.8 + layer * 0.4);
      offset[i * 3 + 1] = (random() - 0.5) * (0.9 + layer * 0.35);
      offset[i * 3 + 2] = (random() - 0.5) * 2;
      candidate[i] = i < limits[0] ? 0 : i < limits[1] ? 1 : 2;
      delay[i] = random() * 0.1;
    }
    return { start, offset, candidate, delay };
  }, [candidates, count, layer, seed]);
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry();
    value.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    value.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return value;
  }, [count]);

  useLayoutEffect(() => {
    const measure = () => {
      const canvasRect = gl.domElement.getBoundingClientRect();
      const elements = Array.from(document.querySelectorAll<HTMLElement>(".candidate-word"));
      if (elements.length !== 3 || !canvasRect.width || !canvasRect.height) return;
      anchors.current = elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const ndc = new THREE.Vector3(
          ((rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width) * 2 - 1,
          -(((rect.top + rect.height / 2 - canvasRect.top) / canvasRect.height) * 2 - 1),
          0.5,
        ).unproject(camera);
        const direction = ndc.sub(camera.position).normalize();
        return camera.position.clone().add(direction.multiplyScalar(-camera.position.z / direction.z));
      });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(gl.domElement);
    document.querySelectorAll<HTMLElement>(".candidate-word").forEach((element) => observer.observe(element));
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [camera, gl, round]);

  useEffect(() => {
    if (phase === "arrival") progress.current.value = 0;
    const durations = round === 1 ? motionDurations.predictionRound1 : motionDurations.predictionRound2;
    const duration = reducedMotion ? 0.12 : phase === "influx" ? durations.influx : phase === "compression" ? durations.compression : phase === "distribution" ? durations.distribution : 0.12;
    const tween = gsap.to(progress.current, {
      value: phaseTargets[phase], duration, ease: phase === "distribution" ? "none" : "power2.inOut",
      onComplete: phase === "distribution" ? onAbsorbed : undefined,
    });
    return () => { tween.kill(); };
  }, [onAbsorbed, phase, reducedMotion, round]);

  useEffect(() => {
    if (["idle", "locking", "blackSwap", "blackHold", "enteringCore", "centerHold", "expanding"].includes(transitionPhase)) {
      discardProgress.current.value = 0;
      retainProgress.current.value = 0;
      return;
    }
    const tweens: gsap.core.Tween[] = [];
    if (transitionPhase === "resolvingChoice") tweens.push(gsap.to(discardProgress.current, { value: 1, duration: reducedMotion ? 0.12 : 0.48, ease: "power2.out", overwrite: true }));
    if (transitionPhase === "compacting") tweens.push(gsap.to(retainProgress.current, { value: 0.18, duration: reducedMotion ? 0.1 : 0.3, ease: "power2.in", overwrite: true }));
    if (transitionPhase === "converging") tweens.push(gsap.to(retainProgress.current, { value: 1, duration: reducedMotion ? 0.16 : 0.68, ease: "power3.inOut", overwrite: true }));
    if (["coreReady", "exiting"].includes(transitionPhase)) { discardProgress.current.value = 1; retainProgress.current.value = 1; }
    return () => tweens.forEach((tween) => tween.kill());
  }, [reducedMotion, transitionPhase]);

  useFrame(() => {
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
      const assigned = data.candidate[i];
      const target = anchors.current[assigned];
      let x: number;
      let y: number;
      let z: number;
      let brightness = 1;
      if (t < 0.7) {
        const local = easeInOut(t / 0.7);
        x = cubicBezier(startX, startX * 0.55, data.offset[i * 3], 0, local);
        y = cubicBezier(startY, startY * 0.35, data.offset[i * 3 + 1], 0, local);
        z = startZ + (data.offset[i * 3 + 2] - startZ) * local;
      } else {
        const wave = (t - 0.7) / 0.3;
        const waveStart = assigned * 0.16 + data.delay[i];
        const local = THREE.MathUtils.clamp((wave - waveStart) / Math.max(0.1, 0.58 - data.delay[i]), 0, 1);
        const eased = easeInOut(local);
        x = cubicBezier(0, data.offset[i * 3], target.x * 0.72, target.x, eased);
        y = cubicBezier(0, data.offset[i * 3 + 1], target.y * 0.72, target.y, eased);
        z = data.offset[i * 3 + 2] * (1 - eased);
        brightness = local > 0.82 ? 1 - (local - 0.82) / 0.18 : 1;
      }
      if (selectedIndex >= 0 && !["idle", "locking", "blackSwap", "blackHold", "enteringCore", "centerHold", "expanding"].includes(transitionPhase)) {
        if (assigned === selectedIndex) {
          const retained = easeInOut(retainProgress.current.value);
          x *= 1 - retained; y *= 1 - retained; z *= 1 - retained;
          brightness *= Math.max(0.05, 1 - retained * 0.88);
        } else {
          const discarded = easeInOut(discardProgress.current.value);
          const length = Math.max(0.35, Math.hypot(target.x, target.y));
          x += target.x / length * 7 * discarded;
          y += target.y / length * 5 * discarded;
          z += Math.sin(i * 0.71) * 1.6 * discarded;
          brightness *= Math.max(0, 1 - discarded);
        }
      }
      array[i * 3] = x; array[i * 3 + 1] = y; array[i * 3 + 2] = z;
      colorArray[i * 3] = baseColor[0] * brightness;
      colorArray[i * 3 + 1] = baseColor[1] * brightness;
      colorArray[i * 3 + 2] = baseColor[2] * brightness;
    }
    attribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial color="#ffffff" vertexColors map={texture} size={layer === 2 ? 0.095 : layer === 1 ? 0.055 : 0.025} sizeAttenuation transparent opacity={layer === 2 ? 0.66 : layer === 1 ? 0.58 : 0.36} blending={THREE.AdditiveBlending} depthWrite={false} />
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
  onAbsorbed: () => void;
}

export function PredictionParticles({ phase, round, candidates, selectedId, total, seed, reducedMotion, transitionPhase, onAbsorbed }: Props) {
  const effectiveTotal = reducedMotion ? Math.min(280, total) : total;
  const far = Math.floor(effectiveTotal * 0.3);
  const mid = Math.floor(effectiveTotal * 0.57);
  const near = effectiveTotal - far - mid;
  return (
    <group>
      <ParticleLayer count={far} layer={0} seed={seed + round * 17} phase={phase} round={round} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} onAbsorbed={onAbsorbed} />
      <ParticleLayer count={mid} layer={1} seed={seed + round * 37} phase={phase} round={round} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
      <ParticleLayer count={near} layer={2} seed={seed + round * 67} phase={phase} round={round} candidates={candidates} selectedId={selectedId} reducedMotion={reducedMotion} transitionPhase={transitionPhase} />
    </group>
  );
}
