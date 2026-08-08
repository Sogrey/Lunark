import { describe, expect, it } from "vitest";
import { sanitizeCss, slugifyThemeFileName } from "./customCss";

describe("slugifyThemeFileName", () => {
  it("strips path traversal and separators", () => {
    expect(slugifyThemeFileName("../../etc/passwd.css")).toBe("etc-passwd");
    expect(slugifyThemeFileName("a/b\\c.css")).toBe("a-b-c");
  });
});

describe("sanitizeCss", () => {
  it("blocks @import and external url", () => {
    const css = `
      @import url("https://evil.example/x.css");
      .x { background: url(https://evil.example/i.png); }
      .y { background: url("//evil.example/i.png"); }
      .z { background: url("./ok.png"); }
    `;
    const out = sanitizeCss(css);
    expect(out).toContain("blocked @import");
    expect(out).toContain("blocked external");
    expect(out).toContain("./ok.png");
    expect(out).not.toMatch(/@import\s+url/i);
  });
});
