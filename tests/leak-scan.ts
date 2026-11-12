import { inflateSync } from 'node:zlib';

/**
 * Returns true if `needle` can be found anywhere in the PDF bytes: as
 * plain text, inside any (Flate) compressed stream, or hex encoded.
 * Unreferenced objects are scanned too.
 */
export function containsSecret(pdf: Uint8Array, needle: string): boolean {
  const buf = Buffer.from(pdf);
  const chunks: string[] = [buf.toString('latin1')];
  let pos = 0;
  for (;;) {
    const s = buf.indexOf('stream', pos, 'latin1');
    if (s < 0) break;
    let start = s + 6;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const e = buf.indexOf('endstream', start, 'latin1');
    if (e < 0) break;
    try {
      chunks.push(inflateSync(buf.subarray(start, e)).toString('latin1'));
    } catch {
      /* not flate or truncated; raw text already included */
    }
    pos = e + 9;
  }
  const hex = Buffer.from(needle, 'latin1').toString('hex');
  const hex16 = [...needle].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  const all = chunks.join('\n');
  const compactHex = all.toLowerCase().replace(/\s+/g, '');
  return all.includes(needle) || compactHex.includes(hex) || compactHex.includes(hex16);
}
