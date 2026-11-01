import { describe, expect, it } from "vitest";
import {
  formatFenceInfo,
  formatHighlightRanges,
  parseFenceInfo,
  parseHighlightRanges,
} from "./fenceInfo";

describe("parseHighlightRanges", () => {
  it("parses singles and ranges", () => {
    expect(parseHighlightRanges("1,3-5")).toEqual([1, 3, 4, 5]);
  });

  it("ignores junk", () => {
    expect(parseHighlightRanges("a,2")).toEqual([2]);
  });
});

describe("parseFenceInfo", () => {
  it("parses lang with brace meta", () => {
    expect(parseFenceInfo("ts{1,3-5}")).toEqual({
      lang: "ts",
      highlightLines: [1, 3, 4, 5],
    });
  });

  it("parses spaced meta", () => {
    expect(parseFenceInfo("javascript {2}")).toEqual({
      lang: "javascript",
      highlightLines: [2],
    });
  });

  it("returns lang only", () => {
    expect(parseFenceInfo("rust")).toEqual({
      lang: "rust",
      highlightLines: [],
    });
  });
});

describe("formatHighlightRanges / formatFenceInfo", () => {
  it("compresses ranges", () => {
    expect(formatHighlightRanges([1, 3, 4, 5, 8])).toBe("1,3-5,8");
  });

  it("builds fence info", () => {
    expect(formatFenceInfo("ts", [1, 3])).toBe("ts{1,3}");
    expect(formatFenceInfo("ts", [])).toBe("ts");
  });

  it("round-trips", () => {
    const info = formatFenceInfo("javascript", [2, 3, 4]);
    expect(parseFenceInfo(info)).toEqual({
      lang: "javascript",
      highlightLines: [2, 3, 4],
    });
  });
});
