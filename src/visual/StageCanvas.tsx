import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ExperienceState } from "../app/experienceReducer";
import type { ChoiceFixture, ScenarioFixture } from "../data/scenarioTypes";
import { BackgroundParticles } from "./BackgroundParticles";
import { PredictionParticles } from "./PredictionParticles";
import { qualityConfig } from "./visualConfig";
import { VectorWorld } from "./VectorWorld";

interface Props {
  state: ExperienceState;
  scenario: ScenarioFixture;
  candidates: ChoiceFixture[];
  onVectorToggle: (id: string) => void;
  onContextLost: () => void;
}

export function StageCanvas({ state, scenario, candidates, onVectorToggle, onContextLost }: Props) {
  const quality = qualityConfig[state.settings.quality];
  return (
    <div className="stage-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, quality.pixelRatio]}
        camera={{ position: [0, 0, 8.5], fov: 48, near: 0.1, far: 80 }}
        gl={{ antialias: state.settings.quality !== "low", alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            onContextLost();
          }, { once: true });
        }}
      >
        <Suspense fallback={null}>
          <BackgroundParticles reducedMotion={state.settings.reducedMotion} active={state.scene !== "output" && state.scene !== "summary"} transitionPhase={state.transitionVisualPhase} />
          {state.scene === "vector" && (
            <VectorWorld
              scenario={scenario}
              selectedIds={state.exploredConceptIds}
              onToggle={onVectorToggle}
              resetKey={state.sceneInstanceId}
              reducedMotion={state.settings.reducedMotion}
              transitionPhase={state.transitionVisualPhase}
            />
          )}
          {state.scene === "prediction" && candidates.length === 3 && (
            <PredictionParticles
              key={`${state.sceneInstanceId}-${state.prediction.round}`}
              phase={state.prediction.phase}
              round={state.prediction.round}
              candidates={candidates}
              selectedId={state.prediction.pendingCandidateId}
              total={quality.particles}
              seed={scenario.seed}
              reducedMotion={state.settings.reducedMotion}
              transitionPhase={state.transitionVisualPhase}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
