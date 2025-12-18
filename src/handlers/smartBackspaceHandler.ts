import * as vscode from 'vscode';
import { calculateIndent } from '../utils/indentHelpers';
import { setCursorPosition, isInIndentZone, getFirstNonWhitespaceIndex } from '../utils/cursorHelpers';
import { getSmartKeysConfiguration } from '../configuration';

export class SmartBackspaceHandler {
	/**
	 * Handle Backspace on an empty line when the previous line is also empty.
	 */
	private async handleEmptyLineWithEmptyPrevious(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string
	): Promise<boolean> {
		const targetIndent = calculateIndent(editor, document, currentLine);
		
		// Remove previous empty line and apply target indent
		await editor.edit(editBuilder => {
			const deleteRange = new vscode.Range(
				new vscode.Position(currentLine - 1, 0),
				new vscode.Position(currentLine, 0)
			);
			editBuilder.delete(deleteRange);
			
			const replaceRange = new vscode.Range(
				new vscode.Position(currentLine, 0),
				new vscode.Position(currentLine, lineText.length)
			);
			editBuilder.replace(replaceRange, targetIndent);
		});
		
		setCursorPosition(editor, currentLine - 1, targetIndent.length);
		return true;
	}

	/**
	 * Handle Backspace on an empty line when the previous line has text.
	 */
	private async handleEmptyLineWithTextPrevious(
		editor: vscode.TextEditor,
		currentLine: number,
		prevText: string
	): Promise<boolean> {
		const prevTextTrimmed = prevText.trimEnd();
		const cursorPosition = prevTextTrimmed.length;
		
		await editor.edit(editBuilder => {
			// Remove current empty line
			const deleteRange = new vscode.Range(
				new vscode.Position(currentLine, 0),
				new vscode.Position(currentLine + 1, 0)
			);
			editBuilder.delete(deleteRange);
			
			// Trim trailing spaces in previous line
			if (prevText.length > prevTextTrimmed.length) {
				const trimRange = new vscode.Range(
					new vscode.Position(currentLine - 1, prevTextTrimmed.length),
					new vscode.Position(currentLine - 1, prevText.length)
				);
				editBuilder.delete(trimRange);
			}
		});
		
		setCursorPosition(editor, currentLine - 1, cursorPosition);
		return true;
	}

	/**
	 * Handle Backspace on an empty line.
	 */
	private async handleEmptyLine(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string
	): Promise<boolean> {
		if (currentLine === 0) {
			return false;
		}

		const prevLine = document.lineAt(currentLine - 1);
		const prevText = prevLine.text;
		
		if (prevText.trim().length === 0) {
			// Previous line is empty
			return await this.handleEmptyLineWithEmptyPrevious(editor, document, currentLine, lineText);
		} else {
			// Previous line contains text
			return await this.handleEmptyLineWithTextPrevious(editor, currentLine, prevText);
		}
	}

	/**
	 * Handle Backspace in indent zone when the previous line is empty.
	 */
	private async handleIndentZoneWithEmptyPrevious(
		editor: vscode.TextEditor,
		currentLine: number,
		firstNonWhitespaceIndex: number
	): Promise<boolean> {
		await editor.edit(editBuilder => {
			const deleteRange = new vscode.Range(
				new vscode.Position(currentLine - 1, 0),
				new vscode.Position(currentLine, 0)
			);
			editBuilder.delete(deleteRange);
		});

		setCursorPosition(editor, currentLine - 1, firstNonWhitespaceIndex);
		return true;
	}

	/**
	 * Handle Backspace in indent zone when the previous line has text.
	 */
	private async handleIndentZoneWithTextPrevious(
		editor: vscode.TextEditor,
		currentLine: number,
		lineText: string,
		prevText: string
	): Promise<boolean> {
		const prevTextTrimmed = prevText.trimEnd();
		const currentTextTrimmed = lineText.trim();
		const joinedText = prevTextTrimmed + currentTextTrimmed;
		const cursorPosition = prevTextTrimmed.length;
		
		await editor.edit(editBuilder => {
			const deleteRange = new vscode.Range(
				new vscode.Position(currentLine - 1, 0),
				new vscode.Position(currentLine, lineText.length)
			);
			editBuilder.delete(deleteRange);
			editBuilder.insert(new vscode.Position(currentLine - 1, 0), joinedText);
		});

		setCursorPosition(editor, currentLine - 1, cursorPosition);
		return true;
	}

	/**
	 * Handle Backspace inside the indent zone.
	 */
	private async handleIndentZone(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string
	): Promise<boolean> {
		if (currentLine === 0) {
			return false;
		}

		const firstNonWhitespaceIndex = getFirstNonWhitespaceIndex(lineText);
		const currentIndent = lineText.substring(0, firstNonWhitespaceIndex);
		
		// Calculate correct indent for the line
		const correctIndent = calculateIndent(editor, document, currentLine);
		
		// If current indent is too large, fix it
		if (currentIndent.length > correctIndent.length) {
			await editor.edit(editBuilder => {
				const indentRange = new vscode.Range(
					new vscode.Position(currentLine, 0),
					new vscode.Position(currentLine, currentIndent.length)
				);
				editBuilder.replace(indentRange, correctIndent);
			});
			
			setCursorPosition(editor, currentLine, correctIndent.length);
			return true;
		}
		
		// If indent is correct, run deletion/merge logic
		const prevLine = document.lineAt(currentLine - 1);
		const prevText = prevLine.text;
		
		if (prevText.trim().length === 0) {
			// Previous line is empty
			return await this.handleIndentZoneWithEmptyPrevious(editor, currentLine, firstNonWhitespaceIndex);
		} else {
			// Previous line contains text
			return await this.handleIndentZoneWithTextPrevious(editor, currentLine, lineText, prevText);
		}
	}

	/**
	 * Main handler for Smart Backspace.
	 * 
	 * Multi-cursor limitation: Falls back to default behavior when multiple cursors
	 * are present, as smart operations (line deletion/joining) would affect positions
	 * of other cursors unpredictably.
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { smartBackspace } = getSmartKeysConfiguration();
		const document = editor.document;
		const selections = editor.selections;
		
		// Use default behavior for multi-cursor or non-empty selections
		if (selections.length > 1 || !selections[0].isEmpty) {
			await vscode.commands.executeCommand('deleteLeft');
			return;
		}

		const selection = selections[0];

		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const lineText = document.lineAt(currentLine).text;

		// Check whether current line is empty
		if (lineText.trim().length === 0 && smartBackspace.handleEmptyLine) {
			const handled = await this.handleEmptyLine(editor, document, currentLine, lineText);
			if (handled) {
				return;
			}
		}

		// Check whether cursor is in indent zone
		if (isInIndentZone(lineText, currentChar) && smartBackspace.handleIndentZone) {
			const handled = await this.handleIndentZone(editor, document, currentLine, lineText);
			if (handled) {
				return;
			}
		}

		// Default Backspace behavior
		await vscode.commands.executeCommand('deleteLeft');
	}
}
