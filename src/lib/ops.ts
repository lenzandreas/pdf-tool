import { PDFDocument, StandardFonts, degrees, rgb, type PDFDict } from 'pdf-lib';
import { assemble, createOutput, loadPdf, saveOutput, type PageRef } from './pdfdoc.ts';

/** Merges whole documents (or selected pages of them) in order. */
export async function mergePdfs(files: { bytes: Uint8Array; pages?: number[] }[]): Promise<Uint8Array> {
  const docs = await Promise.all(files.map((f) => loadPdf(f.bytes)));
  const pages: PageRef[] = [];
  docs.forEach((doc, source) => {
    const indexes = files[source].pages ?? doc.getPageIndices();
    for (const page of indexes) pages.push({ source, page });
  });
  return saveOutput(await assemble(docs, pages));
}

/** Creates one PDF per group of zero-based page indexes. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for (const group of groups) {
    // Load a fresh copy per part, so nothing is shared between the parts.
    const doc = await loadPdf(bytes);
    out.push(await saveOutput(await assemble([doc], group.map((page) => ({ source: 0, page })))));
  }
  return out;
}

/** Builds a PDF from an arbitrary page list taken from several sources. */
export async function buildPdf(sources: Uint8Array[], pages: PageRef[]): Promise<Uint8Array> {
  const docs = await Promise.all(sources.map((b) => loadPdf(b)));
  return saveOutput(await assemble(docs, pages));
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

// ---------------------------------------------------------------- images

export type PageSize = 'fit' | 'a4' | 'letter';

export interface ImageInput {
  bytes: Uint8Array;
  kind: 'png' | 'jpg';
}

const SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/**
 * Puts each image on its own page. With 'fit' the page has the image's
 * size (at 96 dpi); otherwise the image is scaled into the page with a
 * margin, and the page turns landscape for wide images.
 */
export async function imagesToPdf(images: ImageInput[], size: PageSize, marginPt = 28): Promise<Uint8Array> {
  const out = await createOutput();
  for (const img of images) {
    const embedded = img.kind === 'png' ? await out.embedPng(img.bytes) : await out.embedJpg(img.bytes);
    const w = (embedded.width * 72) / 96;
    const h = (embedded.height * 72) / 96;
    if (size === 'fit') {
      out.addPage([w, h]).drawImage(embedded, { x: 0, y: 0, width: w, height: h });
      continue;
    }
    let [pw, ph] = SIZES[size];
    if (w > h) [pw, ph] = [ph, pw];
    const scale = Math.min((pw - 2 * marginPt) / w, (ph - 2 * marginPt) / h, 1e9);
    const dw = w * scale;
    const dh = h * scale;
    out.addPage([pw, ph]).drawImage(embedded, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
  }
  return saveOutput(out);
}

// ---------------------------------------------------------- page numbers

export type NumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';

export interface PageNumberOptions {
  position: NumberPosition;
  /** Text pattern, {n} is the page number and {total} the page count. */
  pattern: string;
  startAt: number;
  fontSize: number;
  /** Zero-based indexes of pages that get a number; all if omitted. */
  pages?: number[];
}

/** Adds page numbers that read upright however a page is rotated. */
export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await assemble([src], src.getPageIndices().map((page) => ({ source: 0, page })));
  const font = await out.embedFont(StandardFonts.Helvetica);
  const pages = out.getPages();
  const targets = new Set(opts.pages ?? pages.map((_, i) => i));
  const total = targets.size;
  let n = opts.startAt;
  pages.forEach((page, i) => {
    if (!targets.has(i)) return;
    const text = opts.pattern.replaceAll('{n}', String(n)).replaceAll('{total}', String(opts.startAt + total - 1));
    n++;
    const box = page.getCropBox();
    const rot = page.getRotation().angle % 360;
    // Size of the page as the reader sees it.
    const vw = rot === 90 || rot === 270 ? box.height : box.width;
    const vh = rot === 90 || rot === 270 ? box.width : box.height;
    const tw = font.widthOfTextAtSize(text, opts.fontSize);
    const margin = Math.max(18, opts.fontSize * 1.5);
    const [hpos] = opts.position.split('-').slice(1);
    const top = opts.position.startsWith('top');
    const vx = hpos === 'left' ? margin : hpos === 'right' ? vw - margin - tw : (vw - tw) / 2;
    const vy = top ? vh - margin - opts.fontSize * 0.75 : margin;
    // Map the visual point back to the page's own coordinate system.
    let x: number;
    let y: number;
    if (rot === 90) [x, y] = [box.width - vy, vx];
    else if (rot === 180) [x, y] = [box.width - vx, box.height - vy];
    else if (rot === 270) [x, y] = [vy, box.height - vx];
    else [x, y] = [vx, vy];
    page.drawText(text, {
      x: box.x + x,
      y: box.y + y,
      size: opts.fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      rotate: degrees(rot),
    });
  });
  return saveOutput(out);
}

// --------------------------------------------------------------- metadata

export interface Metadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created?: Date;
  modified?: Date;
}

export async function readMetadata(bytes: Uint8Array): Promise<Metadata> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    created: doc.getCreationDate(),
    modified: doc.getModificationDate(),
  };
}

/**
 * Writes a fresh copy with only the given document properties. Hidden
 * XMP metadata, bookmarks, attachments and earlier revisions are dropped.
 * Empty fields are left out entirely.
 */
export async function writeMetadata(bytes: Uint8Array, meta: Partial<Metadata>): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await assemble([src], src.getPageIndices().map((page) => ({ source: 0, page })));
  // pdf-lib has no public API to empty the info dictionary.
  const info = (out as unknown as { getInfoDict(): PDFDict }).getInfoDict();
  for (const key of info.keys()) info.delete(key);
  if (meta.title) out.setTitle(meta.title);
  if (meta.author) out.setAuthor(meta.author);
  if (meta.subject) out.setSubject(meta.subject);
  if (meta.keywords) out.setKeywords(meta.keywords.split(/\s*[,;]\s*/).filter(Boolean));
  if (meta.creator) out.setCreator(meta.creator);
  if (meta.producer) out.setProducer(meta.producer);
  if (meta.created) out.setCreationDate(meta.created);
  if (meta.modified) out.setModificationDate(meta.modified);
  return saveOutput(out);
}
