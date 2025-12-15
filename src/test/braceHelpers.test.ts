import * as assert from 'assert';
import { shouldInsertClosingBrace, countUnmatchedBraces, isBraceUnmatched } from '../utils/braceHelpers';

suite('BraceHelpers', () => {
    suite('countUnmatchedBraces', () => {
        test('No braces - should return 0', () => {
            const lines = ['const x = 1;'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('One unmatched opening brace', () => {
            const lines = ['function test() {'];
            assert.strictEqual(countUnmatchedBraces(lines), 1);
        });
        
        test('Two unmatched opening braces', () => {
            const lines = ['function test() {', '    if (x) {'];
            assert.strictEqual(countUnmatchedBraces(lines), 2);
        });
        
        test('Matched braces - should return 0', () => {
            const lines = ['function test() {', '}'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Multiple matched braces', () => {
            const lines = [
                'function test() {',
                '    if (x) {',
                '    }',
                '}'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Extra closing brace - should ignore', () => {
            const lines = ['function test() {', '}', '}'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Nested unmatched braces', () => {
            const lines = [
                'class A {',
                '    method() {',
                '        if (x) {'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 3);
        });
        
        test('Complex nesting', () => {
            const lines = [
                'if (a) {',
                '    for (b) {',
                '    }',
                '    while (c) {'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 2);
        });
        
        test('Empty lines', () => {
            const lines = ['function test() {', '', '', '}'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Braces on same line', () => {
            const lines = ['const obj = { key: {} };'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Multiple braces per line', () => {
            const lines = ['if (x) { if (y) { code; } }'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Object literal', () => {
            const lines = [
                'const obj = {',
                '    key: "value"',
                '};'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Array with objects', () => {
            const lines = [
                'const arr = [',
                '    { a: 1 },',
                '    { b: 2 }',
                '];'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
    });
    
    suite('isBraceUnmatched', () => {
        test('Single unmatched brace - should return true', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 16), true);
        });
        
        test('Matched brace - should return false', () => {
            const lines = ['function test() {', '}'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 16), false);
        });
        
        test('First of two unmatched braces', () => {
            const lines = ['function outer() {', '    function inner() {'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 17), true);
        });
        
        test('Second of two unmatched braces', () => {
            const lines = ['function outer() {', '    function inner() {'];
            assert.strictEqual(isBraceUnmatched(lines, 1, 21), true);
        });
        
        test('First brace matched, second unmatched', () => {
            const lines = [
                'function outer() {',
                '    function inner() {',
                '}'
            ];
            // The algorithm processes all lines and pops from stack when matching
            // With 2 opening braces and 1 closing, the closing brace pops the last one added (inner)
            // So the first brace (outer) remains in the stack and is unmatched
            assert.strictEqual(isBraceUnmatched(lines, 0, 17), true);
            assert.strictEqual(isBraceUnmatched(lines, 1, 21), false);
        });
        
        test('Nested matched braces', () => {
            const lines = [
                'if (a) {',
                '    if (b) {',
                '    }',
                '}'
            ];
            assert.strictEqual(isBraceUnmatched(lines, 0, 7), false);
            assert.strictEqual(isBraceUnmatched(lines, 1, 11), false);
        });
        
        test('Invalid line number - should return false', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, 5, 0), false);
        });
        
        test('Invalid char index - should return false', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 100), false);
        });
        
        test('Negative line number', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, -1, 0), false);
        });
        
        test('Negative char index', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, 0, -1), false);
        });
        
        test('Char is not a brace - should return false', () => {
            const lines = ['function test() {'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 0), false);
        });
        
        test('Multiple braces on same line', () => {
            const lines = ['if (x) { code; }'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 7), false);
        });
        
        test('Object literal brace', () => {
            const lines = ['const obj = { key: value };'];
            assert.strictEqual(isBraceUnmatched(lines, 0, 12), false);
        });
    });
    
    suite('shouldInsertClosingBrace', () => {
        test('Unmatched opening brace - should insert', () => {
            const lines = ['function test() {'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 16), true);
        });
        
        test('Matched opening brace - should not insert', () => {
            const lines = ['function test() {', '}'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 16), false);
        });
        
        test('Multiple unmatched braces', () => {
            const lines = [
                'class A {',
                '    method() {'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 8), true);
            assert.strictEqual(shouldInsertClosingBrace(lines, 1, 13), true);
        });
        
        test('Brace that balances when removed', () => {
            const lines = [
                'function test() {',
                '    return {',
                '    };',
                '}'
            ];
            // The inner brace is matched, should not insert
            assert.strictEqual(shouldInsertClosingBrace(lines, 1, 11), false);
        });
        
        test('Invalid line - should return false', () => {
            const lines = ['function test() {'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 10, 0), false);
        });
        
        test('Invalid char index - should return false', () => {
            const lines = ['function test() {'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 100), false);
        });
        
        test('Char is not opening brace - should return false', () => {
            const lines = ['function test() }'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 16), false);
        });
        
        test('Object literal - balanced', () => {
            const lines = ['const obj = { key: "value" };'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 12), false);
        });
        
        test('Nested object literals', () => {
            const lines = [
                'const obj = {',
                '    nested: {',
                '    }',
                '};'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 12), false);
            assert.strictEqual(shouldInsertClosingBrace(lines, 1, 12), false);
        });
        
        test('Empty file with brace', () => {
            const lines = ['{'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 0), true);
        });
        
        test('Brace at end of line', () => {
            const lines = ['if (condition) {'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 15), true);
        });
        
        test('Brace with trailing content', () => {
            const lines = ['if (x) { code'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 7), true);
        });
        
        test('Switch statement', () => {
            const lines = [
                'switch (x) {',
                '    case 1:',
                '        break;',
                '}'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 11), false);
        });
        
        test('Try-catch block', () => {
            const lines = [
                'try {',
                '    code;',
                '} catch (e) {',
                '}'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 4), false);
            assert.strictEqual(shouldInsertClosingBrace(lines, 2, 12), false);
        });
        
        test('Arrow function with brace', () => {
            const lines = ['const fn = () => {'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 17), true);
        });
        
        test('Class declaration', () => {
            const lines = [
                'class MyClass {',
                '    constructor() {',
                '    }',
                '}'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 14), false);
        });
        
        test('Multiple braces on same line - first brace', () => {
            const lines = ['if (x) { if (y) { } }'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 7), false);
        });
        
        test('Multiple braces on same line - second brace', () => {
            const lines = ['if (x) { if (y) { } }'];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 16), false);
        });
        
        test('Extra closing braces', () => {
            const lines = [
                'function test() {',
                '}',
                '}'
            ];
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 16), false);
        });
        
        test('Mismatched braces structure', () => {
            const lines = [
                'function outer() {',
                '    function inner() {',
                '}'
            ];
            // Both braces are unmatched, one closing brace doesn't resolve both
            assert.strictEqual(shouldInsertClosingBrace(lines, 0, 17), true);
            assert.strictEqual(shouldInsertClosingBrace(lines, 1, 21), true);
        });
    });
    
    suite('Edge cases with strings and comments', () => {
        test('Brace in string literal - counted as brace', () => {
            // Note: The current implementation doesn't handle strings
            const lines = ['const str = "test { brace";'];
            const count = countUnmatchedBraces(lines);
            // This will count the brace in the string
            assert.strictEqual(count, 1);
        });
        
        test('Brace in single-line comment - counted as brace', () => {
            // Note: The current implementation doesn't handle comments
            const lines = ['// This is a comment {'];
            const count = countUnmatchedBraces(lines);
            // This will count the brace in the comment
            assert.strictEqual(count, 1);
        });
        
        test('Braces in template literal', () => {
            const lines = ['const str = `template { } literal`;'];
            const count = countUnmatchedBraces(lines);
            // Braces in template literals are counted
            assert.strictEqual(count, 0);
        });
        
        test('Escaped braces in string', () => {
            const lines = ['const str = "\\{ \\}";'];
            // Escaped or not, they are still braces in current implementation
            const count = countUnmatchedBraces(lines);
            assert.strictEqual(count, 0);
        });
        
        test('Multi-line string with braces', () => {
            const lines = [
                'const str = `',
                '    {',
                '`;'
            ];
            const count = countUnmatchedBraces(lines);
            assert.strictEqual(count, 1);
        });
    });
    
    suite('Complex nesting scenarios', () => {
        test('Deeply nested structures', () => {
            const lines = [
                'class A {',
                '    method() {',
                '        if (x) {',
                '            while (y) {',
                '                for (z) {',
                '                }',
                '            }',
                '        }',
                '    }',
                '}'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Mixed structures', () => {
            const lines = [
                'const obj = {',
                '    method() {',
                '        return {',
                '            data: [1, 2, 3]',
                '        };',
                '    }',
                '};'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Incomplete nested structure', () => {
            const lines = [
                'function outer() {',
                '    const obj = {',
                '        inner: function() {',
                '            if (x) {'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 4);
        });
        
        test('Alternating matched and unmatched', () => {
            const lines = [
                'if (a) {',
                '}',
                'if (b) {'
            ];
            assert.strictEqual(countUnmatchedBraces(lines), 1);
        });
        
        test('JSX-like syntax', () => {
            const lines = [
                'function Component() {',
                '    return (',
                '        <div>',
                '            { data.map(item => {',
                '                return <span>{item}</span>;',
                '            })}',
                '        </div>',
                '    );',
                '}'
            ];
            // Count only curly braces, not JSX
            const count = countUnmatchedBraces(lines);
            assert.strictEqual(count, 0);
        });
    });
    
    suite('Special characters and edge cases', () => {
        test('Unicode in code', () => {
            const lines = ['function test() { const emoji = "😀"; }'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Empty array', () => {
            const lines: string[] = [];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Array with empty strings', () => {
            const lines = ['', '', ''];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Line with only brace', () => {
            const lines = ['{'];
            assert.strictEqual(countUnmatchedBraces(lines), 1);
        });
        
        test('Line with only closing brace', () => {
            const lines = ['}'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Multiple opening braces on one line', () => {
            const lines = ['{ { {'];
            assert.strictEqual(countUnmatchedBraces(lines), 3);
        });
        
        test('Multiple closing braces on one line', () => {
            const lines = ['{ { {', '} } }'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Braces with other brackets', () => {
            const lines = ['const x = [{ key: (value) }];'];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Regex with braces', () => {
            const lines = ['const regex = /\\{\\}/;'];
            // Implementation doesn't parse regex, braces are counted
            const count = countUnmatchedBraces(lines);
            assert.strictEqual(count, 0);
        });
        
        test('Very long line with many braces', () => {
            const openBraces = '{'.repeat(50);
            const closeBraces = '}'.repeat(50);
            const lines = [openBraces + closeBraces];
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
        
        test('Unbalanced with more closing', () => {
            const lines = ['{ } } }'];
            // Extra closing braces are ignored
            assert.strictEqual(countUnmatchedBraces(lines), 0);
        });
    });
});
