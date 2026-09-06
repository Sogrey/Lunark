import { describe, expect, it } from "vitest";
import {
  defaultSaveMarkdownPath,
  sanitizeDocBaseName,
  suggestMarkdownFileName,
} from "./documentIo";

describe("suggestMarkdownFileName", () => {
  it("uses first ATX heading", () => {
    const name = suggestMarkdownFileName(
      "# cesium标绘之点，线，面\n\ngetData: 返回坐标\n",
    );
    expect(name).toBe("cesium标绘之点，线，面.md");
  });

  it("falls back to first 10 chars of first sentence", () => {
    const name = suggestMarkdownFileName(
      "getData: 返回该标绘对象坐标数据，可以入库。\n\n第二段\n",
    );
    // 10 码点后去掉 Windows 非法字符 `:`
    expect(name).toBe("getData 返.md");
  });

  it("strips inline markdown in heading", () => {
    expect(suggestMarkdownFileName("## **Hello** _world_\n")).toBe(
      "Hello world.md",
    );
  });

  it("sanitizes illegal filename chars", () => {
    expect(sanitizeDocBaseName('a/b:c*d?.md')).toBe("abcd.md");
  });
});

describe("defaultSaveMarkdownPath", () => {
  it("keeps existing path", () => {
    expect(
      defaultSaveMarkdownPath("D:/docs/a.md", "a.md", "# Title\n"),
    ).toBe("D:/docs/a.md");
  });

  it("suggests from content for Untitled", () => {
    expect(
      defaultSaveMarkdownPath(null, "Untitled.md", "# 我的笔记\n正文"),
    ).toBe("我的笔记.md");
  });
});
