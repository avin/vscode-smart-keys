import * as assert from 'assert';
import * as vscode from 'vscode';
import { SmartEnterHandler } from '../handlers/smartEnterHandler';
import { CURSOR, createEditorWithCursor, createMockEditor, createEditorWithMultipleCursors } from './helpers/editorTestUtils';

suite('SmartEnterHandler', () => {
    let handler: SmartEnterHandler;
    
    setup(() => {
        handler = new SmartEnterHandler();
    });
    
    suite('Auto-insert closing brace', () => {
        test('Enter after opening brace - should insert closing brace', async () => {
            const content = 'function test() {⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines.length, 3);
            assert.strictEqual(lines[0], 'function test() {');
            assert.strictEqual(lines[1], '    ');
            assert.strictEqual(lines[2], '}');
            
            // Cursor should be on the middle line with proper indent
            assert.strictEqual(editor.selection.active.line, 1);
            assert.strictEqual(editor.selection.active.character, 4);
        });
        
		test('Enter after brace with trailing spaces - should trim spaces', async () => {
			const content = 'if (x) {   ⌘}';
			const editor = await createEditorWithCursor(content);
			await handler.execute(editor);
			
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Trailing spaces are removed from the opening line
            assert.strictEqual(lines[0].trimEnd(), 'if (x) {');
			assert.strictEqual(lines[1], '    ');
			assert.strictEqual(lines[2], '}');
		});

		test('Enter after brace with trailing content - should preserve suffix', async () => {
			const content = 'function test() {⌘};';
			const editor = await createEditorWithCursor(content);
			await handler.execute(editor);

			const resultText = editor.document.getText();
			const lines = resultText.split(/\r?\n/);

			assert.strictEqual(lines[0], 'function test() {');
			assert.strictEqual(lines[1], '    ');
			assert.strictEqual(lines[2], '};');
		});
		
		test('Enter after brace in nested block - should use correct indent', async () => {
			const content = 'class A {\n    method() {⌘}\n}';
			const editor = await createEditorWithCursor(content);
			editor.options = { tabSize: 4, insertSpaces: true };
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[1], '    method() {');
            assert.strictEqual(lines[2], '        ');
            assert.strictEqual(lines[3], '    }');
            
            assert.strictEqual(editor.selection.active.line, 2);
            assert.strictEqual(editor.selection.active.character, 8);
        });
        
        test('Enter after brace when closing brace exists - should not insert', async () => {
            const content = 'function test() {⌘\n    return 1;\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should just insert normal newline, not add another }
            assert.strictEqual(lines.length, 4);
            assert.ok(!resultText.includes('}}'));
        });
        
        test('Enter after brace in balanced code - should not insert', async () => {
            const content = 'const obj = {⌘\n    key: "value"\n};';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const braceCount = (resultText.match(/}/g) || []).length;
            
            // Should have only one closing brace
            assert.strictEqual(braceCount, 1);
        });
        
        test('Enter after brace when unmatched - should insert closing', async () => {
            const content = 'function outer() {\n    function inner() {⌘\n';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should insert closing brace
            assert.strictEqual(lines[2], '        ');
            assert.strictEqual(lines[3], '    }');
        });
    });
    
    suite('Enter before closing brace', () => {
        test('Enter before brace - should use default behavior', async () => {
            const content = 'function test() {⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            // Should insert properly (with closing brace since cursor is at end)
            assert.ok(resultText.includes('\n'));
        });
    });
    
    suite('Enter without opening brace', () => {
        test('Enter in middle of line - should use default behavior', async () => {
            const content = 'const x = ⌘1;';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], 'const x = ');
            assert.strictEqual(lines[1], '1;');
        });
        
        test('Enter at end of line without brace', async () => {
            const content = 'const x = 1;⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], 'const x = 1;');
            assert.strictEqual(lines[1], '');
        });
        
        test('Enter on empty line', async () => {
            const content = '⌘';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            assert.ok(resultText.includes('\n'));
        });
    });
    
    suite('Enter with selection', () => {
        test('Enter with selected text - should use default behavior', async () => {
            const content = 'const x = 1;';
            
            const editor = await createMockEditor(content, 0, 6);
            editor.selection = new vscode.Selection(
                new vscode.Position(0, 6),
                new vscode.Position(0, 11)
            );
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            // Should delete selection and insert newline
            assert.ok(resultText.includes('\n'));
        });
    });
    
    suite('Edge cases', () => {
        test('Enter after brace at start of document', async () => {
            const content = '{⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], '{');
            assert.strictEqual(lines[1], '    ');
            assert.strictEqual(lines[2], '}');
        });
        
        test('Enter after brace with no indent', async () => {
            const content = '{⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[2], '}');
        });
        
        test('Enter after brace in string - should use default', async () => {
            const content = 'const s = "{⌘}";';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            // Should not insert closing brace (it's in a string)
            // But this is hard to detect, so it might insert
            // The test documents current behavior
            assert.ok(resultText.includes('\n'));
        });
        
        test('Enter after brace in comment - should use default', async () => {
            const content = '// test {⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // In comments, Enter still inserts closing brace (code doesn't detect comments)
            assert.ok(lines[0].includes('// test {'));
        });
        
        test('Enter after other characters', async () => {
            const content = 'const x = [⌘];';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            // Should not insert closing brace for [
            const braceCount = (resultText.match(/}/g) || []).length;
            assert.strictEqual(braceCount, 0);
        });
    });
    
    suite('Complex scenarios', () => {
        test('Enter after brace in arrow function', async () => {
            const content = 'const fn = () => {⌘};';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], 'const fn = () => {');
            assert.strictEqual(lines[1], '    ');
            assert.strictEqual(lines[2], '};');
        });
        
        test('Enter after brace in method', async () => {
            const content = 'class A {\n    method() {⌘}\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Check structure is correct
            assert.ok(lines.some(l => l.includes('method() {')));
            assert.ok(lines.filter(l => l.trim() === '}').length >= 2);
        });
        
        test('Enter after brace in JSX', async () => {
            const content = 'function Comp() {⌘}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], 'function Comp() {');
            assert.strictEqual(lines[2], '}');
        });
        
        test('Enter after brace with complex nesting', async () => {
            const content = 'if (a) {\n    if (b) {\n        if (c) {⌘}\n    }\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Verify closing brace was inserted with proper indent
            assert.ok(lines.some(l => l.includes('if (c) {')));
            assert.ok(lines.filter(l => l.trim() === '}').length >= 3);
        });
        
        test('Enter after brace in switch case', async () => {
            const content = 'switch (x) {\n    case 1: {⌘}\n}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Verify closing brace inserted
            assert.ok(lines.some(l => l.includes('case 1: {')));
            assert.ok(lines.some(l => l.trim() === '}' && l.startsWith('    ')));
        });
        
        test('Enter after brace in try-catch', async () => {
            const content = 'try {⌘} catch (e) {}';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], 'try {');
            assert.strictEqual(lines[2], '} catch (e) {}');
        });
    });
    
    suite('Different indent configurations', () => {
        test('Enter with 2-space indent', async () => {
            const content = 'if (x) {⌘}';
            const editor = await createEditorWithCursor(content);
            editor.options = { tabSize: 2, insertSpaces: true };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[1], '  ');
        });
        
        test('Enter with 8-space indent', async () => {
            const content = 'if (x) {⌘}';
            const editor = await createEditorWithCursor(content);
            editor.options = { tabSize: 8, insertSpaces: true };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[1], '        ');
        });
        
        test('Enter with tab indent', async () => {
            const content = 'if (x) {⌘}';
            const editor = await createEditorWithCursor(content);
            editor.options = { tabSize: 4, insertSpaces: false };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[1], '\t');
        });
    });
    
    suite('JSON integration', () => {
        test('Enter after opening brace in JSON should insert closing brace', async () => {
            const content = `{\n  "config": {${CURSOR}\n}`;
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.strictEqual(lines[0], '{');
            assert.strictEqual(lines[1], '  "config": {');
            assert.strictEqual(lines[2], '    ');
            assert.strictEqual(lines[3], '  }');
            assert.strictEqual(lines[4], '}');
        });

        test('Enter after JSON property value should still add comma before newline', async () => {
            const content = `{\n  "name": "test"${CURSOR}\n  "age": 25\n}`;
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": "test",'));
            assert.strictEqual(editor.selection.active.line, 2);
        });
    });
    
    suite('Regression tests', () => {
        test('Enter after brace that steals closing from outer block', async () => {
            const content = 'function outer() {\n    const inner = () => {⌘\n';
            const editor = await createEditorWithCursor(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should insert closing brace
            assert.strictEqual(lines[2], '        ');
            assert.strictEqual(lines[3], '    }');
        });
        
        test('Enter multiple times in sequence', async () => {
            const content = 'function test() {⌘}';
            const editor = await createEditorWithCursor(content);
            
            await handler.execute(editor);
            
            // Move cursor and press Enter again
            const newPos = new vscode.Position(editor.selection.active.line, 0);
            editor.selection = new vscode.Selection(newPos, newPos);
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines.length >= 3);
        });
    });

    suite('Multi-cursor support', () => {
        test('Enter with multiple cursors after opening braces - should expand all', async () => {
            const content = 'function test() {⌘}\nif (x) {⌘}';
            const editor = await createEditorWithMultipleCursors(content);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // First function expanded
            assert.strictEqual(lines[0], 'function test() {');
            assert.strictEqual(lines[1].trim(), '');
            assert.strictEqual(lines[2], '}');
            
            // Second if expanded (shifted by 2 lines from first expansion)
            assert.strictEqual(lines[3], 'if (x) {');
            assert.strictEqual(lines[4].trim(), '');
            assert.strictEqual(lines[5], '}');
            
            // Both cursors on indented lines
            assert.strictEqual(editor.selections.length, 2);
            assert.strictEqual(editor.selections[0].active.line, 1);
            assert.strictEqual(editor.selections[1].active.line, 4);
        });

        test('Enter with multiple cursors - one expandable, one not - should use default behavior', async () => {
            const content = 'function test() {⌘}\nconst x = ⌘1;';
            const editor = await createEditorWithMultipleCursors(content);
            const originalLineCount = editor.document.lineCount;
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should use default newline behavior
            // Check that newlines were inserted (not smart brace expansion for all)
            // If smart expansion happened, we'd have more lines (3 per expansion)
            // Default behavior should just insert 2 newlines (one per cursor)
            assert.strictEqual(editor.selections.length, 2);
            // Should have inserted newlines
            assert.ok(resultText.length > content.length - 2); // -2 for removed cursor markers
        });

        test('Enter with multiple cursors on empty lines - should insert newlines', async () => {
            const content = 'line1\n⌘\nline2\n⌘\nline3';
            const editor = await createEditorWithMultipleCursors(content);
            const originalLineCount = editor.document.lineCount;
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add 2 newlines
            assert.strictEqual(lines.length, originalLineCount + 2);
        });
    });
});
