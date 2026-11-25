type ZipEntry = { name: string; data: Uint8Array; time: number; date: number };

const encoder = new TextEncoder();


const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function writeStoredZip(entries: ZipEntry[]): Uint8Array {
  const names = entries.map(entry => encoder.encode(entry.name));
  const locals = entries.map((entry, i) => 30 + names[i].byteLength + entry.data.byteLength);
  const centrals = entries.map((_, i) => 46 + names[i].byteLength);
  const output = new Uint8Array(locals.reduce((a, b) => a + b, 0) + centrals.reduce((a, b) => a + b, 0) + 22);
  const view = new DataView(output.buffer);
  const offsets: number[] = [];
  let cursor = 0;
  entries.forEach((entry, i) => {
    const name = names[i], length = entry.data.byteLength, crc = crc32(entry.data);
    offsets.push(cursor);
    view.setUint32(cursor, 0x04034B50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x0800, true); // UTF-8 filenames
    view.setUint16(cursor + 8, 0, true); // stored (uncompressed)
    view.setUint16(cursor + 10, entry.time, true);
    view.setUint16(cursor + 12, entry.date, true);
    view.setUint32(cursor + 14, crc, true);
    view.setUint32(cursor + 18, length, true);
    view.setUint32(cursor + 22, length, true);
    view.setUint16(cursor + 26, name.byteLength, true);
    view.setUint16(cursor + 28, 0, true);
    output.set(name, cursor + 30);
    output.set(entry.data, cursor + 30 + name.byteLength);
    cursor += locals[i];
  });
  const centralStart = cursor;
  entries.forEach((entry, i) => {
    const name = names[i], length = entry.data.byteLength, crc = crc32(entry.data);
    view.setUint32(cursor, 0x02014B50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 10, 0, true);
    view.setUint16(cursor + 12, entry.time, true);
    view.setUint16(cursor + 14, entry.date, true);
    view.setUint32(cursor + 16, crc, true);
    view.setUint32(cursor + 20, length, true);
    view.setUint32(cursor + 24, length, true);
    view.setUint16(cursor + 28, name.byteLength, true);
    view.setUint16(cursor + 30, 0, true); // extra length
    view.setUint16(cursor + 32, 0, true); // comment length
    view.setUint16(cursor + 34, 0, true); // disk number
    view.setUint16(cursor + 36, 0, true); // internal attributes
    view.setUint32(cursor + 38, 0, true); // external attributes
    view.setUint32(cursor + 42, offsets[i], true);
    output.set(name, cursor + 46);
    cursor += centrals[i];
  });
  view.setUint32(cursor, 0x06054B50, true);
  view.setUint16(cursor + 4, 0, true);
  view.setUint16(cursor + 6, 0, true);
  view.setUint16(cursor + 8, entries.length, true);
  view.setUint16(cursor + 10, entries.length, true);
  view.setUint32(cursor + 12, cursor - centralStart, true);
  view.setUint32(cursor + 16, centralStart, true);
  view.setUint16(cursor + 20, 0, true);
  return output;
}

