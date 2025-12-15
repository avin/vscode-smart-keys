import * as assert from 'assert';
import { isInIndentZone, getFirstNonWhitespaceIndex } from '../utils/cursorHelpers';

suite('CursorHelpers', () => {
    suite('isInIndentZone', () => {
        test('Cursor before first non-whitespace - should return true', () => {
            const lineText = '    code';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
            assert.strictEqual(isInIndentZone(lineText, 1), true);
            assert.strictEqual(isInIndentZone(lineText, 2), true);
            assert.strictEqual(isInIndentZone(lineText, 3), true);
            assert.strictEqual(isInIndentZone(lineText, 4), true);
        });
        
        test('Cursor after first non-whitespace - should return false', () => {
            const lineText = '    code';
            assert.strictEqual(isInIndentZone(lineText, 5), false);
            assert.strictEqual(isInIndentZone(lineText, 6), false);
        });
        
        test('Cursor at first non-whitespace - should return true', () => {
            const lineText = '  x';
            assert.strictEqual(isInIndentZone(lineText, 2), true);
        });
        
        test('No indent - cursor at position 0', () => {
            const lineText = 'code';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
        });
        
        test('No indent - cursor after first char', () => {
            const lineText = 'code';
            assert.strictEqual(isInIndentZone(lineText, 1), false);
        });
        
        test('Line with only whitespace - all positions in indent zone', () => {
            const lineText = '    ';
            assert.strictEqual(isInIndentZone(lineText, 0), false);
            assert.strictEqual(isInIndentZone(lineText, 2), false);
            assert.strictEqual(isInIndentZone(lineText, 4), false);
        });
        
        test('Empty line - should return false', () => {
            const lineText = '';
            assert.strictEqual(isInIndentZone(lineText, 0), false);
        });
        
        test('Tab indentation', () => {
            const lineText = '\t\tcode';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
            assert.strictEqual(isInIndentZone(lineText, 1), true);
            assert.strictEqual(isInIndentZone(lineText, 2), true);
            assert.strictEqual(isInIndentZone(lineText, 3), false);
        });
        
        test('Mixed tabs and spaces', () => {
            const lineText = '\t  code';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
            assert.strictEqual(isInIndentZone(lineText, 1), true);
            assert.strictEqual(isInIndentZone(lineText, 2), true);
            assert.strictEqual(isInIndentZone(lineText, 3), true);
        });
        
        test('Cursor beyond line length', () => {
            const lineText = '  code';
            assert.strictEqual(isInIndentZone(lineText, 10), false);
        });
        
        test('Negative cursor position', () => {
            const lineText = '  code';
            // Negative position is treated as before first char
            assert.strictEqual(isInIndentZone(lineText, -1), true);
        });
        
        test('Large indent', () => {
            const lineText = '                code';
            assert.strictEqual(isInIndentZone(lineText, 10), true);
            assert.strictEqual(isInIndentZone(lineText, 16), true);
            assert.strictEqual(isInIndentZone(lineText, 17), false);
        });
        
        test('Single space indent', () => {
            const lineText = ' code';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
            assert.strictEqual(isInIndentZone(lineText, 1), true);
            assert.strictEqual(isInIndentZone(lineText, 2), false);
        });
        
        test('Multiple consecutive spaces in text', () => {
            const lineText = '    code    more';
            assert.strictEqual(isInIndentZone(lineText, 3), true);
            assert.strictEqual(isInIndentZone(lineText, 8), false);
        });
        
        test('Line starting with non-whitespace', () => {
            const lineText = 'code';
            assert.strictEqual(isInIndentZone(lineText, 0), true);
            assert.strictEqual(isInIndentZone(lineText, 1), false);
        });
        
        test('Line with special characters in indent', () => {
            const lineText = '    // comment';
            assert.strictEqual(isInIndentZone(lineText, 4), true);
            assert.strictEqual(isInIndentZone(lineText, 5), false);
        });
        
        test('Unicode characters after indent', () => {
            const lineText = '    😀code';
            assert.strictEqual(isInIndentZone(lineText, 4), true);
            assert.strictEqual(isInIndentZone(lineText, 5), false);
        });
        
        test('Non-breaking space in indent', () => {
            const lineText = '\u00A0\u00A0code';
            // Non-breaking space is treated as non-whitespace by \S in JavaScript
            assert.strictEqual(isInIndentZone(lineText, 0), true);
        });
        
        test('Zero-width characters', () => {
            const lineText = '  \u200Bcode';
            // Zero-width space counts as non-whitespace
            assert.strictEqual(isInIndentZone(lineText, 2), true);
        });
    });
    
    suite('getFirstNonWhitespaceIndex', () => {
        test('Line with indent - should return index after spaces', () => {
            const lineText = '    code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('No indent - should return 0', () => {
            const lineText = 'code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Only whitespace - should return 0', () => {
            const lineText = '    ';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Empty string - should return 0', () => {
            const lineText = '';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Tab indent', () => {
            const lineText = '\tcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 1);
        });
        
        test('Multiple tabs', () => {
            const lineText = '\t\t\tcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 3);
        });
        
        test('Mixed tabs and spaces', () => {
            const lineText = '\t  \tcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Single space', () => {
            const lineText = ' code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 1);
        });
        
        test('Large indent', () => {
            const lineText = '                code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 16);
        });
        
        test('Line with special characters', () => {
            const lineText = '    // comment';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Line starting with number', () => {
            const lineText = '    123';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Line starting with symbol', () => {
            const lineText = '    +';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Line with Unicode characters', () => {
            const lineText = '    😀';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Line with Chinese characters', () => {
            const lineText = '    中文';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Very long indent', () => {
            const lineText = ' '.repeat(100) + 'code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 100);
        });
        
        test('Newline characters should not be whitespace', () => {
            const lineText = '  \ncode';
            // \n is whitespace, so search continues
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 3);
        });
        
        test('Carriage return not whitespace', () => {
            const lineText = '  \rcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 3);
        });
        
        test('Line with form feed', () => {
            const lineText = '  \fcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 3);
        });
        
        test('Line with vertical tab', () => {
            const lineText = '  \vcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 3);
        });
        
        test('Non-breaking space', () => {
            const lineText = '\u00A0\u00A0code';
            // Non-breaking space is matched as non-whitespace by \S
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 2);
        });
        
        test('Thin space', () => {
            const lineText = '\u2009\u2009code';
            // Thin space is treated as non-whitespace
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 2);
        });
        
        test('Zero-width space', () => {
            const lineText = '  \u200Bcode';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 2);
        });
        
        test('Multiple types of whitespace', () => {
            const lineText = ' \t \t code';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 5);
        });
        
        test('Whitespace at end of line', () => {
            const lineText = 'code    ';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Single character line', () => {
            const lineText = 'x';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Single space line', () => {
            const lineText = ' ';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Single tab line', () => {
            const lineText = '\t';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 0);
        });
        
        test('Bracket after indent', () => {
            const lineText = '    {';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Parenthesis after indent', () => {
            const lineText = '    (';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Quote after indent', () => {
            const lineText = '    "';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Backtick after indent', () => {
            const lineText = '    `';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Underscore after indent', () => {
            const lineText = '    _variable';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Dollar sign after indent', () => {
            const lineText = '    $variable';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('At sign after indent', () => {
            const lineText = '    @decorator';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Hash after indent', () => {
            const lineText = '    #private';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
        
        test('Exclamation after indent', () => {
            const lineText = '    !important';
            assert.strictEqual(getFirstNonWhitespaceIndex(lineText), 4);
        });
    });
});
