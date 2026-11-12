// End-to-end tests: drive the built app in Chromium and inspect the files it produces.
// Run `npm run build` first.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { preview, type PreviewServer } from 'vite';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { SECRETS, makeSample } from '../fixtures/make.ts';
import { containsSecret } from '../leak-scan.ts';

let server: PreviewServer;
let browser: Browser;
let base: string;
let sample: Uint8Array;
const dir = mkdtempSync(join(tmpdir(), 'pdf-tool-e2e-'));
const foreignRequests: string[] = [];
const pageErrors: string[] = [];

before(async () => {
  server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'silent' });
  base = server.resolvedUrls!.local[0];
  browser = await chromium.launch();
  sample = await makeSample();
});

after(async () => {
  await browser?.close();
  await new Promise<void>((r) => server.httpServer.close(() => r()));
  assert.deepEqual(foreignRequests, [], 'the app must not contact any other server');
  assert.deepEqual(pageErrors, [], 'no errors in the page');
});

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ acceptDownloads: true, locale: 'en-US' });
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(base) && !url.startsWith('blob:') && !url.startsWith('data:')) foreignRequests.push(url);
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push(m.text());
  });
  await page.goto(`${base}#${hash}`);
  return page;
}

async function upload(page: Page, files: { name: string; data: Uint8Array; mime?: string }[]) {
  await page.locator('input[type=file]').first().setInputFiles(
    files.map((f) => ({ name: f.name, mimeType: f.mime ?? 'application/pdf', buffer: Buffer.from(f.data) })),
  );
}

async function clickAndDownload(page: Page, button: string): Promise<Uint8Array> {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: button }).click()]);
  const path = join(dir, download.suggestedFilename());
  await download.saveAs(path);
  return new Uint8Array(readFileSync(path));
}

function pdfText(bytes: Uint8Array, pageNo: number): string {
  const file = join(dir, `text-${Date.now()}.pdf`);
  writeFileSync(file, bytes);
  return execFileSync('pdftotext', ['-f', String(pageNo), '-l', String(pageNo), file, '-'], { encoding: 'utf8' });
}

test('blackening removes the covered content for good', async () => {
  const page = await open('redact');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  await page.locator('.redact-page').nth(3).waitFor();

  // Mark the page 1 secret with the text search.
  await page.getByPlaceholder('Name, number, word').fill(SECRETS.page1);
  await page.getByRole('button', { name: 'Mark matches' }).click();
  await page.getByText('1 areas marked').waitFor();

  // Also draw a box by hand on page 1 over the e-mail line.
  const stage = page.locator('.page-stage').first();
  await stage.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  const box = (await stage.boundingBox())!;
  const at = (fx: number, fy: number) => [box.x + fx * box.width, box.y + fy * box.height] as const;
  await page.mouse.move(...at(0.07, 0.21));
  await page.mouse.down();
  await page.mouse.move(...at(0.3, 0.235), { steps: 5 });
  await page.mouse.move(...at(0.5, 0.24), { steps: 5 });
  await page.mouse.up();

  // Black out page 3 completely.
  await page.locator('.redact-page').nth(2).getByRole('button', { name: 'Black out whole page' }).click();
  await page.getByText('3 boxes on 2 pages').waitFor();

  const out = await clickAndDownload(page, 'Blacken and download');
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 4);
  for (const [where, secret] of Object.entries(SECRETS)) {
    assert.equal(containsSecret(out, secret), false, `${where} secret leaked`);
  }
  assert.equal(containsSecret(out, 'max@example.com'), false, 'hand drawn box');
  assert.equal(pdfText(out, 1).trim(), '', 'page 1 has no text layer any more');
  assert.match(pdfText(out, 2), /PAGE TWO STAYS/, 'untouched pages stay searchable');
  assert.match(pdfText(out, 4), /ROTATED PAGE/);
  assert.equal(doc.getPage(3).getRotation().angle, 90);
  assert.equal(doc.getTitle(), undefined);
  const p3 = doc.getPage(2).getSize();
  assert.deepEqual([Math.round(p3.width), Math.round(p3.height)], [842, 595], 'page size is kept');
  await page.close();
});

test('merge combines files in order', async () => {
  const page = await open('merge');
  await upload(page, [
    { name: 'a.pdf', data: sample },
    { name: 'b.pdf', data: sample },
  ]);
  await page.locator('.file-row').nth(1).waitFor();
  await page.locator('.pages-input').nth(1).fill('2-3');
  const out = await clickAndDownload(page, 'Merge and download');
  assert.equal((await PDFDocument.load(out)).getPageCount(), 6);
  await page.close();
});

test('split creates a zip with one PDF per page', async () => {
  const page = await open('split');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  await page.getByRole('button', { name: 'Split and download' }).waitFor();
  const zip = unzipSync(await clickAndDownload(page, 'Split and download'));
  assert.equal(Object.keys(zip).length, 4);
  const p2 = zip['sample-2.pdf'];
  assert.ok(p2);
  assert.equal(containsSecret(p2, SECRETS.page3), false);
  await page.close();
});

test('organize, numbers, metadata, export and images run', async () => {
  let page = await open('organize');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  await page.locator('.thumb').nth(3).waitFor();
  await page.locator('.thumb').first().getByRole('button', { name: 'Rotate right' }).click();
  await page.locator('.thumb').nth(1).getByRole('button', { name: 'Remove' }).click();
  let out = await clickAndDownload(page, 'Save and download');
  let doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 3);
  assert.equal(doc.getPage(0).getRotation().angle, 90);
  await page.close();

  page = await open('numbers');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  out = await clickAndDownload(page, 'Add numbers and download');
  assert.match(pdfText(out, 3), /\b3\b/);
  await page.close();

  page = await open('metadata');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  assert.equal(await page.locator('.form-grid input').first().inputValue(), SECRETS.title);
  out = await clickAndDownload(page, 'Remove all metadata and download');
  assert.equal(containsSecret(out, SECRETS.title), false);
  await page.close();

  page = await open('export');
  await upload(page, [{ name: 'sample.pdf', data: sample }]);
  const zip = unzipSync(await clickAndDownload(page, 'Convert and download'));
  assert.equal(Object.keys(zip).length, 4);
  const png = zip['sample-1.png'];
  await page.close();

  page = await open('images');
  await upload(page, [{ name: 'p1.png', data: png, mime: 'image/png' }]);
  await page.locator('.thumb').first().waitFor();
  out = await clickAndDownload(page, 'Create PDF');
  doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 1);
  await page.close();
});
