import { describe, expect, it } from "vitest";
import config from "../wxt.config";

describe("extension commands", () => {
  it("binds popup execution and leaves sidepanel commands configurable", () => {
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
    expect(commands["execute-prompt"]).toMatchObject({
      description: "Execute the current selected prompt in popup",
    });
    expect(commands["execute-prompt-sidepanel"]).toEqual({
      description: "Execute the current selected prompt in side bar",
    });
    expect(commands["open-sidepanel"]).toEqual({
      description: "Open LLM Companion sidebar",
    });
  });
});
