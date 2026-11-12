/**
 * Parses page selections such as "1-3, 5, 8-" into zero-based page indexes.
 * Page numbers are one-based. "8-" means "8 to the last page", "-3" means
 * "1 to 3". Throws a RangeError with a readable message for bad input.
 */
export function parsePageList(input: string, pageCount: number): number[] {
  const groups = parsePageGroups(input, pageCount);
  return groups.flat();
}

/**
 * Like parsePageList, but keeps each comma separated part as its own group.
 * Used by split: "1-3, 4-6" gives two files.
 */
export function parsePageGroups(input: string, pageCount: number): number[][] {
  const parts = input
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) throw new RangeError('empty');
  return parts.map((part) => parseGroup(part, pageCount));
}

function parseGroup(part: string, pageCount: number): number[] {
  const m = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part);
  let from: number;
  let to: number;
  if (m) {
    from = m[1] ? Number(m[1]) : 1;
    to = m[2] ? Number(m[2]) : pageCount;
  } else if (/^\d+$/.test(part)) {
    from = to = Number(part);
  } else {
    throw new RangeError(`invalid:${part}`);
  }
  if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
    throw new RangeError(`outOfRange:${part}`);
  }
  const pages: number[] = [];
  const step = from <= to ? 1 : -1;
  for (let p = from; step > 0 ? p <= to : p >= to; p += step) pages.push(p - 1);
  return pages;
}

/** Splits [0..pageCount) into chunks of `size` pages. */
export function chunkPages(pageCount: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('chunk');
  const groups: number[][] = [];
  for (let i = 0; i < pageCount; i += size) {
    groups.push(Array.from({ length: Math.min(size, pageCount - i) }, (_, k) => i + k));
  }
  return groups;
}

/** Formats zero-based indexes as a compact one-based list, e.g. "1-3, 5". */
export function formatPageList(indexes: number[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < indexes.length) {
    let j = i;
    while (j + 1 < indexes.length && indexes[j + 1] === indexes[j] + 1) j++;
    out.push(i === j ? `${indexes[i] + 1}` : `${indexes[i] + 1}-${indexes[j] + 1}`);
    i = j + 1;
  }
  return out.join(', ');
}
