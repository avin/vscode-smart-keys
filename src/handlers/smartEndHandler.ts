import * as vscode from 'vscode';
import { calculateIndent } from '../utils/indentHelpers';
import { setCursorPosition } from '../utils/cursorHelpers';

/**
 * Состояние для отслеживания последней позиции End
 */
interface EndPositionState {
	line: number;
	character: number;
	atTrimmedEnd: boolean;
}

export class SmartEndHandler {
	private lastEndPositions = new Map<string, EndPositionState>();

	/**
	 * Сбрасывает состояние для документа
	 */
	public resetState(documentUri: string): void {
		this.lastEndPositions.delete(documentUri);
	}

	/**
	 * Проверяет, нужно ли сбросить состояние при перемещении курсора
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
	 * Обрабатывает нажатие End на пустой строке
	 */
	private async handleEmptyLine(
		editor: vscode.TextEditor,
		document: vscode.TextDocument,
		currentLine: number,
		lineText: string,
		documentUri: string
	): Promise<void> {
		const targetIndent = calculateIndent(editor, document, currentLine);

		// Вставляем отступы
		await editor.edit(editBuilder => {
			const lineRange = new vscode.Range(
				new vscode.Position(currentLine, 0),
				new vscode.Position(currentLine, lineText.length)
			);
			editBuilder.delete(lineRange);
			editBuilder.insert(new vscode.Position(currentLine, 0), targetIndent);
		});

		// Устанавливаем курсор
		setCursorPosition(editor, currentLine, targetIndent.length);
		
		// Сохраняем состояние
		this.lastEndPositions.set(documentUri, {
			line: currentLine,
			character: targetIndent.length,
			atTrimmedEnd: false
		});
	}

	/**
	 * Обрабатывает нажатие End на строке с содержимым
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
			// Переключаемся на полный конец (с пробелами)
			targetPosition = fullLength;
			atTrimmedEnd = false;
		} else if (isAtEnd && !lastPos.atTrimmedEnd && currentChar === fullLength) {
			// Переключаемся обратно на конец без пробелов
			targetPosition = trimmedLength;
			atTrimmedEnd = true;
		} else if (currentChar === trimmedLength && trimmedLength < fullLength) {
			// Если уже в конце без пробелов, сразу переходим в конец с пробелами
			targetPosition = fullLength;
			atTrimmedEnd = false;
		} else {
			// Первое нажатие - идем на конец без пробелов
			targetPosition = trimmedLength;
			atTrimmedEnd = true;
		}

		setCursorPosition(editor, currentLine, targetPosition);
		
		// Сохраняем состояние
		this.lastEndPositions.set(documentUri, {
			line: currentLine,
			character: targetPosition,
			atTrimmedEnd: atTrimmedEnd
		});
	}

	/**
	 * Основной обработчик команды Smart End
	 */
	public async execute(editor: vscode.TextEditor): Promise<void> {
		const document = editor.document;
		const selection = editor.selection;
		const currentLine = selection.active.line;
		const currentChar = selection.active.character;
		const lineText = document.lineAt(currentLine).text;
		const documentUri = document.uri.toString();

		if (lineText.trim().length === 0) {
			// Пустая строка
			await this.handleEmptyLine(editor, document, currentLine, lineText, documentUri);
		} else {
			// Строка с содержимым
			this.handleNonEmptyLine(editor, currentLine, currentChar, lineText, documentUri);
		}
	}

	/**
	 * Очищает все состояния
	 */
	public clear(): void {
		this.lastEndPositions.clear();
	}
}

