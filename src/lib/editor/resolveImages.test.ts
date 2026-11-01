import { describe, expect, it } from "vitest";
import { refFromMarkdownImage, refsFromSnippets } from "./resolveImages";

describe("refFromMarkdownImage", () => {
  it("extracts url", () => {
    expect(refFromMarkdownImage("![alt](./assets/a.png)")).toBe(
      "./assets/a.png",
    );
  });

  it("extracts remote", () => {
    expect(refFromMarkdownImage("![](https://x.test/a.png)")).toBe(
      "https://x.test/a.png",
    );
  });

  it("returns null for junk", () => {
    expect(refFromMarkdownImage("not an image")).toBeNull();
  });
});

describe("refsFromSnippets", () => {
  it("maps list", () => {
    expect(
      refsFromSnippets(["![a](./assets/a.png)", "x", "![b](https://b)"]),
    ).toEqual(["./assets/a.png", "https://b"]);
  });
});
