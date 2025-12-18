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

/**
 * Parse multiple cursor positions from text.
 * Example: "line1⌘\nline2⌘" -> { text: "line1\nline2", offsets: [5, 11] }
 */
export function parseMultipleCursors(textWithCursors: string): { text: string; offsets: number[] } {
	const offsets: number[] = [];
	let text = textWithCursors;
	let searchFrom = 0;

	while (true) {
		const index = text.indexOf(CURSOR, searchFrom);
		if (index === -1) {
			break;
		}
		offsets.push(index);
		// Remove cursor marker and continue search
		text = text.slice(0, index) + text.slice(index + CURSOR.length);
		searchFrom = index; // Continue from same position (marker removed)
	}

	if (offsets.length === 0) {
		throw new Error(`No cursor markers ${CURSOR} found in text`);
	}

	return { text, offsets };
}

/**
 * Create editor with multiple cursors.
 * Example: "line1⌘\nline2⌘" will create two cursors.
 */
export async function createEditorWithMultipleCursors(
	textWithCursors: string,
	language: string = 'typescript'
): Promise<vscode.TextEditor> {
	const { text, offsets } = parseMultipleCursors(textWithCursors);
	const document = await vscode.workspace.openTextDocument({
		content: text,
		language
	});

	const editor = await vscode.window.showTextDocument(document);
	
	// Convert offsets to positions and create selections
	const selections = offsets.map(offset => {
		const { line, character } = offsetToPosition(text, offset);
		const position = new vscode.Position(line, character);
		return new vscode.Selection(position, position);
	});

	editor.selections = selections;
	return editor;
}
