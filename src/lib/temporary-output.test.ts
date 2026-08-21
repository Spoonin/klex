import { describe, expect, it, vi } from 'vitest';
import { createTemporaryArchive, createTemporaryOutput, TemporaryStorageUnavailableError } from './temporary-output';

describe('temporary export output', () => {
  it('reports a browser capability error when OPFS is unavailable', async () => {
    await expect(createTemporaryOutput(undefined, 'missing')).rejects.toBeInstanceOf(TemporaryStorageUnavailableError);
  });

  it('creates a uniquely named file and removes it idempotently', async () => {
    const fileHandle = { kind: 'file', name: 'export-attempt.mp4' } as FileSystemFileHandle;
    const getFileHandle = vi.fn().mockResolvedValue(fileHandle);
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    const directory = { getFileHandle, removeEntry } as unknown as FileSystemDirectoryHandle;
    const getDirectoryHandle = vi.fn().mockResolvedValue(directory);
    const storage = {
      getDirectory: vi.fn().mockResolvedValue({ getDirectoryHandle }),
    } as unknown as Pick<StorageManager, 'getDirectory'>;

    const output = await createTemporaryOutput(storage, 'attempt');
    await output.dispose();
    await output.dispose();

    expect(getDirectoryHandle).toHaveBeenCalledWith('klex-exports', { create: true });
    expect(getFileHandle).toHaveBeenCalledWith('export-attempt.mp4', { create: true });
    expect(output.handle).toBe(fileHandle);
    expect(removeEntry).toHaveBeenCalledOnce();
    expect(removeEntry).toHaveBeenCalledWith('export-attempt.mp4');
  });

  it('retries deletion while a terminated worker releases its file lock', async () => {
    const removeEntry = vi.fn()
      .mockRejectedValueOnce(new DOMException('Locked', 'NoModificationAllowedError'))
      .mockResolvedValue(undefined);
    const directory = {
      getFileHandle: vi.fn().mockResolvedValue({ kind: 'file' }),
      removeEntry,
    } as unknown as FileSystemDirectoryHandle;
    const storage = {
      getDirectory: vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(directory),
      }),
    } as unknown as Pick<StorageManager, 'getDirectory'>;

    const output = await createTemporaryOutput(storage, 'locked');
    await output.dispose();

    expect(removeEntry).toHaveBeenCalledTimes(2);
  });

  it('creates ZIP archives in the same temporary browser storage', async () => {
    const getFileHandle = vi.fn().mockResolvedValue({ kind: 'file', name: 'archive-batch.zip' });
    const storage = {
      getDirectory: vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue({ getFileHandle, removeEntry: vi.fn() }),
      }),
    } as unknown as Pick<StorageManager, 'getDirectory'>;

    await createTemporaryArchive(storage, 'batch');

    expect(getFileHandle).toHaveBeenCalledWith('archive-batch.zip', { create: true });
  });
});
