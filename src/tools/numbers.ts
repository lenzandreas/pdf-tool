import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, field } from '../ui/widgets.ts';
import { baseName, download } from '../ui/files.ts';
import { singlePdf, type LoadedPdf } from '../ui/single.ts';
import { addPageNumbers, type NumberPosition } from '../lib/ops.ts';
import { parsePageList } from '../lib/ranges.ts';
import type { Tool } from './types.ts';

export const numbersTool: Tool = {
  id: 'numbers',
  icon: '#',
  title: 'numbersTitle',
  desc: 'numbersDesc',
  mount(root) {
    const status = new Status();
    const body = h('div', { class: 'tool-body' }, status.el);
    const slot = singlePdf({ status, onLoad: (doc) => build(doc), onClear: () => body.replaceChildren(status.el) });
    root.append(slot.el, body);

    const build = (doc: LoadedPdf) => {
      const position = h(
        'select',
        {},
        h('option', { value: 'bottom-center', selected: true }, t('posBottomCenter')),
        h('option', { value: 'bottom-right' }, t('posBottomRight')),
        h('option', { value: 'bottom-left' }, t('posBottomLeft')),
        h('option', { value: 'top-center' }, t('posTopCenter')),
        h('option', { value: 'top-right' }, t('posTopRight')),
        h('option', { value: 'top-left' }, t('posTopLeft')),
      );
      const pattern = h(
        'select',
        {},
        h('option', { value: '{n}', selected: true }, '1, 2, 3'),
        h('option', { value: '{n} / {total}' }, '1 / 9'),
        h('option', { value: `${t('page')} {n}` }, `${t('page')} 1`),
        h('option', { value: `${t('pageOf', { n: '{n}', total: '{total}' })}` }, t('pageOf', { n: 1, total: 9 })),
        h('option', { value: '- {n} -' }, '- 1 -'),
      );
      const start = h('input', { type: 'number', value: 1, min: 0, class: 'small-input' });
      const size = h('input', { type: 'number', value: 11, min: 5, max: 48, class: 'small-input' });
      const pages = h('input', { type: 'text', placeholder: '2-' });
      const button = h('button', { type: 'button', class: 'btn primary' }, t('numbersButton'));
      button.addEventListener('click', () =>
        busy(button, status, async () => {
          try {
            const out = await addPageNumbers(doc.bytes, {
              position: position.value as NumberPosition,
              pattern: pattern.value,
              startAt: Number(start.value) || 0,
              fontSize: Math.min(48, Math.max(5, Number(size.value) || 11)),
              pages: pages.value.trim() ? parsePageList(pages.value, doc.pdf.numPages) : undefined,
            });
            download(out, `${baseName(doc.name)}-numbered.pdf`);
            status.success(t('done'));
          } catch (err) {
            status.fail(err, doc.name);
          }
        }),
      );
      body.replaceChildren(
        h(
          'div',
          { class: 'form-grid' },
          field(t('numbersPosition'), position),
          field(t('numbersPattern'), pattern),
          field(t('numbersStart'), start),
          field(t('numbersSize'), size),
          field(t('numbersPages'), pages),
        ),
        h('div', { class: 'actions' }, button),
        status.el,
      );
    };
    return slot.destroy;
  },
};
