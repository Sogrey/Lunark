import { describe, expect, it } from "vitest";
import {
  extractToc,
  parseHeadingLine,
  stripHeadingAnchorMarkers,
} from "./toc";

describe("parseHeadingLine", () => {
  it("reads custom anchor", () => {
    expect(parseHeadingLine("## Hello {#hi}")).toEqual({
      level: 2,
      text: "Hello",
      customId: "hi",
    });
  });

  it("returns null customId when absent", () => {
    expect(parseHeadingLine("# Title")).toEqual({
      level: 1,
      text: "Title",
      customId: null,
    });
  });
});

describe("extractToc", () => {
  it("prefers custom ids and uniquifies collisions", () => {
    const toc = extractToc("# A {#x}\n\n## B {#x}\n\n### C\n");
    expect(toc.map((t) => t.id)).toEqual(["x", "x-1", "c"]);
    expect(toc[0]!.text).toBe("A");
  });
});

describe("stripHeadingAnchorMarkers", () => {
  it("removes markers outside fences", () => {
    const src = "## Hi {#a}\n\n```md\n## Keep {#b}\n```\n";
    const out = stripHeadingAnchorMarkers(src);
    expect(out).toContain("## Hi\n");
    expect(out).toContain("## Keep {#b}");
  });
});
