import { describe, expect, it } from "vitest";
import {
  clampGeometryToWorkArea,
  defaultGeometryForMode,
} from "./geometry";

const work = { x: 0, y: 0, width: 1920, height: 900 };

describe("defaultGeometryForMode", () => {
  it("hybrid/source narrower than split", () => {
    const h = defaultGeometryForMode("hybrid", work);
    const s = defaultGeometryForMode("split", work);
    expect(h.width).toBeLessThan(s.width);
    expect(h.width).toBe(980);
    expect(s.width).toBe(1280);
  });

  it("centers inside work area", () => {
    const g = defaultGeometryForMode("hybrid", work);
    expect(g.x + g.width).toBeLessThanOrEqual(work.width);
    expect(g.y + g.height).toBeLessThanOrEqual(work.height);
    expect(g.y).toBeGreaterThanOrEqual(0);
  });

  it("shrinks when work area is small", () => {
    const tiny = { x: 0, y: 0, width: 800, height: 500 };
    const g = defaultGeometryForMode("split", tiny);
    expect(g.width).toBeLessThanOrEqual(800 - 16);
    expect(g.height).toBeLessThanOrEqual(500 - 16);
  });
});

describe("clampGeometryToWorkArea", () => {
  it("pulls bottom out from under taskbar", () => {
    const g = clampGeometryToWorkArea(
      { width: 1000, height: 900, x: 100, y: 200 },
      work,
    );
    expect(g.y + g.height).toBeLessThanOrEqual(work.height - 8);
  });

  it("clamps oversized height", () => {
    const g = clampGeometryToWorkArea(
      { width: 2000, height: 2000, x: 0, y: 0 },
      work,
    );
    expect(g.width).toBeLessThanOrEqual(work.width - 16);
    expect(g.height).toBeLessThanOrEqual(work.height - 16);
  });
});
