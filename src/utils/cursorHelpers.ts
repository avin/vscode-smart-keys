import * as vscode from 'vscode';

/**
 * Устанавливает позицию курсора и прокручивает к ней
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
 * Проверяет, находится ли курсор в зоне отступа (до первого символа)
 */
export function isInIndentZone(lineText: string, cursorChar: number): boolean {
	const firstNonWhitespaceIndex = lineText.search(/\S/);
	return firstNonWhitespaceIndex !== -1 && cursorChar <= firstNonWhitespaceIndex;
}

/**
 * Получает позицию первого непробельного символа
 */
export function getFirstNonWhitespaceIndex(lineText: string): number {
	const index = lineText.search(/\S/);
	return index === -1 ? 0 : index;
}

