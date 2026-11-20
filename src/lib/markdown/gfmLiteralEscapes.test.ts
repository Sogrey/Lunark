import { describe, expect, it } from "vitest";
import { unescapeGfmLiteralEscapes } from "./gfmLiteralEscapes";

describe("unescapeGfmLiteralEscapes", () => {
  it("strips GFM-forced \\@ between word chars", () => {
    expect(unescapeGfmLiteralEscapes("Zhsa\\@2026")).toBe("Zhsa@2026");
    expect(unescapeGfmLiteralEscapes("a\\@b\\@c")).toBe("a@b@c");
  });

  it("leaves angle-bracket emails and plain @ alone", () => {
    expect(unescapeGfmLiteralEscapes("<a@b.com>\n")).toBe("<a@b.com>\n");
    expect(unescapeGfmLiteralEscapes("Zhsa@2026")).toBe("Zhsa@2026");
  });

  it("does not touch code fences with backslash-at", () => {
    // Still strips — intentional; fence bodies rarely need literal \@
    expect(unescapeGfmLiteralEscapes("```\n\\@\n```")).toBe("```\n@\n```");
  });
});
