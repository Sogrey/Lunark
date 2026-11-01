import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("ranks substring higher", () => {
    expect(fuzzyScore("插入表格", "表格")).toBeGreaterThan(
      fuzzyScore("插入表格", "cb"),
    );
  });

  it("matches sequential chars", () => {
    expect(fuzzyScore("heading 1", "hd1")).toBeGreaterThan(0);
  });

  it("rejects non-matches", () => {
    expect(fuzzyScore("tip", "zzz")).toBe(0);
  });
});

describe("fuzzyFilter", () => {
  it("filters and sorts", () => {
    const items = ["插入提示", "插入表格", "切换模式"];
    expect(fuzzyFilter(items, "插入", (x) => x)).toEqual([
      "插入提示",
      "插入表格",
    ]);
  });
});
