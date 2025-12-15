import * as vscode from 'vscode';

export const CURSOR = '⌘';

export function parseCursor(textWithCursor: string): { text: string; offset: number } {
	const offset = textWithCursor.indexOf(CURSOR);
	if (offset === -1) {
		throw new Error(`No cursor marker ${CURSOR} found in text`);
	}

	const text = textWithCursor.slice(0, offset) + textWithCursor.slice(offset + CURSOR.length);
	return { text, offset };
}

export function offsetToPosition(text: string, offset: number): { line: number; character: number } {
	const lines = text.split(/\r?\n/);
	let currentOffset = 0;

	for (let lineNum = 0; lineNum < lines.length; lineNum++) {
		const lineLength = lines[lineNum].length;
		if (currentOffset + lineLength >= offset) {
			return { line: lineNum, character: offset - currentOffset };
		}
		currentOffset += lineLength + 1;
	}

	return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

export async function createMockEditor(
	content: string,
	cursorLine: number,
	cursorChar: number,
	language: string = 'typescript'
): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument({
		content,
		language
	});

	const editor = await vscode.window.showTextDocument(document);
	const position = new vscode.Position(cursorLine, cursorChar);
	editor.selection = new vscode.Selection(position, position);

	return editor;
}

export async function createEditorWithCursor(
	textWithCursor: string,
	language: string = 'typescript'
): Promise<vscode.TextEditor> {
	const { text, offset } = parseCursor(textWithCursor);
	const { line, character } = offsetToPosition(text, offset);
	return createMockEditor(text, line, character, language);
}
