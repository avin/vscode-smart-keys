import * as vscode from 'vscode';
import { SmartEndHandler } from './handlers/smartEndHandler';
import { SmartBackspaceHandler } from './handlers/smartBackspaceHandler';

// Инстансы обработчиков
const smartEndHandler = new SmartEndHandler();
const smartBackspaceHandler = new SmartBackspaceHandler();

/**
 * Регистрирует обработчик изменения позиции курсора
 * Сбрасывает состояние End при ручном перемещении курсора
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
 * Регистрирует обработчик изменения документа
 * Сбрасывает состояние End при редактировании
 */
function registerDocumentChangeHandler(): vscode.Disposable {
	return vscode.workspace.onDidChangeTextDocument(event => {
		const documentUri = event.document.uri.toString();
		smartEndHandler.resetState(documentUri);
	});
}

/**
 * Регистрирует команду Smart End
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
 * Регистрирует команду Smart Backspace
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
 * Активация расширения
 */
export function activate(context: vscode.ExtensionContext): void {
	console.log('Smart Keys extension is now active!');

	// Регистрируем все обработчики и команды
	const disposables = [
		registerCursorChangeHandler(),
		registerDocumentChangeHandler(),
		registerSmartEndCommand(),
		registerSmartBackspaceCommand()
	];

	context.subscriptions.push(...disposables);
}

/**
 * Деактивация расширения
 */
export function deactivate(): void {
	smartEndHandler.clear();
}
