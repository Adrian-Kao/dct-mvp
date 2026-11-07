import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../app/App";
import { ExperienceProvider } from "../app/ExperienceProvider";

describe("core interactions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?renderer=2d");
  });

  it("tells the visitor about privacy and offers a no-camera path before scanning", async () => {
    render(<ExperienceProvider><App /></ExperienceProvider>);
    await waitFor(() => expect(document.getElementById("stage-root")).toHaveAttribute("data-transition-phase", "idle"), { timeout: 3000 });
    expect(screen.getByText("站到鏡頭前。")).toBeInTheDocument();
    expect(screen.getByText(/不拍照、不上傳/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "不掃描、用預設影像" })).toBeEnabled();
    expect(screen.queryByText("為什麼人會想念一個人？")).not.toBeInTheDocument();
  });

  it("opens the presenter panel with D and safely jumps to a complete summary", () => {
    render(<ExperienceProvider><App /></ExperienceProvider>);
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByRole("complementary", { name: "演示工具" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("場景"), { target: { value: "summary" } });
    fireEvent.click(screen.getByRole("button", { name: "跳至所選場景" }));
    expect(screen.getByText("路徑收據")).toBeInTheDocument();
    expect(screen.getByText("演示預設路徑")).toBeInTheDocument();
    expect(screen.getByText("missing-someone-answer-v1")).toBeInTheDocument();
  });
});
