import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
    findPreviousNonEmptyLine, 
    shouldIncreaseIndent, 
    calculateIndent,
    getIndentFromLine,
    getIndentUnit
} from '../utils/indentHelpers';

/**
 * Create a mock text editor
 */
async function createMockEditor(content: string): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({
        content: content,
        language: 'typescript'
    });
    
    const editor = await vscode.window.showTextDocument(document);
    return editor;
}

suite('IndentHelpers', () => {
    suite('findPreviousNonEmptyLine', () => {
        test('Previous line has text - should return it', async () => {
            const editor = await createMockEditor('line1\n\n');
            const result = findPreviousNonEmptyLine(editor.document, 2);
            
            assert.notStrictEqual(result, null);
            assert.strictEqual(result?.lineNumber, 0);
            assert.strictEqual(result?.text, 'line1');
        });
        
        test('Multiple empty lines - should skip them', async () => {
            const editor = await createMockEditor('line1\n\n\n\nline5');
            const result = findPreviousNonEmptyLine(editor.document, 4);
            
            assert.notStrictEqual(result, null);
            assert.strictEqual(result?.lineNumber, 0);
        });
        
        test('No previous non-empty line - should return null', async () => {
            const editor = await createMockEditor('\n\n\nline4');
            const result = findPreviousNonEmptyLine(editor.document, 3);
            
            assert.strictEqual(result, null);
        });
        
        test('First line - should return null', async () => {
            const editor = await createMockEditor('line1\nline2');
            const result = findPreviousNonEmptyLine(editor.document, 0);
            
            assert.strictEqual(result, null);
        });
        
        test('Previous line with only whitespace - should skip', async () => {
            const editor = await createMockEditor('line1\n    \nline3');
            const result = findPreviousNonEmptyLine(editor.document, 2);
            
            assert.notStrictEqual(result, null);
            assert.strictEqual(result?.lineNumber, 0);
        });
        
        test('Previous line with tab - should skip', async () => {
            const editor = await createMockEditor('line1\n\t\nline3');
            const result = findPreviousNonEmptyLine(editor.document, 2);
            
            assert.strictEqual(result?.lineNumber, 0);
        });
        
        test('Immediate previous line has text', async () => {
            const editor = await createMockEditor('line1\nline2');
            const result = findPreviousNonEmptyLine(editor.document, 1);
            
            assert.strictEqual(result?.lineNumber, 0);
            assert.strictEqual(result?.text, 'line1');
        });
        
        test('Previous line with comment', async () => {
            const editor = await createMockEditor('// comment\n\nline3');
            const result = findPreviousNonEmptyLine(editor.document, 2);
            
            assert.strictEqual(result?.lineNumber, 0);
            assert.ok(result?.text.includes('comment'));
        });
        
        test('Previous line with indented text', async () => {
            const editor = await createMockEditor('    code\n\nline3');
            const result = findPreviousNonEmptyLine(editor.document, 2);
            
            assert.strictEqual(result?.lineNumber, 0);
            assert.ok(result?.text.includes('code'));
        });
    });
    
    suite('shouldIncreaseIndent', () => {
        test('Line ending with opening brace - should increase', () => {
            assert.strictEqual(shouldIncreaseIndent('function test() {'), true);
        });
        
        test('Line ending with opening brace and spaces', () => {
            assert.strictEqual(shouldIncreaseIndent('if (x) {  '), true);
        });
        
        test('Line ending with colon - should increase', () => {
            assert.strictEqual(shouldIncreaseIndent('case 1:'), true);
        });
        
        test('Line ending with opening parenthesis', () => {
            assert.strictEqual(shouldIncreaseIndent('function test('), true);
        });
        
        test('Line ending with opening bracket', () => {
            assert.strictEqual(shouldIncreaseIndent('const arr = ['), true);
        });
        
        test('Line without increase markers - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('const x = 1;'), false);
        });
        
        test('Line ending with closing brace', () => {
            assert.strictEqual(shouldIncreaseIndent('    }'), false);
        });
        
        test('Empty line', () => {
            assert.strictEqual(shouldIncreaseIndent(''), false);
        });
        
        test('Line with only whitespace', () => {
            assert.strictEqual(shouldIncreaseIndent('    '), false);
        });
        
        test('HTML opening tag - should increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<div>'), true);
        });
        
        test('HTML self-closing tag - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<img />'), false);
        });
        
        test('HTML closing tag - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('</div>'), false);
        });
        
        test('HTML comment - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<!-- comment -->'), false);
        });
        
        test('JSX fragment opening - should increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<>'), true);
        });
        
        test('XML declaration - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<?xml version="1.0"?>'), false);
        });
        
        test('DOCTYPE - should not increase', () => {
            assert.strictEqual(shouldIncreaseIndent('<!DOCTYPE html>'), false);
        });
        
        test('HTML tag with attributes', () => {
            assert.strictEqual(shouldIncreaseIndent('<div class="test">'), true);
        });
        
        test('Brace in middle of line', () => {
            assert.strictEqual(shouldIncreaseIndent('const obj = { key: value }'), false);
        });
        
        test('Colon in middle of line', () => {
            assert.strictEqual(shouldIncreaseIndent('const obj = { key: value }'), false);
        });
        
        test('Object literal start', () => {
            assert.strictEqual(shouldIncreaseIndent('const obj = {'), true);
        });
        
        test('Array literal start', () => {
            assert.strictEqual(shouldIncreaseIndent('const arr = ['), true);
        });
        
        test('Switch case with colon', () => {
            assert.strictEqual(shouldIncreaseIndent('    case "value":'), true);
        });
        
        test('Default case with colon', () => {
            assert.strictEqual(shouldIncreaseIndent('    default:'), true);
        });
        
        test('Ternary operator with colon', () => {
            assert.strictEqual(shouldIncreaseIndent('x ? y :'), true);
        });
        
        test('Label with colon', () => {
            assert.strictEqual(shouldIncreaseIndent('label:'), true);
        });
        
        test('Arrow function with brace', () => {
            assert.strictEqual(shouldIncreaseIndent('const fn = () => {'), true);
        });
        
        test('Class declaration', () => {
            assert.strictEqual(shouldIncreaseIndent('class MyClass {'), true);
        });
        
        test('Method declaration', () => {
            assert.strictEqual(shouldIncreaseIndent('    method() {'), true);
        });
        
        test('If statement', () => {
            assert.strictEqual(shouldIncreaseIndent('if (condition) {'), true);
        });
        
        test('Else block', () => {
            assert.strictEqual(shouldIncreaseIndent('} else {'), true);
        });
        
        test('For loop', () => {
            assert.strictEqual(shouldIncreaseIndent('for (let i = 0; i < 10; i++) {'), true);
        });
        
        test('While loop', () => {
            assert.strictEqual(shouldIncreaseIndent('while (condition) {'), true);
        });
        
        test('Try block', () => {
            assert.strictEqual(shouldIncreaseIndent('try {'), true);
        });
        
        test('Catch block', () => {
            assert.strictEqual(shouldIncreaseIndent('} catch (e) {'), true);
        });
    });
    
    suite('calculateIndent', () => {
        test('After opening brace - should increase indent', async () => {
            const editor = await createMockEditor('function test() {\n');
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.ok(indent.length === 4 || indent === '\t');
        });
        
        test('First line - should return empty', async () => {
            const editor = await createMockEditor('code');
            const indent = calculateIndent(editor, editor.document, 0);
            
            assert.strictEqual(indent, '');
        });
        
        test('After line without increase - should maintain indent', async () => {
            const editor = await createMockEditor('    const x = 1;\n');
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.strictEqual(indent, '    ');
        });
        
        test('After empty lines - should calculate from previous', async () => {
            const editor = await createMockEditor('function test() {\n\n\n');
            const indent = calculateIndent(editor, editor.document, 3);
            
            assert.ok(indent.length === 4 || indent === '\t');
        });
        
        test('No previous non-empty line - should return empty', async () => {
            const editor = await createMockEditor('\n\n\nline');
            const indent = calculateIndent(editor, editor.document, 3);
            
            assert.strictEqual(indent, '');
        });
        
        test('Nested blocks - should increase twice', async () => {
            const editor = await createMockEditor('if (x) {\n    if (y) {\n');
            const indent = calculateIndent(editor, editor.document, 2);
            
            assert.ok(indent.length === 8 || indent === '\t\t');
        });
        
        test('After closing brace - should maintain indent', async () => {
            const editor = await createMockEditor('function test() {\n    code\n}\n');
            const indent = calculateIndent(editor, editor.document, 3);
            
            assert.strictEqual(indent, '');
        });
        
        test('With tab indentation', async () => {
            const editor = await createMockEditor('function test() {\n');
            editor.options = { ...editor.options, insertSpaces: false };
            
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.ok(indent === '\t' || indent.length > 0);
        });
        
        test('With 2-space indent', async () => {
            const editor = await createMockEditor('if (x) {\n');
            editor.options = { ...editor.options, tabSize: 2, insertSpaces: true };
            
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.ok(indent.length >= 2);
        });
        
        test('After HTML opening tag', async () => {
            const editor = await createMockEditor('<div>\n');
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.ok(indent.length > 0);
        });
        
        test('After array opening', async () => {
            const editor = await createMockEditor('const arr = [\n');
            const indent = calculateIndent(editor, editor.document, 1);
            
            assert.ok(indent.length > 0);
        });
        
        test('After object property with colon', async () => {
            const editor = await createMockEditor('const obj = {\n    key:\n');
            const indent = calculateIndent(editor, editor.document, 2);
            
            assert.ok(indent.length >= 4);
        });
    });
    
    suite('getIndentFromLine', () => {
        test('Line with spaces - should extract indent', () => {
            const indent = getIndentFromLine('    code');
            assert.strictEqual(indent, '    ');
        });
        
        test('Line with no indent', () => {
            const indent = getIndentFromLine('code');
            assert.strictEqual(indent, '');
        });
        
        test('Line with tabs', () => {
            const indent = getIndentFromLine('\t\tcode');
            assert.strictEqual(indent, '\t\t');
        });
        
        test('Line with mixed tabs and spaces', () => {
            const indent = getIndentFromLine('\t  code');
            assert.strictEqual(indent, '\t  ');
        });
        
        test('Empty line', () => {
            const indent = getIndentFromLine('');
            assert.strictEqual(indent, '');
        });
        
        test('Line with only spaces', () => {
            const indent = getIndentFromLine('    ');
            assert.strictEqual(indent, '    ');
        });
        
        test('Line with single space', () => {
            const indent = getIndentFromLine(' code');
            assert.strictEqual(indent, ' ');
        });
        
        test('Line with large indent', () => {
            const indent = getIndentFromLine('                code');
            assert.strictEqual(indent, '                ');
        });
        
        test('Line starting with special char', () => {
            const indent = getIndentFromLine('    // comment');
            assert.strictEqual(indent, '    ');
        });
        
        test('Line with Unicode after indent', () => {
            const indent = getIndentFromLine('    😀');
            assert.strictEqual(indent, '    ');
        });
    });
    
    suite('getIndentUnit', () => {
        test('Default settings - should return 4 spaces', async () => {
            const editor = await createMockEditor('code');
            const unit = getIndentUnit(editor);
            
            assert.strictEqual(unit, '    ');
        });
        
        test('Tab indentation - should return tab', async () => {
            const editor = await createMockEditor('code');
            editor.options = { ...editor.options, insertSpaces: false };
            
            const unit = getIndentUnit(editor);
            
            assert.strictEqual(unit, '\t');
        });
        
        test('2-space indent', async () => {
            const editor = await createMockEditor('code');
            editor.options = { ...editor.options, tabSize: 2, insertSpaces: true };
            
            const unit = getIndentUnit(editor);
            
            assert.strictEqual(unit, '  ');
        });
        
        test('8-space indent', async () => {
            const editor = await createMockEditor('code');
            editor.options = { ...editor.options, tabSize: 8, insertSpaces: true };
            
            const unit = getIndentUnit(editor);
            
            assert.strictEqual(unit, '        ');
        });
        
        test('Tab size 3', async () => {
            const editor = await createMockEditor('code');
            editor.options = { ...editor.options, tabSize: 3, insertSpaces: true };
            
            const unit = getIndentUnit(editor);
            
            assert.strictEqual(unit, '   ');
        });
    });
});
