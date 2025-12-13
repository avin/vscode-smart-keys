import * as vscode from 'vscode';
import { getIndentFromLine, getIndentUnit } from '../utils/indentHelpers';
import { setCursorPosition } from '../utils/cursorHelpers';
import { shouldInsertClosingBrace } from '../utils/braceHelpers';
import { getSmartKeysConfiguration } from '../configuration';

export class SmartEnterHandler {
	private async insertDefaultNewLine(): Promise<void> {
		await vscode.commands.executeCommand('type', { text: '\n' });
	}

	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { document, selection } = editor;
		const { smartEnter } = getSmartKeysConfiguration();

		if (!selection.isEmpty) {
			await this.insertDefaultNewLine();
			return;
		}

		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const line = document.lineAt(currentLine);
		const originalText = line.text;
		const trimmedLine = originalText.trimEnd();

		if (trimmedLine.length === 0) {
			await this.insertDefaultNewLine();
			return;
		}

		const braceCharIndex = trimmedLine.length - 1;

		const lastNonWhitespaceChar = trimmedLine.charAt(trimmedLine.length - 1);
		if (lastNonWhitespaceChar !== '{' || !smartEnter.autoInsertClosingBrace) {
			await this.insertDefaultNewLine();
			return;
		}

		// Skip if cursor is before the brace
		if (currentChar < trimmedLine.length) {
			await this.insertDefaultNewLine();
			return;
		}

		const documentLines = Array.from({ length: document.lineCount }, (_, lineNumber) =>
			document.lineAt(lineNumber).text
		);

		if (!shouldInsertClosingBrace(documentLines, currentLine, braceCharIndex)) {
			await this.insertDefaultNewLine();
			return;
		}

		const baseIndent = getIndentFromLine(originalText);
		const indentUnit = getIndentUnit(editor);
		const innerIndent = baseIndent + indentUnit;

		await editor.edit(editBuilder => {
			const insertionPosition = new vscode.Position(currentLine, trimmedLine.length);

			if (originalText.length > trimmedLine.length) {
				const trailingRange = new vscode.Range(
					insertionPosition,
					new vscode.Position(currentLine, originalText.length)
				);
				editBuilder.delete(trailingRange);
			}

			editBuilder.insert(insertionPosition, `\n${innerIndent}\n${baseIndent}}`);
		});

		setCursorPosition(editor, currentLine + 1, innerIndent.length);
	}
}
