# Model search session persistence

## Goal

Keep the model-picker query available in both popup and sidepanel for the current browser session, and make it easy to clear.

## Design

- Store one query value in `chrome.storage.session`.
- Read it when a picker opens and write it whenever the query changes.
- Do not clear it when the picker closes or when a model is selected.
- Guard session storage access so test and unsupported environments continue to operate with in-memory state.

## Testing

Test query persistence after closing and reopening the picker.
