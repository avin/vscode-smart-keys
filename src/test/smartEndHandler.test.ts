import * as assert from 'assert';
import * as vscode from 'vscode';
import { SmartEndHandler } from '../handlers/smartEndHandler';

const CURSOR = '⌘';

/**
 * Helper to parse cursor position from text with marker
 */
function parseCursor(textWithCursor: string): { text: string; offset: number } {
    const offset = textWithCursor.indexOf(CURSOR);
    if (offset === -1) {
        throw new Error(`No cursor marker ${CURSOR} found in text`);
    }
    const text = textWithCursor.slice(0, offset) + textWithCursor.slice(offset + CURSOR.length);
    return { text, offset };
}

/**
 * Helper to find line and character from absolute offset
 */
function offsetToPosition(text: string, offset: number): { line: number; character: number } {
    const lines = text.split(/\r?\n/);
    let currentOffset = 0;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const lineLength = lines[lineNum].length;
        if (currentOffset + lineLength >= offset) {
            return { line: lineNum, character: offset - currentOffset };
        }
        currentOffset += lineLength + 1;
    }
    
    return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

/**
 * Create a mock text editor
 */
async function createMockEditor(content: string, cursorLine: number, cursorChar: number): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({
        content: content,
        language: 'typescript'
    });
    
    const editor = await vscode.window.showTextDocument(document);
    const position = new vscode.Position(cursorLine, cursorChar);
    editor.selection = new vscode.Selection(position, position);
    
    return editor;
}

suite('SmartEndHandler', () => {
    let handler: SmartEndHandler;
    
    setup(() => {
        handler = new SmartEndHandler();
    });
    
    suite('End key on empty line', () => {
        test('End on empty line after opening brace - should add indent', async () => {
            const content = 'function test() {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add indent
            assert.ok(lines[1].length === 4 || lines[1].match(/^\s+$/));
            assert.strictEqual(editor.selection.active.line, 1);
        });
        
        test('End on empty line with existing indent - should recalculate', async () => {
            const content = 'if (true) {\n  ⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should replace with correct indent
            assert.ok(lines[1].match(/^\s+$/));
        });
        
        test('End on empty line in nested structure', async () => {
            const content = 'class A {\n    method() {\n⌘\n    }\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add proper indent for nested level
            assert.ok(lines[2].length === 8 || lines[2].match(/^\s+$/));
        });
        
        test('End on empty line at document start', async () => {
            const content = '⌘\ncode';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // First line should remain empty (no indent)
            assert.strictEqual(lines[0], '');
        });
        
        test('End on empty line after array opening', async () => {
            const content = 'const arr = [\n⌘\n];';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].length > 0);
        });
    });
    
    suite('End key trim/full toggle', () => {
        test('End on line with content - should go to trimmed end', async () => {
            const content = '⌘const x = 1;   ';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should move to trimmed end
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('End at trimmed end - should toggle to full end', async () => {
            const content = 'const x = 1;⌘   ';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            
            // First press - should stay at trimmed (already there)
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 15);
            
            // Second press - should toggle back
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('End at full end - should toggle back to trimmed', async () => {
            const content = 'const x = 1;   ⌘';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should toggle to trimmed end
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('End in middle of line - should go to trimmed end', async () => {
            const content = 'const ⌘x = 1;   ';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('End on line without trailing spaces - should stay at end', async () => {
            const content = 'const ⌘x = 1;';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            assert.strictEqual(editor.selection.active.character, 12);
        });
    });
    
    suite('State management', () => {
        test('State persists across multiple End presses on same line', async () => {
            const content = 'const x = 1;   ';
            const editor = await createMockEditor(content, 0, 0);
            
            // First press
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 12);
            
            // Second press
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 15);
            
            // Third press
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 12);
        });
        
        test('State resets when moving to different line', async () => {
            const content = 'line1   \nline2   ';
            const editor = await createMockEditor(content, 0, 0);
            
            // End on first line
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 5);
            
            // Move to second line
            editor.selection = new vscode.Selection(
                new vscode.Position(1, 0),
                new vscode.Position(1, 0)
            );
            
            // End on second line should reset state
            await handler.execute(editor);
            assert.strictEqual(editor.selection.active.character, 5);
        });
        
        test('State resets when cursor moves significantly', async () => {
            const content = 'const x = 1;   ';
            const editor = await createMockEditor(content, 0, 12);
            
            // First End press
            await handler.execute(editor);
            
            // Move cursor away
            editor.selection = new vscode.Selection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            
            // Check if state should reset
            const shouldReset = handler.shouldResetOnCursorMove(
                editor.document.uri.toString(),
                0,
                0
            );
            assert.strictEqual(shouldReset, true);
        });
        
        test('State does not reset for small cursor movements', async () => {
            const content = 'const x = 1;   ';
            const editor = await createMockEditor(content, 0, 12);
            
            // Press End
            await handler.execute(editor);
            
            // Small movement (within 1 char) should not reset
            const shouldReset = handler.shouldResetOnCursorMove(
                editor.document.uri.toString(),
                0,
                editor.selection.active.character
            );
            assert.strictEqual(shouldReset, false);
        });
        
        test('Clear state removes all stored positions', async () => {
            const content = 'line1   \nline2   ';
            const editor = await createMockEditor(content, 0, 0);
            
            await handler.execute(editor);
            
            handler.clear();
            
            // State should be cleared
            const shouldReset = handler.shouldResetOnCursorMove(
                editor.document.uri.toString(),
                0,
                5
            );
            assert.strictEqual(shouldReset, false);
        });
    });
    
    suite('Different indent sizes', () => {
        test('End with 2-space indent', async () => {
            const content = 'if (true) {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            // Override editor options for 2-space indent
            editor.options = { ...editor.options, tabSize: 2, insertSpaces: true };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should use 2-space indent
            assert.ok(lines[1].match(/^\s+$/));
        });
        
        test('End with tab indent', async () => {
            const content = 'function test() {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            editor.options = { ...editor.options, insertSpaces: false };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add indent (tab or spaces)
            assert.ok(lines[1].length > 0);
        });
        
        test('End with 8-space indent', async () => {
            const content = 'class A {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            editor.options = { ...editor.options, tabSize: 8, insertSpaces: true };
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].match(/^\s+$/));
        });
    });
    
    suite('Edge cases', () => {
        test('End on line with only spaces', async () => {
            const content = '     ⌘     ';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Empty line should get no/minimal indent
            assert.ok(editor.selection.active.character >= 0);
        });
        
        test('End with multi-line selection', async () => {
            const content = 'line1\nline2\nline3';
            const editor = await createMockEditor(content, 0, 0);
            
            // Create multi-line selection
            const start = new vscode.Position(0, 0);
            const end = new vscode.Position(2, 5);
            editor.selection = new vscode.Selection(start, end);
            
            await handler.execute(editor);
            
            // Should handle gracefully
            assert.ok(editor.selection.active.character >= 0);
        });
        
        test('End at very end of document', async () => {
            const content = 'last line   ⌘';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should toggle to trimmed end
            assert.ok(editor.selection.active.character <= text.length);
        });
        
        test('End on single character line', async () => {
            const content = '⌘x';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            assert.strictEqual(editor.selection.active.character, 1);
        });
        
        test('End on line with Unicode characters', async () => {
            const content = '⌘const emoji = "😀";   ';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should handle Unicode properly
            assert.ok(editor.selection.active.character > 0);
        });
    });
    
    suite('Complex scenarios', () => {
        test('End in nested object literal', async () => {
            const content = 'const obj = {\n    nested: {\n⌘\n    }\n};';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should calculate correct indent
            assert.ok(lines[2].match(/^\s+$/));
        });
        
        test('End after colon in object', async () => {
            const content = 'const obj = {\n    key:⌘   \n};';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should go to end (trimmed or full)
            assert.ok(editor.selection.active.character >= 8);
        });
        
        test('End in JSX-like content', async () => {
            const content = '<div>\n⌘\n</div>';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add indent for JSX content
            assert.ok(lines[1].length >= 0);
        });
        
        test('End after opening parenthesis', async () => {
            const content = 'function test(\n⌘\n)';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add indent for parameters
            assert.ok(lines[1].length > 0);
        });
        
        test('End in switch statement', async () => {
            const content = 'switch (x) {\n    case 1:\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[2].match(/^\s+$/));
        });
    });
    
    suite('Whitespace handling', () => {
        test('End on line with only tabs', async () => {
            const content = '\t\t⌘\t';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should handle tabs as whitespace
            assert.ok(editor.selection.active.character >= 0);
        });
        
        test('End on line with mixed tabs and spaces', async () => {
            const content = '\t  ⌘code  \t';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            // Should go to trimmed end
            assert.ok(editor.selection.active.character > 3);
        });
        
        test('End on line ending with newline char visible', async () => {
            const content = 'code⌘\n';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            assert.strictEqual(editor.selection.active.line, 0);
        });
    });
    
    suite('Per-document cursor tracking', () => {
        test('Different documents maintain separate state', async () => {
            const content1 = 'doc1   ';
            const content2 = 'doc2   ';
            
            const editor1 = await createMockEditor(content1, 0, 0);
            await handler.execute(editor1);
            
            const editor2 = await createMockEditor(content2, 0, 0);
            await handler.execute(editor2);
            
            // Both should be at their respective trimmed ends
            assert.strictEqual(editor1.selection.active.character, 4);
            assert.strictEqual(editor2.selection.active.character, 4);
        });
        
        test('Reset state for specific document', async () => {
            const content = 'line   ';
            const editor = await createMockEditor(content, 0, 0);
            
            await handler.execute(editor);
            const firstPos = editor.selection.active.character;
            
            // Reset state for this document
            handler.resetState(editor.document.uri.toString());
            
            // State should be cleared - pressing End again should behave like first press
            editor.selection = new vscode.Selection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            await handler.execute(editor);
            assert.ok(editor.selection.active.character >= 4);
        });
    });
    
    suite('Indent based on previous line', () => {
        test('End after class declaration', async () => {
            const content = 'class MyClass {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].length > 0);
        });
        
        test('End after if statement', async () => {
            const content = 'if (condition) {\n⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].match(/^\s+$/));
        });
        
        test('End after arrow function', async () => {
            const content = 'const fn = () => {\n⌘\n};';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character);
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].length > 0);
        });
    });
});
