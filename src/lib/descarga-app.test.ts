import { describe, expect, it } from "vitest";
import { esAndroid } from "./descarga-app";

describe("esAndroid", () => {
  it("reconoce Chrome en Android", () => {
    expect(
      esAndroid("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36"),
    ).toBe(true);
  });
  it("no confunde iPhone ni escritorio", () => {
    expect(esAndroid("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(false);
    expect(esAndroid("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0")).toBe(false);
  });
});
