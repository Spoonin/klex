import { describe, expect, it, vi } from 'vitest';
import { createBatchArchiveEntries, createBatchArchiveNames, writeStoredZip } from './batch-archive';

describe('Batch ZIP archive', () => {
  it('keeps upload order and assigns stable suffixes to duplicate source names', () => {
    const files = [
      new File([], 'clip.mov'),
      new File([], 'other.mp4'),
      new File([], 'clip.mov'),
      new File([], 'CLIP.MP4'),
    ];

    const entries = createBatchArchiveEntries(files.map((file) => ({ sourceName: file.name, file })));

    expect(entries.map(({ name }) => name)).toEqual([
      'clip-klex.mp4',
      'other-klex.mp4',
      'clip-klex-2.mp4',
      'CLIP-klex-3.mp4',
    ]);
    expect(entries.map(({ file }) => file)).toEqual(files);
  });

  it('can assign names before failed results are filtered out', () => {
    const names = createBatchArchiveNames(['clip.mov', 'clip.mp4', 'other.mov']);

    expect(names).toEqual(['clip-klex.mp4', 'clip-klex-2.mp4', 'other-klex.mp4']);
    expect([names[1], names[2]]).toEqual(['clip-klex-2.mp4', 'other-klex.mp4']);
  });

  it('streams valid store entries with UTF-8 names into the output handle', async () => {
    const first = new File(['first mp4'], 'first.mp4', { type: 'video/mp4' });
    const second = new File([new Uint8Array([0, 1, 2, 3])], 'second.mp4', { type: 'video/mp4' });
    const firstArrayBuffer = vi.spyOn(first, 'arrayBuffer');
    const chunks: ArrayBuffer[] = [];
    const writable = {
      write: vi.fn(async (chunk: FileSystemWriteChunkType) => {
        expect(chunk).toBeInstanceOf(Uint8Array);
        chunks.push((chunk as Uint8Array<ArrayBuffer>).slice().buffer);
      }),
      close: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
    };
    const handle = {
      createWritable: vi.fn().mockResolvedValue(writable),
      getFile: vi.fn(async () => new File(chunks, 'archive.zip', { type: 'application/zip' })),
    } as unknown as FileSystemFileHandle;
    const expected = createBatchArchiveEntries([
      { sourceName: 'первый.mov', file: first },
      { sourceName: 'second.mp4', file: second },
    ]);

    const archive = await writeStoredZip(expected, handle);
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const parsed = parseStoredZip(bytes);

    expect(firstArrayBuffer).not.toHaveBeenCalled();
    expect(writable.close).toHaveBeenCalledOnce();
    expect(writable.abort).not.toHaveBeenCalled();
    expect(parsed).toEqual([
      { name: 'первый-klex.mp4', method: 0, data: [...new TextEncoder().encode('first mp4')] },
      { name: 'second-klex.mp4', method: 0, data: [0, 1, 2, 3] },
    ]);
  });
});

function parseStoredZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = bytes.byteLength - 22;
  expect(view.getUint32(endOffset, true)).toBe(0x06054b50);
  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  const entries: Array<{ name: string; method: number; data: number[] }> = [];

  for (let index = 0; index < entryCount; index += 1) {
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    const flags = view.getUint16(centralOffset + 8, true);
    const method = view.getUint16(centralOffset + 10, true);
    const size = view.getUint32(centralOffset + 24, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.subarray(centralOffset + 46, centralOffset + 46 + nameLength));

    expect(flags & 0x0800).toBe(0x0800);
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const descriptorOffset = dataOffset + size;
    expect(view.getUint32(descriptorOffset, true)).toBe(0x08074b50);
    entries.push({ name, method, data: [...bytes.subarray(dataOffset, descriptorOffset)] });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
