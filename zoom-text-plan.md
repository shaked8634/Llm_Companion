# Zoom-Aware Text Plan

1. Remove the root document font-size zoom behavior from `ChatInterface`.
2. Apply browser zoom only to prompt textareas and chat transcript text.
3. Keep extension chrome text fixed: header, selects, buttons, and settings UI.
4. Update Vitest coverage to verify zoom-aware text changes and fixed chrome text.
5. Add a Playwright browser test that loads the built popup, mocks Chrome APIs, and checks zoomed text styling.
6. Run type-check, unit tests, and Playwright validation.
