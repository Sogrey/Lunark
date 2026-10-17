import { describe, expect, it } from "vitest";
import {
  buildBacklinks,
  expandWikiLinksForPreview,
  extractWikiLinks,
  resolveWikiTarget,
} from "./wikiLinks";

describe("wikiLinks", () => {
  it("extracts and expands", () => {
    const src = "See [[Home Page|home]] and [[Notes]].";
    expect(extractWikiLinks(src)).toHaveLength(2);
    const expanded = expandWikiLinksForPreview(src);
    expect(expanded).toContain("wikilink:");
    expect(expanded).toContain("[home]");
  });

  it("resolves basename", () => {
    const paths = ["D:/w/Home Page.md", "D:/w/Notes.md"];
    expect(resolveWikiTarget("Notes", paths)?.endsWith("Notes.md")).toBe(true);
  });

  it("builds backlinks", () => {
    const bl = buildBacklinks("D:/w/Notes.md", [
      {
        path: "D:/w/Index.md",
        name: "Index.md",
        text: "link [[Notes]] here",
      },
      { path: "D:/w/Notes.md", name: "Notes.md", text: "self [[Notes]]" },
    ]);
    expect(bl).toHaveLength(1);
    expect(bl[0]!.name).toBe("Index.md");
  });
});
