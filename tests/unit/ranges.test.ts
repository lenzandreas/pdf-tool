import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkPages, formatPageList, parsePageGroups, parsePageList } from '../../src/lib/ranges.ts';

test('parses single pages and ranges', () => {
  assert.deepEqual(parsePageList('1-3, 5', 10), [0, 1, 2, 4]);
  assert.deepEqual(parsePageList('8-', 10), [7, 8, 9]);
  assert.deepEqual(parsePageList('-2', 10), [0, 1]);
  assert.deepEqual(parsePageList('3-1', 10), [2, 1, 0]);
});

test('keeps groups for split', () => {
  assert.deepEqual(parsePageGroups('1-2; 3, 4-', 5), [[0, 1], [2], [3, 4]]);
});

test('rejects bad input', () => {
  assert.throws(() => parsePageList('', 3), /empty/);
  assert.throws(() => parsePageList('0', 3), /outOfRange/);
  assert.throws(() => parsePageList('4', 3), /outOfRange/);
  assert.throws(() => parsePageList('a-b', 3), /invalid/);
});

test('chunks and formats', () => {
  assert.deepEqual(chunkPages(5, 2), [[0, 1], [2, 3], [4]]);
  assert.equal(formatPageList([0, 1, 2, 4, 6, 7]), '1-3, 5, 7-8');
});
