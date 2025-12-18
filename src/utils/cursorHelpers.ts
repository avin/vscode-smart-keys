import * as vscode from 'vscode';

/**
 * Set cursor position and reveal it.
 */
export function setCursorPosition(
	editor: vscode.TextEditor,
	line: number,
	character: number
): void {
	const position = new vscode.Position(line, character);
	editor.selection = new vscode.Selection(position, position);
	editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.Default);
}

/**
 * Set multiple cursor positions.
 */
export function setCursorPositions(
	editor: vscode.TextEditor,
	positions: Array<{ line: number; character: number }>
): void {
	editor.selections = positions.map(pos => {
		const position = new vscode.Position(pos.line, pos.character);
		return new vscode.Selection(position, position);
	});
	
	if (positions.length > 0) {
		const firstPos = new vscode.Position(positions[0].line, positions[0].character);
		editor.revealRange(new vscode.Range(firstPos, firstPos), vscode.TextEditorRevealType.Default);
	}
}

/**
 * Check whether cursor is in the indent zone (before first non-space char).
 */
export function isInIndentZone(lineText: string, cursorChar: number): boolean {
	const firstNonWhitespaceIndex = lineText.search(/\S/);
	return firstNonWhitespaceIndex !== -1 && cursorChar <= firstNonWhitespaceIndex;
}

/**
 * Get index of the first non-whitespace character.
 */
export function getFirstNonWhitespaceIndex(lineText: string): number {
	const index = lineText.search(/\S/);
	return index === -1 ? 0 : index;
}
