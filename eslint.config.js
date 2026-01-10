import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [".wxt/*", "dist/*", "node_modules/*", ".output/*"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        defineBackground: "readonly",
        defineContentScript: "readonly",
        defineUnlistedScript: "readonly",
        defineGenericContext: "readonly",
        defineConfig: "readonly",
        fetch: "readonly",
        TextDecoder: "readonly",
        console: "readonly",
        chrome: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true 
      }],
      "no-undef": "error",
      "no-constant-condition": ["error", { "checkLoops": false }]
    },
  }
);
