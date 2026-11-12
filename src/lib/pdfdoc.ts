import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNull,
  PDFPageLeaf,
  PDFPageTree,
  PDFRef,
  PDFStream,
  degrees,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';

export class EncryptedPdfError extends Error {
  constructor() {
    super('encrypted');
  }
}

export class InvalidPdfError extends Error {
  constructor(cause?: unknown) {
    super('invalid');
    this.cause = cause;
  }
}

/** Loads a PDF with pdf-lib and turns its errors into readable ones. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    if (err instanceof Error && /encrypted/i.test(err.message)) throw new EncryptedPdfError();
    throw new InvalidPdfError(err);
  }
  prepareSourceForCopy(doc);
  return doc;
}

/** Creates the empty output document all tools write into. */
export async function createOutput(): Promise<PDFDocument> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setProducer('pdf-tool');
  doc.setCreator('pdf-tool');
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);
  return doc;
}

export async function saveOutput(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}

/** Page dictionary keys that are kept when a page is copied. */
const PAGE_KEYS = new Set([
  'Type', 'Parent', 'MediaBox', 'CropBox', 'BleedBox', 'TrimBox', 'ArtBox',
  'Rotate', 'Resources', 'Contents', 'Annots', 'UserUnit', 'Group', 'Tabs',
]);

/**
 * pdf-lib copies a page by following every reference it contains. A link
 * or form field that points to *another* page would therefore pull that
 * whole page, including its content, into the output as a hidden object.
 * When someone extracts or keeps only some pages, that would leak the
 * other pages. To prevent it, this removes every reference from a page to
 * any page object (including itself), and drops page entries that are not
 * needed to display the page (private application data, page level
 * metadata, thumbnails, article beads, actions).
 *
 * It only changes the in-memory copy of the source document.
 */
export function prepareSourceForCopy(doc: PDFDocument): void {
  const ctx = doc.context;
  const isPageNode = (obj: PDFObject | undefined): boolean => {
    if (obj instanceof PDFPageLeaf || obj instanceof PDFPageTree) return true;
    if (obj instanceof PDFDict) {
      const type = obj.get(PDFName.of('Type'));
      return type === PDFName.of('Page') || type === PDFName.of('Pages');
    }
    return false;
  };
  const visited = new Set<PDFObject>();

  const visit = (obj: PDFObject): void => {
    if (visited.has(obj)) return;
    visited.add(obj);
    if (obj instanceof PDFStream) {
      visit(obj.dict);
    } else if (obj instanceof PDFDict) {
      for (const [key, value] of obj.entries()) {
        const next = cutPageRef(value);
        if (next === null) obj.delete(key);
        else if (next) visit(next);
      }
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) {
        const next = cutPageRef(obj.get(i));
        if (next === null) obj.set(i, PDFNull);
        else if (next) visit(next);
      }
    }
  };

  // Returns null if the value must be removed, otherwise the object to walk into.
  const cutPageRef = (value: PDFObject): PDFObject | null | undefined => {
    if (value instanceof PDFRef) {
      const target = ctx.lookup(value);
      if (isPageNode(target)) return null;
      return target;
    }
    if (isPageNode(value)) return null;
    if (value instanceof PDFDict || value instanceof PDFArray || value instanceof PDFStream) return value;
    return undefined;
  };

  for (const page of doc.getPages()) {
    const node = page.node;
    // Make inherited values explicit before removing anything.
    for (const key of ['Resources', 'MediaBox', 'CropBox', 'Rotate']) {
      const name = PDFName.of(key);
      if (!node.get(name)) {
        const inherited = node.getInheritableAttribute(name);
        if (inherited) node.set(name, inherited);
      }
    }
    for (const key of node.keys()) {
      if (!PAGE_KEYS.has(key.decodeText())) node.delete(key);
    }
    // Links to other pages of the source cannot point anywhere useful in
    // the new file; drop them instead of leaving broken links behind.
    // Web links (URI actions) are kept.
    const annots = node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (annots) {
      const keepAnnots = annots.asArray().filter((ref) => !isInternalLink(ctx.lookup(ref)));
      node.set(PDFName.of('Annots'), ctx.obj(keepAnnots));
    }
    visited.add(node);
    for (const [key, value] of node.entries()) {
      if (key === PDFName.of('Parent')) continue;
      const next = cutPageRef(value);
      if (next === null) node.delete(key);
      else if (next) visit(next);
    }
  }
}

function isInternalLink(annot: PDFObject | undefined): boolean {
  if (!(annot instanceof PDFDict)) return false;
  if (annot.get(PDFName.of('Subtype')) !== PDFName.of('Link')) return false;
  if (annot.has(PDFName.of('Dest'))) return true;
  const action = annot.lookupMaybe(PDFName.of('A'), PDFDict);
  const kind = action?.get(PDFName.of('S'));
  return kind === PDFName.of('GoTo') || kind === PDFName.of('GoToR') || kind === PDFName.of('Launch');
}

export interface PageRef {
  /** Index into the list of source documents. */
  source: number;
  /** Zero-based page index in that source. */
  page: number;
  /** Extra clockwise rotation in degrees (multiple of 90). */
  rotate?: number;
}

/**
 * Builds a new PDF from pages of one or more source PDFs, in the given
 * order. This is the core of merge, split, organize and extract.
 */
export async function assemble(sources: PDFDocument[], pages: PageRef[]): Promise<PDFDocument> {
  const out = await createOutput();
  // Copy all needed pages of each source in a single call so shared
  // resources (fonts, images) are only stored once.
  const copied = new Map<string, PDFPage>();
  for (let s = 0; s < sources.length; s++) {
    const wanted = [...new Set(pages.filter((p) => p.source === s).map((p) => p.page))];
    if (wanted.length === 0) continue;
    const result = await out.copyPages(sources[s], wanted);
    wanted.forEach((idx, i) => copied.set(`${s}:${idx}`, result[i]));
  }
  const used = new Set<string>();
  for (const ref of pages) {
    const key = `${ref.source}:${ref.page}`;
    let page = copied.get(key)!;
    if (used.has(key)) {
      // Same page used twice: copy it again so it gets its own page object.
      [page] = await out.copyPages(sources[ref.source], [ref.page]);
    }
    used.add(key);
    out.addPage(page);
    const extra = ref.rotate ?? 0;
    if (extra % 360 !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees(normalizeAngle(current + extra)));
    }
  }
  return out;
}

export function normalizeAngle(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
}
