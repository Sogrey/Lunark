import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, normalizePrefs } from "./store";

describe("normalizePrefs", () => {
  it("returns defaults for null/invalid", () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs("x")).toEqual(DEFAULT_PREFS);
  });

  it("clamps splitRatio and maps legacy viewMode", () => {
    const p = normalizePrefs({
      viewMode: "wysiwyg",
      splitRatio: 9,
      foo: 1,
    });
    expect(p.viewMode).toBe("hybrid");
    expect(p.splitRatio).toBe(0.8);
    expect("foo" in p).toBe(false);
  });

  it("keeps valid viewMode and locale", () => {
    const p = normalizePrefs({
      viewMode: "source",
      locale: "en",
      themeId: "night",
    });
    expect(p.viewMode).toBe("source");
    expect(p.locale).toBe("en");
    expect(p.themeId).toBe("night");
  });

  it("falls back invalid themeId", () => {
    const p = normalizePrefs({ themeId: "no-such-theme" });
    expect(p.themeId).toBe(DEFAULT_PREFS.themeId);
  });

  it("keeps welcomeSeenVersion string", () => {
    const p = normalizePrefs({ welcomeSeenVersion: "0.1.2" });
    expect(p.welcomeSeenVersion).toBe("0.1.2");
    expect(normalizePrefs({}).welcomeSeenVersion).toBeNull();
  });
});
