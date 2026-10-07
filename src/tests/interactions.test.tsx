import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../app/App";
import { ExperienceProvider } from "../app/ExperienceProvider";

describe("core interactions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?renderer=2d");
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("does not submit a short simulated hold", () => {
    render(<ExperienceProvider><App /></ExperienceProvider>);
    const button = screen.getByRole("button", { name: "按住提問" });
    fireEvent.pointerDown(button, { pointerId: 1 });
    vi.advanceTimersByTime(300);
    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(screen.getByText("按得太短了，請再按住一下。")).toBeInTheDocument();
    expect(screen.queryByText("YOUR QUESTION")).not.toBeInTheDocument();
  });

  it("opens the presenter panel with D and safely jumps to a complete summary", () => {
    render(<ExperienceProvider><App /></ExperienceProvider>);
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByRole("complementary", { name: "演示工具" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("場景"), { target: { value: "summary" } });
    fireEvent.change(screen.getByLabelText("安全預設路線"), { target: { value: "cognition" } });
    fireEvent.click(screen.getByRole("button", { name: "跳至所選場景" }));
    expect(screen.getByText("PATH RECEIPT")).toBeInTheDocument();
    expect(screen.getByText("演示預設路徑")).toBeInTheDocument();
    expect(screen.getByText("cognition:repeated:routines")).toBeInTheDocument();
  });
});
