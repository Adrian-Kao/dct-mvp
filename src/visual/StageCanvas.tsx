import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ExperienceState } from "../app/experienceReducer";
import { BackgroundParticles } from "./BackgroundParticles";
import { qualityConfig } from "./visualConfig";

interface Props {
  state: ExperienceState;
  onContextLost: () => void;
}

export function StageCanvas({ state, onContextLost }: Props) {
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
        </Suspense>
      </Canvas>
    </div>
  );
}
