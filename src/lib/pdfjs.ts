import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
export type { PDFDocumentProxy, PDFPageProxy };

/** Absolute URL of a folder that ships next to index.html. */
function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

export class PasswordRequiredError extends Error {
  constructor(public readonly wrongPassword: boolean) {
    super(wrongPassword ? 'Wrong password' : 'Password required');
  }
}

/**
 * Opens a PDF with pdf.js. The bytes are copied first because pdf.js
 * transfers the buffer to its worker.
 */
export async function openWithPdfJs(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  const task = pdfjsLib.getDocument({
    data: bytes.slice(),
    password,
    standardFontDataUrl: assetUrl('pdfjs/standard_fonts/'),
    cMapUrl: assetUrl('pdfjs/cmaps/'),
    cMapPacked: true,
    wasmUrl: assetUrl('pdfjs/wasm/'),
    iccUrl: assetUrl('pdfjs/iccs/'),
    isEvalSupported: false,
    enableXfa: false,
  });
  try {
    return await task.promise;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'PasswordException') {
      const code = (err as { code?: number }).code;
      throw new PasswordRequiredError(code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD);
    }
    throw err;
  }
}

/**
 * Renders a page into a new canvas. `scale` is pixels per PDF point
 * (1 = 72 dpi). Page rotation is applied, so the canvas shows the page the
 * way a viewer shows it. Annotations with an appearance (including filled
 * form fields) are painted into the canvas too.
 */
export async function renderPage(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not available');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
  }).promise;
  return canvas;
}

/** Renders a page so that it fits into `maxWidth` CSS pixels (sharp on HiDPI). */
export async function renderThumbnail(page: PDFPageProxy, maxWidth: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (maxWidth / base.width) * ratio;
  const canvas = await renderPage(page, scale);
  canvas.style.width = `${Math.round(canvas.width / ratio)}px`;
  canvas.style.height = `${Math.round(canvas.height / ratio)}px`;
  return canvas;
}
