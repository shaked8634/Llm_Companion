# WXT TypeScript Web Extension: Security Scanning + Renovate Plan

This document is an implementation guide for agents working on a WXT-based TypeScript browser extension hosted on Forgejo.

## Current decisions

- Project type: TypeScript browser extension using **WXT**.
- Not using Svelte/SvelteKit in this project.
- Forgejo is the Git host and CI platform.
- Renovate is currently run via a Forgejo workflow using `renovatebot/github-action`.
- Skip **Trivy** for now.
- Skip **Gitleaks/secrets scanning** for now.
- Focus on open-source SAST/security/audit tools.
- Prefer CI jobs that do not require Docker Buildx / Docker-in-Docker for this project.
- Renovate should be centralized across multiple repositories/projects/technologies.

## Goals

1. Automatically scan the WXT extension for TypeScript/browser-extension security issues.
2. Run dependency vulnerability checks periodically and on PRs.
3. Let Renovate create dependency update PRs.
4. Allow safe auto-merge for trivial dependency updates only after CI passes.
5. Keep project-specific configuration small.
6. Keep centralized Renovate policy reusable across repositories.

---

# 1. Must-have tools for the WXT TypeScript extension

## 1.1 TypeScript typecheck

Purpose:

- Catch obvious TS errors.
- Required before trusting build/security checks.
- Should run on every PR and push.

Recommended script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

If WXT provides a better project-specific typecheck command, use that instead.

---

## 1.2 WXT build

Purpose:

- Verify that the extension actually builds.
- WXT generates the final built extension output and manifest.
- Extension linting should run against the built output, not only source files.

Recommended scripts:

```json
{
  "scripts": {
    "build": "wxt build"
  }
}
```

Typical output paths are WXT-dependent. Common examples:

```text
.output/chrome-mv3
.output/firefox-mv3
```

The agent should verify the actual output directory in the repo.

---

## 1.3 ESLint

Purpose:

- Fast TypeScript/JavaScript linting.
- Enforce unsafe JS/browser patterns.
- Run locally and in CI.

Install baseline dependencies, adjusted to the repo package manager:

```bash
pnpm add -D eslint @eslint/js typescript typescript-eslint
```

Add security-relevant plugins:

```bash
pnpm add -D eslint-plugin-security eslint-plugin-no-unsanitized
```

Recommended script:

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

### Recommended ESLint security rules

Use ESLint flat config if the project already uses it.

Example `eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      ".output/**",
      ".wxt/**",
      "node_modules/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      security,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      ...security.configs.recommended.rules,

      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",

      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
];
```

Notes:

- `eslint-plugin-security` can be noisy. Treat findings as hotspots for review.
- `eslint-plugin-no-unsanitized` is especially relevant for browser extensions because it flags dangerous DOM sinks.

---

## 1.4 web-ext lint

Purpose:

- Browser/WebExtension-specific linting.
- Checks extension manifest/package issues.
- Should run against WXT build output.

Install:

```bash
pnpm add -D web-ext
```

Recommended scripts, adjusted to actual WXT output:

```json
{
  "scripts": {
    "lint:extension:chrome": "web-ext lint --source-dir .output/chrome-mv3",
    "lint:extension:firefox": "web-ext lint --source-dir .output/firefox-mv3"
  }
}
```

If the project only targets Chrome initially, keep only the Chrome script.

Important sequence:

```bash
pnpm run build
pnpm run lint:extension:chrome
```

Do not run `web-ext lint` against a non-generated manifest unless the project explicitly stores the final manifest in source.

---

## 1.5 Semgrep CE

Purpose:

- Main open-source SAST scanner for TypeScript/JavaScript.
- Useful for browser-extension custom security rules.
- Should run on PRs, pushes, and scheduled scans.

Install locally if desired:

```bash
pipx install semgrep
# or
pip install semgrep
```

Recommended script:

```json
{
  "scripts": {
    "security:semgrep": "semgrep scan --config auto --config .semgrep --error ."
  }
}
```

If `.semgrep` does not exist yet:

```json
{
  "scripts": {
    "security:semgrep": "semgrep scan --config auto --error ."
  }
}
```

---

## 1.6 OSV-Scanner

Purpose:

- Dependency vulnerability scanning.
- Good default SCA scanner for npm/pnpm/yarn lockfiles and project source.
- Should run on PRs, pushes, and scheduled scans.

Recommended script:

```json
{
  "scripts": {
    "security:osv": "osv-scanner scan source -r ."
  }
}
```

CI can use the official OSV container image instead of installing the binary manually.

---

## 1.7 pnpm audit

Purpose:

- Cheap npm ecosystem vulnerability check.
- Useful second opinion alongside OSV.
- Should fail only on meaningful severity.

Recommended script:

```json
{
  "scripts": {
    "audit:deps": "pnpm audit --audit-level high"
  }
}
```

If the project uses npm instead of pnpm:

```bash
npm audit --audit-level=high
```

---

# 2. Tools intentionally skipped for now

## Trivy

Skip from now.

Reason:

- User explicitly decided to skip it.
- The project is currently a TS/WXT extension, not a container/IaC-heavy project.
- OSV + pnpm audit are enough for dependency audit initially.

## Gitleaks / secrets scanning

Skip for now.

Reason:

- User said leaks are not the current concern.

Possible future addition:

```bash
gitleaks detect --source .
```

---

# 3. Recommended `package.json` scripts

Agent should merge these into the actual project scripts without overwriting existing useful scripts.

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "build": "wxt build",
    "lint:extension:chrome": "web-ext lint --source-dir .output/chrome-mv3",
    "audit:deps": "pnpm audit --audit-level high",
    "security:semgrep": "semgrep scan --config auto --config .semgrep --error .",
    "security:osv": "osv-scanner scan source -r .",
    "ci": "pnpm run typecheck && pnpm run lint && pnpm test --if-present && pnpm run build && pnpm run lint:extension:chrome && pnpm run audit:deps"
  }
}
```

If `.semgrep` is not present yet, either create it or change the Semgrep script to:

```json
{
  "scripts": {
    "security:semgrep": "semgrep scan --config auto --error ."
  }
}
```

---

# 4. Extension-specific Semgrep rules

Create:

```text
.semgrep/extension-security.yml
```

Suggested initial rules:

```yaml
rules:
  - id: extension-dangerous-innerhtml
    message: Avoid assigning to innerHTML in extension code unless input is trusted and sanitized.
    severity: WARNING
    languages: [typescript, javascript]
    pattern: $EL.innerHTML = $VALUE

  - id: extension-dangerous-outerhtml
    message: Avoid assigning to outerHTML in extension code unless input is trusted and sanitized.
    severity: WARNING
    languages: [typescript, javascript]
    pattern: $EL.outerHTML = $VALUE

  - id: extension-insertadjacenthtml
    message: Avoid insertAdjacentHTML unless input is trusted and sanitized.
    severity: WARNING
    languages: [typescript, javascript]
    pattern: $EL.insertAdjacentHTML($POS, $VALUE)

  - id: extension-document-write
    message: Avoid document.write in browser extension code.
    severity: ERROR
    languages: [typescript, javascript]
    pattern: document.write(...)

  - id: extension-localstorage-token
    message: Avoid storing token-like values in localStorage.
    severity: WARNING
    languages: [typescript, javascript]
    patterns:
      - pattern-either:
          - pattern: localStorage.setItem($KEY, $VALUE)
          - pattern: window.localStorage.setItem($KEY, $VALUE)
      - metavariable-regex:
          metavariable: $KEY
          regex: (?i).*(token|secret|password|jwt|api.?key).*
```

Possible future Semgrep rules:

- `chrome.runtime.onMessage` / `browser.runtime.onMessage` handlers without sender validation.
- Broad permissions in generated manifest.
- `eval`, dynamic function construction, dynamic script injection.
- Remote code execution patterns.
- Dangerous host permissions such as `<all_urls>`.
- Use of `chrome.storage.local` for token-like keys.

---

# 5. Forgejo CI workflow for the extension

Create:

```text
.forgejo/workflows/extension-security.yml
```

Suggested workflow:

```yaml
name: Extension security

on:
  push:
    branches:
      - main

  pull_request:
    types: [opened, synchronize, reopened]

  schedule:
    - cron: "30 4 * * 1"
      timezone: Europe/Paris

jobs:
  quality-and-security:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Enable pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate

      - name: Install dependencies
        run: |
          pnpm install --frozen-lockfile

      - name: Typecheck
        run: |
          pnpm run typecheck

      - name: Lint
        run: |
          pnpm run lint

      - name: Test
        run: |
          pnpm test --if-present

      - name: Build extension
        run: |
          pnpm run build

      - name: Web extension lint
        run: |
          pnpm run lint:extension:chrome

      - name: Dependency audit
        run: |
          pnpm run audit:deps

  semgrep:
    runs-on: act-latest
    container:
      image: semgrep/semgrep:latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Semgrep CE
        run: |
          if [ -d .semgrep ]; then
            semgrep scan --config auto --config .semgrep --error .
          else
            semgrep scan --config auto --error .
          fi

  osv:
    runs-on: act-latest
    container:
      image: ghcr.io/google/osv-scanner:latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: OSV dependency scan
        run: |
          osv-scanner scan source -r .
```

Notes for agents:

- The runner labels may need adjustment to match the user's Forgejo runner labels.
- User's runner has labels such as `ubuntu-latest`, `act-latest`, `ubuntu-22.04`, `docker`.
- Avoid Buildx/DIND for this workflow.
- If `container:` syntax causes issues with Forgejo runner, install Semgrep/OSV directly in a normal job instead.

Fallback Semgrep install:

```yaml
- name: Install Semgrep
  run: |
    python3 -m pip install --user semgrep
    echo "$HOME/.local/bin" >> "$GITHUB_PATH"
```

Fallback OSV install:

```yaml
- name: Install OSV-Scanner
  run: |
    curl -sSfL https://github.com/google/osv-scanner/releases/latest/download/osv-scanner_linux_amd64 \
      -o /usr/local/bin/osv-scanner
    chmod +x /usr/local/bin/osv-scanner
```

---

# 6. Periodic automation approach

Use scheduled Forgejo CI for security validation.

Recommended schedule:

```yaml
schedule:
  - cron: "30 4 * * 1"
    timezone: Europe/Paris
```

Purpose:

- Catch newly disclosed vulnerabilities even if no code changed.
- Re-run Semgrep, OSV, pnpm audit, build, and extension lint weekly.

Run also on:

- Pull requests.
- Pushes to main.

Rationale:

- Scheduled scans catch new dependency CVEs.
- PR scans protect branch merges.
- Push-to-main scans catch direct pushes or bot merges.

---

# 7. Renovate approach

## 7.1 Centralized Renovate is preferred

Because the user has multiple projects with multiple technologies, Renovate should be centralized.

Recommended model:

```text
ST_Consultancy/renovate-admin
  .forgejo/workflows/renovate.yml
  config.js

ST_Consultancy/renovate-config
  org-inherited-config.json

Each project repo:
  renovate.json only for exceptions
```

The central Renovate workflow runs once and updates multiple repositories.

## 7.2 Current user approach

The user currently runs Renovate as an action:

```yaml
- name: Renovate
  continue-on-error: true
  uses: https://github.com/renovatebot/github-action@v46.1.4
  with:
    token: ${{ secrets.RENOVATE_TOKEN }}
    mount-docker-socket: false
  env:
    RENOVATE_AUTODISCOVER: false
    RENOVATE_REPOSITORIES: ${{ github.repository }}
    RENOVATE_PLATFORM: forgejo
    RENOVATE_ENDPOINT: https://forgejo.o-st.dev/api/v1
    RENOVATE_BINARY_SOURCE: install
    GIT_AUTHOR_NAME: Renovate Bot
    GIT_AUTHOR_EMAIL: renovate-bot@o-st.dev
    GIT_COMMITTER_NAME: Renovate Bot
    GIT_COMMITTER_EMAIL: renovate-bot@o-st.dev
    RENOVATE_GIT_AUTHOR: Renovate Bot <renovate-bot@o-st.dev>
    RENOVATE_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This works per-repo, but it is not centralized because:

```yaml
RENOVATE_REPOSITORIES: ${{ github.repository }}
```

targets only the repository where the workflow is running.

## 7.3 Recommended central action setup

Create a dedicated repo:

```text
ST_Consultancy/renovate-admin
```

Add:

```text
config.js
.forgejo/workflows/renovate.yml
```

### `config.js`

Use autodiscovery for the org/namespace:

```js
module.exports = {
  platform: "forgejo",
  endpoint: "https://forgejo.o-st.dev/api/v1",
  token: process.env.RENOVATE_TOKEN,

  autodiscover: true,
  autodiscoverNamespaces: ["ST_Consultancy"],

  onboarding: true,
  dependencyDashboard: true,

  gitAuthor: "Renovate Bot <renovate-bot@o-st.dev>",

  prHourlyLimit: 2,
  prConcurrentLimit: 5,

  inheritConfig: true,
};
```

Alternative safer explicit repo list:

```js
module.exports = {
  platform: "forgejo",
  endpoint: "https://forgejo.o-st.dev/api/v1",
  token: process.env.RENOVATE_TOKEN,

  repositories: ["ST_Consultancy/Anan", "ST_Consultancy/web-extension"],

  onboarding: true,
  dependencyDashboard: true,

  gitAuthor: "Renovate Bot <renovate-bot@o-st.dev>",

  prHourlyLimit: 2,
  prConcurrentLimit: 5,

  inheritConfig: true,
};
```

Use explicit repositories if the bot has broad access and the user wants tight control.

### `.forgejo/workflows/renovate.yml`

```yaml
name: Renovate

on:
  workflow_dispatch:

  schedule:
    - cron: "20 4 * * *"
      timezone: Europe/Paris

jobs:
  renovate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout central config
        uses: actions/checkout@v4

      - name: Renovate
        continue-on-error: false
        uses: https://github.com/renovatebot/github-action@v46.1.4
        with:
          token: ${{ secrets.RENOVATE_TOKEN }}
          configurationFile: config.js
          mount-docker-socket: false
        env:
          RENOVATE_TOKEN: ${{ secrets.RENOVATE_TOKEN }}
          RENOVATE_BINARY_SOURCE: install
```

Notes:

- Prefer `continue-on-error: false` for central Renovate once stable, so failures are visible.
- Keep `mount-docker-socket: false`.
- `RENOVATE_GITHUB_TOKEN` is usually unnecessary for Forgejo-only use.
- The important token is the Forgejo bot PAT passed as `RENOVATE_TOKEN`.

---

# 8. Shared Renovate policy

Create:

```text
ST_Consultancy/renovate-config/org-inherited-config.json
```

Suggested starting config:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "dependencyDashboard": true,
  "labels": ["dependencies"],
  "rangeStrategy": "bump",
  "prHourlyLimit": 2,
  "prConcurrentLimit": 5,
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 5am on monday"],
    "automerge": true
  },
  "packageRules": [
    {
      "description": "Automerge patch updates after CI passes",
      "matchUpdateTypes": ["patch"],
      "automerge": true
    },
    {
      "description": "Automerge selected dev-tool minor updates",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["minor"],
      "matchPackageNames": [
        "eslint",
        "typescript",
        "@types/**",
        "prettier",
        "web-ext",
        "@eslint/**",
        "typescript-eslint"
      ],
      "automerge": true
    },
    {
      "description": "Do not automerge WXT/Vite/runtime-sensitive extension updates",
      "matchPackageNames": [
        "wxt",
        "vite",
        "@wxt-dev/**",
        "webextension-polyfill"
      ],
      "automerge": false
    },
    {
      "description": "Never automerge major updates",
      "matchUpdateTypes": ["major"],
      "automerge": false
    }
  ]
}
```

Agents should tune package names to the actual repo dependencies.

## Per-repo override example

Create only if needed:

```text
renovate.json
```

Example for the WXT extension:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "packageRules": [
    {
      "description": "Keep WXT and Vite manual for browser extension packaging safety",
      "matchPackageNames": ["wxt", "vite", "@wxt-dev/**"],
      "automerge": false
    }
  ]
}
```

---

# 9. Auto-merge policy

Safe starting policy:

```text
Automerge:
  - patch updates after CI passes
  - lockfile maintenance after CI passes
  - selected dev-tool minor updates after CI passes

Manual review:
  - all major updates
  - WXT
  - Vite
  - extension runtime/browser API libraries
  - anything that changes generated extension manifest behavior
  - any update that causes CI failures
```

CI required before automerge should include:

```text
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm test --if-present
pnpm run build
pnpm run lint:extension:chrome
pnpm run audit:deps
Semgrep
OSV-Scanner
```

Rationale:

- Renovate should create PRs.
- Forgejo CI should validate PRs.
- Renovate may auto-merge only when CI proves the update is safe enough.

---

# 10. Agent implementation checklist

## Phase 1: Extension repo security baseline

1. Inspect package manager:
   - `pnpm-lock.yaml` => pnpm
   - `package-lock.json` => npm
   - `yarn.lock` => yarn

2. Inspect WXT output:
   - Run `pnpm run build`.
   - Find actual `.output/...` directory.
   - Confirm generated manifest path.

3. Add dev dependencies:
   - ESLint dependencies.
   - `eslint-plugin-security`.
   - `eslint-plugin-no-unsanitized`.
   - `web-ext`.

4. Add or update:
   - `eslint.config.js`
   - `.semgrep/extension-security.yml`
   - `package.json` scripts.

5. Run locally:
   - `pnpm install`
   - `pnpm run typecheck`
   - `pnpm run lint`
   - `pnpm test --if-present`
   - `pnpm run build`
   - `pnpm run lint:extension:chrome`
   - `pnpm run audit:deps`

6. Add Forgejo workflow:
   - `.forgejo/workflows/extension-security.yml`

7. Run CI manually or via PR.

## Phase 2: Central Renovate

1. Create or use `ST_Consultancy/renovate-admin`.
2. Add `config.js`.
3. Add `.forgejo/workflows/renovate.yml`.
4. Add `RENOVATE_TOKEN` secret to the admin repo.
5. Ensure the Renovate bot user has access to target repos.
6. Decide:
   - autodiscovery via `autodiscoverNamespaces`
   - or explicit `repositories` list.
7. Create `ST_Consultancy/renovate-config`.
8. Add `org-inherited-config.json`.
9. Set `inheritConfig: true` in central config.
10. Run Renovate manually with `workflow_dispatch`.
11. Inspect PRs and Dependency Dashboard.
12. Enable automerge only after CI is reliable.

## Phase 3: Hardening

1. Add extension-specific Semgrep rules for message sender validation.
2. Add rules for broad manifest permissions.
3. Add checks for token-like keys in `chrome.storage` / `browser.storage`.
4. Add browser target matrix if needed:
   - Chrome MV3
   - Firefox MV3 or MV2 depending on project.
5. Add release workflow gating:
   - release only if security workflow passed.

---

# 11. Minimal final recommended setup

For the WXT TypeScript extension:

```text
Must-have CI:
  - typecheck
  - eslint + no-unsanitized
  - tests if present
  - wxt build
  - web-ext lint against built output
  - pnpm audit --audit-level high
  - semgrep CE
  - osv-scanner

Scheduled:
  - weekly extension-security workflow
  - daily or several-times-weekly centralized Renovate

Skipped:
  - Trivy
  - Gitleaks

Renovate:
  - centralized action in renovate-admin repo
  - shared org inherited config
  - per-repo overrides only for exceptions
  - automerge patch/lockfile/selected dev-tool minors after CI
  - manual for major/WXT/Vite/runtime-sensitive updates
```
