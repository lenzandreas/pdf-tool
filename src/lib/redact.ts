import { loadPdf, createOutput, saveOutput } from './pdfdoc.ts';
import { openWithPdfJs, renderPage, type PDFDocumentProxy, type PDFPageProxy } from './pdfjs.ts';
import type { PDFDocument, PDFPage } from 'pdf-lib';

/**
 * A rectangle on a page, as fractions (0..1) of the page as displayed
 * (rotation applied), measured from the top left corner.
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Fill colour; black unless set. Either way the content underneath is removed. */
  color?: BoxColor;
}

export type BoxColor = 'black' | 'white';

export interface RedactOptions {
  /** Resolution of the flattened pages. */
  dpi: number;
  /** Flatten every page, not only the ones with boxes. */
  flattenAll: boolean;
  /** Image format of flattened pages. */
  format: 'png' | 'jpeg';
  password?: string;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Produces a new PDF in which every page that has at least one box is
 * replaced by a picture of that page with the boxes painted black (or white).
 *
 * Why this cannot be undone: the flattened page holds nothing but pixels.
 * The text, fonts, vector graphics, images and annotations of the
 * original page are not copied into the output at all, so nothing is
 * hidden "under" the black box. The output is a brand new file, so the
 * original's metadata, bookmarks, attachments, form data, JavaScript and
 * earlier revisions are not carried over either. Pages without boxes are
 * copied as they are (still searchable), after cutting any references to
 * other pages so a link cannot drag a redacted page back in.
 */
export async function redactPdf(bytes: Uint8Array, boxes: Map<number, Box[]>, opts: RedactOptions): Promise<Uint8Array> {
  const pdf = await openWithPdfJs(bytes, opts.password);
  try {
    const count = pdf.numPages;
    const flatten = (i: number) => opts.flattenAll || (boxes.get(i)?.length ?? 0) > 0;

    // Pages that stay as they are come from pdf-lib.
    const keep = Array.from({ length: count }, (_, i) => i).filter((i) => !flatten(i));
    let src: PDFDocument | undefined;
    // Throws EncryptedPdfError for protected files; the UI then offers
    // to flatten all pages, which works because pdf.js can decrypt.
    if (keep.length > 0) src = await loadPdf(bytes);

    const out = await createOutput();
    const kept = new Map<number, PDFPage>();
    if (src && keep.length > 0) {
      const copies = await out.copyPages(src, keep);
      keep.forEach((idx, i) => kept.set(idx, copies[i]));
    }

    for (let i = 0; i < count; i++) {
      opts.onProgress?.(i, count);
      const copy = kept.get(i);
      if (copy) {
        out.addPage(copy);
        continue;
      }
      const page = await pdf.getPage(i + 1);
      try {
        await addFlattenedPage(out, page, boxes.get(i) ?? [], opts);
      } finally {
        page.cleanup();
      }
    }
    opts.onProgress?.(count, count);
    return await saveOutput(out);
  } finally {
    await pdf.destroy();
  }
}

async function addFlattenedPage(out: PDFDocument, page: PDFPageProxy, pageBoxes: Box[], opts: RedactOptions) {
  const size = page.getViewport({ scale: 1 });
  const canvas = await renderPage(page, opts.dpi / 72);
  const ctx = canvas.getContext('2d')!;
  for (const b of pageBoxes) {
    ctx.fillStyle = b.color === 'white' ? '#fff' : '#000';
    // Round outwards to whole pixels so no partly covered pixel survives.
    const x0 = Math.floor(clamp01(b.x) * canvas.width);
    const y0 = Math.floor(clamp01(b.y) * canvas.height);
    const x1 = Math.ceil(clamp01(b.x + b.w) * canvas.width);
    const y1 = Math.ceil(clamp01(b.y + b.h) * canvas.height);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  const type = opts.format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, 0.9),
  );
  const data = new Uint8Array(await blob.arrayBuffer());
  const image = opts.format === 'png' ? await out.embedPng(data) : await out.embedJpg(data);
  out.addPage([size.width, size.height]).drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });
  // Free the pixel memory right away; large documents add up quickly.
  canvas.width = canvas.height = 0;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// ------------------------------------------------------------ text search

export const PRESETS = {
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  iban: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g,
  phone: /(?:\+|\b00|\b0)\d[\d\s/()-]{5,}\d\b/g,
} as const;

export type Preset = keyof typeof PRESETS;

/** Turns a plain search term into a regex that ignores case and spacing. */
export function termToRegex(term: string): RegExp | null {
  const t = term.trim();
  if (!t) return null;
  const escaped = t
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(escaped, 'gi');
}

interface Item {
  str: string;
  transform: number[];
  width: number;
  hasEOL: boolean;
}

/**
 * Finds all matches of the patterns on a page and returns boxes around
 * them. Boxes are estimated from the text positions pdf.js reports and
 * are a bit generous, so they can be reviewed and adjusted afterwards.
 */
export async function findTextBoxes(pdf: PDFDocumentProxy, pageIndex: number, patterns: RegExp[]): Promise<Box[]> {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: Item[] = [];
  for (const it of content.items) {
    if ('str' in it) items.push(it as Item);
  }
  let text = '';
  const starts: number[] = [];
  for (const it of items) {
    starts.push(text.length);
    text += it.str;
    if (it.hasEOL) text += '\n';
  }
  const boxes: Box[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    for (const m of text.matchAll(re)) {
      if (!m[0]) continue;
      const ms = m.index!;
      const me = ms + m[0].length;
      items.forEach((it, k) => {
        const s = starts[k];
        const e = s + it.str.length;
        if (e <= ms || s >= me || it.str.length === 0) return;
        const from = Math.max(ms, s) - s;
        const to = Math.min(me, e) - s;
        boxes.push(itemBox(it, from, to, viewport));
      });
    }
  }
  page.cleanup();
  return boxes;
}

function itemBox(it: Item, from: number, to: number, viewport: ReturnType<PDFPageProxy['getViewport']>): Box {
  const [a, b, c, d, e, f] = it.transform;
  const xLen = Math.hypot(a, b) || 1;
  const yLen = Math.hypot(c, d) || 1;
  const ux = a / xLen;
  const uy = b / xLen;
  const vx = c / yLen;
  const vy = d / yLen;
  const h = yLen;
  const len = it.str.length;
  const pad = h * 0.15;
  const s0 = (it.width * from) / len - pad;
  const s1 = (it.width * to) / len + pad;
  const t0 = -0.3 * h;
  const t1 = 1.05 * h;
  const corners = [
    [s0, t0],
    [s1, t0],
    [s0, t1],
    [s1, t1],
  ].map(([s, t]) => viewport.convertToViewportPoint(e + ux * s + vx * t, f + uy * s + vy * t));
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX / viewport.width,
    y: minY / viewport.height,
    w: (Math.max(...xs) - minX) / viewport.width,
    h: (Math.max(...ys) - minY) / viewport.height,
  };
}

