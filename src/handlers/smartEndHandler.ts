import * as vscode from 'vscode';
import { calculateIndent } from '../utils/indentHelpers';
import { setCursorPosition } from '../utils/cursorHelpers';
import { getSmartKeysConfiguration } from '../configuration';

/**
 * State for tracking the last End position.
 */
interface EndPositionState {
	line: number;
	character: number;
	atTrimmedEnd: boolean;
}

export class SmartEndHandler {
	private lastEndPositions = new Map<string, EndPositionState>();

	/**
	 * Reset stored state for a document.
	 */
	public resetState(documentUri: string): void {
		this.lastEndPositions.delete(documentUri);
	}

	/**
	 * Decide whether End state should be reset after cursor move.
	 */
	public shouldResetOnCursorMove(
		documentUri: string,
		line: number,
		character: number
	): boolean {
		const lastPos = this.lastEndPositions.get(documentUri);
		if (!lastPos) {
			return false;
		}
		
		return line !== lastPos.line || Math.abs(character - lastPos.character) > 1;
	}

	/**
	 * Handle End on an empty line.
	 */
	private async handleEmptyLine(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string,
		documentUri: string
	): Promise<void> {
		const targetIndent = calculateIndent(editor, document, currentLine);

		// Insert target indent
		await editor.edit(editBuilder => {
			const lineRange = new vscode.Range(
				new vscode.Position(currentLine, 0),
				new vscode.Position(currentLine, lineText.length)
			);
			editBuilder.delete(lineRange);
			editBuilder.insert(new vscode.Position(currentLine, 0), targetIndent);
		});

		// Place cursor
		setCursorPosition(editor, currentLine, targetIndent.length);
		
		// Store state
		this.lastEndPositions.set(documentUri, {
			line: currentLine,
			character: targetIndent.length,
			atTrimmedEnd: false
		});
	}

	/**
	 * Handle End on a non-empty line.
	 */
	private handleNonEmptyLine(
		editor: vscode.TextEditor,
		currentLine: number,
		currentChar: number,
		lineText: string,
		documentUri: string
	): void {
		const trimmedLength = lineText.trimEnd().length;
		const fullLength = lineText.length;
		const lastPos = this.lastEndPositions.get(documentUri);
		
		const isAtEnd = lastPos && 
			lastPos.line === currentLine && 
			currentChar >= trimmedLength;

		let targetPosition: number;
		let atTrimmedEnd: boolean;

		if (isAtEnd && lastPos.atTrimmedEnd && currentChar === trimmedLength) {
			// Switch to full end (with trailing spaces)
			targetPosition = fullLength;
			atTrimmedEnd = false;
		} else if (isAtEnd && !lastPos.atTrimmedEnd && currentChar === fullLength) {
			// Switch back to trimmed end
			targetPosition = trimmedLength;
			atTrimmedEnd = true;
		} else if (currentChar === trimmedLength && trimmedLength < fullLength) {
			// Already at trimmed end, jump to full end
			targetPosition = fullLength;
			atTrimmedEnd = false;
		} else {
			// First press: go to trimmed end
			targetPosition = trimmedLength;
			atTrimmedEnd = true;
		}

		setCursorPosition(editor, currentLine, targetPosition);
		
		// Store state
		this.lastEndPositions.set(documentUri, {
			line: currentLine,
			character: targetPosition,
			atTrimmedEnd: atTrimmedEnd
		});
	}

	/**
	 * Main handler for Smart End.
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { smartEnd } = getSmartKeysConfiguration();
		const document = editor.document;
		const selection = editor.selection;
		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const lineText = document.lineAt(currentLine).text;
		const documentUri = document.uri.toString();

		if (lineText.trim().length === 0) {
			if (!smartEnd.indentEmptyLine) {
				this.resetState(documentUri);
				await vscode.commands.executeCommand('cursorEnd');
				return;
			}
			// Empty line
			await this.handleEmptyLine(editor, document, currentLine, lineText, documentUri);
		} else {
			if (!smartEnd.toggleTrimmedEnd) {
				this.resetState(documentUri);
				await vscode.commands.executeCommand('cursorEnd');
				return;
			}
			// Line with content
			this.handleNonEmptyLine(editor, currentLine, currentChar, lineText, documentUri);
		}
	}

	/**
	 * Clear all stored state.
	 */
	public clear(): void {
		this.lastEndPositions.clear();
	}
}
