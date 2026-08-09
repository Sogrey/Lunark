import { describe, expect, it } from "vitest";
import { isVacantPreviewMarkdown } from "./previewBlockSource";

describe("isVacantPreviewMarkdown", () => {
  it("treats empty and bare dollar fences as vacant", () => {
    expect(isVacantPreviewMarkdown("")).toBe(true);
    expect(isVacantPreviewMarkdown("   ")).toBe(true);
    expect(isVacantPreviewMarkdown("$$$$")).toBe(true);
    expect(isVacantPreviewMarkdown("$$")).toBe(true);
    expect(isVacantPreviewMarkdown("$$\n$$")).toBe(true);
    expect(isVacantPreviewMarkdown("$$\n\n$$")).toBe(true);
    expect(isVacantPreviewMarkdown("```mermaid\n\n```")).toBe(true);
    expect(isVacantPreviewMarkdown("```latex\n\n```")).toBe(true);
  });

  it("keeps real formula / mermaid", () => {
    expect(isVacantPreviewMarkdown("$$x^2$$")).toBe(false);
    expect(
      isVacantPreviewMarkdown("$$\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx$$"),
    ).toBe(false);
    expect(
      isVacantPreviewMarkdown("```mermaid\nflowchart LR\n  A --> B\n```"),
    ).toBe(false);
  });
});
