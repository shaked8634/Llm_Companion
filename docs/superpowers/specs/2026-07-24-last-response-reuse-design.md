# Last Response Reuse

## Scope

Reuse the last successful response for an immediately repeated prompt in the same tab when its request inputs are unchanged. The reuse check covers prompt text, selected model, system prompt, and page content without the scraper capture timestamp.

## Behavior

Store a SHA-256 fingerprint for the last successful request in the tab session. Before creating a provider request, compare the new fingerprint to it. On a match, leave the existing conversation visible and do not send a provider request or append messages. Replace the fingerprint after a successful response and remove it when the user clears conversation history.

## Validation

Tests cover cache hits for equivalent page content with different capture timestamps, misses after page or request changes, and provider bypass on a cache hit.
