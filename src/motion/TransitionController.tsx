import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import type { SceneId } from "../app/sceneOrder";
import { motionDurations } from "../visual/visualConfig";
import { captureSceneExitSnapshot } from "./sceneExitSnapshot";
import type { TransitionSnapshot, TransitionVisualPhase } from "./transitionTypes";
import { TransferOrbOverlay } from "./TransferOrbOverlay";

interface TransferPath {
  exit: [number, number];
  enterStart: [number, number];
  exitDirection: "up" | "right" | "down";
  enterDirection: "up" | "right" | "down";
}

function pathFor(from: SceneId, to: SceneId): TransferPath {
  if (from === "input") return { exit: [0.5, -0.2], enterStart: [0.5, 1.2], exitDirection: "up", enterDirection: "up" };
  if (from === "output" && to === "summary") return { exit: [0.5, 1.2], enterStart: [0.5, -0.2], exitDirection: "down", enterDirection: "down" };
  return { exit: [1.2, 0.5], enterStart: [-0.2, 0.5], exitDirection: "right", enterDirection: "right" };
}

function visibleEntryTargets(stage: HTMLElement): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>("[data-entry-target='true']", stage)
    .filter((target) => target.getClientRects().length > 0)
    .sort((a, b) => Number(a.dataset.entryOrder ?? 2) - Number(b.dataset.entryOrder ?? 2));
}

export function TransitionController() {
  const { state, dispatch, scenario } = useExperience();
  const orbRef = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<TransitionSnapshot | null>(null);
  const activeSnapshot = state.transitionId !== null && snapshot?.transitionId === state.transitionId ? snapshot : null;
  const entryOnly = state.transitionMode === "entry" && state.scenePhase === "entering" && state.transitionId !== null;
  const animationKey = useMemo(
    () => activeSnapshot ? `exit-${activeSnapshot.transitionId}` : entryOnly ? `entry-${state.transitionId}` : "idle",
    [activeSnapshot, entryOnly, state.transitionId],
  );

  useLayoutEffect(() => {
    if (state.scenePhase !== "exiting" || state.transitionId === null) {
      if (state.transitionId === null && snapshot !== null) {
        const frame = requestAnimationFrame(() => setSnapshot(null));
        return () => cancelAnimationFrame(frame);
      }
      return undefined;
    }
    if (snapshot?.transitionId === state.transitionId) return undefined;
    const frame = requestAnimationFrame(() => {
      const stage = document.getElementById("stage-root");
      if (stage) setSnapshot(captureSceneExitSnapshot(stage, state));
    });
    return () => cancelAnimationFrame(frame);
  }, [snapshot, state]);

  useGSAP(() => {
    const orb = orbRef.current;
    const root = scope.current;
    const stage = document.getElementById("stage-root");
    if (!orb || !root || !stage) return;
    const blackout = root.querySelector<HTMLElement>("[data-stage-blackout='true']");
    const scatterParticles = gsap.utils.toArray<HTMLElement>("[data-entry-particle='true']", root);
    if (!blackout) return;

    if (animationKey === "idle") {
      gsap.set(orb, { left: "50%", top: "50%", opacity: 0, scale: 0.45 });
      gsap.set(blackout, { opacity: 0, clipPath: "circle(0% at 50% 50%)" });
      return;
    }

    const transitionId = activeSnapshot?.transitionId ?? state.transitionId;
    if (transitionId === null) return;
    const runId = activeSnapshot?.runId ?? state.runId;
    const oldInstance = activeSnapshot?.sceneInstanceId ?? state.sceneInstanceId;
    const newInstance = activeSnapshot ? oldInstance + 1 : oldInstance;
    const oldMeta = { runId, sceneInstanceId: oldInstance };
    const newMeta = { runId, sceneInstanceId: newInstance };
    const from = activeSnapshot?.from ?? state.scene;
    const to = activeSnapshot?.to ?? state.scene;
    const path = pathFor(from, to);
    const reduced = activeSnapshot?.reducedMotion ?? state.settings.reducedMotion;
    const speed = reduced ? 0.24 : 1;
    const retainedDots = gsap.utils.toArray<HTMLElement>("[data-retained-dot='true']", root);
    const discardedDots = gsap.utils.toArray<HTMLElement>("[data-discard-particle='true']", root);
    const phase = (value: TransitionVisualPhase, meta = oldMeta) => dispatch({ type: "TRANSITION_VISUAL_PHASE", phase: value, transitionId, meta });
    const timeline = gsap.timeline();
    const setPhase = (value: TransitionVisualPhase, meta = oldMeta) => timeline.call(() => phase(value, meta));

    gsap.set(scatterParticles, { left: "50%", top: "50%", opacity: 0, scale: 0.3 });

    const appendEntry = () => {
      timeline.call(() => phase("blackHold", newMeta));
      timeline.to({}, { duration: motionDurations.transfer.blackHold * speed });
      timeline.call(() => {
        phase("enteringCore", newMeta);
        orb.dataset.direction = path.enterDirection;
        gsap.set(orb, { left: `${path.enterStart[0] * 100}%`, top: `${path.enterStart[1] * 100}%`, opacity: 1, scale: 0.72 });
      });
      timeline.to(orb, { left: "50%", top: "50%", opacity: 1, scale: 1, duration: motionDurations.transfer.enter * speed, ease: "power3.out" });
      setPhase("centerHold", newMeta);
      timeline.to(orb, { scale: 1.24, duration: motionDurations.transfer.centerHold * 0.45 * speed, ease: "power2.out" });
      timeline.to(orb, { scale: 1, duration: motionDurations.transfer.centerHold * 0.55 * speed, ease: "sine.inOut" });
      timeline.call(() => phase("expanding", newMeta));
      timeline.addLabel("reveal");
      timeline.call(() => {
        const targets = visibleEntryTargets(stage);
        const stageRect = stage.getBoundingClientRect();
        gsap.set(targets, { opacity: 0, scale: 0.9 });
        gsap.set([stage.querySelector(".stage-canvas"), stage.querySelector(".fallback-stage"), stage.querySelector(".stage-vignette")].filter(Boolean), { opacity: 1 });
        targets.forEach((target, targetIndex) => {
          const rect = target.getBoundingClientRect();
          const x = ((rect.left + rect.width / 2 - stageRect.left) / stageRect.width) * 100;
          const y = ((rect.top + rect.height / 2 - stageRect.top) / stageRect.height) * 100;
          const at = targetIndex * 0.065 * speed;
          const particles = scatterParticles.slice(targetIndex * 3, targetIndex * 3 + 3);
          gsap.set(particles, { left: "50%", top: "50%", opacity: 0.92, scale: 0.7 });
          particles.forEach((particle, particleIndex) => {
            const angle = (particleIndex - 1) * 0.45 + targetIndex * 0.17;
            const jitter = 7 + particleIndex * 4;
            timeline.to(particle, {
              left: `${x + Math.cos(angle) * jitter / Math.max(1, stageRect.width) * 100}%`,
              top: `${y + Math.sin(angle) * jitter / Math.max(1, stageRect.height) * 100}%`,
              opacity: 0, scale: 0.16, duration: 0.52 * speed, ease: "power2.out",
            }, `reveal+=${at}`);
          });
          timeline.to(target, { opacity: 1, scale: 1, duration: 0.22 * speed, ease: "power2.out" }, `reveal+=${at + 0.42 * speed}`);
        });
      }, undefined, "reveal");
      timeline.to(blackout, { clipPath: "circle(0% at 50% 50%)", duration: motionDurations.transfer.expand * speed, ease: "power2.inOut" }, "reveal");
      timeline.to(orb, { opacity: 0, scale: 1.7, duration: 0.34 * speed, ease: "power2.out" }, "reveal+=0.08");
      timeline.to([stage.querySelector(".stage-header"), stage.querySelector(".stage-footer"), stage.querySelector(".size-warning")].filter(Boolean), { opacity: 1, duration: motionDurations.transfer.chrome * speed }, `reveal+=${motionDurations.transfer.expand * 0.72 * speed}`);
      timeline.call(() => dispatch({ type: "TRANSITION_READY", transitionId, meta: newMeta }));
    };

    if (!activeSnapshot) {
      gsap.set(blackout, { opacity: 1, clipPath: "circle(150% at 50% 50%)" });
      gsap.set([stage.querySelector(".stage-header"), stage.querySelector(".stage-footer"), stage.querySelector(".size-warning")].filter(Boolean), { opacity: 0 });
      appendEntry();
    } else {
      gsap.set(blackout, { opacity: 0, clipPath: "circle(150% at 50% 50%)" });
      if (retainedDots.length) gsap.set(retainedDots, { opacity: 0, scale: 0.25 });
      if (discardedDots.length) gsap.set(discardedDots, { opacity: 0, scale: 0.35 });
      gsap.set(orb, { left: "50%", top: "50%", opacity: 0, scale: 0.35 });
      orb.dataset.direction = path.exitDirection;
      setPhase("locking");
      if (activeSnapshot.hasDiscarded) {
        setPhase("resolvingChoice");
        timeline.to({}, { duration: motionDurations.transfer.selectedHold * speed });
        timeline.to(discardedDots, { opacity: 0.92, scale: 1, duration: 0.08 * speed, stagger: 0.004 * speed });
        timeline.to(discardedDots, {
          left: (_index, target) => `${Number.parseFloat((target as HTMLElement).dataset.targetX ?? "0.5") * 100}%`,
          top: (_index, target) => `${Number.parseFloat((target as HTMLElement).dataset.targetY ?? "0.5") * 100}%`,
          opacity: 0, scale: 0.2, duration: motionDurations.transfer.discard * speed, ease: "power2.out", stagger: 0.003 * speed,
        });
      }
      setPhase("compacting");
      if (retainedDots.length) timeline.to(retainedDots, { opacity: 1, scale: 1, duration: motionDurations.transfer.compact * speed, stagger: 0.025 * speed, ease: "power2.out" });
      setPhase("converging");
      if (retainedDots.length) timeline.to(retainedDots, { left: "50%", top: "50%", scale: 0.62, opacity: 0.18, duration: motionDurations.transfer.converge * speed, stagger: 0.035 * speed, ease: "power3.inOut" }, "converge");
      timeline.to(orb, { opacity: 1, scale: 1, duration: motionDurations.transfer.converge * 0.62 * speed, ease: "power2.out" }, `converge+=${motionDurations.transfer.converge * 0.38 * speed}`);
      setPhase("coreReady");
      timeline.to(orb, { scale: 1.34, duration: motionDurations.transfer.coreHold * 0.45 * speed, ease: "power2.out" });
      timeline.to(orb, { scale: 1, duration: motionDurations.transfer.coreHold * 0.55 * speed, ease: "sine.inOut" });

      if (activeSnapshot.mode === "restart") {
        timeline.to(orb, { opacity: 0, scale: 0.38, duration: motionDurations.transfer.restartFade * speed, ease: "power2.in" });
        timeline.to(blackout, { opacity: 1, duration: 0.08 * speed });
        timeline.call(() => dispatch({ type: "RESET_EXPERIENCE" }));
      } else {
        setPhase("exiting");
        timeline.to(orb, { left: `${path.exit[0] * 100}%`, top: `${path.exit[1] * 100}%`, scale: 0.72, opacity: 1, duration: motionDurations.transfer.exit * speed, ease: "power3.in" });
        setPhase("blackSwap");
        timeline.to(blackout, { opacity: 1, duration: 0.08 * speed, ease: "none" });
        timeline.call(() => {
          if (activeSnapshot.mode === "prediction") dispatch({ type: "PREDICTION_TRANSFER_SWAP", transitionId, meta: oldMeta, scenario });
          else dispatch({ type: "TRANSITION_SWAP", target: activeSnapshot.to, transitionId, meta: oldMeta });
        });
        appendEntry();
      }
    }

    const handleVisibility = () => document.hidden ? timeline.pause() : timeline.resume();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); timeline.kill(); };
  }, { scope, dependencies: [animationKey] });

  return <div ref={scope}><TransferOrbOverlay ref={orbRef} snapshot={activeSnapshot} /></div>;
}
