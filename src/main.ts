import './styles.css';
import { h } from './ui/dom.ts';
import { getLang, setLang, t, type Lang } from './i18n.ts';
import { mergeTool } from './tools/merge.ts';
import { splitTool } from './tools/split.ts';
import { redactTool } from './tools/redact.ts';
import { organizeTool } from './tools/organize.ts';
import { imagesTool } from './tools/images.ts';
import { exportTool } from './tools/export.ts';
import { numbersTool } from './tools/numbers.ts';
import { metadataTool } from './tools/metadata.ts';
import type { Tool } from './tools/types.ts';

const TOOLS: Tool[] = [mergeTool, splitTool, redactTool, organizeTool, imagesTool, exportTool, numbersTool, metadataTool];
const REPO = 'https://github.com/lenzandreas/pdf-tool';

const app = document.getElementById('app')!;
let cleanup: (() => void) | void;

function currentTool(): Tool | undefined {
  const id = location.hash.replace(/^#\/?/, '');
  return TOOLS.find((tool) => tool.id === id);
}

function langSwitch(): HTMLElement {
  const make = (lang: Lang, label: string) =>
    h(
      'button',
      {
        type: 'button',
        class: lang === getLang() ? 'active' : '',
        'aria-pressed': String(lang === getLang()),
        onclick: () => {
          if (lang === getLang()) return;
          setLang(lang);
          render();
        },
      },
      label,
    );
  return h('div', { class: 'lang', role: 'group', 'aria-label': t('language') }, make('de', 'DE'), make('en', 'EN'));
}

function render(): void {
  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  document.title = t('appName');
  const tool = currentTool();

  const header = h(
    'header',
    { class: 'top' },
    h('a', { href: '#', class: 'brand' }, h('span', { class: 'logo', 'aria-hidden': 'true' }, 'PDF'), t('appName')),
    h('span', { class: 'badge' }, '🔒 ', t('privacyBadge')),
    langSwitch(),
  );
  const nav = h(
    'nav',
    { class: 'tabs', 'aria-label': t('home') },
    TOOLS.map((x) =>
      h('a', { href: `#${x.id}`, class: x === tool ? 'active' : '', 'aria-current': x === tool ? 'page' : undefined }, h('span', { 'aria-hidden': 'true' }, x.icon), t(x.title)),
    ),
  );

  const main = h('main', {});
  if (tool) {
    main.append(h('h1', {}, t(tool.title)), h('p', { class: 'lead' }, t(tool.desc)));
    const root = h('div', { class: `tool tool-${tool.id}` });
    main.append(root);
    cleanup = tool.mount(root);
  } else {
    main.append(
      h('h1', {}, t('appName')),
      h('p', { class: 'lead' }, t('tagline')),
      h(
        'div',
        { class: 'cards' },
        TOOLS.map((x) =>
          h('a', { href: `#${x.id}`, class: 'card' }, h('span', { class: 'card-icon', 'aria-hidden': 'true' }, x.icon), h('strong', {}, t(x.title)), h('span', {}, t(x.desc))),
        ),
      ),
    );
  }

  const footer = h('footer', {}, h('span', {}, t('footer')), ' ', h('a', { href: REPO, rel: 'noopener noreferrer', target: '_blank' }, t('sourceCode')));
  app.replaceChildren(header, nav, main, footer);
  window.scrollTo(0, 0);
}

setLang(getLang());
window.addEventListener('hashchange', render);
// Keep a dropped file from replacing the app when it misses a drop area.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());
render();
