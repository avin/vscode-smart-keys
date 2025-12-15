import * as assert from 'assert';
import * as vscode from 'vscode';
import { SmartJsonCommaHandler } from '../handlers/smartJsonCommaHandler';
import { CURSOR, createEditorWithCursor } from './helpers/editorTestUtils';

suite('SmartJsonCommaHandler', () => {
    let handler: SmartJsonCommaHandler;
    
    setup(() => {
        handler = new SmartJsonCommaHandler();
    });
    
    suite('Insert missing comma on Enter in JSON', () => {
        test('Should add comma after property value without comma', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma after "test"
            assert.ok(lines[1].includes('"name": "test",'), 'Should have comma after value');
            assert.strictEqual(editor.selection.active.line, 2);
        });
        
        test('Should add comma after number value', async () => {
            const content = '{\n  "age": 25⌘\n  "name": "test"\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"age": 25,'), 'Should have comma after number');
        });
        
        test('Should add comma after boolean value', async () => {
            const content = '{\n  "isActive": true⌘\n  "name": "test"\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"isActive": true,'), 'Should have comma after boolean');
        });
        
        test('Should add comma after null value', async () => {
            const content = '{\n  "data": null⌘\n  "name": "test"\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"data": null,'), 'Should have comma after null');
        });
        
        test('Should add comma after array value', async () => {
            const content = '{\n  "items": [1, 2, 3]⌘\n  "name": "test"\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"items": [1, 2, 3],'), 'Should have comma after array');
        });
        
		test('Should add comma after nested object', async () => {
			const content = '{\n  "config": {"x": 1}⌘\n  "name": "test"\n}';
			const editor = await createEditorWithCursor(content, 'json');
			await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"config": {"x": 1},'), 'Should have comma after nested object');
        });
        
        test('Should NOT add comma when already present', async () => {
            const content = '{\n  "name": "test",⌘\n  "age": 25\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should not add another comma
            assert.ok(lines[1].endsWith('"name": "test",'), 'Should not add duplicate comma');
            assert.strictEqual((lines[1].match(/,/g) || []).length, 1, 'Should have only one comma');
        });
        
        test('Should add comma even if next line is closing brace', async () => {
            const content = '{\n  "name": "test"⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma even though next line is closing brace
            assert.ok(lines[1].includes(','), 'Should have comma after value');
        });
        
        test('Should work with JSONC language', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const editor = await createEditorWithCursor(content, 'jsonc');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": "test",'), 'Should add comma in JSONC files');
        });
        
        test('Should NOT activate in non-JSON files', async () => {
            const content = '{\n  "name": "test"⌘\n  "age": 25\n}';
            const editor = await createEditorWithCursor(content, 'typescript');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should just insert newline without adding comma
            assert.ok(!lines[1].includes(','), 'Should not add comma in TypeScript files');
        });
        
		test('Should NOT add comma if line is empty or only whitespace', async () => {
			const content = '{\n  ⌘\n  "age": 25\n}';
			const editor = await createEditorWithCursor(content, 'json');
			await handler.execute(editor);
			
            const resultText = editor.document.getText();
            
            // Should just insert newline
            assert.ok(!resultText.includes(','), 'Should not add comma on empty line');
        });
        
		test('Should add comma with trailing whitespace after value', async () => {
			const content = '{\n  "name": "test"   ⌘\n  "age": 25\n}';
			const editor = await createEditorWithCursor(content, 'json');
			await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should add comma after value, handling trailing whitespace
            assert.ok(lines[1].trim().endsWith('"name": "test",'), 'Should have comma after value even with trailing spaces');
        });
        
		test('Should add comma even if next non-empty line is closing bracket', async () => {
			const content = '{\n  "name": "test"⌘\n  \n}';
			const editor = await createEditorWithCursor(content, 'json');
			await handler.execute(editor);
			
			const resultText = editor.document.getText();
			const lines = resultText.split(/\r?\n/);
			
			// Should add comma even if next non-empty line is closing brace
			assert.ok(lines[1].includes(','), 'Should have comma after value');
		});

		test('Should not add comma when selection is active', async () => {
			const content = '{\n  "name": "test"⌘\n}';
			const editor = await createEditorWithCursor(content, 'json');
			const lineText = editor.document.lineAt(1).text;
			const start = new vscode.Position(1, lineText.indexOf('"name"'));
			const end = new vscode.Position(1, lineText.length);
			editor.selection = new vscode.Selection(start, end);

			await handler.execute(editor);

			const resultText = editor.document.getText();
			assert.ok(!resultText.includes(','), 'Should avoid inserting comma when selection exists');
		});

		test('Should add comma without inserting newline when disabled', async () => {
			const content = '{\n  "name": "test"⌘\n}';
			const editor = await createEditorWithCursor(content, 'json');

			await handler.execute(editor, { insertNewLine: false });

			const lines = editor.document.getText().split(/\r?\n/);
			assert.ok(lines[1].endsWith('"name": "test",'), 'Should append comma on the same line');
			assert.strictEqual(lines.length, 3, 'Should not insert an extra newline');
		});
	});
});
