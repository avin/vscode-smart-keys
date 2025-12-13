import * as vscode from 'vscode';
import { SmartEndHandler } from './handlers/smartEndHandler';
import { SmartBackspaceHandler } from './handlers/smartBackspaceHandler';
import { SmartEnterHandler } from './handlers/smartEnterHandler';

// Handler instances
const smartEndHandler = new SmartEndHandler();
const smartBackspaceHandler = new SmartBackspaceHandler();
const smartEnterHandler = new SmartEnterHandler();

/**
 * Register handler for cursor movement and reset End state on manual moves.
 */
function registerCursorChangeHandler(): vscode.Disposable {
	return vscode.window.onDidChangeTextEditorSelection(event => {
		const editor = event.textEditor;
		const selection = event.selections[0];
		const documentUri = editor.document.uri.toString();
		
		if (smartEndHandler.shouldResetOnCursorMove(
			documentUri,
			selection.active.line,
			selection.active.character
		)) {
			smartEndHandler.resetState(documentUri);
		}
	});
}

/**
 * Register handler for document changes and reset End state on edits.
 */
function registerDocumentChangeHandler(): vscode.Disposable {
	return vscode.workspace.onDidChangeTextDocument(event => {
		const documentUri = event.document.uri.toString();
		smartEndHandler.resetState(documentUri);
	});
}

/**
 * Register Smart End command.
 */
function registerSmartEndCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('smart-keys.smartEnd', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		
		await smartEndHandler.execute(editor);
	});
}

/**
 * Register Smart Backspace command.
 */
function registerSmartBackspaceCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('smart-keys.smartBackspace', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		
		await smartBackspaceHandler.execute(editor);
	});
}

/**
 * Register Smart Enter command.
 */
function registerSmartEnterCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('smart-keys.smartEnter', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		await smartEnterHandler.execute(editor);
	});
}

/**
 * Extension activation.
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Smart Keys extension is now active!');

	// Register handlers and commands
	const disposables = [
		registerCursorChangeHandler(),
		registerDocumentChangeHandler(),
		registerSmartEndCommand(),
		registerSmartBackspaceCommand(),
		registerSmartEnterCommand()
	];

	context.subscriptions.push(...disposables);
}

/**
 * Extension deactivation.
 */
export function deactivate(): void {
	smartEndHandler.clear();
}
