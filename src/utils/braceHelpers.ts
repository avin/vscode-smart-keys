/**
 * Count unmatched opening braces in the document.
 */
export function countUnmatchedBraces(lines: string[]): number {
	const stack: Array<{ line: number; char: number }> = [];

	lines.forEach((lineText, lineNumber) => {
		for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
			const char = lineText.charAt(charIndex);

			if (char === '{') {
				stack.push({ line: lineNumber, char: charIndex });
			} else if (char === '}') {
				if (stack.length > 0) {
					stack.pop();
				}
			}
		}
	});

	return stack.length;
}

/**
 * Check if a specific opening brace remains unmatched after parsing.
 */
export function isBraceUnmatched(
	lines: string[],
	targetLine: number,
	targetChar: number
): boolean {
	const stack: Array<{ line: number; char: number }> = [];

	for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
		const lineText = lines[lineNumber];

		for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
			const char = lineText.charAt(charIndex);

			if (char === '{') {
				stack.push({ line: lineNumber, char: charIndex });
			} else if (char === '}' && stack.length > 0) {
				stack.pop();
			}
		}
	}

	return stack.some(
		position => position.line === targetLine && position.char === targetChar
	);
}

/**
 * Decide whether to insert a closing brace for the given opening brace.
 * Insert if:
 * - the brace is unmatched, or
 * - removing it decreases the count of unmatched braces (code balances with its closing).
 */
export function shouldInsertClosingBrace(
	lines: string[],
	targetLine: number,
	targetChar: number
): boolean {
	if (targetLine < 0 || targetLine >= lines.length) {
		return false;
	}

	const lineText = lines[targetLine];
	if (targetChar < 0 || targetChar >= lineText.length || lineText.charAt(targetChar) !== '{') {
		return false;
	}

	if (isBraceUnmatched(lines, targetLine, targetChar)) {
		return true;
	}

	const unmatchedBefore = countUnmatchedBraces(lines);
	const modifiedLines = [...lines];
	modifiedLines[targetLine] = lineText.slice(0, targetChar) + lineText.slice(targetChar + 1);
	const unmatchedAfterRemoval = countUnmatchedBraces(modifiedLines);

	return unmatchedAfterRemoval < unmatchedBefore;
}
