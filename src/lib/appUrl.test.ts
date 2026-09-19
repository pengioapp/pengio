import { describe, it, expect } from "vitest";
import { buildAppUrl } from "./appUrl";

// The bug this guards against: a reset link that drops the base path and lands
// one directory above the app, on a URL that has no app on it at all.
describe("buildAppUrl", () => {
  it("keeps the base path when the app is served from a subdirectory", () => {
    expect(buildAppUrl("https://pengioapp.github.io", "/pengio/", "reset-password"))
      .toBe("https://pengioapp.github.io/pengio/reset-password");
  });

  it("does not double up slashes at the domain root", () => {
    expect(buildAppUrl("https://pengio.app", "/", "reset-password"))
      .toBe("https://pengio.app/reset-password");
  });

  it("tolerates a leading slash on the path", () => {
    expect(buildAppUrl("https://pengioapp.github.io", "/pengio/", "/reset-password"))
      .toBe("https://pengioapp.github.io/pengio/reset-password");
  });

  it("tolerates a base without a trailing slash", () => {
    expect(buildAppUrl("https://pengioapp.github.io", "/pengio", "reset-password"))
      .toBe("https://pengioapp.github.io/pengio/reset-password");
  });

  it("returns the app root when given no path", () => {
    expect(buildAppUrl("https://pengioapp.github.io", "/pengio/"))
      .toBe("https://pengioapp.github.io/pengio");
    expect(buildAppUrl("https://pengio.app", "/")).toBe("https://pengio.app");
  });

  it("works on localhost during development", () => {
    expect(buildAppUrl("http://localhost:8080", "/", "reset-password"))
      .toBe("http://localhost:8080/reset-password");
  });
});
