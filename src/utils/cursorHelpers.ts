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
