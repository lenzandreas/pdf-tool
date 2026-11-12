import { h } from './dom.ts';
import { t } from '../i18n.ts';
import { Status, dropzone } from './widgets.ts';
import { formatBytes, isPdf, readBytes } from './files.ts';
import { PasswordRequiredError, openWithPdfJs, type PDFDocumentProxy } from '../lib/pdfjs.ts';
import { InvalidPdfError } from '../lib/pdfdoc.ts';

export interface LoadedPdf {
  name: string;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  password?: string;
}

/**
 * Drop area for a single PDF. After loading it shows the file name and a
 * "start over" button, and hands the opened document to `onLoad`.
 */
export function singlePdf(opts: {
  status: Status;
  onLoad: (doc: LoadedPdf) => void | Promise<void>;
  onClear: () => void;
}): { el: HTMLElement; destroy: () => void } {
  const el = h('div', { class: 'single-pdf' });
  let current: LoadedPdf | undefined;

  const destroy = () => {
    void current?.pdf.destroy();
    current = undefined;
  };

  const showDrop = () => {
    el.replaceChildren(dropzone({ label: 'dropOnePdf', accept: 'application/pdf,.pdf', multiple: false, onFiles: (f) => load(f[0]) }));
  };

  const open = async (name: string, bytes: Uint8Array, password?: string) => {
    try {
      const pdf = await openWithPdfJs(bytes, password);
      current = { name, bytes, pdf, password };
      opts.status.clear();
      el.replaceChildren(
        h(
          'div',
          { class: 'file-chip' },
          h('span', { class: 'file-name', title: name }, name),
          h('span', { class: 'muted' }, `${pdf.numPages} ${t('pages')} · ${formatBytes(bytes.length)}`),
          h(
            'button',
            {
              type: 'button',
              class: 'btn',
              onclick: () => {
                destroy();
                opts.status.clear();
                showDrop();
                opts.onClear();
              },
            },
            t('clear'),
          ),
        ),
      );
      await opts.onLoad(current);
    } catch (err) {
      if (err instanceof PasswordRequiredError) return askPassword(name, bytes, err.wrongPassword);
      opts.status.fail(err instanceof Error && err.name === 'InvalidPDFException' ? new InvalidPdfError(err) : err, name);
      showDrop();
    }
  };

  const askPassword = (name: string, bytes: Uint8Array, wrong: boolean) => {
    const input = h('input', { type: 'password', autocomplete: 'off' });
    const form = h(
      'form',
      { class: 'password-form' },
      h('p', {}, `${name}: ${wrong ? t('redactPasswordWrong') : t('redactPassword')}`),
      input,
      h('button', { type: 'submit', class: 'btn primary' }, t('redactPasswordButton')),
      h('button', { type: 'button', class: 'btn', onclick: showDrop }, t('clear')),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void open(name, bytes, input.value);
    });
    el.replaceChildren(form);
    input.focus();
  };

  const load = async (file: File | undefined) => {
    if (!file) return;
    if (!isPdf(file)) return opts.status.fail(new InvalidPdfError(), file.name);
    opts.status.info(t('fileReading', { name: file.name }));
    await open(file.name, await readBytes(file));
  };

  showDrop();
  return { el, destroy };
}
