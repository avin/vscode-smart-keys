# Smart Keys

Smart behavior for `End` and `Backspace` keys, similar to JetBrains IDEs.

## Features

### Smart End

- On empty lines: automatically indents based on the previous non-empty line
- On non-empty lines: toggles between end of line (trimmed) and end of line (with trailing whitespace)

### Smart Backspace

- On empty lines: removes previous empty line and sets correct indentation, or moves to end of previous line if it has content
- In indent zone: removes previous empty line, joins with previous line, or fixes incorrect indentation

### Smart Enter

- When the last non-whitespace character on the line is `{`, automatically inserts a closing `}` with proper indentation and places the cursor inside the new block
