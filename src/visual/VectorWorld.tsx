import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import type { ScenarioFixture } from "../data/scenarioTypes";
import type { TransitionVisualPhase } from "../motion/transitionTypes";

interface Props {
  scenario: ScenarioFixture;
  selectedIds: string[];
  onToggle: (id: string) => void;
  resetKey: number;
  reducedMotion: boolean;
  transitionPhase: TransitionVisualPhase;
}

function transitionOpacity(role: "retained" | "discarded", phase: TransitionVisualPhase) {
  if (phase === "resolvingChoice") return role === "discarded" ? 0.08 : 1;
  if (phase === "compacting") return role === "retained" ? 0.12 : 0;
  if (["converging", "coreReady", "exiting", "blackSwap", "blackHold", "enteringCore", "centerHold"].includes(phase)) return 0;
  return 1;
}

export function VectorWorld({ scenario, selectedIds, onToggle, resetKey, reducedMotion, transitionPhase }: Props) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0.04, y: 0 });
  const drag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  useFrame((_, delta) => {
    if (!group.current) return;
    const amount = reducedMotion ? 1 : Math.min(1, delta * 6);
    group.current.rotation.x += (target.current.x - group.current.rotation.x) * amount;
    group.current.rotation.y += (target.current.y - group.current.rotation.y) * amount;
  });

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    setDragging(true);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) > 6) drag.current.moved = true;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    target.current.y = THREE.MathUtils.clamp(target.current.y + dx * 0.004, -0.61, 0.61);
    target.current.x = THREE.MathUtils.clamp(target.current.x + dy * 0.003, -0.35, 0.35);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    setDragging(false);
  };

  return (
    <>
      <group ref={group} key={resetKey}>
        {scenario.vectorNodes.filter((node) => node.id !== "childhood").map((node) => {
          const selected = selectedIds.includes(node.id);
          const opacity = transitionOpacity(selected ? "retained" : "discarded", transitionPhase);
          return <Line key={`line-${node.id}`} points={[[0, 0, 0], node.position]} color={selected ? "#ffd28a" : "#304a5f"} lineWidth={selected ? 1.8 : 0.55} transparent opacity={(selected ? 0.9 : 0.4) * opacity} />;
        })}
        {scenario.vectorNodes.map((node) => {
          const selected = selectedIds.includes(node.id);
          const retained = node.id === "childhood" || selected;
          const opacity = transitionOpacity(retained ? "retained" : "discarded", transitionPhase);
          return (
            <group key={node.id} position={node.position}>
              <mesh>
                <sphereGeometry args={[node.id === "childhood" ? 0.18 : 0.11, 20, 20]} />
                <meshBasicMaterial color={selected ? "#ffd28a" : node.id === "childhood" ? "#8eeaff" : "#78aabd"} toneMapped={false} transparent opacity={opacity} />
              </mesh>
              <Html center transform={false} distanceFactor={9} style={{ pointerEvents: "auto" }}>
                {node.selectable ? (
                  <button
                    type="button"
                    className={`vector-node-label${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    data-transition-item="true"
                    data-transition-id={`vector-${node.id}`}
                    data-transition-role={selected ? "retained" : "discarded"}
                    data-transition-source="webgl"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!drag.current?.moved) onToggle(node.id);
                    }}
                  >
                    {node.label}
                  </button>
                ) : (
                  <span
                    className="vector-node-label vector-node-center"
                    data-transition-item="true"
                    data-transition-id="vector-childhood"
                    data-transition-role="retained"
                    data-transition-source="webgl"
                  >{node.label}</span>
                )}
              </Html>
            </group>
          );
        })}
      </group>
      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div
          className={`vector-drag-surface${dragging ? " is-dragging" : ""}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </Html>
    </>
  );
}
