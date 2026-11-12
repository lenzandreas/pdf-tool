import type { Key } from '../i18n.ts';

export interface Tool {
  id: string;
  icon: string;
  title: Key;
  desc: Key;
  /** Builds the tool into `root`. May return a cleanup function. */
  mount(root: HTMLElement): void | (() => void);
}
