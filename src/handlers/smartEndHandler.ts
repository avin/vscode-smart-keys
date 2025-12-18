import * as vscode from 'vscode';
import { calculateIndent } from '../utils/indentHelpers';
import { setCursorPosition, setCursorPositions } from '../utils/cursorHelpers';
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
	 * Calculate target position for End key on non-empty line.
	 */
	private calculateTargetPosition(
		lineText: string,
		currentChar: number,
		currentLine: number,
		documentUri: string
	): { position: number; atTrimmedEnd: boolean } {
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

		return { position: targetPosition, atTrimmedEnd };
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
		const { position, atTrimmedEnd } = this.calculateTargetPosition(
			lineText, currentChar, currentLine, documentUri
		);

		setCursorPosition(editor, currentLine, position);
		
		// Store state
		this.lastEndPositions.set(documentUri, {
			line: currentLine,
			character: position,
			atTrimmedEnd
		});
	}

	/**
	 * Main handler for Smart End - supports multiple cursors.
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { smartEnd } = getSmartKeysConfiguration();
		const document = editor.document;
		const selections = editor.selections;
		const documentUri = document.uri.toString();

		// Check if all selections can use smart behavior
		const canUseSmartBehavior = selections.every(selection => {
			if (!selection.isEmpty) {
				return false;
			}
			const currentLine = selection.active.line;
			const lineText = document.lineAt(currentLine).text;
			
			if (lineText.trim().length === 0) {
				return smartEnd.indentEmptyLine;
			} else {
				return smartEnd.toggleTrimmedEnd;
			}
		});

		// If cannot use smart behavior for all cursors, fallback to default
		if (!canUseSmartBehavior) {
			this.resetState(documentUri);
			await vscode.commands.executeCommand('cursorEnd');
			return;
		}

		// For single cursor, use existing logic
		if (selections.length === 1) {
			const selection = selections[0];
			const currentLine = selection.active.line;
			const currentChar = selection.active.character;
			const lineText = document.lineAt(currentLine).text;

			if (lineText.trim().length === 0) {
				await this.handleEmptyLine(editor, document, currentLine, lineText, documentUri);
			} else {
				this.handleNonEmptyLine(editor, currentLine, currentChar, lineText, documentUri);
			}
			return;
		}

		// Multi-cursor: process each cursor
		const edits: Array<{ range: vscode.Range; text: string }> = [];
		const newPositions: Array<{ line: number; character: number }> = [];

		for (const selection of selections) {
			const currentLine = selection.active.line;
			const currentChar = selection.active.character;
			const lineText = document.lineAt(currentLine).text;

			if (lineText.trim().length === 0) {
				// Empty line - calculate indent
				const targetIndent = calculateIndent(editor, document, currentLine);
				const lineRange = new vscode.Range(
					new vscode.Position(currentLine, 0),
					new vscode.Position(currentLine, lineText.length)
				);
				edits.push({ range: lineRange, text: targetIndent });
				newPositions.push({ line: currentLine, character: targetIndent.length });
			} else {
				// Non-empty line - go to trimmed or full end
				const { position } = this.calculateTargetPosition(
					lineText, currentChar, currentLine, documentUri
				);
				newPositions.push({ line: currentLine, character: position });
			}
		}

		// Apply edits if any
		if (edits.length > 0) {
			await editor.edit(editBuilder => {
				for (const edit of edits) {
					editBuilder.replace(edit.range, edit.text);
				}
			});
		}

		// Set all cursor positions
		setCursorPositions(editor, newPositions);

		// For multi-cursor, reset state (cannot track single state for multiple cursors)
		this.resetState(documentUri);
	}

	/**
	 * Clear all stored state.
	 */
	public clear(): void {
		this.lastEndPositions.clear();
	}
}
