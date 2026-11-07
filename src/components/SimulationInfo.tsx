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
        <p>這個版本還沒有接上真的語言模型。畫面上的切字、token 編號、星空座標、注意力比例和答案，目前都是預先寫好的示意資料，用來測試體驗流程。</p>
        <ul>
          <li>token 編號是示意數字；之後會換成真實 tokenizer 的 ID。</li>
          <li>站 2 星空座標是手動排的示意位置；之後會換成真實 embedding 降維到三維的結果。</li>
          <li>站 3 圓餅比例是示意權重；之後會換成開源模型實際的注意力權重。</li>
          <li>鍵盤按鍵暫時代替實體裝置：← → 是轉盤，Space 是鎖定鈕或水泵。</li>
        </ul>
        <button ref={closeRef} type="button" className="primary-button" onClick={onClose}>回到體驗</button>
      </section>
    </div>
  );
}
