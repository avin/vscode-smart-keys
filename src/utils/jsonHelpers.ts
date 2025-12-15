import * as vscode from 'vscode';

/**
 * Determine whether document is JSON or JSON with comments.
 */
export function isJsonDocument(document: vscode.TextDocument): boolean {
	return document.languageId === 'json' || document.languageId === 'jsonc';
}
