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
  const mp4Bytes = estimateMp4Bytes(videos, preset);
  const zipBytes = videos.length > 1
    ? estimateZipBytes(mp4Bytes)
    : 0;
  return Math.ceil((mp4Bytes + zipBytes) * SAFE_WRITE_MARGIN);
}

/** Estimates only the additional files needed while successful MP4s remain in storage. */
export function estimateBatchRetryBytes(
  videos: readonly SourceMetadata[],
  preset: ExportPreset,
  retainedBytes: number,
  totalVideoCount: number,
) {
  const retryMp4Bytes = estimateMp4Bytes(videos, preset);
  const finalPayloadBytes = finiteNonNegative(retainedBytes) + retryMp4Bytes;
  const zipBytes = totalVideoCount > 1 ? estimateZipBytes(finalPayloadBytes) : 0;
  return Math.ceil((retryMp4Bytes + zipBytes) * SAFE_WRITE_MARGIN);
}

export async function checkBatchExportStorage(
  videos: readonly SourceMetadata[],
  preset: ExportPreset,
  storage: BrowserStorage | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<BatchExportStorageCapacity> {
  return checkRequiredStorage(estimateBatchExportBytes(videos, preset), storage);
}

export async function checkBatchRetryStorage(
  videos: readonly SourceMetadata[],
  preset: ExportPreset,
  retainedBytes: number,
  totalVideoCount: number,
  storage: BrowserStorage | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<BatchExportStorageCapacity> {
  return checkRequiredStorage(
    estimateBatchRetryBytes(videos, preset, retainedBytes, totalVideoCount),
    storage,
  );
}

async function checkRequiredStorage(
  requiredBytes: number,
  storage: BrowserStorage | undefined,
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
    const availableBytes = Math.max(0, estimate.quota - estimate.usage);
    return { requiredBytes, availableBytes, hasCapacity: availableBytes >= requiredBytes };
  } catch (cause) {
    if (cause instanceof BatchExportStorageUnavailableError) throw cause;
    throw new BatchExportStorageUnavailableError();
  }
}

function estimateMp4Bytes(videos: readonly SourceMetadata[], preset: ExportPreset) {
  const videoBitrate = EXPORT_VIDEO_BITRATES[preset];
  return videos.reduce((total, metadata) => {
    const duration = finiteNonNegative(metadata.duration);
    const audioBitrate = finiteNonNegative(metadata.audioBitrate);
    const payload = duration * (videoBitrate + audioBitrate) / 8;
    return total + Math.ceil(payload * MP4_PAYLOAD_MARGIN + MP4_FIXED_OVERHEAD);
  }, 0);
}

function estimateZipBytes(payloadBytes: number) {
  return Math.ceil(payloadBytes * ZIP_PAYLOAD_MARGIN + ZIP_FIXED_OVERHEAD);
}

function finiteNonNegative(value: number) {
  return isFiniteNonNegative(value) ? value : 0;
}

function isFiniteNonNegative(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
