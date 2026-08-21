import { EXPORT_VIDEO_BITRATES, type ExportPreset, type SourceMetadata } from './export-protocol';

const MEBIBYTE = 1024 ** 2;
const MP4_PAYLOAD_MARGIN = 1.15;
const MP4_FIXED_OVERHEAD = MEBIBYTE;
const ZIP_PAYLOAD_MARGIN = 1.01;
const ZIP_FIXED_OVERHEAD = MEBIBYTE;
const SAFE_WRITE_MARGIN = 1.1;

type BrowserStorage = Pick<StorageManager, 'estimate' | 'getDirectory'>;

export type BatchExportStorageCapacity = {
  requiredBytes: number;
  availableBytes: number;
  hasCapacity: boolean;
};

export class BatchExportStorageUnavailableError extends Error {
  constructor() {
    super('The browser cannot report or provide storage for a safe Batch export.');
  }
}

/**
 * Estimates peak temporary storage. For multi-video Batches, the source MP4s
 * remain in OPFS while the uncompressed ZIP is written, so both copies count.
 */
export function estimateBatchExportBytes(
  videos: readonly SourceMetadata[],
  preset: ExportPreset,
) {
  const videoBitrate = EXPORT_VIDEO_BITRATES[preset];
  const mp4Bytes = videos.reduce((total, metadata) => {
    const duration = finiteNonNegative(metadata.duration);
    const audioBitrate = finiteNonNegative(metadata.audioBitrate);
    const payload = duration * (videoBitrate + audioBitrate) / 8;
    return total + Math.ceil(payload * MP4_PAYLOAD_MARGIN + MP4_FIXED_OVERHEAD);
  }, 0);
  const zipBytes = videos.length > 1
    ? Math.ceil(mp4Bytes * ZIP_PAYLOAD_MARGIN + ZIP_FIXED_OVERHEAD)
    : 0;
  return Math.ceil((mp4Bytes + zipBytes) * SAFE_WRITE_MARGIN);
}

export async function checkBatchExportStorage(
  videos: readonly SourceMetadata[],
  preset: ExportPreset,
  storage: BrowserStorage | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<BatchExportStorageCapacity> {
  if (!storage || typeof storage.estimate !== 'function' || typeof storage.getDirectory !== 'function') {
    throw new BatchExportStorageUnavailableError();
  }

  try {
    await storage.getDirectory();
    const estimate = await storage.estimate();
    if (!isFiniteNonNegative(estimate.quota) || !isFiniteNonNegative(estimate.usage)) {
      throw new BatchExportStorageUnavailableError();
    }
    const requiredBytes = estimateBatchExportBytes(videos, preset);
    const availableBytes = Math.max(0, estimate.quota - estimate.usage);
    return { requiredBytes, availableBytes, hasCapacity: availableBytes >= requiredBytes };
  } catch (cause) {
    if (cause instanceof BatchExportStorageUnavailableError) throw cause;
    throw new BatchExportStorageUnavailableError();
  }
}

function finiteNonNegative(value: number) {
  return isFiniteNonNegative(value) ? value : 0;
}

function isFiniteNonNegative(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
