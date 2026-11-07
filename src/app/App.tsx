import { useState } from "react";
import { AttentionScene } from "../scenes/AttentionScene";
import { useExperience } from "./ExperienceProvider";
import { StageFrame } from "../components/StageFrame";
import { StationCard } from "../components/StationCard";
import { TransitionController } from "../motion/TransitionController";
import { StageCanvas } from "../visual/StageCanvas";
import { FallbackStage2D } from "../visual/FallbackStage2D";
import { InputScene } from "../scenes/InputScene";
import { TokenizationScene } from "../scenes/TokenizationScene";
import { VectorScene } from "../scenes/VectorScene";
import { PredictionScene } from "../scenes/PredictionScene";
import { GenerationScene } from "../scenes/GenerationScene";
import { OutputScene } from "../scenes/OutputScene";
import { SummaryScene } from "../scenes/SummaryScene";

function shouldUse2D(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("renderer") === "2d") return true;
  return typeof window.WebGLRenderingContext === "undefined";
}

/** Station 4: first the probability wheel draws the opening words, then the pump grows the rest. */
function GenerationStation() {
  const { state } = useExperience();
  const [pumping, setPumping] = useState(state.prediction.complete);
  return pumping ? <GenerationScene /> : <PredictionScene onDone={() => setPumping(true)} />;
}

export default function App() {
  const { state } = useExperience();
  const [renderer2d, setRenderer2d] = useState(shouldUse2D);
  const scenes = {
    input: <InputScene key={state.sceneInstanceId} />,
    tokenization: <TokenizationScene key={state.sceneInstanceId} />,
    vector: <VectorScene key={state.sceneInstanceId} />,
    attention: <AttentionScene key={state.sceneInstanceId} />,
    generation: <GenerationStation key={state.sceneInstanceId} />,
    output: <OutputScene key={state.sceneInstanceId} />,
    summary: <SummaryScene key={state.sceneInstanceId} />,
  };
  const visual = renderer2d ? (
    <FallbackStage2D state={state} />
  ) : (
    <StageCanvas
      state={state}
      onContextLost={() => setRenderer2d(true)}
    />
  );
  return (
    <>
      <StageFrame renderer2d={renderer2d} visual={visual} transfer={<TransitionController />}>
        {scenes[state.scene]}
      </StageFrame>
      <StationCard />
    </>
  );
}
