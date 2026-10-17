import { describe, expect, it } from "vitest";
import { clipboardToMarkdownTable, parseHtmlTable } from "./tablePaste";

describe("clipboardToMarkdownTable", () => {
  it("converts TSV", () => {
    const md = clipboardToMarkdownTable("A\tB\n1\t2\n3\t4");
    expect(md).toContain("| A | B |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("converts HTML table", () => {
    const html =
      "<table><tr><th>X</th><th>Y</th></tr><tr><td>1</td><td>2</td></tr></table>";
    expect(parseHtmlTable(html)?.[0]).toEqual(["X", "Y"]);
    const md = clipboardToMarkdownTable("", html);
    expect(md).toContain("| X | Y |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("returns null for plain prose", () => {
    expect(clipboardToMarkdownTable("hello world\nnext line")).toBeNull();
  });
});
