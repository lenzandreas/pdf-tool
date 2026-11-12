import { h } from '../ui/dom.ts';
import { t } from '../i18n.ts';
import { Status, busy, checkbox, field } from '../ui/widgets.ts';
import { baseName, download } from '../ui/files.ts';
import { singlePdf, type LoadedPdf } from '../ui/single.ts';
import { whenVisible } from '../ui/thumbs.ts';
import { renderPage } from '../lib/pdfjs.ts';
import { EncryptedPdfError, loadPdf } from '../lib/pdfdoc.ts';
import { PRESETS, findTextBoxes, redactPdf, termToRegex, type Box, type Preset } from '../lib/redact.ts';
import type { Tool } from './types.ts';

const MIN_SIZE = 0.004;

export const redactTool: Tool = {
  id: 'redact',
  icon: '▮',
  title: 'redactTitle',
  desc: 'redactDesc',
  mount(root) {
    const status = new Status();
    const body = h('div', { class: 'tool-body' }, status.el);
    const slot = singlePdf({ status, onLoad: (doc) => build(doc), onClear: () => body.replaceChildren(status.el) });
    root.append(
      h('details', { class: 'explain', open: true }, h('summary', {}, t('redactHowTitle')), h('p', {}, t('redactHow'))),
      slot.el,
      body,
    );

    const build = async (doc: LoadedPdf) => {
      const count = doc.pdf.numPages;
      const boxes = new Map<number, Box[]>();
      const overlays: (() => void)[] = [];
      const counter = h('span', { class: 'muted' });

      const changed = (page?: number) => {
        if (page === undefined) overlays.forEach((f) => f());
        else overlays[page]?.();
        let n = 0;
        let p = 0;
        for (const list of boxes.values()) {
          n += list.length;
          if (list.length) p++;
        }
        counter.textContent = t('redactBoxes', { n, p });
      };
      const addBox = (page: number, box: Box) => {
        const list = boxes.get(page) ?? [];
        list.push(box);
        boxes.set(page, list);
      };

      // --- search
      const term = h('input', { type: 'search', placeholder: t('redactSearchPlaceholder') });
      const presets = (Object.keys(PRESETS) as Preset[]).map((key) => ({
        key,
        ...checkbox(t(key === 'email' ? 'presetEmail' : key === 'iban' ? 'presetIban' : 'presetPhone')),
      }));
      const searchBtn = h('button', { type: 'submit', class: 'btn' }, t('redactSearchButton'));
      const searchForm = h(
        'form',
        { class: 'panel search' },
        h('strong', {}, t('redactSearch')),
        h('div', { class: 'search-row' }, term, searchBtn),
        h('div', { class: 'presets' }, h('span', { class: 'muted' }, t('redactPresets')), presets.map((p) => p.el)),
      );
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        void busy(searchBtn, status, async () => {
          const patterns: RegExp[] = [];
          const re = termToRegex(term.value);
          if (re) patterns.push(re);
          for (const p of presets) if (p.input.checked) patterns.push(PRESETS[p.key]);
          if (!patterns.length) return status.clear();
          try {
            let found = 0;
            for (let i = 0; i < count; i++) {
              const list = await findTextBoxes(doc.pdf, i, patterns);
              list.forEach((b) => addBox(i, b));
              found += list.length;
            }
            changed();
            status[found ? 'success' : 'info'](found ? t('redactFound', { n: found }) : t('redactFoundNone'));
          } catch (err) {
            status.fail(err, doc.name);
          }
        });
      });

      const clearAll = h('button', { type: 'button', class: 'btn' }, t('redactClearAll'));
      clearAll.addEventListener('click', () => {
        boxes.clear();
        changed();
      });
      const drawToggle = checkbox('✎ ' + t('redactDraw'));
      const pagesEl = h('div', { class: 'redact-pages' });
      drawToggle.input.addEventListener('change', () => pagesEl.classList.toggle('drawing', drawToggle.input.checked));

      // --- pages
      for (let i = 0; i < count; i++) pagesEl.append(buildPage(i));

      function buildPage(index: number): HTMLElement {
        const canvasBox = h('div', { class: 'page-canvas' });
        const overlay = h('div', { class: 'overlay' });
        const stage = h('div', { class: 'page-stage' }, canvasBox, overlay);
        const wrap = h(
          'section',
          { class: 'redact-page' },
          h(
            'div',
            { class: 'page-head' },
            h('span', {}, t('pageOf', { n: index + 1, total: count })),
            h(
              'button',
              {
                type: 'button',
                class: 'btn small',
                onclick: () => {
                  addBox(index, { x: 0, y: 0, w: 1, h: 1 });
                  changed(index);
                },
              },
              t('redactWholePage'),
            ),
          ),
          stage,
        );

        whenVisible(stage, async () => {
          try {
            const page = await doc.pdf.getPage(index + 1);
            const vp = page.getViewport({ scale: 1 });
            stage.style.aspectRatio = `${vp.width} / ${vp.height}`;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const cssWidth = Math.min(stage.clientWidth || 800, 1000);
            const canvas = await renderPage(page, (cssWidth / vp.width) * ratio);
            page.cleanup();
            canvasBox.replaceChildren(canvas);
          } catch {
            canvasBox.classList.add('failed');
          }
        });

        const drawOverlay = () => {
          overlay.replaceChildren(
            ...(boxes.get(index) ?? []).map((b, k) => {
              const el = h('div', { class: 'rbox', title: t('remove') });
              place(el, b);
              el.addEventListener('pointerdown', (e) => e.stopPropagation());
              el.addEventListener('click', () => {
                boxes.get(index)!.splice(k, 1);
                changed(index);
              });
              return el;
            }),
          );
        };
        overlays[index] = drawOverlay;

        overlay.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          if (e.pointerType === 'touch' && !pagesEl.classList.contains('drawing')) return;
          e.preventDefault();
          overlay.setPointerCapture(e.pointerId);
          const rect = overlay.getBoundingClientRect();
          const pos = (ev: PointerEvent) => ({
            x: Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height)),
          });
          const start = pos(e);
          const draft = h('div', { class: 'rbox draft' });
          overlay.append(draft);
          let box: Box = { x: start.x, y: start.y, w: 0, h: 0 };
          const move = (ev: PointerEvent) => {
            const p = pos(ev);
            box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
            place(draft, box);
          };
          const up = () => {
            overlay.removeEventListener('pointermove', move);
            overlay.removeEventListener('pointerup', up);
            overlay.removeEventListener('pointercancel', up);
            draft.remove();
            if (box.w > MIN_SIZE && box.h > MIN_SIZE) addBox(index, box);
            changed(index);
          };
          overlay.addEventListener('pointermove', move);
          overlay.addEventListener('pointerup', up);
          overlay.addEventListener('pointercancel', up);
        });
        return wrap;
      }

      // --- options and run
      let encrypted = false;
      try {
        await loadPdf(doc.bytes);
      } catch (err) {
        if (err instanceof EncryptedPdfError) encrypted = true;
      }
      const flattenAll = checkbox(t('redactFlattenAll'), encrypted);
      flattenAll.input.disabled = encrypted;
      const quality = h(
        'select',
        {},
        h('option', { value: '150' }, t('redactQualityLow')),
        h('option', { value: '200', selected: true }, t('redactQualityMid')),
        h('option', { value: '300' }, t('redactQualityHigh')),
      );
      const png = checkbox(t('redactFormat'));
      const run = h('button', { type: 'button', class: 'btn primary' }, t('redactButton'));
      run.addEventListener('click', () =>
        busy(run, status, async () => {
          const any = [...boxes.values()].some((l) => l.length > 0);
          if (!any && !flattenAll.input.checked) return status.error(t('redactNothing'));
          try {
            const out = await redactPdf(doc.bytes, boxes, {
              dpi: Number(quality.value),
              flattenAll: flattenAll.input.checked,
              format: png.input.checked ? 'png' : 'jpeg',
              password: doc.password,
              onProgress: (n, total) => status.info(t('redactProgress', { n: Math.min(n + 1, total), total })),
            });
            download(out, `${baseName(doc.name)}-redacted.pdf`);
            status.success(`${t('done')} ${t('redactCheck')}`);
          } catch (err) {
            status.fail(err, doc.name);
          }
        }),
      );

      const options = h(
        'div',
        { class: 'panel options' },
        encrypted ? h('p', { class: 'notice' }, t('redactEncrypted')) : null,
        flattenAll.el,
        h('div', { class: 'option-row' }, field(t('redactQuality'), quality), png.el),
      );
      const bar = h('div', { class: 'sticky-bar' }, counter, h('span', { class: 'spacer' }), run);

      body.replaceChildren(
        searchForm,
        options,
        h('div', { class: 'toolbar' }, clearAll, h('span', { class: 'touch-only' }, drawToggle.el)),
        pagesEl,
        bar,
        status.el,
      );
      changed();
    };

    return slot.destroy;
  },
};

function place(el: HTMLElement, b: Box): void {
  el.style.left = `${b.x * 100}%`;
  el.style.top = `${b.y * 100}%`;
  el.style.width = `${b.w * 100}%`;
  el.style.height = `${b.h * 100}%`;
}
