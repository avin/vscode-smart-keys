import * as vscode from 'vscode';

/**
 * Find the first non-empty line above the given one.
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
 * Check whether indent should increase based on the line text.
 */
export function shouldIncreaseIndent(lineText: string): boolean {
	const trimmedLine = lineText.trim();

	return /[{:(\[]\s*$/.test(trimmedLine) || isHtmlLikeOpeningTag(trimmedLine);
}

/**
 * Detect whether an HTML/JSX-like tag should increase indent level.
 */
function isHtmlLikeOpeningTag(trimmedLine: string): boolean {
	if (!trimmedLine.startsWith('<')) {
		return false;
	}

	if (
		trimmedLine.startsWith('</') || // closing tag
		trimmedLine.startsWith('<!--') || // comment
		trimmedLine.startsWith('<!') || // doctype/directives
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
 * Extract indent string from a line.
 */
export function getIndentFromLine(lineText: string): string {
	const match = lineText.match(/^(\s*)/);
	return match ? match[1] : '';
}

/**
 * Calculate correct indent based on the previous non-empty line.
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

	// Increase indent
	return prevIndent + getIndentUnit(editor);
}

/**
 * Return indent unit according to editor settings.
 */
export function getIndentUnit(editor: vscode.TextEditor): string {
	const tabSize = editor.options.tabSize as number || 4;
	const insertSpaces = editor.options.insertSpaces !== false;
	
	return insertSpaces ? ' '.repeat(tabSize) : '\t';
}
