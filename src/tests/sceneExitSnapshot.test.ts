import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, experienceReducer } from "../app/experienceReducer";
import { captureSceneExitSnapshot } from "../motion/sceneExitSnapshot";

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function addItem(stage: HTMLElement, id: string, role: "retained" | "discarded" | "chrome", bounds: DOMRect, source = "dom") {
  const item = document.createElement("div");
  item.dataset.transitionItem = "true";
  item.dataset.transitionId = id;
  item.dataset.transitionRole = role;
  item.dataset.transitionSource = source;
  item.getBoundingClientRect = () => bounds;
  stage.append(item);
}

describe("scene exit snapshot", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("normalizes retained and discarded origins against the stage and fixes the target at its center", () => {
    const stage = document.createElement("main");
    stage.dataset.renderer = "dom";
    stage.getBoundingClientRect = () => rect(100, 50, 1000, 600);
    addItem(stage, "left-retained", "retained", rect(180, 110, 40, 20));
    addItem(stage, "right-discarded", "discarded", rect(870, 420, 60, 40));
    addItem(stage, "header", "chrome", rect(100, 50, 1000, 70));
    addItem(stage, "wrong-renderer", "retained", rect(450, 250, 30, 30), "webgl");
    document.body.append(stage);

    const initial = { ...createInitialState("fixture"), scene: "tokenization" as const };
    const state = experienceReducer(initial, { type: "REQUEST_TRANSITION", target: "vector" });
    const snapshot = captureSceneExitSnapshot(stage, state);

    expect(snapshot.center).toEqual({ x: 0.5, y: 0.5 });
    expect(snapshot.items.map((item) => item.id)).toEqual(["left-retained", "right-discarded", "header"]);
    expect(snapshot.items[0]).toMatchObject({ role: "retained", x: 0.1, y: 0.11666666666666667, width: 0.04 });
    expect(snapshot.items[1]).toMatchObject({ role: "discarded", x: 0.8, y: 0.65, width: 0.06 });
    expect(snapshot.items[2]).toMatchObject({ role: "chrome", x: 0.5 });
    expect(snapshot.hasDiscarded).toBe(true);
  });
});
