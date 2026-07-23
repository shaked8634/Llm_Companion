import { describe, expect, it } from "vitest";
import config from "../wxt.config";

describe("extension commands", () => {
  it("binds execution and leaves the sidebar command configurable", () => {
    const commands = (
      config.manifest as {
        commands: Record<
          string,
          { description: string; suggested_key?: Record<string, string> }
        >;
      }
    ).commands;

    expect(commands["execute-prompt"]?.suggested_key).toEqual({
      default: "Ctrl+Shift+S",
      mac: "Command+Shift+S",
    });
    expect(commands["open-sidepanel"]).toEqual({
      description: "Open LLM Companion sidebar",
    });
  });
});
