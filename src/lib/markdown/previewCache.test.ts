import { describe, expect, it } from "vitest";
import { splitPreviewBlocks } from "./previewCache";

describe("splitPreviewBlocks", () => {
  it("keeps fences intact and splits on blank lines", () => {
    const src = ["# Hi", "", "para", "", "```js", "a", "", "b", "```", "", "end"].join(
      "\n",
    );
    const blocks = splitPreviewBlocks(src);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const fence = blocks.find((b) => b.source.includes("```js"));
    expect(fence?.source).toContain("a");
    expect(fence?.source).toContain("b");
  });
});
