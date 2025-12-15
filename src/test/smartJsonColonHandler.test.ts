import * as assert from 'assert';
import { SmartJsonColonHandler } from '../handlers/smartJsonColonHandler';
import { CURSOR, createEditorWithCursor } from './helpers/editorTestUtils';

suite('SmartJsonColonHandler', () => {
    let handler: SmartJsonColonHandler;
    
    setup(() => {
        handler = new SmartJsonColonHandler();
    });
    
	suite('Auto-add whitespace after colon', () => {
		test('Should add space after colon following property name', async () => {
			const content = '{\n  "name"⌘\n}';
			const editor = await createEditorWithCursor(content, 'json');
			const initialCharacter = editor.selection.active.character;
			await handler.execute(editor);
			
			const resultText = editor.document.getText();
			const lines = resultText.split(/\r?\n/);
			
			// Should have `: ` (colon with space)
			assert.ok(lines[1].includes('"name": '), 'Should have space after colon');
			// Cursor should be after the space
			assert.strictEqual(editor.selection.active.character, initialCharacter + 2);
		});
		
		test('Should add space even with trailing whitespace before cursor', async () => {
			const content = '{\n  "name" ⌘\n}';
			const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": '), 'Should have space after colon');
        });
		
		test('Should work with JSONC', async () => {
			const content = '{\n  "name"⌘\n}';
			const editor = await createEditorWithCursor(content, 'jsonc');
			await handler.execute(editor);
			
			const resultText = editor.document.getText();
			const lines = resultText.split(/\r?\n/);
			
            assert.ok(lines[1].includes('"name": '), 'Should work in JSONC files');
        });
		
		test('Should NOT add space in non-JSON files', async () => {
			const content = '{\n  "name"⌘\n}';
			const editor = await createEditorWithCursor(content, 'typescript');
			await handler.execute(editor);
			
			const resultText = editor.document.getText();
			const lines = resultText.split(/\r?\n/);
			
            // Should just insert colon without space
            assert.strictEqual(lines[1].includes('"name": '), false, 'Should not add space in non-JSON files');
        });
    });
    
    suite('Auto-add quotes to property names', () => {
        test('Should add quotes to unquoted property name', async () => {
            const content = '{\n  name⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should have quoted property name
            assert.ok(lines[1].includes('"name": '), 'Should add quotes to property name');
        });
        
        test('Should add quotes to property name with numbers', async () => {
            const content = '{\n  prop123⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"prop123": '), 'Should quote property with numbers');
        });
        
        test('Should add quotes to camelCase property', async () => {
            const content = '{\n  firstName⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"firstName": '), 'Should quote camelCase property');
        });
        
        test('Should NOT add quotes if already quoted', async () => {
            const content = '{\n  "name"⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should not add duplicate quotes
            assert.ok(lines[1].includes('"name": '), 'Should keep existing quotes');
            assert.strictEqual((lines[1].match(/"/g) || []).length, 2, 'Should have exactly two quotes');
        });
        
        test('Should handle property with underscore', async () => {
            const content = '{\n  first_name⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"first_name": '), 'Should quote property with underscore');
        });
        
        test('Should work in JSONC', async () => {
            const content = '{\n  name⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": '), 'Should work in JSONC');
        });
		
		test('Should NOT quote in non-JSON files', async () => {
			const content = '{\n  name⌘\n}';
			const editor = await createEditorWithCursor(content, 'typescript');
			await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should NOT add quotes in TypeScript
            assert.strictEqual(lines[1].includes('"name"'), false, 'Should not quote in non-JSON');
        });
    });
    
    suite('Combined: Quotes + Whitespace', () => {
        test('Should add both quotes and space for unquoted property', async () => {
            const content = '{\n  name⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should have both quotes and space
            assert.ok(lines[1].includes('"name": '), 'Should have both quotes and space');
        });
        
        test('Should add only space for already quoted property', async () => {
            const content = '{\n  "name"⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            // Should only add space, not duplicate quotes
            assert.ok(lines[1].includes('"name": '), 'Should have quotes and space');
            assert.strictEqual((lines[1].match(/"/g) || []).length, 2, 'Should have exactly two quotes');
        });
    });
    
    suite('Edge cases', () => {
        test('Should NOT activate if there is already a colon', async () => {
            const content = '{\n  "name":⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            const initialText = editor.document.getText();
            
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            
            // Should just type a colon, not do smart behavior
            assert.ok(resultText.includes('::'), 'Should just add colon');
        });
        
        test('Should handle property at start of object', async () => {
            const content = '{\nname⌘\n}';
            const editor = await createEditorWithCursor(content, 'json');
            await handler.execute(editor);
            
            const resultText = editor.document.getText();
            const lines = resultText.split(/\r?\n/);
            
            assert.ok(lines[1].includes('"name": '), 'Should work without leading whitespace');
        });
    });
});
