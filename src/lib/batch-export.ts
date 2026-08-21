import type { ExportPreset, ExportRequest, SourceMetadata } from './export-protocol';
import { fitLogoSettings, type LogoSettings, type LogoSource } from './logo';
import { resolveVideoLogoSettings, type VideoBatchItem, type VideoLogoOverrides } from './video-batch';

export type BatchExportStatus = 'queued' | 'processing' | 'ready';

export type BatchExportItem = {
  id: string;
  file: File;
  metadata: SourceMetadata;
  status: BatchExportStatus;
  completed: number;
};

/** Creates an export snapshot in upload order, omitting unsupported videos. */
export function createBatchExportQueue(batch: readonly VideoBatchItem[]): BatchExportItem[] {
  return batch.reduce<BatchExportItem[]>((queue, item) => {
    if (item.metadata && (item.status === 'supported' || item.status === 'warning')) {
      queue.push({ id: item.id, file: item.file, metadata: item.metadata, status: 'queued', completed: 0 });
    }
    return queue;
  }, []);
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
  return queue.map((item) => item.id === id && item.status === 'processing'
    ? { ...item, completed: clamp(completed, item.metadata.duration) }
    : item);
}

export function completeBatchExportItem(queue: readonly BatchExportItem[], id: string): BatchExportItem[] {
  return queue.map((item) => item.id === id && item.status === 'processing'
    ? { ...item, status: 'ready', completed: item.metadata.duration }
    : item);
}

/** Overall progress is weighted by each video's full validated duration. */
export function batchExportProgress(queue: readonly BatchExportItem[]) {
  const total = queue.reduce((sum, item) => sum + item.metadata.duration, 0);
  if (total <= 0) return 0;
  const completed = queue.reduce((sum, item) => sum + item.completed, 0);
  return Math.round(completed / total * 100);
}

/** Resolves Batch Default + sparse Video Override, then fits it to this video's frame. */
export function resolveBatchExportLogoSource(
  item: BatchExportItem,
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
  item: BatchExportItem,
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
