import * as vscode from 'vscode';
import { insertNewLine } from '../utils/editorCommands';
import { getSmartKeysConfiguration } from '../configuration';
import { isJsonDocument } from '../utils/jsonHelpers';

export class SmartJsonCommaHandler {
	/**
	 * Check if a line needs a comma (has a value but no comma at the end)
	 */
	private lineNeedsComma(lineText: string): boolean {
		const trimmed = lineText.trim();
		
		// Empty line or only whitespace
		if (trimmed.length === 0) {
			return false;
		}
		
		// Already has comma at the end
		if (trimmed.endsWith(',')) {
			return false;
		}
		
		// Check if line appears to be a property value
		// Should have a colon and end with a value (string, number, boolean, null, closing bracket)
		if (!trimmed.includes(':')) {
			return false;
		}
		
		// Check if ends with a value
		const endsWithValue = 
			trimmed.endsWith('"') ||  // string value
			trimmed.endsWith('}') ||  // object value
			trimmed.endsWith(']') ||  // array value
			/\d$/.test(trimmed) ||    // number value
			trimmed.endsWith('true') ||
			trimmed.endsWith('false') ||
			trimmed.endsWith('null');

		return endsWithValue;
	}

	/**
	 * Execute smart comma insertion on Enter
	 */
	public async execute(
		editor: vscode.TextEditor,
		options?: { insertNewLine?: boolean }
	): Promise<boolean> {
		const shouldInsertNewLine = options?.insertNewLine ?? true;
		const insertNewLineIfAllowed = async () => {
			if (shouldInsertNewLine) {
				await insertNewLine();
			}
		};

		const { document, selection } = editor;
		const config = getSmartKeysConfiguration();

		// Check if feature is enabled
		if (!config.json.insertCommaOnEnter) {
			await insertNewLineIfAllowed();
			return false;
		}

		// Only activate for JSON/JSONC files
		if (!isJsonDocument(document)) {
			await insertNewLineIfAllowed();
			return false;
		}

		// Don't handle multi-cursor or selection
		if (!selection.isEmpty) {
			await insertNewLineIfAllowed();
			return false;
		}

		const currentLine = selection.active.line;
		const line = document.lineAt(currentLine);
		const lineText = line.text;

		// Check if line needs a comma
		if (!this.lineNeedsComma(lineText)) {
			await insertNewLineIfAllowed();
			return false;
		}
		// Add comma before inserting newline
		const trimmedLength = lineText.trimEnd().length;
		const commaPosition = new vscode.Position(currentLine, trimmedLength);
		
		await editor.edit((editBuilder) => {
			editBuilder.insert(commaPosition, ',');
		});

		// Insert newline
		await insertNewLineIfAllowed();
		return true;
	}
}
