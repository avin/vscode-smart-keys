import * as vscode from 'vscode';

/**
 * Находит первую непустую строку выше указанной
 */
export function findPreviousNonEmptyLine(
	document: vscode.TextDocument,
	startLine: number
): { lineNumber: number; text: string } | null {
	let lineNum = startLine - 1;
	
	while (lineNum >= 0) {
		const line = document.lineAt(lineNum);
		if (line.text.trim().length > 0) {
			return { lineNumber: lineNum, text: line.text };
		}
		lineNum--;
	}
	
	return null;
}

/**
 * Проверяет, должен ли отступ быть увеличен на основе текста строки
 */
export function shouldIncreaseIndent(lineText: string): boolean {
	const trimmedLine = lineText.trim();

	return /[{:(\[]\s*$/.test(trimmedLine) || isHtmlLikeOpeningTag(trimmedLine);
}

/**
 * Определяет, должен ли HTML/JSX тег увеличивать уровень вложенности
 */
function isHtmlLikeOpeningTag(trimmedLine: string): boolean {
	if (!trimmedLine.startsWith('<')) {
		return false;
	}

	if (
		trimmedLine.startsWith('</') || // закрывающий тег
		trimmedLine.startsWith('<!--') || // комментарий
		trimmedLine.startsWith('<!') || // doctype/инструкции
		trimmedLine.startsWith('<?') // xml-declaration
	) {
		return false;
	}

	if (trimmedLine.endsWith('/>')) {
		return false;
	}

	if (trimmedLine === '<>') {
		return true;
	}

	return /<[\w.:$-]+(?:\s[^>]*)?>\s*$/.test(trimmedLine);
}

/**
 * Извлекает отступ из строки
 */
export function getIndentFromLine(lineText: string): string {
	const match = lineText.match(/^(\s*)/);
	return match ? match[1] : '';
}

/**
 * Вычисляет правильный отступ на основе предыдущей строки
 */
export function calculateIndent(
	editor: vscode.TextEditor,
	document: vscode.TextDocument,
	currentLine: number
): string {
	if (currentLine === 0) {
		return '';
	}

	const prevLineInfo = findPreviousNonEmptyLine(document, currentLine);
	if (!prevLineInfo) {
		return '';
	}

	const prevIndent = getIndentFromLine(prevLineInfo.text);
	
	if (!shouldIncreaseIndent(prevLineInfo.text)) {
		return prevIndent;
	}

	// Увеличиваем отступ
	const tabSize = editor.options.tabSize as number || 4;
	const insertSpaces = editor.options.insertSpaces !== false;
	
	if (insertSpaces) {
		return prevIndent + ' '.repeat(tabSize);
	} else {
		return prevIndent + '\t';
	}
}
