import { describe, expect, it } from "vitest";
import { unmappedShellSelectors } from "./shellSelectors";

describe("unmappedShellSelectors", () => {
  it("lists shell classes and ignores content hooks", () => {
    const css = `
      .megamenu-menu { color: red; }
      .outline-item { }
      #write .md-fences { border: 0; }
      .file-list-item.active { }
    `;
    expect(unmappedShellSelectors(css).sort()).toEqual([
      ".file-list-item",
      ".megamenu-menu",
      ".outline-item",
    ]);
  });
});
