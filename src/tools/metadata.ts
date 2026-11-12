import { h } from '../ui/dom.ts';
import { getLang, t, type Key } from '../i18n.ts';
import { Status, busy, field } from '../ui/widgets.ts';
import { download } from '../ui/files.ts';
import { singlePdf, type LoadedPdf } from '../ui/single.ts';
import { readMetadata, writeMetadata, type Metadata } from '../lib/ops.ts';
import type { Tool } from './types.ts';

const TEXT_FIELDS: [keyof Metadata, Key][] = [
  ['title', 'metaFieldTitle'],
  ['author', 'metaFieldAuthor'],
  ['subject', 'metaFieldSubject'],
  ['keywords', 'metaFieldKeywords'],
  ['creator', 'metaFieldCreator'],
  ['producer', 'metaFieldProducer'],
];

export const metadataTool: Tool = {
  id: 'metadata',
  icon: 'ⓘ',
  title: 'metaTitle',
  desc: 'metaDesc',
  mount(root) {
    const status = new Status();
    const body = h('div', { class: 'tool-body' }, status.el);
    const slot = singlePdf({ status, onLoad: (doc) => build(doc), onClear: () => body.replaceChildren(status.el) });
    root.append(slot.el, body);

    const build = async (doc: LoadedPdf) => {
      let meta: Metadata;
      try {
        meta = await readMetadata(doc.bytes);
      } catch (err) {
        return status.fail(err, doc.name);
      }
      const inputs = new Map<keyof Metadata, HTMLInputElement>();
      const fmt = (d?: Date) => (d ? d.toLocaleString(getLang() === 'de' ? 'de-DE' : 'en-GB') : '–');
      const save = h('button', { type: 'button', class: 'btn primary' }, t('metaSave'));
      const strip = h('button', { type: 'button', class: 'btn danger' }, t('metaStrip'));
      save.addEventListener('click', () =>
        busy(save, status, async () => {
          try {
            const next: Partial<Metadata> = { created: meta.created, modified: new Date() };
            for (const [key, input] of inputs) (next as Record<string, string>)[key] = input.value.trim();
            download(await writeMetadata(doc.bytes, next), doc.name);
            status.success(t('done'));
          } catch (err) {
            status.fail(err, doc.name);
          }
        }),
      );
      strip.addEventListener('click', () =>
        busy(strip, status, async () => {
          try {
            download(await writeMetadata(doc.bytes, {}), doc.name);
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
          TEXT_FIELDS.map(([key, label]) => {
            const input = h('input', { type: 'text', value: String(meta[key] ?? '') });
            inputs.set(key, input);
            return field(t(label), input);
          }),
          field(t('metaFieldCreated'), h('output', {}, fmt(meta.created))),
          field(t('metaFieldModified'), h('output', {}, fmt(meta.modified))),
        ),
        h('p', { class: 'hint' }, t('metaHint')),
        h('div', { class: 'actions' }, save, strip),
        status.el,
      );
    };
    return slot.destroy;
  },
};
