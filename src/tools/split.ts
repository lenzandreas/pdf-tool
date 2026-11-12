import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, radio } from '../ui/widgets.ts';
import { baseName, download, zip } from '../ui/files.ts';
import { singlePdf, type LoadedPdf } from '../ui/single.ts';
import { lazyThumb } from '../ui/thumbs.ts';
import { splitPdf } from '../lib/ops.ts';
import { chunkPages, formatPageList, parsePageGroups, parsePageList } from '../lib/ranges.ts';
import type { Tool } from './types.ts';

export const splitTool: Tool = {
  id: 'split',
  icon: '✂',
  title: 'splitTitle',
  desc: 'splitDesc',
  mount(root) {
    const status = new Status();
    const body = h('div', { class: 'tool-body' });
    const slot = singlePdf({ status, onLoad: (doc) => build(doc), onClear: () => body.replaceChildren(status.el) });

    const build = (doc: LoadedPdf) => {
      const count = doc.pdf.numPages;
      const selected = new Set<number>();
      const everyInput = h('input', { type: 'number', min: 1, max: count, value: 2, class: 'small-input' });
      const rangesInput = h('input', { type: 'text', placeholder: t('splitRangesPlaceholder') });
      const extractInput = h('input', { type: 'text', placeholder: t('splitExtractPlaceholder') });
      const [everyBefore, everyAfter] = t('splitEvery').split('{n}');
      const modes = h(
        'fieldset',
        { class: 'modes' },
        h('legend', {}, t('splitMode')),
        radio('split-mode', 'each', t('splitEach'), true),
        h('div', { class: 'mode-row' }, radio('split-mode', 'every', everyBefore.trim()), everyInput, h('span', {}, everyAfter)),
        h('div', { class: 'mode-row' }, radio('split-mode', 'ranges', t('splitRanges')), rangesInput),
        h('div', { class: 'mode-row' }, radio('split-mode', 'extract', t('splitExtract')), extractInput),
      );
      const pick = (mode: string) => {
        const r = modes.querySelector<HTMLInputElement>(`input[value="${mode}"]`);
        if (r) r.checked = true;
      };
      everyInput.addEventListener('focus', () => pick('every'));
      rangesInput.addEventListener('focus', () => pick('ranges'));
      extractInput.addEventListener('focus', () => pick('extract'));

      const tiles: HTMLElement[] = [];
      const syncTiles = () => tiles.forEach((tile, i) => tile.classList.toggle('selected', selected.has(i)));
      extractInput.addEventListener('input', () => {
        selected.clear();
        try {
          parsePageList(extractInput.value, count).forEach((i) => selected.add(i));
        } catch {
          /* typing in progress */
        }
        syncTiles();
      });
      const grid = h(
        'div',
        { class: 'thumb-grid' },
        Array.from({ length: count }, (_, i) => {
          const tile = h(
            'button',
            { type: 'button', class: 'thumb', 'aria-pressed': 'false' },
            lazyThumb(doc.pdf, i, 120),
            h('span', { class: 'thumb-label' }, String(i + 1)),
          );
          tile.addEventListener('click', () => {
            if (selected.has(i)) selected.delete(i);
            else selected.add(i);
            tile.setAttribute('aria-pressed', String(selected.has(i)));
            extractInput.value = formatPageList([...selected].sort((a, b) => a - b));
            pick('extract');
            syncTiles();
          });
          tiles.push(tile);
          return tile;
        }),
      );

      const button = h('button', { type: 'button', class: 'btn primary' }, t('splitButton'));
      button.addEventListener('click', () =>
        busy(button, status, async () => {
          try {
            const mode = modes.querySelector<HTMLInputElement>('input[name="split-mode"]:checked')!.value;
            const stem = baseName(doc.name);
            if (mode === 'extract') {
              const pages = parsePageList(extractInput.value, count);
              const [out] = await splitPdf(doc.bytes, [pages]);
              download(out, `${stem}-${formatPageList(pages).replace(/, /g, '_')}.pdf`);
              return status.success(t('done'));
            }
            const groups =
              mode === 'each'
                ? chunkPages(count, 1)
                : mode === 'every'
                  ? chunkPages(count, Number(everyInput.value))
                  : parsePageGroups(rangesInput.value, count);
            const parts = await splitPdf(doc.bytes, groups);
            if (parts.length === 1) {
              download(parts[0], `${stem}-1.pdf`);
              return status.success(t('done'));
            }
            const files = parts.map((data, i) => ({ name: `${stem}-${formatPageList(groups[i]).replace(/, /g, '_')}.pdf`, data }));
            download(zip(files), `${stem}-split.zip`, 'application/zip');
            status.success(t('splitResult', { n: parts.length }));
          } catch (err) {
            status.fail(err, doc.name);
          }
        }),
      );

      body.replaceChildren(modes, h('div', { class: 'actions' }, button), status.el, h('p', { class: 'hint' }, t('splitHint')), grid);
    };

    body.append(status.el);
    root.append(slot.el, body);
    return slot.destroy;
  },
};
