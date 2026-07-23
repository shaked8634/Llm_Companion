import { describe, expect, it } from "vitest";
import { DEFAULT_PROMPTS } from "@/lib/store";

describe("default prompts", () => {
  it("limits page summaries to 300 words", () => {
    expect(DEFAULT_PROMPTS[0]?.text).toBe(
      "Summarize this page with less than 300 words",
    );
  });
});
