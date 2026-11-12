import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, dropzone, field, iconButton } from '../ui/widgets.ts';
import { download } from '../ui/files.ts';
import { imagesToPdf, type PageSize } from '../lib/ops.ts';
import { prepareImage } from '../lib/images.ts';
import { ensurePdf } from './merge.ts';
import type { Tool } from './types.ts';

interface Entry {
  file: File;
  url: string;
}

export const imagesTool: Tool = {
  id: 'images',
  icon: '▣',
  title: 'imagesTitle',
  desc: 'imagesDesc',
  mount(root) {
    const entries: Entry[] = [];
    const status = new Status();
    const list = h('div', { class: 'thumb-grid' });
    const size = h(
      'select',
      {},
      h('option', { value: 'a4', selected: true }, t('sizeA4')),
      h('option', { value: 'letter' }, t('sizeLetter')),
      h('option', { value: 'fit' }, t('sizeFit')),
    );
    const nameInput = h('input', { type: 'text', value: 'images.pdf' });
    const button = h('button', { type: 'button', class: 'btn primary' }, t('imagesButton'));

    const render = () => {
      list.replaceChildren(
        ...entries.map((e, i) =>
          h(
            'div',
            { class: 'thumb' },
            h('div', { class: 'thumb-frame' }, h('img', { src: e.url, alt: e.file.name, class: 'thumb-photo' })),
            h('span', { class: 'thumb-label', title: e.file.name }, e.file.name),
            h(
              'div',
              { class: 'thumb-actions' },
              iconButton('◀', t('moveUp'), () => move(i, -1)),
              iconButton('✕', t('remove'), () => {
                URL.revokeObjectURL(e.url);
                entries.splice(i, 1);
                render();
              }, 'danger'),
              iconButton('▶', t('moveDown'), () => move(i, 1)),
            ),
          ),
        ),
      );
      button.disabled = entries.length === 0;
    };
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= entries.length) return;
      [entries[i], entries[j]] = [entries[j], entries[i]];
      render();
    };

    button.addEventListener('click', () =>
      busy(button, status, async () => {
        let current = '';
        try {
          const images = [];
          for (const e of entries) {
            current = e.file.name;
            try {
              images.push(await prepareImage(e.file));
            } catch {
              return status.error(t('imagesUnsupported', { name: current }));
            }
          }
          const out = await imagesToPdf(images, size.value as PageSize);
          download(out, ensurePdf(nameInput.value));
          status.success(t('done'));
        } catch (err) {
          status.fail(err, current);
        }
      }),
    );

    root.append(
      dropzone({
        label: 'dropImages',
        accept: 'image/*',
        multiple: true,
        onFiles: (files) => {
          for (const file of files) {
            if (!file.type.startsWith('image/')) {
              status.error(t('imagesUnsupported', { name: file.name }));
              continue;
            }
            entries.push({ file, url: URL.createObjectURL(file) });
          }
          render();
        },
      }),
      list,
      h('div', { class: 'actions' }, field(t('imagesPageSize'), size), field(t('outputName'), nameInput), button),
      status.el,
    );
    render();
    return () => entries.forEach((e) => URL.revokeObjectURL(e.url));
  },
};
