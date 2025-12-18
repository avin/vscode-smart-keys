import * as vscode from 'vscode';
import { getSmartKeysConfiguration } from '../configuration';
import { isJsonDocument } from '../utils/jsonHelpers';

/**
 * Type colon using default VS Code command (bypasses type interceptor)
 */
async function typeColonDefault(): Promise<void> {
	await vscode.commands.executeCommand('default:type', { text: ':' });
}

export class SmartJsonColonHandler {
	/**
	 * Find the property name before the cursor (unquoted or quoted)
	 */
	private findPropertyNameBeforeCursor(lineText: string, cursorChar: number): { 
		propertyName: string; 
		isQuoted: boolean; 
		startPos: number;
		endPos: number;
		trailingWhitespace: number;
	} | null {
		const textBeforeCursor = lineText.substring(0, cursorChar);
		
		// Try to match quoted property: "propertyName" with optional trailing whitespace
		const quotedMatch = textBeforeCursor.match(/"([^"]+)"(\s*)$/);
		if (quotedMatch) {
			const propertyName = quotedMatch[1];
			const trailingWhitespace = quotedMatch[2].length;
			// The match tells us where the quoted string ends (including trailing space)
			// We need to find where the opening quote starts
			const matchedString = quotedMatch[0]; // The full match: "propertyName" or "propertyName" 
			const startPos = cursorChar - matchedString.length;
			const endPos = startPos + 1 + propertyName.length + 1; // opening quote + name + closing quote
			return {
				propertyName,
				isQuoted: true,
				startPos,
				endPos,
				trailingWhitespace
			};
		}
		
		// Try to match unquoted property: propertyName with optional trailing whitespace
		// Also supports dotted names like "workbench.statusBar.visible"
		const unquotedMatch = textBeforeCursor.match(/([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)(\s*)$/);
		if (unquotedMatch) {
			const propertyName = unquotedMatch[1];
			const trailingWhitespace = unquotedMatch[2].length;
			const matchedString = unquotedMatch[0];
			const startPos = cursorChar - matchedString.length;
			const endPos = startPos + propertyName.length;
			return {
				propertyName,
				isQuoted: false,
				startPos,
				endPos,
				trailingWhitespace
			};
		}
		
		return null;
	}

	/**
	 * Check if there's already a colon after the cursor position
	 */
	private hasColonAfterCursor(lineText: string, cursorChar: number): boolean {
		const textAfterCursor = lineText.substring(cursorChar);
		return textAfterCursor.trim().startsWith(':');
	}

	/**
	 * Execute smart colon insertion.
	 * Note: Multi-cursor support uses fallback to default behavior.
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const { document, selections } = editor;
		const config = getSmartKeysConfiguration();

		// Only activate for JSON/JSONC files
		if (!isJsonDocument(document)) {
			await typeColonDefault();
			return;
		}

		// Multi-cursor: use default behavior (complex property name quoting would be tricky)
		if (selections.length > 1) {
			await typeColonDefault();
			return;
		}

		const selection = selections[0];

		// Don't handle selection
		if (!selection.isEmpty) {
			await typeColonDefault();
			return;
		}

		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const line = document.lineAt(currentLine);
		const lineText = line.text;

		// Check if there's already a colon after cursor
		if (this.hasColonAfterCursor(lineText, currentChar)) {
			await typeColonDefault();
			return;
		}

		// Find property name before cursor
		const propertyInfo = this.findPropertyNameBeforeCursor(lineText, currentChar);
		
		if (!propertyInfo) {
			await typeColonDefault();
			return;
		}

		// Build the text to insert
		let textToInsert = ':';
		
		// Add space after colon if enabled
		if (config.json.addWhitespaceAfterColon) {
			textToInsert += ' ';
		}

		// Determine if we need to add quotes
		const needsQuotes = !propertyInfo.isQuoted && config.json.addQuotesToPropertyNames;

		// Calculate where we'll insert the colon
		// The insertion point is right after the property name (and closing quote if quoted)
		const colonInsertPos = propertyInfo.endPos;
		
		await editor.edit((editBuilder) => {
			// First, remove any trailing whitespace after the property name
			if (propertyInfo.trailingWhitespace > 0) {
				const wsRange = new vscode.Range(
					currentLine,
					colonInsertPos,
					currentLine,
					currentChar
				);
				editBuilder.delete(wsRange);
			}
			
			if (needsQuotes) {
				// Replace unquoted property with quoted version
				const replaceRange = new vscode.Range(
					currentLine,
					propertyInfo.startPos,
					currentLine,
					propertyInfo.endPos
				);
				editBuilder.replace(replaceRange, `"${propertyInfo.propertyName}"`);
			}
			
			// Insert colon (and space) at the end of property name
			// Account for the quotes if we added them
			let finalInsertPos: number;
			if (needsQuotes) {
				// Property was replaced with quoted version
				finalInsertPos = propertyInfo.startPos + propertyInfo.propertyName.length + 2; // +2 for quotes
			} else {
				// Property stays as is
				finalInsertPos = colonInsertPos;
			}
			
			const insertPosition = new vscode.Position(currentLine, finalInsertPos);
			editBuilder.insert(insertPosition, textToInsert);
		});

		// Move cursor to after the inserted text
		// Start from the original cursor position
		let newCursorPos = currentChar;
		// Remove trailing whitespace
		newCursorPos -= propertyInfo.trailingWhitespace;
		// Add the length of the inserted text (: or : )
		newCursorPos += textToInsert.length;
		// If we added quotes, account for them
		if (needsQuotes) {
			newCursorPos += 2; // Added opening and closing quotes
		}
		
		const newPosition = new vscode.Position(currentLine, newCursorPos);
		editor.selection = new vscode.Selection(newPosition, newPosition);
	}
}
