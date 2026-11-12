import { h } from './dom.ts';
import { t, type Key } from '../i18n.ts';
import { EncryptedPdfError, InvalidPdfError } from '../lib/pdfdoc.ts';

/** A drop area that also works as a file picker button. */
export function dropzone(opts: {
  label: Key;
  accept: string;
  multiple: boolean;
  onFiles: (files: File[]) => void;
}): HTMLElement {
  const input = h('input', { type: 'file', accept: opts.accept, multiple: opts.multiple, hidden: true });
  input.addEventListener('change', () => {
    if (input.files?.length) opts.onFiles([...input.files]);
    input.value = '';
  });
  const zone = h(
    'label',
    { class: 'dropzone', tabindex: 0 },
    input,
    h('span', { class: 'dropzone-icon', 'aria-hidden': 'true' }, '⬆'),
    h('span', {}, t(opts.label)),
  );
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) opts.onFiles(opts.multiple ? files : files.slice(0, 1));
  });
  return zone;
}

/** Area for progress, success and error messages. */
export class Status {
  readonly el = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });

  info(text: string): void {
    this.set('info', text);
  }
  success(text: string): void {
    this.set('success', text);
  }
  error(text: string): void {
    this.set('error', text);
  }
  clear(): void {
    this.el.replaceChildren();
    this.el.className = 'status';
  }
  private set(kind: string, text: string) {
    this.el.className = `status status-${kind}`;
    this.el.textContent = text;
  }

  /** Shows a readable message for an error thrown while handling `name`. */
  fail(err: unknown, name = ''): void {
    console.error(err);
    if (err instanceof EncryptedPdfError) return this.error(t('errorEncrypted', { name }));
    if (err instanceof InvalidPdfError) return this.error(t('errorInvalid', { name }));
    if (err instanceof RangeError) {
      const [kind, part] = err.message.split(':');
      if (kind === 'empty') return this.error(t('errorPagesEmpty'));
      return this.error(t('errorPages', { part: part ?? '' }));
    }
    this.error(t('errorGeneric', { msg: err instanceof Error ? err.message : String(err) }));
  }
}

/** Runs an async action with the button disabled and a busy message. */
export async function busy(button: HTMLButtonElement, status: Status, action: () => Promise<void>): Promise<void> {
  if (button.disabled) return;
  button.disabled = true;
  document.body.classList.add('busy');
  status.info(t('working'));
  // Let the browser paint the message before heavy work starts.
  await new Promise((r) => setTimeout(r, 30));
  try {
    await action();
  } finally {
    button.disabled = false;
    document.body.classList.remove('busy');
  }
}

export function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('small', {}, hint) : null);
}

export function radio(name: string, value: string, label: string, checked = false): HTMLElement {
  return h('label', { class: 'choice' }, h('input', { type: 'radio', name, value, checked }), h('span', {}, label));
}

export function checkbox(label: string, checked = false): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox', checked });
  return { el: h('label', { class: 'choice' }, input, h('span', {}, label)), input };
}

export function iconButton(icon: string, title: string, onclick: (e: Event) => void, cls = ''): HTMLButtonElement {
  return h('button', { type: 'button', class: `icon-btn ${cls}`, title, 'aria-label': title, onclick }, icon);
}
