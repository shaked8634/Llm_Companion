import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";

const releaseVersion = globalThis.process?.env?.WXT_RELEASE_VERSION ?? "0.0.0";

export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  vite: () => ({
    plugins: [preact()],
  }),

  manifestVersion: 3,
  manifest: {
    name: "LLM Companion",
    version_name: releaseVersion,
    icons: {
      96: "icon-96.png",
    },
    action: {
      default_title: "Your friendly surfing companion",
      default_icon: {
        96: "icon-96.png",
      },
    },
    web_accessible_resources: [
      {
        matches: ["*://*/*"],
        resources: ["logo.svg"],
      },
    ],
    permissions: [
      "storage",
      "activeTab",
      "scripting",
      "sidePanel",
      "contextMenus",
      "tabs",
    ],

    commands: {
      "execute-prompt": {
        suggested_key: {
          default: "Ctrl+Shift+L",
          mac: "Command+Shift+L",
        },
        description: "Execute the current selected prompt",
      },
      "open-sidepanel": {
        suggested_key: {
          default: "Ctrl+Shift+S",
          mac: "Command+Shift+S",
        },
        description: "Open LLM Companion sidebar",
      },
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
  },

  webExt: {
    openConsole: true,
    chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"], // Persist browser data
  },
});
