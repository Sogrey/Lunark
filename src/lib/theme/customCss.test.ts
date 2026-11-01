import { describe, expect, it } from "vitest";
import {
  parseThemeHeader,
  sanitizeCss,
  slugifyThemeFileName,
} from "./customCss";

describe("slugifyThemeFileName", () => {
  it("strips path traversal and separators", () => {
    expect(slugifyThemeFileName("../../etc/passwd.css")).toBe("etc-passwd");
    expect(slugifyThemeFileName("a/b\\c.css")).toBe("a-b-c");
  });
});

describe("parseThemeHeader", () => {
  it("reads label, dark, and features", () => {
    const css = `
      /* lunark-theme: Preview Kit */
      /* lunark-dark: true */
      /* lunark-features: tip, line-numbers, highlight-lines */
      [data-theme="custom"] { --bg-color: #111; }
    `;
    expect(parseThemeHeader(css, "fallback")).toEqual({
      label: "Preview Kit",
      dark: true,
      features: ["tip", "line-numbers", "highlight-lines"],
    });
  });

  it("defaults features to empty", () => {
    const css = `/* lunark-theme: Slate */\n/* lunark-dark: false */\n`;
    expect(parseThemeHeader(css, "x").features).toEqual([]);
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
