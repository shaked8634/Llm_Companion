import { afterEach, describe, expect, it, vi } from "vitest";
import { getExtensionVersion, REPOSITORY_LINKS } from "@/lib/constants";

describe("constants", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 0.0.0 when no manifest version_name is provided", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: vi.fn(() => ({ version: "0.0.9" })),
      },
    });

    expect(getExtensionVersion()).toBe("0.0.0");
  });

  it("returns the manifest version_name when present", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: vi.fn(() => ({ version: "0.0.9", version_name: "0.0.9" })),
      },
    });

    expect(getExtensionVersion()).toBe("0.0.9");
  });

  it("contains both repository links", () => {
    expect(REPOSITORY_LINKS).toEqual([
      {
        label: "Forgejo",
        url: "https://forgejo.o-st.dev/ST_Consultancy/Llm_companion",
      },
      {
        label: "GitHub Mirror",
        url: "https://github.com/shaked8634/Llm_Companion",
      },
    ]);
  });
});
