import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, dropzone, field, iconButton } from '../ui/widgets.ts';
import { download, isPdf, readBytes } from '../ui/files.ts';
import { lazyThumb } from '../ui/thumbs.ts';
import { openWithPdfJs, type PDFDocumentProxy } from '../lib/pdfjs.ts';
import { buildPdf } from '../lib/ops.ts';
import { loadPdf } from '../lib/pdfdoc.ts';
import { ensurePdf } from './merge.ts';
import type { Tool } from './types.ts';

interface Source {
  name: string;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
}
interface Item {
  id: number;
  source: number;
  page: number;
  rotate: number;
}

export const organizeTool: Tool = {
  id: 'organize',
  icon: '⇅',
  title: 'organizeTitle',
  desc: 'organizeDesc',
  mount(root) {
    const sources: Source[] = [];
    let items: Item[] = [];
    let nextId = 1;
    let dragId: number | null = null;
    const status = new Status();
    const grid = h('div', { class: 'thumb-grid organize' });
    const tiles = new Map<number, HTMLElement>();
    const nameInput = h('input', { type: 'text', value: 'organized.pdf' });
    const save = h('button', { type: 'button', class: 'btn primary' }, t('organizeButton'));
    const toolbar = h(
      'div',
      { class: 'toolbar' },
      h('button', { type: 'button', class: 'btn', onclick: () => rotateAll(-90) }, '⟲ ' + t('rotateAllLeft')),
      h('button', { type: 'button', class: 'btn', onclick: () => rotateAll(90) }, '⟳ ' + t('rotateAllRight')),
      h('button', { type: 'button', class: 'btn', onclick: () => ((items = items.reverse()), render()) }, '⇵ ' + t('reverse')),
    );
    const work = h('div', { class: 'tool-body' });

    const rotateAll = (d: number) => {
      items.forEach((it) => (it.rotate += d));
      render();
    };

    const tileFor = (item: Item): HTMLElement => {
      let tile = tiles.get(item.id);
      if (!tile) {
        const src = sources[item.source];
        const img = lazyThumb(src.pdf, item.page, 130);
        img.classList.add('rotatable');
        const label = h('span', { class: 'thumb-label' });
        tile = h(
          'div',
          { class: 'thumb', draggable: 'true', 'data-id': item.id },
          h('div', { class: 'thumb-frame' }, img),
          label,
          h(
            'div',
            { class: 'thumb-actions' },
            iconButton('◀', t('moveUp'), () => moveBy(item.id, -1)),
            iconButton('⟲', t('rotateLeft'), () => turn(item.id, -90)),
            iconButton('⟳', t('rotateRight'), () => turn(item.id, 90)),
            iconButton('⧉', t('duplicate'), () => dup(item.id)),
            iconButton('✕', t('remove'), () => del(item.id), 'danger'),
            iconButton('▶', t('moveDown'), () => moveBy(item.id, 1)),
          ),
        );
        tile.addEventListener('dragstart', (e) => {
          dragId = item.id;
          tile!.classList.add('dragging');
          e.dataTransfer?.setData('text/plain', String(item.id));
        });
        tile.addEventListener('dragend', () => {
          dragId = null;
          tile!.classList.remove('dragging');
        });
        tile.addEventListener('dragover', (e) => {
          if (dragId === null || dragId === item.id) return;
          e.preventDefault();
          const from = items.findIndex((x) => x.id === dragId);
          const to = items.findIndex((x) => x.id === item.id);
          const [moved] = items.splice(from, 1);
          items.splice(to, 0, moved);
          render();
        });
        tiles.set(item.id, tile);
      }
      const img = tile.querySelector<HTMLElement>('.thumb-img')!;
      img.style.transform = `rotate(${item.rotate}deg)`;
      const src = sources[item.source];
      tile.querySelector('.thumb-label')!.textContent = sources.length > 1 ? `${src.name} · ${item.page + 1}` : `${item.page + 1}`;
      return tile;
    };

    const render = () => {
      grid.replaceChildren(...items.map(tileFor));
      if (items.length === 0 && sources.length > 0) grid.append(h('p', { class: 'muted' }, t('organizeEmpty')));
      save.disabled = items.length === 0;
    };
    const find = (id: number) => items.findIndex((x) => x.id === id);
    const moveBy = (id: number, d: number) => {
      const i = find(id);
      const j = i + d;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
      render();
    };
    const turn = (id: number, d: number) => {
      items[find(id)].rotate += d;
      render();
    };
    const dup = (id: number) => {
      const i = find(id);
      items.splice(i + 1, 0, { ...items[i], id: nextId++ });
      render();
    };
    const del = (id: number) => {
      items.splice(find(id), 1);
      tiles.delete(id);
      render();
    };

    const addFiles = async (files: File[]) => {
      status.clear();
      for (const file of files.filter(isPdf)) {
        try {
          status.info(t('fileReading', { name: file.name }));
          const bytes = await readBytes(file);
          await loadPdf(bytes); // fail early on protected or broken files
          const pdf = await openWithPdfJs(bytes);
          const source = sources.push({ name: file.name, bytes, pdf }) - 1;
          for (let p = 0; p < pdf.numPages; p++) items.push({ id: nextId++, source, page: p, rotate: 0 });
          status.clear();
        } catch (err) {
          status.fail(err, file.name);
        }
      }
      if (sources.length) work.hidden = false;
      render();
    };

    save.addEventListener('click', () =>
      busy(save, status, async () => {
        try {
          const out = await buildPdf(
            sources.map((s) => s.bytes),
            items.map((it) => ({ source: it.source, page: it.page, rotate: it.rotate })),
          );
          download(out, ensurePdf(nameInput.value));
          status.success(t('done'));
        } catch (err) {
          status.fail(err);
        }
      }),
    );

    work.hidden = true;
    work.append(h('p', { class: 'hint' }, t('organizeHint')), toolbar, grid, h('div', { class: 'actions' }, field(t('outputName'), nameInput), save));
    root.append(dropzone({ label: 'dropPdf', accept: 'application/pdf,.pdf', multiple: true, onFiles: addFiles }), work, status.el);
    return () => sources.forEach((s) => void s.pdf.destroy());
  },
};
