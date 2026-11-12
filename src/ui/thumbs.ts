import { h } from './dom.ts';
import { renderThumbnail, type PDFDocumentProxy } from '../lib/pdfjs.ts';

let observer: IntersectionObserver | undefined;
const pending = new WeakMap<Element, () => void>();

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const run = pending.get(entry.target);
        observer!.unobserve(entry.target);
        pending.delete(entry.target);
        run?.();
      }
    },
    { rootMargin: '400px' },
  );
  return observer;
}

/** Calls `render` once the element scrolls near the viewport. */
export function whenVisible(el: Element, render: () => void): void {
  pending.set(el, render);
  getObserver().observe(el);
}

/** A placeholder that fills itself with a page thumbnail when visible. */
export function lazyThumb(pdf: PDFDocumentProxy, pageIndex: number, width: number): HTMLElement {
  const box = h('div', { class: 'thumb-img' });
  box.style.width = `${width}px`;
  whenVisible(box, async () => {
    try {
      const page = await pdf.getPage(pageIndex + 1);
      const canvas = await renderThumbnail(page, width);
      page.cleanup();
      box.replaceChildren(canvas);
      box.classList.add('loaded');
    } catch {
      box.classList.add('failed');
    }
  });
  return box;
}
