import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SimulationInfo({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="info-panel" role="dialog" aria-modal="true" aria-labelledby="simulation-info-title">
        <p className="eyebrow">ABOUT THIS SIMULATION</p>
        <h2 id="simulation-info-title">關於這個示意</h2>
        <p>此演示使用預設資料，不執行語言模型。畫面中的 token 切分、三維位置、關聯線與候選機率皆為教學／藝術示意。Attention 站的選擇是在切換預寫內容，不是在修改真實模型權重。</p>
        <ul>
          <li><code>t01</code> 等是本地示意單位，不是真實 token ID。</li>
          <li>百分比只正規化三個畫面候選，不代表完整詞彙表。</li>
          <li>概念位置是美術配置；粒子量不代表參數、算力或計算次數。</li>
          <li>Generation 播放預設文字片段，不是模型內部思考或即時輸出。</li>
        </ul>
        <button ref={closeRef} type="button" className="primary-button" onClick={onClose}>回到體驗</button>
      </section>
    </div>
  );
}
