import { zipSync } from 'fflate';

export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** File name without extension, safe to use in a download name. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_') || 'document';
}

let lastUrl: string | undefined;

/** Starts a download of in-memory data. Nothing is sent anywhere. */
export function download(data: Uint8Array | Blob, name: string, type = 'application/pdf'): void {
  const blob = data instanceof Blob ? data : new Blob([data as Uint8Array<ArrayBuffer>], { type });
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  const url = URL.createObjectURL(blob);
  lastUrl = url;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
}

export function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const f of files) {
    let name = f.name;
    for (let i = 2; entries[name]; i++) name = f.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
    // PDFs and images are already compressed; storing them is faster.
    entries[name] = [f.data, { level: /\.(pdf|png|jpe?g)$/i.test(name) ? 0 : 6 }];
  }
  return zipSync(entries);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
