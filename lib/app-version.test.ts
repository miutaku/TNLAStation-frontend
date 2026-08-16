import { describe, expect, it } from "vitest";

import { displayBackendVersion, displayVersion } from "./app-version";

describe("app version labels", () => {
  it("adds the v prefix only when needed", () => {
    expect(displayVersion("1.1.2-amd64")).toBe("v1.1.2-amd64");
    expect(displayVersion("v1.1.2-amd64")).toBe("v1.1.2-amd64");
  });

  it("aligns the backend architecture with the frontend build", () => {
    expect(displayBackendVersion("1.1.3", "1.1.2-amd64")).toBe("v1.1.3-amd64");
    expect(displayBackendVersion("v1.1.3-arm64", "1.1.2-arm64")).toBe("v1.1.3-arm64");
  });

  it("leaves the backend version unchanged when the frontend has no architecture", () => {
    expect(displayBackendVersion("1.1.3", "1.1.2")).toBe("v1.1.3");
  });
});
