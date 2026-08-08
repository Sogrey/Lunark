import { describe, expect, it } from "vitest";
import { computeDocStats } from "./wordStats";

describe("computeDocStats", () => {
  it("empty document", () => {
    expect(computeDocStats("")).toEqual({
      chars: 0,
      charsNoSpace: 0,
      words: 0,
      lines: 0,
    });
  });

  it("counts CJK chars as words", () => {
    const s = computeDocStats("你好世界");
    expect(s.words).toBe(4);
    expect(s.chars).toBe(4);
    expect(s.lines).toBe(1);
  });

  it("counts latin words", () => {
    const s = computeDocStats("hello world foo");
    expect(s.words).toBe(3);
  });

  it("mixes CJK and latin", () => {
    const s = computeDocStats("Hello 世界");
    expect(s.words).toBe(3);
  });

  it("counts lines", () => {
    expect(computeDocStats("a\nb\nc").lines).toBe(3);
  });
});
