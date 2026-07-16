# Assistant Response Copy

## Scope

Add a copy control to assistant response cards in the shared chat interface. User-message cards do not receive the control.

## Behavior

The lower-right corner of every assistant response card contains an icon-only `Copy` button. Activating it writes the message's original `content` string to the native Clipboard API, preserving Markdown rather than copying rendered text.

## Presentation

The control uses the existing `lucide-preact` icon set and the same compact slate-to-indigo hover styling as other icon buttons. It is positioned below the rendered Markdown and aligned to the response card's right edge.

## Validation

One UI test renders a user message and an assistant message, verifies the button appears only for the assistant, and verifies it copies the exact raw Markdown string.
