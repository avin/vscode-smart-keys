import * as assert from 'assert';
import * as vscode from 'vscode';
import { SmartJsonCommaHandler } from '../handlers/smartJsonCommaHandler';

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
async function createMockEditor(content: string, cursorLine: number, cursorChar: number, language: string = 'json'): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({
        content: content,
        language: language
    });
    
    const editor = await vscode.window.showTextDocument(document);
    const position = new vscode.Position(cursorLine, cursorChar);
    editor.selection = new vscode.Selection(position, position);
    
    return editor;
}

suite('SmartJsonCommaHandler', () => {
    let handler: SmartJsonCommaHandler;
    
    setup(() => {
        handler = new SmartJsonCommaHandler();
    });
    
    suite('Insert missing comma on Enter in JSON', () => {
        test('Should add comma after property value without comma', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma after "test"
            assert.ok(lines[1].includes('"name": "test",'), 'Should have comma after value');
            assert.strictEqual(editor.selection.active.line, 2);
        });
        
        test('Should add comma after number value', async () => {
            const content = '{\n  "age": 25⌘\n  "name": "test"\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"age": 25,'), 'Should have comma after number');
        });
        
        test('Should add comma after boolean value', async () => {
            const content = '{\n  "isActive": true⌘\n  "name": "test"\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"isActive": true,'), 'Should have comma after boolean');
        });
        
        test('Should add comma after null value', async () => {
            const content = '{\n  "data": null⌘\n  "name": "test"\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"data": null,'), 'Should have comma after null');
        });
        
        test('Should add comma after array value', async () => {
            const content = '{\n  "items": [1, 2, 3]⌘\n  "name": "test"\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"items": [1, 2, 3],'), 'Should have comma after array');
        });
        
        test('Should add comma after nested object', async () => {
            const content = '{\n  "config": {"x": 1}⌘\n  "name": "test"\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"config": {"x": 1},'), 'Should have comma after nested object');
        });
        
        test('Should NOT add comma when already present', async () => {
            const content = '{\n  "name": "test",⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should not add another comma
            assert.ok(lines[1].endsWith('"name": "test",'), 'Should not add duplicate comma');
            assert.strictEqual((lines[1].match(/,/g) || []).length, 1, 'Should have only one comma');
        });
        
        test('Should add comma even if next line is closing brace', async () => {
            const content = '{\n  "name": "test"⌘\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma even though next line is closing brace
            assert.ok(lines[1].includes(','), 'Should have comma after value');
        });
        
        test('Should work with JSONC language', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'jsonc');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": "test",'), 'Should add comma in JSONC files');
        });
        
        test('Should NOT activate in non-JSON files', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'typescript');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should just insert newline without adding comma
            assert.ok(!lines[1].includes(','), 'Should not add comma in TypeScript files');
        });
        
        test('Should NOT add comma if line is empty or only whitespace', async () => {
            const content = '{\n  ⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should just insert newline
            assert.ok(!resultText.includes(','), 'Should not add comma on empty line');
        });
        
        test('Should add comma with trailing whitespace after value', async () => {
            const content = '{\n  "name": "test"   ⌘\n  "age": 25\n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma after value, handling trailing whitespace
            assert.ok(lines[1].trim().endsWith('"name": "test",'), 'Should have comma after value even with trailing spaces');
        });
        
        test('Should add comma even if next non-empty line is closing bracket', async () => {
            const content = '{\n  "name": "test"⌘\n  \n}';
            const { text, offset } = parseCursor(content);
            const { line, character } = offsetToPosition(text, offset);
            
            const editor = await createMockEditor(text, line, character, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma even if next non-empty line is closing brace
            assert.ok(lines[1].includes(','), 'Should have comma after value');
        });
    });
});
