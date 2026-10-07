import { forwardRef, type CSSProperties } from "react";
import type { TransitionSnapshot, TransitionSnapshotItem } from "./transitionTypes";

interface Props {
  snapshot: TransitionSnapshot | null;
}

function hashUnit(text: string, offset: number): number {
  let value = 2166136261 + offset * 374761393;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 10000) / 10000;
}

function scatterTarget(item: TransitionSnapshotItem, index: number) {
  let dx = item.x - 0.5;
  let dy = item.y - 0.5;
  if (Math.hypot(dx, dy) < 0.08) {
    const angle = hashUnit(item.id, index + 31) * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
  }
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const side = hashUnit(item.id, index + 71) - 0.5;
  const distance = 0.09 + hashUnit(item.id, index + 101) * 0.09;
  return {
    x: item.x + (dx / length) * distance - (dy / length) * side * 0.045,
    y: item.y + (dy / length) * distance + (dx / length) * side * 0.045,
  };
}

function retainedStyle(item: TransitionSnapshotItem): CSSProperties {
  return { left: `${item.x * 100}%`, top: `${item.y * 100}%` };
}

export const TransferOrbOverlay = forwardRef<HTMLDivElement, Props>(function TransferOrbOverlay({ snapshot }, ref) {
  const retained = snapshot?.items.filter((item) => item.role === "retained") ?? [];
  const discarded = snapshot?.items.filter((item) => item.role === "discarded") ?? [];
  const discardParticleCount = snapshot?.reducedMotion ? 5 : 12;
  return (
    <div className="transfer-overlay" aria-hidden="true" data-transition-snapshot={snapshot ? `${snapshot.from}-${snapshot.transitionId}` : undefined}>
      <div className="transfer-proxies">
        {retained.map((item, index) => (
          <i
            key={item.id}
            className="transfer-data-dot"
            data-retained-dot="true"
            data-dot-index={index}
            data-origin-x={item.x}
            data-origin-y={item.y}
            style={retainedStyle(item)}
          />
        ))}
        {discarded.flatMap((item) => Array.from({ length: discardParticleCount }, (_, index) => {
          const jitterX = (hashUnit(item.id, index + 1) - 0.5) * item.width * 0.72;
          const jitterY = (hashUnit(item.id, index + 11) - 0.5) * item.height * 0.72;
          const x = item.x + jitterX;
          const y = item.y + jitterY;
          const target = scatterTarget({ ...item, x, y }, index);
          return (
            <i
              key={`${item.id}-discard-${index}`}
              className="discard-particle"
              data-discard-particle="true"
              data-target-x={target.x}
              data-target-y={target.y}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          );
        }))}
      </div>
      <div ref={ref} className="transfer-orb" data-testid="transfer-orb"><span /></div>
    </div>
  );
});
