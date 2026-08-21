import { describe, expect, it, vi } from 'vitest';
import type { SourceMetadata } from './export-protocol';
import {
  BatchExportStorageUnavailableError,
  checkBatchExportStorage,
  estimateBatchExportBytes,
} from './batch-export-storage';

function metadata(duration: number, audioBitrate = 0): SourceMetadata {
  return { duration, width: 1920, height: 1080, unsupportedAudio: false, audioBitrate };
}

function storage(quota: number, usage: number) {
  return {
    estimate: vi.fn().mockResolvedValue({ quota, usage }),
    getDirectory: vi.fn().mockResolvedValue({}),
  } as unknown as Pick<StorageManager, 'estimate' | 'getDirectory'>;
}

describe('Batch export storage', () => {
  it('uses every duration, the preset bitrate, copied audio, and MP4/ZIP safety overhead', () => {
    const silent = estimateBatchExportBytes([metadata(30), metadata(90)], 'standard');
    const withAudio = estimateBatchExportBytes([metadata(30, 256_000), metadata(90, 128_000)], 'standard');
    const high = estimateBatchExportBytes([metadata(30), metadata(90)], 'high');
    const light = estimateBatchExportBytes([metadata(30), metadata(90)], 'light');
    const separateMp4s = estimateBatchExportBytes([metadata(30)], 'standard')
      + estimateBatchExportBytes([metadata(90)], 'standard');

    expect(withAudio).toBeGreaterThan(silent);
    expect(high).toBeGreaterThan(silent);
    expect(light).toBeLessThan(silent);
    expect(silent).toBeGreaterThan(separateMp4s); // The ZIP coexists with both MP4 outputs.
  });

  it('compares required bytes with quota minus current usage', async () => {
    const videos = [metadata(120, 192_000), metadata(60)];
    const required = estimateBatchExportBytes(videos, 'standard');
    const enough = await checkBatchExportStorage(videos, 'standard', storage(required + 1_000, 1_000));
    const short = await checkBatchExportStorage(videos, 'standard', storage(required + 999, 1_000));

    expect(enough).toEqual({ requiredBytes: required, availableBytes: required, hasCapacity: true });
    expect(short).toEqual({ requiredBytes: required, availableBytes: required - 1, hasCapacity: false });
  });

  it('does not impose a file-count limit when quota is sufficient', async () => {
    const videos = Array.from({ length: 100 }, () => metadata(1));
    const required = estimateBatchExportBytes(videos, 'light');

    await expect(checkBatchExportStorage(videos, 'light', storage(required, 0))).resolves.toMatchObject({
      hasCapacity: true,
    });
  });

  it('reports missing, incomplete, or failing mandatory storage APIs as incompatible', async () => {
    await expect(checkBatchExportStorage([], 'standard', undefined))
      .rejects.toBeInstanceOf(BatchExportStorageUnavailableError);
    await expect(checkBatchExportStorage([], 'standard', {
      estimate: vi.fn().mockResolvedValue({ quota: undefined, usage: 0 }),
      getDirectory: vi.fn().mockResolvedValue({}),
    }))
      .rejects.toBeInstanceOf(BatchExportStorageUnavailableError);
    await expect(checkBatchExportStorage([], 'standard', {
      estimate: vi.fn().mockRejectedValue(new Error('disabled')),
      getDirectory: vi.fn().mockResolvedValue({}),
    }))
      .rejects.toBeInstanceOf(BatchExportStorageUnavailableError);
  });
});
