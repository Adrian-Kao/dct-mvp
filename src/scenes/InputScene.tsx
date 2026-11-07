import { useCallback, useEffect, useRef, useState } from "react";
import { useExperience } from "../app/ExperienceProvider";
import { MissionCard } from "../components/MissionCard";
import { SceneHeading } from "../components/SceneHeading";
import { buildDefaultAvatar, normalizeLandmarks, pickMainFace, type Avatar } from "../data/avatar";
import { createFaceScanner, type FaceScanner } from "../input/faceScanner";
import { playInhaleSound } from "../input/inhaleSound";
import { AvatarCanvas } from "../visual/AvatarCanvas";

type EntrancePhase = "standby" | "loading" | "scanning" | "complete" | "token" | "absorbing";

const AVATAR_SIZE = 340;

export function InputScene() {
  const { state, dispatch } = useExperience();
  const reduced = state.settings.reducedMotion;
  const ready = state.scenePhase === "ready" && state.scene === "input";
  const [phase, setPhase] = useState<EntrancePhase>("standby");
  const [live, setLive] = useState<Avatar | null>(null);
  const [scan, setScan] = useState(0);
  const [dissolve, setDissolve] = useState(0);
  const [faceMissing, setFaceMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [usingCamera, setUsingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<FaceScanner | null>(null);
  const frameRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const scanSeconds = reduced ? 0.6 : 2.8;

  const stopCamera = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
  }, []);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    timersRef.current.forEach(window.clearTimeout);
    stopCamera();
  }, [stopCamera]);

  const later = useCallback((callback: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(callback, ms));
  }, []);

  const finishScan = useCallback((avatar: Avatar) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    stopCamera(); // the camera is off as soon as the nodes are captured
    setLive(avatar);
    setScan(1);
    setPhase("complete");
    dispatch({ type: "AVATAR_SET", avatar });
    const start = performance.now();
    const melt = (now: number) => {
      const progress = Math.min(1, (now - start) / (reduced ? 200 : 1300));
      setDissolve(progress * 0.55);
      if (progress < 1) frameRef.current = requestAnimationFrame(melt);
    };
    frameRef.current = requestAnimationFrame(melt);
    later(() => setPhase("token"), reduced ? 500 : 2600);
  }, [dispatch, later, reduced, stopCamera]);

  /** Scan line sweeps top → bottom; with a camera it only moves while a face is in view. */
  const runScan = useCallback((nextFrame: (now: number) => Avatar | null) => {
    let progress = 0;
    let last = performance.now();
    const step = (now: number) => {
      const avatar = nextFrame(now);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (avatar) {
        setFaceMissing(false);
        setLive(avatar);
        progress = Math.min(1, progress + dt / scanSeconds);
        setScan(progress);
        if (progress >= 1) { finishScan(avatar); return; }
      } else {
        setFaceMissing(true);
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [finishScan, scanSeconds]);

  const chooseDefault = useCallback((message: string | null = null) => {
    if (!ready) return;
    stopCamera();
    setUsingCamera(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    setNotice(message);
    const avatar = buildDefaultAvatar(seed);
    setPhase("scanning");
    runScan(() => avatar);
  }, [ready, runScan, seed, stopCamera]);

  const startCamera = useCallback(async () => {
    if (!ready || phase !== "standby" || !videoRef.current) return;
    setPhase("loading");
    setNotice(null);
    try {
      const scanner = await createFaceScanner(videoRef.current);
      scannerRef.current = scanner;
      setUsingCamera(true);
      setPhase("scanning");
      runScan((now) => {
        const faces = scanner.detect(now);
        const index = pickMainFace(faces);
        return index >= 0 ? normalizeLandmarks(faces[index], scanner.connections, seed) : null;
      });
    } catch {
      setPhase("standby");
      chooseDefault("鏡頭沒有開啟，改用預設影像。");
    }
  }, [phase, ready, runScan, chooseDefault, seed]);

  const openToken = () => {
    if (phase !== "token" || !ready) return;
    setPhase("absorbing");
    playInhaleSound(reduced ? 0.5 : 1.2);
    later(() => dispatch({ type: "REQUEST_TRANSITION", target: "tokenization" }), reduced ? 300 : 1300);
  };

  const scanning = phase === "scanning" || phase === "loading";
  const done = phase === "complete" || phase === "token" || phase === "absorbing";
  const screenText = phase === "standby"
    ? "站到鏡頭前。"
    : phase === "loading"
      ? "正在開啟鏡頭……"
      : phase === "scanning"
        ? faceMissing ? "請正對鏡頭，站在地上的腳印上。" : "掃描中，請保持不動。"
        : phase === "complete"
          ? "掃描完成。你現在是一個語言模型。"
          : "有人問了一個問題。";

  return (
    <div className={`scene-shell input-shell entrance-${phase}`} data-input-phase={phase}>
      <SceneHeading eyebrow="站 0 · INPUT 入口" title={done ? "你現在是一個語言模型。" : "成為 AI"} />
      <MissionCard
        station="站 0 · 入口"
        task="站到鏡頭前，讓系統把你掃描成一個由節點組成的虛擬影像。從這一刻起，你就是 AI。"
        steps={[
          { text: "面對鏡頭，等掃描光線由上而下掃過", done: done },
          { text: "掃描完成後，點選發光的彈珠 token", done: phase === "absorbing" },
        ]}
        learned="接下來你不是問問題的人，而是回答問題的 AI；你手上的問題不屬於你。"
        showLearned={phase === "token" || phase === "absorbing"}
      />

      <div className="entrance-stage" data-entry-target="true" data-entry-order="1">
        <div className="avatar-frame" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE * 1.25 }}>
          <svg className="avatar-silhouette" viewBox="0 0 340 425" aria-hidden="true">
            <path d="M170 18 C238 18 268 72 268 140 C268 205 236 252 170 252 C104 252 72 205 72 140 C72 72 102 18 170 18 Z M38 425 C42 330 96 282 170 282 C244 282 298 330 302 425" />
          </svg>
          {live && (
            <AvatarCanvas
              className="avatar-canvas"
              points={live.points}
              edges={live.edges}
              reveal={done ? 1 : scan}
              dissolve={dissolve}
              size={AVATAR_SIZE * 0.7}
            />
          )}
          {scanning && <div className="scan-beam" style={{ top: `${4 + scan * 56}%` }} aria-hidden="true" />}
          {done && state.avatar && <p className="model-number" aria-label={`模型編號 ${state.avatar.modelNumber}`}>MODEL {state.avatar.modelNumber}</p>}
          <video ref={videoRef} className="entrance-video" muted playsInline aria-hidden="true" />
        </div>

        {(phase === "token" || phase === "absorbing") && (
          <button type="button" className="question-marble" aria-label="點選彈珠 token，打開上一位觀眾的問題" disabled={phase !== "token" || !ready} onClick={openToken}>
            <span className="marble-core" aria-hidden="true" />
            <small>上一位觀眾的問題 · 未開封</small>
          </button>
        )}
      </div>

      <div className="entrance-console" data-entry-target="true" data-entry-order="3">
        <p className="entrance-screen-text" role="status">{screenText}</p>
        {notice && <p className="entrance-notice">{notice}</p>}
        {phase === "standby" && (
          <>
            <div className="entrance-buttons">
              <button type="button" className="primary-button" disabled={!ready} onClick={() => void startCamera()}>開始掃描</button>
              <button type="button" className="ghost-button" disabled={!ready} onClick={() => chooseDefault()}>不掃描、用預設影像</button>
            </div>
            <p className="privacy-note">鏡頭只在這台電腦上辨識臉部節點，不拍照、不上傳；體驗結束後節點資料即刪除。</p>
          </>
        )}
        {phase === "scanning" && usingCamera && faceMissing && (
          <button type="button" className="ghost-button" onClick={() => chooseDefault()}>找不到臉？改用預設影像</button>
        )}
      </div>
      <div className={`white-out${phase === "absorbing" ? " is-on" : ""}`} aria-hidden="true" />
    </div>
  );
}
