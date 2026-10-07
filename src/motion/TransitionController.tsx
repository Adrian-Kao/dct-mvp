import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
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

export function TransitionController() {
  const { state, dispatch, scenario } = useExperience();
  const orbRef = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<TransitionSnapshot | null>(null);
  const activeSnapshot = state.transitionId !== null && snapshot?.transitionId === state.transitionId ? snapshot : null;

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
    if (!orb) return;
    if (!activeSnapshot) {
      gsap.set(orb, { left: "50%", top: "50%", opacity: 0, scale: 0.45 });
      return;
    }

    const oldMeta = { runId: activeSnapshot.runId, sceneInstanceId: activeSnapshot.sceneInstanceId };
    const newMeta = { runId: activeSnapshot.runId, sceneInstanceId: activeSnapshot.sceneInstanceId + 1 };
    const path = pathFor(activeSnapshot.from, activeSnapshot.to);
    const scale = activeSnapshot.reducedMotion ? 0.24 : 1;
    const retainedDots = gsap.utils.toArray<HTMLElement>("[data-retained-dot='true']", scope.current);
    const discardedDots = gsap.utils.toArray<HTMLElement>("[data-discard-particle='true']", scope.current);
    const phase = (value: TransitionVisualPhase, meta = oldMeta) => dispatch({
      type: "TRANSITION_VISUAL_PHASE",
      phase: value,
      transitionId: activeSnapshot.transitionId,
      meta,
    });

    gsap.set(retainedDots, { opacity: 0, scale: 0.25 });
    if (discardedDots.length > 0) gsap.set(discardedDots, { opacity: 0, scale: 0.35 });
    gsap.set(orb, { left: "50%", top: "50%", opacity: 0, scale: 0.35 });
    orb.dataset.direction = path.exitDirection;

    const timeline = gsap.timeline();
    const setPhase = (value: TransitionVisualPhase, meta = oldMeta) => timeline.call(() => phase(value, meta));
    setPhase("locking");

    if (activeSnapshot.hasDiscarded) {
      setPhase("resolvingChoice");
      timeline.to({ value: 0 }, { value: 1, duration: motionDurations.transfer.selectedHold * scale });
      timeline.to(discardedDots, {
        opacity: 0.92,
        scale: 1,
        duration: 0.08 * scale,
        stagger: 0.004 * scale,
      });
      timeline.to(discardedDots, {
        left: (_index, target) => `${Number.parseFloat((target as HTMLElement).dataset.targetX ?? "0.5") * 100}%`,
        top: (_index, target) => `${Number.parseFloat((target as HTMLElement).dataset.targetY ?? "0.5") * 100}%`,
        opacity: 0,
        scale: 0.2,
        duration: motionDurations.transfer.discard * scale,
        ease: "power2.out",
        stagger: 0.003 * scale,
      });
    }

    setPhase("compacting");
    timeline.to(retainedDots, {
      opacity: 1,
      scale: 1,
      duration: motionDurations.transfer.compact * scale,
      stagger: 0.025 * scale,
      ease: "power2.out",
    });

    setPhase("converging");
    timeline.to(retainedDots, {
      left: "50%",
      top: "50%",
      scale: 0.62,
      opacity: 0.18,
      duration: motionDurations.transfer.converge * scale,
      stagger: 0.035 * scale,
      ease: "power3.inOut",
    }, "converge");
    timeline.to(orb, {
      opacity: 1,
      scale: 1,
      duration: motionDurations.transfer.converge * 0.62 * scale,
      ease: "power2.out",
    }, `converge+=${motionDurations.transfer.converge * 0.38 * scale}`);

    setPhase("coreReady");
    timeline.to(orb, { scale: 1.34, duration: motionDurations.transfer.coreHold * 0.45 * scale, ease: "power2.out" });
    timeline.to(orb, { scale: 1, duration: motionDurations.transfer.coreHold * 0.55 * scale, ease: "sine.inOut" });

    if (activeSnapshot.mode === "restart") {
      timeline.to(orb, {
        opacity: 0,
        scale: 0.38,
        duration: motionDurations.transfer.restartFade * scale,
        ease: "power2.in",
        onComplete: () => dispatch({ type: "RESET_EXPERIENCE" }),
      });
    } else {
      setPhase("exiting");
      timeline.to(orb, {
        left: `${path.exit[0] * 100}%`,
        top: `${path.exit[1] * 100}%`,
        scale: 0.72,
        opacity: 1,
        duration: motionDurations.transfer.exit * scale,
        ease: "power3.in",
      });
      timeline.call(() => {
        phase("swapping");
        if (activeSnapshot.mode === "prediction") {
          dispatch({ type: "PREDICTION_TRANSFER_SWAP", transitionId: activeSnapshot.transitionId, meta: oldMeta, scenario });
        } else {
          dispatch({ type: "TRANSITION_SWAP", target: activeSnapshot.to, transitionId: activeSnapshot.transitionId, meta: oldMeta });
        }
        orb.dataset.direction = path.enterDirection;
        gsap.set(orb, { left: `${path.enterStart[0] * 100}%`, top: `${path.enterStart[1] * 100}%`, opacity: activeSnapshot.reducedMotion ? 0.3 : 1, scale: 0.72 });
      });
      timeline.to(orb, {
        left: "50%",
        top: "50%",
        opacity: 1,
        scale: 1,
        duration: motionDurations.transfer.enter * scale,
        ease: "power3.out",
      });
      timeline.call(() => phase("expanding", newMeta));
      timeline.to(orb, {
        opacity: 0,
        scale: 1.55,
        duration: motionDurations.transfer.expand * scale,
        ease: "power2.out",
        onComplete: () => dispatch({ type: "TRANSITION_READY", transitionId: activeSnapshot.transitionId, meta: newMeta }),
      });
    }

    const handleVisibility = () => document.hidden ? timeline.pause() : timeline.resume();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      timeline.kill();
    };
  }, { scope, dependencies: [activeSnapshot?.transitionId, activeSnapshot?.runId] });

  return <div ref={scope}><TransferOrbOverlay ref={orbRef} snapshot={activeSnapshot} /></div>;
}
