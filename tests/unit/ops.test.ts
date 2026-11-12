import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { addPageNumbers, buildPdf, mergePdfs, readMetadata, splitPdf, writeMetadata } from '../../src/lib/ops.ts';
import { SECRETS, makeSample } from '../fixtures/make.ts';
import { containsSecret } from '../leak-scan.ts';

test('the scanner finds secrets in the sample', async () => {
  const sample = await makeSample();
  for (const s of Object.values(SECRETS)) assert.ok(containsSecret(sample, s), s);
});

test('merge keeps all pages in order', async () => {
  const a = await makeSample();
  const out = await mergePdfs([{ bytes: a }, { bytes: a, pages: [1] }]);
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 5);
});

test('extracting a page does not leak other pages, metadata or attachments', async () => {
  const sample = await makeSample();
  const [part] = await splitPdf(sample, [[1]]);
  const doc = await PDFDocument.load(part);
  assert.equal(doc.getPageCount(), 1);
  assert.equal(doc.getPage(0).node.Annots()?.size() ?? 0, 0, 'internal link is dropped');
  for (const s of Object.values(SECRETS)) assert.equal(containsSecret(part, s), false, s);
});

test('split produces one file per group', async () => {
  const parts = await splitPdf(await makeSample(), [[0, 1], [2], [3]]);
  assert.deepEqual(
    await Promise.all(parts.map(async (p) => (await PDFDocument.load(p)).getPageCount())),
    [2, 1, 1],
  );
});

test('organize rotates, duplicates and reorders', async () => {
  const out = await buildPdf([await makeSample()], [
    { source: 0, page: 3, rotate: 90 },
    { source: 0, page: 0, rotate: -90 },
    { source: 0, page: 0 },
  ]);
  const doc = await PDFDocument.load(out);
  assert.deepEqual(doc.getPages().map((p) => p.getRotation().angle), [180, 270, 0]);
});

test('metadata can be replaced and removed', async () => {
  const sample = await makeSample();
  assert.equal((await readMetadata(sample)).title, SECRETS.title);
  const edited = await writeMetadata(sample, { title: 'New', author: '' });
  const meta = await readMetadata(edited);
  assert.equal(meta.title, 'New');
  assert.equal(meta.author, '');
  const stripped = await writeMetadata(sample, {});
  assert.equal(containsSecret(stripped, SECRETS.title), false);
  assert.equal(containsSecret(stripped, 'Mustermann'), false);
});

test('page numbers are added to every page', async () => {
  const out = await addPageNumbers(await makeSample(), { position: 'bottom-center', pattern: '{n} / {total}', startAt: 1, fontSize: 11 });
  assert.equal((await PDFDocument.load(out)).getPageCount(), 4);
  assert.ok(containsSecret(out, '4 / 4'));
});
