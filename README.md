# Smart Keys

Smart behavior for `End`, `Backspace`, `Enter` keys, similar to JetBrains IDEs.

## Features

### Smart End

- On empty lines: automatically indents based on the previous non-empty line
- On non-empty lines: toggles between end of line (trimmed) and end of line (with trailing whitespace)

### Smart Backspace

- On empty lines: removes previous empty line and sets correct indentation, or moves to end of previous line if it has content
- In indent zone: removes previous empty line, joins with previous line, or fixes incorrect indentation

### Smart Enter

- When the last non-whitespace character on the line is `{`, automatically inserts a closing `}` with proper indentation and places the cursor inside the new block

## Settings

All smart behaviors can be disabled individually (enabled by default):

- `smart-keys.smartEnd.indentEmptyLine` — auto-indent on empty lines when pressing End
- `smart-keys.smartEnd.toggleTrimmedEnd` — toggle between trimmed end and full line end
- `smart-keys.smartBackspace.handleEmptyLine` — special handling for empty lines on Backspace
- `smart-keys.smartBackspace.handleIndentZone` — indent-zone handling for Backspace (fixing indent or joining lines)
- `smart-keys.smartEnter.autoInsertClosingBrace` — auto insertion of closing brace on Enter after `{`
