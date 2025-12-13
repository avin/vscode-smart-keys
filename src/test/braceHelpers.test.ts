import * as assert from 'assert';
import { shouldInsertClosingBrace } from '../utils/braceHelpers';

function toLines(snippet: string): string[] {
	return snippet.trim().split('\n');
}

function findBracePosition(line: string, occurrenceFromEnd = 1): number {
	let index = -1;
	let remaining = occurrenceFromEnd;
	for (let i = line.length - 1; i >= 0; i--) {
		if (line.charAt(i) === '{') {
			if (remaining === 1) {
				index = i;
				break;
			}
			remaining--;
		}
	}
	return index;
}

suite('braceHelpers.shouldInsertClosingBrace', () => {
	test('returns true when inner block steals closing of outer block', () => {
		const snippet = `
import React from 'react';

function Page({
  title,
  ...divProps
}: Props) { const foo = () => {


  return (
    <div {...divProps}>
    </div>
  );
}
`;

		const lines = toLines(snippet);
		const targetLineIndex = lines.findIndex(line => line.includes('const foo'));
		const targetCharIndex = findBracePosition(lines[targetLineIndex]);

		const result = shouldInsertClosingBrace(lines, targetLineIndex, targetCharIndex);

		assert.strictEqual(result, true);
	});

	test('returns false when block already closed', () => {
		const lines = [
			'const foo = () => {',
			'  return 1;',
			'}'
		];

		const result = shouldInsertClosingBrace(lines, 0, lines[0].length - 1);

		assert.strictEqual(result, false);
	});

	test('returns true on simple unmatched block', () => {
		const lines = [
			'if (condition) {',
			'  doSomething();'
		];

		const result = shouldInsertClosingBrace(lines, 0, lines[0].length - 1);

		assert.strictEqual(result, true);
	});
});
