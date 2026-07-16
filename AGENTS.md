# AGENTS.md

Guidelines for AI agents (e.g. Junie, Copilot, Codex) working on the **LLM Companion** codebase.

## Project Overview

LLM Companion is a browser extension that lets users interact with any web page using local or cloud-based AI models. It supports Ollama, Google Gemini, OpenAI, OpenRouter, and Custom providers and exposes both a popup and a sidepanel UI.

**Repository:** https://forgejo.o-st.dev/ozzt/Llm_companion
**License:** MIT

---

## Tech Stack

| Layer               | Technology                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Extension framework | [WXT](https://wxt.dev/)                                                                                                   |
| UI                  | [Preact](https://preactjs.com/) + [Preact Signals](https://preactjs.com/guide/v10/signals/)                               |
| Styling             | [Tailwind CSS v4](https://tailwindcss.com/)                                                                               |
| Language            | TypeScript (strict)                                                                                                       |
| Build tool          | Vite (via WXT)                                                                                                            |
| Test runner         | [Vitest](https://vitest.dev/) + [@testing-library/preact](https://testing-library.com/docs/preact-testing-library/intro/) |
| Linter              | ESLint + typescript-eslint                                                                                                |
| Formatter           | Prettier                                                                                                                  |
| Package manager     | **pnpm** (use `pnpm` for all install/run commands, never `npm` or `yarn`)                                                 |

---

## Repository Structure

```
src/
  assets/          # Static assets (CSS, SVG)
  components/      # Shared Preact components (e.g. ChatInterface)
  entrypoints/
    background/    # Service worker: message routing, chat handler
    content/       # Content script injected into pages
    options/       # Extension options page
    popup/         # Browser toolbar popup
    sidepanel/     # Browser side panel
  hooks/           # Custom Preact hooks
  lib/
    constants.ts   # Shared constants
    store.ts       # Global Preact Signals store
    providers/     # LLM provider abstraction
      base.ts      # Abstract base class
      types.ts     # Shared types (Message, etc.)
      factory.ts   # Provider factory
      ollama.ts    # Ollama provider
      gemini.ts    # Google Gemini provider
      openai.ts    # OpenAI provider
      openrouter.ts # OpenRouter provider
      custom.ts # Custom OpenAI compatible provider
    utils/
      scraper.ts   # Page content extraction (Readability + Turndown)
      discovery.ts # Model discovery helpers
test/               # Vitest test files (mirror src structure)
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (Chrome)
pnpm dev

# Start dev server (Firefox)
pnpm dev:firefox

# Build for Chrome
pnpm build

# Build for Firefox
pnpm build:firefox

# Package as zip (Chrome)
pnpm zip

# Package as zip (Firefox)
pnpm zip:firefox

# Run all tests (single run)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type-check without emitting
pnpm compile

# Lint
pnpm lint

# Check formatting
pnpm format:check

# Auto-fix formatting
pnpm format
```

## How to develop

Follow this minimal workflow when making changes:

1. Plan
   - Briefly outline what you'll change and why before editing code.
2. Develop
   - Implement the change in small, focused commits.
3. Write tests
   - Add unit/UI tests that cover the behavior you changed or added.
4. Run linting, formatting and tests
   - Use the project's pre-commit config or run the commands directly. See `.pre-commit-config.yaml` for configured hooks.

Example commands (run from repository root):

```bash
pnpm compile
pnpm lint
pnpm format
pnpm test
```

---

## Architecture Notes

### Provider Pattern

All LLM providers extend the abstract `BaseProvider` (`src/lib/providers/base.ts`) and implement a common interface. Use `ProviderFactory` (`src/lib/providers/factory.ts`) to instantiate providers — never instantiate them directly in UI code.

### State Management

Global state lives in `src/lib/store.ts` using Preact Signals. Avoid duplicating state in local component state when a signal already covers it.

### Background ↔ UI Communication

The background service worker (`src/entrypoints/background/`) handles all LLM API calls. UI entrypoints communicate with it via the WXT messaging API (not direct fetch calls to providers).

### Page Scraping

`src/lib/utils/scraper.ts` uses `@mozilla/readability` for article extraction and `turndown` for HTML-to-Markdown conversion. Web page content passed to the LLM should always go through this utility.

---

## Coding Conventions

- **TypeScript strict mode** is enabled — no implicit `any`, always type function parameters and return values.
- Use **Preact** (not React). Import from `preact` and `preact/hooks`, never from `react`.
- Signals for shared state, `useState`/`useReducer` only for purely local component state.
- Keep entrypoints thin — business logic belongs in `src/lib/`.
- Follow existing file naming conventions: kebab-case for files, PascalCase for components.
- Do not add comments unless they clarify non-obvious logic; the existing codebase is mostly comment-free.
- **Agent specific**: Use `/usr/bin/cat` instead of `cat` when reading files via terminal commands.

---

## Testing Guidelines

- Test files live in `test/` and are named `<subject>.test.ts(x)`.
- Use Vitest APIs (`describe`, `it`, `expect`, `vi`) — no Jest globals.
- UI tests use `@testing-library/preact`; DOM is provided by `jsdom` (configured in `vitest.config.ts`).
- **Run tests before submitting any change:** `pnpm test`
- **Run the type-checker before submitting:** `pnpm compile`
- Do not delete, skip, or weaken existing tests to make them pass.

---

## Contribution Notes

- The canonical repository is on Forgejo (see above). The GitHub repository is a read-only mirror.
- Keep pull requests focused on a single concern.
- Ensure `pnpm lint`, `pnpm compile`, and `pnpm test` all pass before opening a PR.

## How to release a version

1. Update `package.json` to the release version.
2. Add `release-notes/X.Y.Z.md` with the release highlights.
3. Commit the release files on `dev`, push `dev`, and open a pull request into `main`.
4. Merge the pull request after `pnpm lint`, `pnpm compile`, and `pnpm test` pass.
5. Update local `main`, create an annotated tag without a `v` prefix, and push it:

```bash
git switch main
git pull --ff-only origin main
git tag -a X.Y.Z -m "Release X.Y.Z"
git push origin X.Y.Z
```

The tag triggers `.forgejo/workflows/release.yml`, which builds browser packages, creates the Forgejo release from `release-notes/X.Y.Z.md`, and attempts Chrome Web Store publication. Verify the workflow and release assets after pushing the tag.
