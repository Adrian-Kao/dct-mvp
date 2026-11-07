import { useEffect, useRef } from "react";
import type { AvatarPoint } from "../data/avatar";

interface Props {
  points: AvatarPoint[];
  edges: Array<[number, number]>;
  /** 0..1: only nodes above the scan line are drawn. */
  reveal: number;
  /** 0..1: the face loosens into free-floating nodes. */
  dissolve?: number;
  size: number;
  className?: string;
}

/** Draws the virtual image as glowing nodes and thin lines. */
export function AvatarCanvas({ points, edges, reveal, dissolve = 0, size, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    const limit = reveal * 1.02;
    const placed = points.map(([x, y], index) => {
      const drift = dissolve * 0.18;
      const angle = index * 2.399963;
      return [
        (x + Math.cos(angle) * drift * ((index % 7) / 7)) * size,
        (y + Math.sin(angle) * drift * ((index % 5) / 5)) * size,
      ] as const;
    });
    context.lineWidth = 0.6;
    context.strokeStyle = `rgba(142, 234, 255, ${0.32 * (1 - dissolve)})`;
    context.beginPath();
    for (const [a, b] of edges) {
      if (points[a][1] > limit || points[b][1] > limit) continue;
      context.moveTo(placed[a][0], placed[a][1]);
      context.lineTo(placed[b][0], placed[b][1]);
    }
    context.stroke();
    context.fillStyle = dissolve > 0 ? `rgba(255, 210, 138, ${0.65 + dissolve * 0.35})` : "rgba(216, 251, 255, 0.85)";
    const radius = 1.1 + dissolve * 1.3;
    points.forEach(([, y], index) => {
      if (y > limit) return;
      context.beginPath();
      context.arc(placed[index][0], placed[index][1], radius, 0, Math.PI * 2);
      context.fill();
    });
  }, [dissolve, edges, points, reveal, size]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />;
}
