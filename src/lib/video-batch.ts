import type { SourceMetadata, WorkerErrorCode } from './export-protocol';

export type VideoBatchStatus = 'validating' | 'supported' | 'warning' | 'error';

export type VideoBatchItem = {
  id: string;
  file: File;
  status: VideoBatchStatus;
  metadata?: SourceMetadata;
  error?: WorkerErrorCode;
};

export function appendVideoBatch(
  batch: readonly VideoBatchItem[],
  files: Iterable<File>,
  createId: () => string,
): VideoBatchItem[] {
  return [
    ...batch,
    ...Array.from(files, (file) => ({ id: createId(), file, status: 'validating' as const })),
  ];
}

export function validateVideoBatchItem(
  batch: readonly VideoBatchItem[],
  id: string,
  metadata: SourceMetadata,
): VideoBatchItem[] {
  return batch.map((item) => item.id === id
    ? { ...item, status: metadata.unsupportedAudio ? 'warning' : 'supported', metadata, error: undefined }
    : item);
}

export function rejectVideoBatchItem(
  batch: readonly VideoBatchItem[],
  id: string,
  error: WorkerErrorCode,
): VideoBatchItem[] {
  return batch.map((item) => item.id === id
    ? { ...item, status: 'error', metadata: undefined, error }
    : item);
}

export function removeVideoBatchItem(batch: readonly VideoBatchItem[], id: string): VideoBatchItem[] {
  return batch.filter((item) => item.id !== id);
}

export function supportedVideoBatchItems(batch: readonly VideoBatchItem[]) {
  return batch.filter((item) => item.status === 'supported' || item.status === 'warning');
}
