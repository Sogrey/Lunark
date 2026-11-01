import { describe, expect, it } from "vitest";
import {
  expandImageSizeSyntax,
  parseEqualsSize,
  sanitizeSizeValue,
} from "./imageSize";

describe("parseEqualsSize", () => {
  it("parses both", () => {
    expect(parseEqualsSize("400x300")).toEqual({
      width: "400",
      height: "300",
    });
  });
  it("parses width-only", () => {
    expect(parseEqualsSize("400x")).toEqual({ width: "400", height: "" });
  });
  it("parses height-only", () => {
    expect(parseEqualsSize("x200")).toEqual({ width: "", height: "200" });
  });
});

describe("expandImageSizeSyntax", () => {
  it("converts Typora size to attrs", () => {
    expect(expandImageSizeSyntax("![a](./x.png =400x300)")).toBe(
      "![a](./x.png){width=400 height=300}",
    );
  });

  it("converts width-only", () => {
    expect(expandImageSizeSyntax("![](./x.png =400x)")).toBe(
      "![](./x.png){width=400}",
    );
  });

  it("keeps plain images", () => {
    expect(expandImageSizeSyntax("![a](./x.png)")).toBe("![a](./x.png)");
  });

  it("merges with existing attrs", () => {
    expect(
      expandImageSizeSyntax("![a](./x.png =400x){class=photo}"),
    ).toBe("![a](./x.png){class=photo width=400}");
  });
});

describe("sanitizeSizeValue", () => {
  it("allows digits and percent", () => {
    expect(sanitizeSizeValue("400")).toBe("400");
    expect(sanitizeSizeValue("50%")).toBe("50%");
    expect(sanitizeSizeValue("400px")).toBe("400");
  });
  it("rejects junk", () => {
    expect(sanitizeSizeValue("100vh")).toBeNull();
    expect(sanitizeSizeValue("expr()")).toBeNull();
  });
});
