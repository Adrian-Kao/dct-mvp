/**
 * The visitor's "virtual image": a cloud of face nodes plus the lines between them.
 * Only node coordinates are kept (never a photo), and they live in memory for one run only.
 */
export type AvatarPoint = [number, number];

export interface Avatar {
  source: "camera" | "default";
  /** Normalised to a 0..1 box, x left→right, y top→bottom, face centred. */
  points: AvatarPoint[];
  edges: Array<[number, number]>;
  /** The number that floats up when the visitor "becomes" a model, e.g. "#0427". */
  modelNumber: string;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function modelNumberFrom(seed: number): string {
  return `#${String(Math.abs(Math.floor(seed)) % 10000).padStart(4, "0")}`;
}

/** Connect every point to its k nearest neighbours (deduplicated). Good enough for a stylised mesh. */
export function nearestEdges(points: AvatarPoint[], k = 3): Array<[number, number]> {
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  points.forEach((point, index) => {
    points
      .map((other, otherIndex) => ({ otherIndex, distance: Math.hypot(other[0] - point[0], other[1] - point[1]) }))
      .filter((item) => item.otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
      .forEach(({ otherIndex }) => {
        const key = index < otherIndex ? `${index}-${otherIndex}` : `${otherIndex}-${index}`;
        if (seen.has(key)) return;
        seen.add(key);
        edges.push(index < otherIndex ? [index, otherIndex] : [otherIndex, index]);
      });
  });
  return edges;
}

/** The "不掃描、用預設影像" face: a stylised oval with eyes, nose and mouth made of nodes. */
export function buildDefaultAvatar(seed = 72931): Avatar {
  const random = mulberry32(seed);
  const points: AvatarPoint[] = [];
  const cx = 0.5;
  const cy = 0.5;
  const rx = 0.34;
  const ry = 0.45;
  for (let i = 0; i < 48; i += 1) {
    const angle = (i / 48) * Math.PI * 2;
    const squeeze = Math.sin(angle) > 0 ? 0.86 + 0.14 * Math.cos(angle) ** 2 : 1; // narrower chin
    points.push([cx + Math.cos(angle) * rx * squeeze, cy + Math.sin(angle) * ry]);
  }
  for (let i = 0; i < 150; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 0.9;
    points.push([cx + Math.cos(angle) * rx * radius, cy + Math.sin(angle) * ry * radius]);
  }
  for (const eyeX of [0.37, 0.63]) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      points.push([eyeX + Math.cos(angle) * 0.065, 0.43 + Math.sin(angle) * 0.028]);
    }
  }
  for (let i = 0; i < 7; i += 1) points.push([0.5 + (i % 2 ? 0.012 : -0.012), 0.46 + i * 0.022]);
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    points.push([0.5 + Math.cos(angle) * 0.11, 0.72 + Math.sin(angle) * 0.03]);
  }
  return { source: "default", points, edges: nearestEdges(points, 3), modelNumber: modelNumberFrom(seed) };
}

/**
 * Turn raw camera landmarks (0..1 of the video frame) into a centred, mirrored face box,
 * so the visitor sees themselves as in a mirror.
 */
export function normalizeLandmarks(landmarks: Array<{ x: number; y: number }>, connections: Array<{ start: number; end: number }>, seed: number): Avatar {
  const xs = landmarks.map((point) => 1 - point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const offsetX = (size - (maxX - minX)) / 2;
  const offsetY = (size - (maxY - minY)) / 2;
  const points: AvatarPoint[] = xs.map((x, index) => [
    0.05 + 0.9 * ((x - minX + offsetX) / size),
    0.05 + 0.9 * ((ys[index] - minY + offsetY) / size),
  ]);
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (const { start, end } of connections) {
    if (!points[start] || !points[end]) continue;
    const key = start < end ? `${start}-${end}` : `${end}-${start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([start, end]);
  }
  return { source: "camera", points, edges, modelNumber: modelNumberFrom(seed) };
}

/**
 * When several people are in frame, the visitor is the largest face nearest the centre,
 * so friends can stand beside them without stealing the scan.
 */
export function pickMainFace(faces: Array<Array<{ x: number; y: number }>>): number {
  let best = -1;
  let bestScore = -Infinity;
  faces.forEach((face, index) => {
    if (!face.length) return;
    const xs = face.map((point) => point.x);
    const ys = face.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const centreX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centreY = (Math.max(...ys) + Math.min(...ys)) / 2;
    const score = width * height - Math.hypot(centreX - 0.5, centreY - 0.5) * 0.05;
    if (score > bestScore) { bestScore = score; best = index; }
  });
  return best;
}
