# Provider screen redesign

## Goal

Replace the fixed Ollama and Custom provider rows with user-created OpenAI-compatible provider rows while keeping Gemini, OpenAI, and OpenRouter unchanged.

## Data and runtime design

- Added providers are stored by generated stable IDs in `customProviders`.
- Each entry contains an editable `name`, `enabled`, `url`, and optional `apiKey`.
- Provider names are required and unique after exact string comparison; case differences are allowed.
- Stable IDs are used in discovered model IDs, selected model IDs, and favorites, so renaming a provider does not break references.
- This is an unreleased redesign; existing Ollama and Custom settings do not need migration.
- Deleting a provider removes its discovered models and clears related selection and favorite references.

## UI and validation

- The options table retains fixed Gemini, OpenAI, and OpenRouter rows.
- A `+ Add OpenAI compatible provider` button is aligned below the table on the right.
- Added rows include an enable checkbox, editable Provider field, optional API key, URL, and delete button.
- An enabled added provider requires a valid HTTP(S) URL.
- Invalid or duplicate provider names are shown inline and are not persisted.

## Testing

Tests cover provider defaults, stable IDs, discovery, add/delete behavior, name validation, and model reference cleanup.
