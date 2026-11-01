import { describe, expect, it } from "vitest";
import {
  containersToHybridFences,
  fenceBodyToContainer,
  hybridFencesToContainers,
  parseContainerInsert,
} from "./containerHybrid";

describe("containerHybrid", () => {
  it("round-trips tip with title", () => {
    const src = "::: warning 注意\n内容一行\n:::";
    const fence = containersToHybridFences(src);
    expect(fence).toBe("```warning\n注意\n内容一行\n```");
    expect(hybridFencesToContainers(fence)).toBe(src);
  });

  it("round-trips tip without title", () => {
    const src = "::: tip\n正文\n:::";
    const fence = containersToHybridFences(src);
    expect(fence).toBe("```tip\n正文\n```");
    expect(hybridFencesToContainers(fence)).toBe(src);
  });

  it("round-trips align", () => {
    const src = "::: align-center\n居中\n:::";
    const fence = containersToHybridFences(src);
    expect(fence).toBe("```align-center\n居中\n```");
    expect(hybridFencesToContainers(fence)).toBe(src);
  });

  it("fenceBodyToContainer builds dialect", () => {
    expect(fenceBodyToContainer("info", "说明\n正文")).toBe(
      "::: info 说明\n正文\n:::",
    );
  });

  it("parseContainerInsert from ::: snippet", () => {
    expect(
      parseContainerInsert("::: warning 注意\n在此填写内容…\n:::\n"),
    ).toEqual({
      kind: "warning",
      body: "注意\n在此填写内容…",
    });
  });
});
