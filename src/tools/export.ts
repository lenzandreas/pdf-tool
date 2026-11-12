import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, field } from '../ui/widgets.ts';
import { baseName, download, zip } from '../ui/files.ts';
import { singlePdf, type LoadedPdf } from '../ui/single.ts';
import { renderPage } from '../lib/pdfjs.ts';
import { parsePageList } from '../lib/ranges.ts';
import type { Tool } from './types.ts';

export const exportTool: Tool = {
  id: 'export',
  icon: '◫',
  title: 'exportTitle',
  desc: 'exportDesc',
  mount(root) {
    const status = new Status();
    const body = h('div', { class: 'tool-body' }, status.el);
    const slot = singlePdf({ status, onLoad: (doc) => build(doc), onClear: () => body.replaceChildren(status.el) });
    root.append(slot.el, body);

    const build = (doc: LoadedPdf) => {
      const format = h('select', {}, h('option', { value: 'png' }, 'PNG'), h('option', { value: 'jpeg' }, 'JPG'));
      const dpi = h(
        'select',
        {},
        h('option', { value: '72' }, '72 dpi'),
        h('option', { value: '150', selected: true }, '150 dpi'),
        h('option', { value: '300' }, '300 dpi'),
      );
      const pages = h('input', { type: 'text', placeholder: '1-3, 5' });
      const button = h('button', { type: 'button', class: 'btn primary' }, t('exportButton'));
      button.addEventListener('click', () =>
        busy(button, status, async () => {
          try {
            const count = doc.pdf.numPages;
            const indexes = pages.value.trim() ? parsePageList(pages.value, count) : [...Array(count).keys()];
            const type = format.value === 'png' ? 'image/png' : 'image/jpeg';
            const ext = format.value === 'png' ? 'png' : 'jpg';
            const stem = baseName(doc.name);
            const files: { name: string; data: Uint8Array }[] = [];
            for (const i of indexes) {
              status.info(t('pageOf', { n: i + 1, total: count }));
              const page = await doc.pdf.getPage(i + 1);
              const canvas = await renderPage(page, Number(dpi.value) / 72);
              page.cleanup();
              const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, 0.92));
              canvas.width = canvas.height = 0;
              files.push({ name: `${stem}-${String(i + 1).padStart(String(count).length, '0')}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) });
            }
            if (files.length === 1) download(files[0].data, files[0].name, type);
            else download(zip(files), `${stem}-images.zip`, 'application/zip');
            status.success(t('done'));
          } catch (err) {
            status.fail(err, doc.name);
          }
        }),
      );
      body.replaceChildren(
        h('div', { class: 'actions' }, field(t('exportFormat'), format), field(t('exportDpi'), dpi), field(t('exportPagesLabel'), pages), button),
        status.el,
      );
    };
    return slot.destroy;
  },
};
