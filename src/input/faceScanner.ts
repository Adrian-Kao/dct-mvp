import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export interface FaceScanner {
  /** Faces in the current video frame, as 0..1 landmark lists (478 points each). */
  detect(timestamp: number): Array<Array<{ x: number; y: number }>>;
  connections: Array<{ start: number; end: number }>;
  stop(): void;
}

const base = import.meta.env.BASE_URL;

/**
 * Opens the entrance camera and loads MediaPipe Face Landmarker from local files (no network).
 * Recognition runs in this browser only; frames are never stored or sent anywhere.
 */
export async function createFaceScanner(video: HTMLVideoElement): Promise<FaceScanner> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false });
  let landmarker: FaceLandmarker | null = null;
  try {
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    const options = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate },
      runningMode: "VIDEO" as const,
      numFaces: 3,
    });
    try {
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options("GPU"));
    } catch {
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options("CPU"));
    }
    const ready = landmarker;
    let lastTimestamp = -1;
    return {
      connections: vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      detect(timestamp) {
        if (video.readyState < 2) return [];
        const safeTimestamp = Math.max(timestamp, lastTimestamp + 1);
        lastTimestamp = safeTimestamp;
        return ready.detectForVideo(video, safeTimestamp).faceLandmarks;
      },
      stop() {
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
        ready.close();
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    landmarker?.close();
    throw error;
  }
}
