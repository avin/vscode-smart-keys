import * as vscode from 'vscode';
import { calculateIndent } from '../utils/indentHelpers';
import { setCursorPosition, isInIndentZone, getFirstNonWhitespaceIndex } from '../utils/cursorHelpers';

export class SmartBackspaceHandler {
	/**
	 * Обрабатывает Backspace на пустой строке с пустой предыдущей строкой
	 */
	private async handleEmptyLineWithEmptyPrevious(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string
	): Promise<boolean> {
		const targetIndent = calculateIndent(editor, document, currentLine);
		
		// Удаляем предыдущую пустую строку и устанавливаем отступ
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
	 * Обрабатывает Backspace на пустой строке с текстовой предыдущей строкой
	 */
	private async handleEmptyLineWithTextPrevious(
		editor: vscode.TextEditor,
		currentLine: number,
		prevText: string
	): Promise<boolean> {
		const prevTextTrimmed = prevText.trimEnd();
		const cursorPosition = prevTextTrimmed.length;
		
		await editor.edit(editBuilder => {
			// Удаляем текущую пустую строку
			const deleteRange = new vscode.Range(
				new vscode.Position(currentLine, 0),
				new vscode.Position(currentLine + 1, 0)
			);
			editBuilder.delete(deleteRange);
			
			// Удаляем пробелы в конце предыдущей строки
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
	 * Обрабатывает Backspace на пустой строке
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
			// Предыдущая строка пустая
			return await this.handleEmptyLineWithEmptyPrevious(editor, document, currentLine, lineText);
		} else {
			// Предыдущая строка содержит текст
			return await this.handleEmptyLineWithTextPrevious(editor, currentLine, prevText);
		}
	}

	/**
	 * Обрабатывает Backspace в зоне отступа с пустой предыдущей строкой
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
	 * Обрабатывает Backspace в зоне отступа с текстовой предыдущей строкой
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
	 * Обрабатывает Backspace в зоне отступа
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
		
		// Вычисляем правильный отступ для этой строки
		const correctIndent = calculateIndent(editor, document, currentLine);
		
		// Если текущий отступ больше правильного, исправляем его
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
		
		// Если отступ правильный, выполняем логику удаления/объединения
		const prevLine = document.lineAt(currentLine - 1);
		const prevText = prevLine.text;
		
		if (prevText.trim().length === 0) {
			// Предыдущая строка пустая
			return await this.handleIndentZoneWithEmptyPrevious(editor, currentLine, firstNonWhitespaceIndex);
		} else {
			// Предыдущая строка содержит текст
			return await this.handleIndentZoneWithTextPrevious(editor, currentLine, lineText, prevText);
		}
	}

	/**
	 * Основной обработчик команды Smart Backspace
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const document = editor.document;
		const selection = editor.selection;
		
		// Если есть выделение, используем стандартное поведение
		if (!selection.isEmpty) {
			await vscode.commands.executeCommand('deleteLeft');
			return;
		}

		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const lineText = document.lineAt(currentLine).text;

		// Проверяем, пустая ли текущая строка
		if (lineText.trim().length === 0) {
			const handled = await this.handleEmptyLine(editor, document, currentLine, lineText);
			if (handled) {
				return;
			}
		}

		// Проверяем, находимся ли в зоне отступа
		if (isInIndentZone(lineText, currentChar)) {
			const handled = await this.handleIndentZone(editor, document, currentLine, lineText);
			if (handled) {
				return;
			}
		}

		// Стандартное поведение Backspace
		await vscode.commands.executeCommand('deleteLeft');
	}
}

