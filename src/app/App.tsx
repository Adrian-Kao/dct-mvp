import { useCallback, useMemo, useState } from "react";
import { useExperience } from "./ExperienceProvider";
import { selectCandidates } from "./selectors";
import { StageFrame } from "../components/StageFrame";
import { TransitionController } from "../motion/TransitionController";
import { StageCanvas } from "../visual/StageCanvas";
import { FallbackStage2D } from "../visual/FallbackStage2D";
import { InputScene } from "../scenes/InputScene";
import { TokenizationScene } from "../scenes/TokenizationScene";
import { VectorScene } from "../scenes/VectorScene";
import { AttentionScene } from "../scenes/AttentionScene";
import { PredictionScene } from "../scenes/PredictionScene";
import { GenerationScene } from "../scenes/GenerationScene";
import { OutputScene } from "../scenes/OutputScene";
import { SummaryScene } from "../scenes/SummaryScene";

function shouldUse2D(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("renderer") === "2d") return true;
  return typeof window.WebGLRenderingContext === "undefined";
}

export default function App() {
  const { state, dispatch, scenario } = useExperience();
  const [renderer2d, setRenderer2d] = useState(shouldUse2D);
  const candidates = useMemo(() => selectCandidates(state, scenario), [scenario, state]);
  const handlePredictionAbsorbed = useCallback(() => {
    dispatch({ type: "PREDICTION_SET_PHASE", phase: "awaitingChoice", meta: { runId: state.runId, sceneInstanceId: state.sceneInstanceId } });
  }, [dispatch, state.runId, state.sceneInstanceId]);
  const scenes = {
    input: <InputScene key={state.sceneInstanceId} />,
    tokenization: <TokenizationScene key={state.sceneInstanceId} />,
    vector: <VectorScene key={state.sceneInstanceId} />,
    attention: <AttentionScene key={state.sceneInstanceId} />,
    prediction: <PredictionScene key={state.sceneInstanceId} />,
    generation: <GenerationScene key={state.sceneInstanceId} />,
    output: <OutputScene key={state.sceneInstanceId} />,
    summary: <SummaryScene key={state.sceneInstanceId} />,
  };
  const visual = renderer2d ? (
    <FallbackStage2D state={state} scenario={scenario} candidates={candidates} />
  ) : (
    <StageCanvas
      state={state}
      scenario={scenario}
      candidates={candidates}
      onVectorToggle={(conceptId) => dispatch({ type: "VECTOR_TOGGLE", conceptId, scenario })}
      onContextLost={() => setRenderer2d(true)}
      onPredictionAbsorbed={handlePredictionAbsorbed}
    />
  );
  return (
    <StageFrame renderer2d={renderer2d} visual={visual} transfer={<TransitionController />}>
      {scenes[state.scene]}
    </StageFrame>
  );
}
