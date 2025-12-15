import * as vscode from 'vscode';

/**
 * Type arbitrary text through VS Code command API.
 */
export async function typeText(text: string): Promise<void> {
	await vscode.commands.executeCommand('type', { text });
}

/**
 * Insert a newline using the default VS Code command.
 */
export async function insertNewLine(): Promise<void> {
	await typeText('\n');
}
