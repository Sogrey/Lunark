import { describe, expect, it } from "vitest";
import { applyPreviewThemeClasses } from "./previewThemeClasses";

describe("applyPreviewThemeClasses", () => {
  it("adds content hooks without touching other lists", () => {
    const html = [
      `<pre class="shiki"><code>x</code></pre>`,
      `<div class="mermaid-block"><svg></svg></div>`,
      `<ul><li class="task-list-item"><input type="checkbox"></li></ul>`,
      `<ul><li>plain</li></ul>`,
      `<p><img src="a.png" alt=""></p>`,
      `<section class="footnotes"><ol><li>n</li></ol></section>`,
    ].join("");
    const out = applyPreviewThemeClasses(html);
    expect(out).toContain(`<pre class="md-fences shiki">`);
    expect(out).toContain(`<div class="md-fences mermaid-block">`);
    expect(out).toContain(`<li class="md-task-list-item task-list-item">`);
    expect(out).toContain(`<li>plain</li>`);
    expect(out).toContain(`<img class="md-image" src="a.png"`);
    expect(out).toContain(`<section class="md-footnote footnotes">`);
  });
});
