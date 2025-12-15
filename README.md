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
- For JSON/JSONC: before the newline it can auto-add a missing comma after a property value; brace insertion still runs if applicable

### JSON typing helpers

- `:` in JSON/JSONC: auto-adds a space after the colon and optionally wraps unquoted property names with quotes
- `Enter` in JSON/JSONC: auto-adds a trailing comma when leaving a property value (string, number, boolean, null, object, array)

### Keybindings

- `End` → `smart-keys.smartEnd`
- `Backspace` → `smart-keys.smartBackspace`
- `Enter` → `smart-keys.smartEnter` (with JSON enhancements)

## Settings

All smart behaviors can be disabled individually (enabled by default):

- `smart-keys.smartEnd.indentEmptyLine` - auto-indent on empty lines when pressing End
- `smart-keys.smartEnd.toggleTrimmedEnd` - toggle between trimmed end and full line end
- `smart-keys.smartBackspace.handleEmptyLine` - special handling for empty lines on Backspace
- `smart-keys.smartBackspace.handleIndentZone` - indent-zone handling for Backspace (fixing indent or joining lines)
- `smart-keys.smartEnter.autoInsertClosingBrace` - auto insertion of closing brace on Enter after `{`
- `smart-keys.json.insertCommaOnEnter` - in JSON/JSONC, add missing comma when pressing Enter after a property value
- `smart-keys.json.addWhitespaceAfterColon` - in JSON/JSONC, add a space after `:`
- `smart-keys.json.addQuotesToPropertyNames` - in JSON/JSONC, wrap unquoted property names with quotes when typing `:`
