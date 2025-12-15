import * as vscode from 'vscode';
import { getIndentFromLine, getIndentUnit } from '../utils/indentHelpers';
import { setCursorPosition } from '../utils/cursorHelpers';
import { shouldInsertClosingBrace } from '../utils/braceHelpers';
import { getSmartKeysConfiguration } from '../configuration';
import { SmartJsonCommaHandler } from './smartJsonCommaHandler';

export class SmartEnterHandler {
	private jsonCommaHandler = new SmartJsonCommaHandler();

	private async insertDefaultNewLine(): Promise<void> {
		await vscode.commands.executeCommand('type', { text: '\n' });
	}

	private isJsonDocument(document: vscode.TextDocument): boolean {
		return document.languageId === 'json' || document.languageId === 'jsonc';
	}

	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { document, selection } = editor;
		const config = getSmartKeysConfiguration();

		// For JSON/JSONC files, use JSON comma handler if enabled
		if (this.isJsonDocument(document) && config.json.insertCommaOnEnter) {
			await this.jsonCommaHandler.execute(editor);
			return;
		}

		const { smartEnter } = config;

		if (!selection.isEmpty) {
			await this.insertDefaultNewLine();
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
			await this.insertDefaultNewLine();
			return;
		}

		const lastNonWhitespaceChar = trimmedLine.charAt(trimmedLine.length - 1);
		if (lastNonWhitespaceChar !== '{' || !smartEnter.autoInsertClosingBrace) {
			await this.insertDefaultNewLine();
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
			await this.insertDefaultNewLine();
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
}
