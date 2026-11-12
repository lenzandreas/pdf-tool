import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, dropzone, field, iconButton } from '../ui/widgets.ts';
import { download, isPdf, readBytes } from '../ui/files.ts';
import { getPageCount, mergePdfs } from '../lib/ops.ts';
import { parsePageList } from '../lib/ranges.ts';
import type { Tool } from './types.ts';

interface Entry {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  pages: string;
}

export const mergeTool: Tool = {
  id: 'merge',
  icon: '⊕',
  title: 'mergeTitle',
  desc: 'mergeDesc',
  mount(root) {
    const entries: Entry[] = [];
    const status = new Status();
    const list = h('ol', { class: 'file-list' });
    const nameInput = h('input', { type: 'text', value: 'merged.pdf' });
    const button = h('button', { type: 'button', class: 'btn primary' }, t('mergeButton'));

    const render = () => {
      list.replaceChildren(
        ...entries.map((e, i) => {
          const pagesInput = h('input', {
            type: 'text',
            class: 'pages-input',
            placeholder: t('mergePagesPlaceholder'),
            value: e.pages,
            'aria-label': t('pages'),
          });
          pagesInput.addEventListener('input', () => (e.pages = pagesInput.value));
          return h(
            'li',
            { class: 'file-row' },
            h('span', { class: 'file-name', title: e.name }, e.name),
            h('span', { class: 'muted' }, `${e.pageCount} ${t('pages')}`),
            pagesInput,
            h(
              'span',
              { class: 'row-actions' },
              iconButton('↑', t('moveUp'), () => move(i, -1)),
              iconButton('↓', t('moveDown'), () => move(i, 1)),
              iconButton('✕', t('remove'), () => {
                entries.splice(i, 1);
                render();
              }),
            ),
          );
        }),
      );
      button.hidden = entries.length === 0;
    };
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= entries.length) return;
      [entries[i], entries[j]] = [entries[j], entries[i]];
      render();
    };

    const addFiles = async (files: File[]) => {
      status.clear();
      for (const file of files.filter(isPdf)) {
        try {
          status.info(t('fileReading', { name: file.name }));
          const bytes = await readBytes(file);
          entries.push({ name: file.name, bytes, pageCount: await getPageCount(bytes), pages: '' });
          status.clear();
        } catch (err) {
          status.fail(err, file.name);
        }
        render();
      }
    };

    button.addEventListener('click', () =>
      busy(button, status, async () => {
        if (entries.length < 2) return status.error(t('mergeNeedTwo'));
        let current = '';
        try {
          const files = entries.map((e) => {
            current = e.name;
            return { bytes: e.bytes, pages: e.pages.trim() ? parsePageList(e.pages, e.pageCount) : undefined };
          });
          current = '';
          const out = await mergePdfs(files);
          download(out, ensurePdf(nameInput.value));
          status.success(t('done'));
        } catch (err) {
          status.fail(err, current);
        }
      }),
    );

    root.append(
      dropzone({ label: 'dropPdf', accept: 'application/pdf,.pdf', multiple: true, onFiles: addFiles }),
      h('p', { class: 'hint' }, t('mergeHint')),
      list,
      h('div', { class: 'actions' }, field(t('outputName'), nameInput), button),
      status.el,
    );
    render();
  },
};

export function ensurePdf(name: string): string {
  const n = name.trim() || 'document.pdf';
  return /\.pdf$/i.test(n) ? n : `${n}.pdf`;
}
