import type { ExportPreset, ExportRequest, SourceMetadata, WorkerErrorCode } from './export-protocol';
import { fitLogoSettings, type LogoSettings, type LogoSource } from './logo';
import { resolveVideoLogoSettings, type VideoBatchItem, type VideoLogoOverrides } from './video-batch';

export type BatchExportStatus = 'queued' | 'processing' | 'ready' | 'error' | 'skipped';

export type BatchExportItem = {
  id: string;
  file: File;
  metadata?: SourceMetadata;
  status: BatchExportStatus;
  completed: number;
  error?: WorkerErrorCode;
};

export type ProcessableBatchExportItem = BatchExportItem & { metadata: SourceMetadata };

export type BatchExportSummary = {
  ready: number;
  error: number;
  skipped: number;
};

export type BatchExportDownloadKind = 'none' | 'mp4' | 'zip';

/** Creates an export snapshot in upload order, marking unsupported videos as skipped. */
export function createBatchExportQueue(batch: readonly VideoBatchItem[]): BatchExportItem[] {
  return batch.reduce<BatchExportItem[]>((queue, item) => {
    if (item.metadata && (item.status === 'supported' || item.status === 'warning')) {
      queue.push({ id: item.id, file: item.file, metadata: item.metadata, status: 'queued', completed: 0 });
    } else if (item.status === 'error') {
      queue.push({ id: item.id, file: item.file, status: 'skipped', completed: 0, error: item.error ?? 'generic' });
    }
    return queue;
  }, []);
}

export function processableBatchExportItems(
  queue: readonly BatchExportItem[],
): ProcessableBatchExportItem[] {
  return queue.filter((item): item is ProcessableBatchExportItem => item.status === 'queued' && !!item.metadata);
}

export function retryableBatchExportItems(
  queue: readonly BatchExportItem[],
): ProcessableBatchExportItem[] {
  return queue.filter((item): item is ProcessableBatchExportItem => item.status === 'error' && !!item.metadata);
}

/** Requeues only failed exports; validation failures remain skipped and ready outputs remain ready. */
export function retryFailedBatchExportItems(queue: readonly BatchExportItem[]): BatchExportItem[] {
  return queue.map((item) => item.status === 'error' && item.metadata
    ? { ...item, status: 'queued', completed: 0, error: undefined }
    : item);
}

/** Starts only the first queued video and never introduces a second active item. */
export function startNextBatchExportItem(queue: readonly BatchExportItem[]): BatchExportItem[] {
  if (queue.some(({ status }) => status === 'processing')) return [...queue];
  const nextId = queue.find(({ status }) => status === 'queued')?.id;
  return queue.map((item) => item.id === nextId ? { ...item, status: 'processing' } : item);
}

export function updateBatchExportProgress(
  queue: readonly BatchExportItem[],
  id: string,
  completed: number,
): BatchExportItem[] {
  return queue.map((item) => item.id === id && item.status === 'processing' && item.metadata
    ? { ...item, completed: clamp(completed, item.metadata.duration) }
    : item);
}

export function completeBatchExportItem(queue: readonly BatchExportItem[], id: string): BatchExportItem[] {
  return queue.map((item) => item.id === id && item.status === 'processing' && item.metadata
    ? { ...item, status: 'ready', completed: item.metadata.duration }
    : item);
}

/** Fails only the active video and counts it as finished so overall progress can continue. */
export function failBatchExportItem(
  queue: readonly BatchExportItem[],
  id: string,
  error: WorkerErrorCode,
): BatchExportItem[] {
  return queue.map((item) => item.id === id && item.status === 'processing' && item.metadata
    ? { ...item, status: 'error', completed: item.metadata.duration, error }
    : item);
}

/** Overall progress is weighted by each video's full validated duration. */
export function batchExportProgress(queue: readonly BatchExportItem[]) {
  const total = queue.reduce((sum, item) => sum + (item.metadata?.duration ?? 0), 0);
  if (total <= 0) return 0;
  const completed = queue.reduce((sum, item) => sum + item.completed, 0);
  return Math.round(completed / total * 100);
}

export function batchExportSummary(queue: readonly BatchExportItem[]): BatchExportSummary {
  return queue.reduce<BatchExportSummary>((summary, item) => {
    if (item.status === 'ready') summary.ready += 1;
    else if (item.status === 'error') summary.error += 1;
    else if (item.status === 'skipped') summary.skipped += 1;
    return summary;
  }, { ready: 0, error: 0, skipped: 0 });
}

/** Keeps direct MP4 only for a Batch that started with exactly one processable video. */
export function batchExportDownloadKind(
  processableCount: number,
  successfulCount: number,
): BatchExportDownloadKind {
  if (successfulCount <= 0) return 'none';
  return processableCount === 1 ? 'mp4' : 'zip';
}

/** Resolves Batch Default + sparse Video Override, then fits it to this video's frame. */
export function resolveBatchExportLogoSource(
  item: ProcessableBatchExportItem,
  file: File,
  image: { width: number; height: number },
  batchDefault: LogoSettings,
  overrides: VideoLogoOverrides,
): LogoSource {
  return {
    file,
    ...image,
    settings: fitLogoSettings(
      image,
      item.metadata,
      resolveVideoLogoSettings(batchDefault, overrides[item.id]),
    ),
  };
}

export function createBatchExportRequest(
  item: ProcessableBatchExportItem,
  preset: ExportPreset,
  logo: LogoSource,
  output: FileSystemFileHandle,
): ExportRequest {
  return {
    type: 'export',
    file: item.file,
    preset,
    layers: [],
    logo,
    trim: { trimIn: 0, trimOut: item.metadata.duration },
    output,
  };
}

function clamp(value: number, maximum: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, value));
}
