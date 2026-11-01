import { describe, expect, it } from "vitest";
import {
  collectFootnoteIds,
  footnoteSnippet,
  footnotesToHybrid,
  hybridFootnotesToCanonical,
  isFootnoteSnippet,
  nextFootnoteId,
} from "./footnotes";

describe("footnotes", () => {
  it("collects ids from refs and defs", () => {
    const md = "a[^1] b[^note]\n\n[^1]: x\n[^note]: y\n";
    expect([...collectFootnoteIds(md)].sort()).toEqual(["1", "note"]);
  });

  it("next id skips used integers", () => {
    expect(nextFootnoteId("")).toBe("1");
    expect(nextFootnoteId("x[^1][^3]\n\n[^1]:a\n[^3]:b")).toBe("2");
    expect(nextFootnoteId("[^note]: z")).toBe("1");
  });

  it("builds snippet", () => {
    expect(footnoteSnippet("2", "正文")).toBe("[^2]\n\n[^2]: 正文\n");
  });

  it("detects footnote snippet", () => {
    expect(isFootnoteSnippet("[^1]\n\n[^1]: hi\n")).toBe(true);
    expect(isFootnoteSnippet("[TOC]")).toBe(false);
  });

  it("round-trips hybrid footnote def protection", () => {
    const src = "脚注[^1]。\n\n[^1]: 更多见帮助。\n";
    const hybrid = footnotesToHybrid(src);
    expect(hybrid).toContain("[^1]\u200B:");
    expect(hybrid).not.toMatch(/^\[\^1\]:/m);
    expect(hybridFootnotesToCanonical(hybrid)).toBe(src);
  });
});
