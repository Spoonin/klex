import type { SourceMetadata, WorkerErrorCode } from './export-protocol';

export type VideoBatchStatus = 'validating' | 'supported' | 'warning' | 'error';

export type VideoBatchItem = {
  id: string;
  file: File;
  status: VideoBatchStatus;
  metadata?: SourceMetadata;
  error?: WorkerErrorCode;
};

export type LogoBatchEditorTarget =
  | { type: 'batch-default' }
  | { type: 'video'; id: string };

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

/** Batch Default exists only when there are multiple videos that can be exported. */
export function hasLogoBatchDefault(batch: readonly VideoBatchItem[]) {
  return supportedVideoBatchItems(batch).length >= 2;
}

/** Opens a multi-video Batch on its common settings and a single video on that video. */
export function initialLogoBatchEditorTarget(
  batch: readonly VideoBatchItem[],
): LogoBatchEditorTarget | undefined {
  const supported = supportedVideoBatchItems(batch);
  if (supported.length >= 2) return { type: 'batch-default' };
  if (supported[0]) return { type: 'video', id: supported[0].id };
}
