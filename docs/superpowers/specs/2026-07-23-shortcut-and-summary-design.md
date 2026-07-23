# Shortcut And Summary

## Scope

Move the global execute command to `Ctrl+Shift+S` on Windows and Linux, and `Command+Shift+S` on macOS. It opens the popup and executes the remembered prompt. Keep the side panel command without a default key so users can configure it from the browser's extension shortcut settings.

## Presentation

The side panel Execute button exposes `Ctrl+Shift+S` in its tooltip. The default page-summary prompt requests fewer than 300 words.

## Validation

Tests verify the execute command remains bound to the new key, the side panel command has no suggested key, and the sidebar exposes the execute shortcut hint.
