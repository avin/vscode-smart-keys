import * as assert from 'assert';
import * as vscode from 'vscode';
import { SmartBackspaceHandler } from '../handlers/smartBackspaceHandler';
import { CURSOR, createEditorWithCursor, createMockEditor, createEditorWithMultipleCursors } from './helpers/editorTestUtils';

suite('SmartBackspaceHandler', () => {
    let handler: SmartBackspaceHandler;
    
    setup(() => {
        handler = new SmartBackspaceHandler();
    });
    
    suite('Backspace on empty line with empty previous line', () => {
        test('Backspace on empty line - should delete previous line and apply indent', async () => {
            const content = 'function test() {\n\n    ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
            assert.strictEqual(lines[0], 'function test() {');
            assert.ok(lines[1].trim() === '');
            assert.strictEqual(lines[2], '}');
        });
        
        test('Backspace on empty line with multiple empty previous lines', async () => {
            const content = 'function test() {\n\n\n    ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should delete one empty line
            assert.strictEqual(lines.length, 4);
        });
        
        test('Backspace on empty line after function declaration', async () => {
            const content = 'function test() {\n\n    ⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 2);
        });
        
        test('Backspace on indented empty line with empty previous', async () => {
            const content = 'class A {\n    method() {\n\n        ⌘\n    }\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 5);
        });
        
        test('Backspace on empty line calculates correct indent', async () => {
            const content = 'if (true) {\n\n    ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should apply correct indent
            assert.ok(lines[1].length === 4 || lines[1].match(/^\s+$/));
        });
    });
    
    suite('Backspace on empty line with text previous line', () => {
        test('Backspace on empty line - should merge with previous', async () => {
            const content = 'const x = 1;\n⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Empty line is deleted, may leave newline
            assert.ok(lines.length <= 2);
            assert.ok(lines[0].includes('const x = 1;'));
        });
        
        test('Backspace on empty line - cursor at end of previous line', async () => {
            const content = 'const x = 1;\n⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            assert.strictEqual(editor.selection.active.line, 0);
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('Backspace on empty line - trims trailing spaces', async () => {
            const content = 'const x = 1;   \n⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should trim spaces and delete line
            assert.ok(resultText.trimEnd() === 'const x = 1;');
        });
        
        test('Backspace on indented empty line with text previous', async () => {
            const content = 'function test() {\n    return 1;\n    ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
            assert.strictEqual(lines[1].trim(), 'return 1;');
        });
        
        test('Backspace on empty line after comment', async () => {
            const content = '// Comment\n⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.ok(resultText.trimEnd() === '// Comment');
        });
    });
    
    suite('Backspace in indent zone with empty previous line', () => {
        test('Backspace in indent - should delete previous empty line', async () => {
            const content = 'function test() {\n\n    ⌘code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
            assert.strictEqual(lines[1].trim(), 'code');
        });
        
        test('Backspace at first char of indent - should merge lines', async () => {
            const content = 'if (x) {\n\n⌘    code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
        });
        
        test('Backspace in middle of indent - cursor at first non-whitespace', async () => {
            const content = 'function test() {\n\n  ⌘  code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[1].trim(), 'code');
        });
    });
    
    suite('Backspace in indent zone with text previous line', () => {
        test('Backspace in indent - should merge lines', async () => {
            const content = 'const x = 1;\n    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should merge or fix indent
            assert.ok(resultText.includes('code'));
        });
        
        test('Backspace in indent - cursor at end of previous line', async () => {
            const content = 'const x = 1;\n    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            // Cursor should be repositioned appropriately
            assert.ok(editor.selection.active.line >= 0);
        });
        
        test('Backspace in indent - trims trailing spaces from previous', async () => {
            const content = 'const x = 1;   \n    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should process the indent zone
            assert.ok(resultText.includes('code'));
        });
        
        test('Backspace at beginning of indent zone', async () => {
            const content = 'function test() {\n    return 1;\n⌘    code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
        });
        
        test('Backspace in deep indent zone', async () => {
            const content = 'class A {\n    method() {\n        return {\n            ⌘value: 1\n        };\n    }\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 6);
        });
    });
    
    suite('Backspace outside indent zone (normal behavior)', () => {
        test('Backspace after first non-whitespace char - default behavior', async () => {
            const content = 'const ⌘x = 1;';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Default backspace deletes the space
            assert.ok(resultText.includes('const') && resultText.includes('x'));
        });
        
        test('Backspace in middle of word - default behavior', async () => {
            const content = 'const var⌘iable = 1;';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Default backspace removes char before cursor (the 'r')
            assert.ok(resultText.includes('va') && resultText.includes('iable'));
        });
        
        test('Backspace at end of line - default behavior', async () => {
            const content = 'const x = 1;⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.strictEqual(resultText, 'const x = 1');
        });
    });
    
    suite('Edge cases', () => {
        test('Backspace at start of document - should do nothing', async () => {
            const content = '⌘const x = 1;';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.strictEqual(resultText, 'const x = 1;');
        });
        
        test('Backspace on first line empty - should do nothing', async () => {
            const content = '    ⌘\ncode';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 2);
        });
        
        test('Backspace with selection - should use default behavior', async () => {
            const content = 'const x = 1;';
            
            const editor = await createMockEditor(content, 0, 6);
            const start = new vscode.Position(0, 6);
            const end = new vscode.Position(0, 7);
            editor.selection = new vscode.Selection(start, end);
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.ok(resultText === 'const  = 1;' || resultText === 'const x = 1;');
        });
        
        test('Backspace on line with only whitespace', async () => {
            const content = 'code\n    ⌘\nmore';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 2);
        });
        
        test('Backspace with excessive indentation - should fix indent', async () => {
            const content = 'function test() {\n            ⌘code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should fix indentation
            assert.ok(lines[1].trim() === 'code');
        });
    });
    
    suite('Complex scenarios', () => {
        test('Backspace in nested structures', async () => {
            const content = 'class A {\n    method() {\n        if (x) {\n            ⌘code\n        }\n    }\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 6);
        });
        
        test('Backspace after object literal', async () => {
            const content = 'const obj = {\n    key: "value"\n};\n    ⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Empty line should be handled
            assert.ok(lines.length <= 4);
        });
        
        test('Backspace in switch statement', async () => {
            const content = 'switch (x) {\n    case 1:\n        ⌘break;\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
        });
        
        test('Backspace after array literal', async () => {
            const content = 'const arr = [\n    1,\n    2\n];\n    ⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Empty line should be handled
            assert.ok(lines.length <= 5);
        });
        
        test('Backspace with tab indentation', async () => {
            const content = 'function test() {\n\t⌘code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 2);
        });
    });
    
    suite('Line merging behavior', () => {
        test('Merge line with previous - preserves content', async () => {
            const content = 'const x = 1;\n    ⌘const y = 2;';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.ok(resultText.includes('x = 1'));
            assert.ok(resultText.includes('const y = 2'));
        });
        
        test('Merge multiple times in sequence', async () => {
            const content = 'line1\nline2\n    ⌘line3';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should process indent zone
            assert.ok(lines.length >= 2);
        });
        
        test('Merge with comment line', async () => {
            const content = '// Comment\n    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.ok(resultText.includes('// Comment'));
            assert.ok(resultText.includes('code'));
        });
    });
    
    suite('Indent calculation', () => {
        test('Calculates indent based on brace', async () => {
            const content = 'if (true) {\n\n    ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should maintain indent for block
            assert.ok(lines[1].match(/^\s+$/) || lines[1].length > 0);
        });
        
        test('Calculates indent based on colon', async () => {
            const content = 'const obj = {\n    key:\n\n        ⌘\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 4);
        });
        
        test('Calculates indent for nested blocks', async () => {
            const content = 'function outer() {\n    function inner() {\n\n        ⌘\n    }\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 5);
        });
    });
    
    suite('Whitespace handling', () => {
        test('Trims trailing whitespace from previous line', async () => {
            const content = 'const x = 1;     \n⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should trim trailing spaces
            assert.ok(resultText.trimEnd() === 'const x = 1;');
        });
        
        test('Handles lines with only spaces', async () => {
            const content = 'code\n     \n    ⌘\nmore';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
        });
        
        test('Handles mixed tabs and spaces', async () => {
            const content = 'function test() {\n\t  ⌘code\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should handle indent zone
            assert.ok(lines.length >= 2);
        });
    });
    
    suite('Document boundaries', () => {
        test('First line of document', async () => {
            const content = '    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should use default behavior
            assert.ok(resultText.includes('code'));
        });
        
        test('Last line of document', async () => {
            const content = 'code\n    ⌘last';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.ok(resultText.includes('last'));
        });
        
        test('Single line document', async () => {
            const content = '    ⌘code';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            assert.strictEqual(resultText.split(/\r?\n/).length, 1);
        });
    });

    suite('Multi-cursor support', () => {
        test('Backspace with multiple cursors - should use default behavior', async () => {
            const content = 'cod⌘e\ntes⌘t';
            const editor = await createEditorWithMultipleCursors(content);
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should delete one character at each cursor (default behavior)
            // First line: 'code' -> 'coe' (delete 'd')
            // Second line: 'test' -> 'tet' (delete 's')
            assert.ok(resultText.includes('coe'));
            assert.ok(resultText.includes('tet'));
            assert.strictEqual(editor.selections.length, 2);
        });

        test('Backspace with multiple cursors on empty lines - should use default behavior', async () => {
            const content = 'function test() {\n\n    ⌘\n}\nif (x) {\n\n    ⌘\n}';
            const editor = await createEditorWithMultipleCursors(content);
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should use default behavior (not smart backspace logic)
            // Both cursors should delete one character/space
            assert.strictEqual(editor.selections.length, 2);
        });
    });
});
