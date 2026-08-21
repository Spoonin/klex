export type BatchArchiveSource = {
  sourceName: string;
  file: Blob;
};

export type BatchArchiveEntry = {
  name: string;
  file: Blob;
};

type CentralDirectoryEntry = {
  name: Uint8Array<ArrayBuffer>;
  crc32: number;
  size: number;
  offset: number;
};

const encoder = new TextEncoder();
const UTF8_WITH_DATA_DESCRIPTOR = 0x0808;
const STORE_METHOD = 0;
const MAX_UINT32 = 0xffff_ffff;
const DOS_DATE = 0x0021; // 1980-01-01

/** Assigns deterministic, case-insensitively unique MP4 names in upload order. */
export function createBatchArchiveEntries(sources: readonly BatchArchiveSource[]): BatchArchiveEntry[] {
  const names = createBatchArchiveNames(sources.map(({ sourceName }) => sourceName));
  return sources.map(({ file }, index) => ({ name: names[index], file }));
}

/** Assigns names for a complete Batch before successful results are selected for an archive. */
export function createBatchArchiveNames(sourceNames: readonly string[]): string[] {
  const counts = new Map<string, number>();
  return sourceNames.map((sourceName) => {
    const stem = sourceName.replace(/\.[^.]+$/, '') || 'video';
    const base = `${stem}-klex`;
    const key = base.toLocaleLowerCase('en-US');
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return `${base}${count === 1 ? '' : `-${count}`}.mp4`;
  });
}

/** Writes a ZIP archive using store mode and streams every source Blob into the destination handle. */
export async function writeStoredZip(
  entries: readonly BatchArchiveEntry[],
  outputHandle: FileSystemFileHandle,
  signal?: AbortSignal,
): Promise<File> {
  const writable = await outputHandle.createWritable();
  const centralDirectory: CentralDirectoryEntry[] = [];
  let offset = 0;

  try {
    for (const entry of entries) {
      throwIfAborted(signal);
      const name = encoder.encode(entry.name);
      assertUint16(name.byteLength, 'ZIP entry name');
      assertUint32(entry.file.size, 'ZIP entry');
      const localOffset = offset;
      const localHeader = localFileHeader(name);
      await writable.write(localHeader);
      await writable.write(name);
      offset += localHeader.byteLength + name.byteLength;
      assertUint32(offset, 'ZIP archive');

      let crc = 0xffff_ffff;
      let size = 0;
      const reader = entry.file.stream().getReader();
      try {
        while (true) {
          throwIfAborted(signal);
          const { done, value } = await reader.read();
          if (done) break;
          if (!value.byteLength) continue;
          size += value.byteLength;
          assertUint32(size, 'ZIP entry');
          crc = updateCrc32(crc, value);
          await writable.write(value);
          offset += value.byteLength;
          assertUint32(offset, 'ZIP archive');
        }
      } finally {
        reader.releaseLock();
      }

      if (size !== entry.file.size) throw new Error('ZIP source size changed while reading.');
      const crc32 = (crc ^ 0xffff_ffff) >>> 0;
      const descriptor = dataDescriptor(crc32, size);
      await writable.write(descriptor);
      offset += descriptor.byteLength;
      assertUint32(offset, 'ZIP archive');
      centralDirectory.push({ name, crc32, size, offset: localOffset });
    }

    const centralOffset = offset;
    for (const entry of centralDirectory) {
      const header = centralFileHeader(entry);
      await writable.write(header);
      await writable.write(entry.name);
      offset += header.byteLength + entry.name.byteLength;
      assertUint32(offset, 'ZIP archive');
    }
    const centralSize = offset - centralOffset;
    assertUint32(centralSize, 'ZIP central directory');
    assertUint16(centralDirectory.length, 'ZIP entry count');
    const end = endOfCentralDirectory(centralDirectory.length, centralSize, centralOffset);
    await writable.write(end);
    await writable.close();
    return outputHandle.getFile();
  } catch (cause) {
    await writable.abort(cause).catch(() => {});
    throw cause;
  }
}

function localFileHeader(name: Uint8Array<ArrayBuffer>) {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, UTF8_WITH_DATA_DESCRIPTOR, true);
  view.setUint16(8, STORE_METHOD, true);
  view.setUint16(12, DOS_DATE, true);
  view.setUint16(26, name.byteLength, true);
  return bytes;
}

function dataDescriptor(crc32: number, size: number) {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x08074b50, true);
  view.setUint32(4, crc32, true);
  view.setUint32(8, size, true);
  view.setUint32(12, size, true);
  return bytes;
}

function centralFileHeader(entry: CentralDirectoryEntry) {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, UTF8_WITH_DATA_DESCRIPTOR, true);
  view.setUint16(10, STORE_METHOD, true);
  view.setUint16(14, DOS_DATE, true);
  view.setUint32(16, entry.crc32, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.name.byteLength, true);
  view.setUint32(42, entry.offset, true);
  return bytes;
}

function endOfCentralDirectory(entryCount: number, centralSize: number, centralOffset: number) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return bytes;
}

function updateCrc32(crc: number, bytes: Uint8Array) {
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}

function assertUint16(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) throw new Error(`${label} exceeds classic ZIP limits.`);
}

function assertUint32(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UINT32) throw new Error(`${label} exceeds classic ZIP limits.`);
}

const CRC32_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  CRC32_TABLE[index] = value >>> 0;
}
