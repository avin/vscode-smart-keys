import * as vscode from 'vscode';
import { getIndentFromLine, getIndentUnit } from '../utils/indentHelpers';
import { setCursorPosition, setCursorPositions } from '../utils/cursorHelpers';
import { shouldInsertClosingBrace } from '../utils/braceHelpers';
import { insertNewLine } from '../utils/editorCommands';
import { isJsonDocument } from '../utils/jsonHelpers';
import { getSmartKeysConfiguration } from '../configuration';
import { SmartJsonCommaHandler } from './smartJsonCommaHandler';

export class SmartEnterHandler {
	private jsonCommaHandler = new SmartJsonCommaHandler();

	/**
	 * Check if a selection can expand a brace (cursor is after opening brace).
	 */
	private canExpandBrace(document: vscode.TextDocument, selection: vscode.Selection): boolean {
		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const line = document.lineAt(currentLine);
		const originalText = line.text;
		const textUpToCursor = originalText.slice(0, currentChar);
		const trimmedLine = textUpToCursor.trimEnd();
		
		if (trimmedLine.length === 0) {
			return false;
		}

		const lastNonWhitespaceChar = trimmedLine.charAt(trimmedLine.length - 1);
		if (lastNonWhitespaceChar !== '{') {
			return false;
		}

		const braceCharIndex = trimmedLine.length - 1;
		const documentLines = Array.from({ length: document.lineCount }, (_, lineNumber) => {
			if (lineNumber === currentLine) {
				return originalText.slice(0, braceCharIndex + 1);
			}
			return document.lineAt(lineNumber).text;
		});

		return shouldInsertClosingBrace(documentLines, currentLine, braceCharIndex);
	}

	public async execute(editor: vscode.TextEditor): Promise<void> {
		const config = getSmartKeysConfiguration();
		const document = editor.document;
		const selections = editor.selections;

		// For JSON/JSONC files, try to insert comma but continue to brace logic
		if (isJsonDocument(document) && config.json.insertCommaOnEnter) {
			await this.jsonCommaHandler.execute(editor, { insertNewLine: false });
		}

		const { smartEnter } = config;

		// Multi-cursor: check if all selections can use smart behavior
		if (selections.length > 1) {
			// If any selection is not empty, use default behavior
			if (selections.some(sel => !sel.isEmpty)) {
				await insertNewLine();
				return;
			}

			// Check if all cursors can expand braces
			const allCanExpand = smartEnter.autoInsertClosingBrace && 
				selections.every(sel => this.canExpandBrace(document, sel));

			if (!allCanExpand) {
				await insertNewLine();
				return;
			}

			// All cursors can expand braces - process them
			await this.executeMultiCursor(editor, selections, document, config);
			return;
		}

		// Single cursor logic
		const selection = selections[0];

		if (!selection.isEmpty) {
			await insertNewLine();
			return;
		}

		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const line = document.lineAt(currentLine);
		const originalText = line.text;
		
		// First, consider only the part of the line up to (and including) the cursor position
		// This handles cases where the cursor is between { and } like: method() {⌘}
		const textUpToCursor = originalText.slice(0, currentChar);
		const trimmedLine = textUpToCursor.trimEnd();

		if (trimmedLine.length === 0) {
			await insertNewLine();
			return;
		}

		const lastNonWhitespaceChar = trimmedLine.charAt(trimmedLine.length - 1);
		if (lastNonWhitespaceChar !== '{' || !smartEnter.autoInsertClosingBrace) {
			await insertNewLine();
			return;
		}

		// The opening brace is at the end of the trimmed line
		const braceCharIndex = trimmedLine.length - 1;

		// No need to check if cursor is before brace since we already sliced up to cursor

		// Get document lines and remove everything after the opening brace on the current line
		// This handles the case where user wants to expand {} into a multi-line block
		const documentLines = Array.from({ length: document.lineCount }, (_, lineNumber) => {
			if (lineNumber === currentLine) {
				// Remove everything after the opening brace
				return originalText.slice(0, braceCharIndex + 1);
			}
			return document.lineAt(lineNumber).text;
		});

		if (!shouldInsertClosingBrace(documentLines, currentLine, braceCharIndex)) {
			await insertNewLine();
			return;
		}

		const baseIndent = getIndentFromLine(originalText);
		const indentUnit = getIndentUnit(editor);
		const innerIndent = baseIndent + indentUnit;

		// Find any content after the closing brace that should be preserved (like semicolons)
		const contentAfterBrace = originalText.slice(braceCharIndex + 1);
		let contentToPreserve = '';
		let closingBraceIndex = contentAfterBrace.indexOf('}');
		
		if (closingBraceIndex !== -1) {
			// There's a closing brace - preserve everything after it
			contentToPreserve = contentAfterBrace.slice(closingBraceIndex + 1);
		}

		const replacementText = `\n${innerIndent}\n${baseIndent}}${contentToPreserve}`;

		await editor.edit(editBuilder => {
			// Replace everything after the opening brace with the expanded braces
			const startPosition = new vscode.Position(currentLine, braceCharIndex + 1);
			const endPosition = new vscode.Position(currentLine, originalText.length);
			const rangeToReplace = new vscode.Range(startPosition, endPosition);

			editBuilder.replace(rangeToReplace, replacementText);
		});

		setCursorPosition(editor, currentLine + 1, innerIndent.length);
	}

	/**
	 * Execute for multiple cursors - expand braces at each cursor position.
	 */
	private async executeMultiCursor(
		editor: vscode.TextEditor,
		selections: readonly vscode.Selection[],
		document: vscode.TextDocument,
		config: ReturnType<typeof getSmartKeysConfiguration>
	): Promise<void> {
		// Sort selections by position (bottom to top, right to left)
		// This ensures we process from end to start, avoiding position shifts during editing
		const sortedSelections = [...selections].sort((a, b) => {
			if (a.active.line !== b.active.line) {
				return b.active.line - a.active.line;
			}
			return b.active.character - a.active.character;
		});

		const edits: Array<{ range: vscode.Range; text: string; newCursorLine: number; newCursorChar: number }> = [];

		// Build all edits
		for (const selection of sortedSelections) {
			const currentLine = selection.active.line;
			const currentChar = selection.active.character;
			const line = document.lineAt(currentLine);
			const originalText = line.text;
			const textUpToCursor = originalText.slice(0, currentChar);
			const trimmedLine = textUpToCursor.trimEnd();
			const braceCharIndex = trimmedLine.length - 1;

			const baseIndent = getIndentFromLine(originalText);
			const indentUnit = getIndentUnit(editor);
			const innerIndent = baseIndent + indentUnit;

			const contentAfterBrace = originalText.slice(braceCharIndex + 1);
			const closingBraceIndex = contentAfterBrace.indexOf('}');
			const contentToPreserve = closingBraceIndex !== -1 
				? contentAfterBrace.slice(closingBraceIndex + 1) 
				: '';

			const replacementText = `\n${innerIndent}\n${baseIndent}}${contentToPreserve}`;

			edits.push({
				range: new vscode.Range(
					new vscode.Position(currentLine, braceCharIndex + 1),
					new vscode.Position(currentLine, originalText.length)
				),
				text: replacementText,
				newCursorLine: currentLine + 1,
				newCursorChar: innerIndent.length
			});
		}

		// Apply all edits at once
		await editor.edit(editBuilder => {
			for (const edit of edits) {
				editBuilder.replace(edit.range, edit.text);
			}
		});

		// Calculate final cursor positions accounting for line shifts
		// Since we edited from bottom to top, cursors above get shifted by the lines added below them
		const newCursorPositions = edits.map((edit, index) => {
			// Count how many lines were added by edits below this one
			const linesAddedBelow = edits
				.slice(index + 1)
				.reduce((sum, e) => sum + (e.text.split('\n').length - 1), 0);
			
			return {
				line: edit.newCursorLine + linesAddedBelow,
				character: edit.newCursorChar
			};
		});

		// Reverse to match original cursor order
		setCursorPositions(editor, newCursorPositions.reverse());
	}
}
