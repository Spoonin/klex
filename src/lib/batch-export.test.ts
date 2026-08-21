import { describe, expect, it } from 'vitest';
import {
  batchExportProgress,
  batchExportDownloadKind,
  batchExportSummary,
  completeBatchExportItem,
  createBatchExportRequest,
  createBatchExportQueue,
  failBatchExportItem,
  processableBatchExportItems,
  retryFailedBatchExportItems,
  retryableBatchExportItems,
  resolveBatchExportLogoSource,
  startNextBatchExportItem,
  updateBatchExportProgress,
} from './batch-export';
import type { VideoBatchItem } from './video-batch';
import { DEFAULT_LOGO_SETTINGS } from './logo';

const metadata = (duration: number) => ({
  duration,
  width: 1920,
  height: 1080,
  unsupportedAudio: false,
  audioBitrate: 0,
});

function item(id: string, status: VideoBatchItem['status'], duration = 10): VideoBatchItem {
  return {
    id,
    file: new File([], `${id}.mp4`),
    status,
    metadata: status === 'supported' || status === 'warning' ? metadata(duration) : undefined,
    error: status === 'error' ? 'videoCodec' : undefined,
  };
}

describe('Batch export queue', () => {
  it('keeps upload order, marks unsupported videos as skipped, and omits unfinished videos', () => {
    const queue = createBatchExportQueue([
      item('first', 'supported'),
      item('unsupported', 'error'),
      item('checking', 'validating'),
      item('last', 'warning'),
    ]);

    expect(queue.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'first', status: 'queued' },
      { id: 'unsupported', status: 'skipped' },
      { id: 'last', status: 'queued' },
    ]);
    expect(queue[1].error).toBe('videoCodec');
    expect(processableBatchExportItems(queue).map(({ id }) => id)).toEqual(['first', 'last']);
  });

  it('fails only the active video, records its exact reason, and advances to the next video', () => {
    let queue = createBatchExportQueue([
      item('first', 'supported', 30),
      item('second', 'supported', 90),
    ]);
    queue = startNextBatchExportItem(queue);
    queue = failBatchExportItem(queue, 'first', 'decoder');

    expect(queue[0]).toMatchObject({ status: 'error', error: 'decoder', completed: 30 });
    expect(queue[1]).toMatchObject({ status: 'queued', completed: 0 });
    expect(batchExportProgress(queue)).toBe(25);

    queue = startNextBatchExportItem(queue);
    expect(queue.map(({ status }) => status)).toEqual(['error', 'processing']);
  });

  it('summarises ready, export-error, and validation-skipped videos separately', () => {
    let queue = createBatchExportQueue([
      item('ready', 'supported'),
      item('failed', 'supported'),
      item('unsupported', 'error'),
    ]);
    queue = startNextBatchExportItem(queue);
    queue = completeBatchExportItem(queue, 'ready');
    queue = startNextBatchExportItem(queue);
    queue = failBatchExportItem(queue, 'failed', 'encoder');

    expect(batchExportSummary(queue)).toEqual({ ready: 1, error: 1, skipped: 1 });
    expect(batchExportProgress(queue)).toBe(100);
  });

  it('queues only failed exports for retry and keeps completed and skipped items unchanged', () => {
    let queue = createBatchExportQueue([
      item('ready', 'supported', 30),
      item('failed', 'supported', 90),
      item('unsupported', 'error'),
    ]);
    queue = startNextBatchExportItem(queue);
    queue = completeBatchExportItem(queue, 'ready');
    queue = startNextBatchExportItem(queue);
    queue = failBatchExportItem(queue, 'failed', 'decoder');

    expect(retryableBatchExportItems(queue).map(({ id }) => id)).toEqual(['failed']);

    const retry = retryFailedBatchExportItems(queue);
    expect(retry).toEqual([
      expect.objectContaining({ id: 'ready', status: 'ready', completed: 30 }),
      expect.objectContaining({ id: 'failed', status: 'queued', completed: 0, error: undefined }),
      expect.objectContaining({ id: 'unsupported', status: 'skipped', error: 'videoCodec' }),
    ]);
    expect(batchExportProgress(retry.filter(({ id }) => id === 'failed'))).toBe(0);
  });

  it('keeps an exact repeated failure retryable', () => {
    let queue = createBatchExportQueue([item('failed', 'supported')]);
    queue = startNextBatchExportItem(queue);
    queue = failBatchExportItem(queue, 'failed', 'encoder');
    queue = retryFailedBatchExportItems(queue);
    queue = startNextBatchExportItem(queue);
    queue = failBatchExportItem(queue, 'failed', 'storage');

    expect(queue[0]).toMatchObject({ status: 'error', error: 'storage' });
    expect(retryableBatchExportItems(queue).map(({ id }) => id)).toEqual(['failed']);
  });

  it('keeps ZIP delivery when only one of multiple processable videos succeeds', () => {
    expect(batchExportDownloadKind(1, 1)).toBe('mp4');
    expect(batchExportDownloadKind(2, 1)).toBe('zip');
    expect(batchExportDownloadKind(3, 2)).toBe('zip');
    expect(batchExportDownloadKind(2, 0)).toBe('none');
  });

  it('allows at most one processing video and advances only after completion', () => {
    let queue = createBatchExportQueue([item('first', 'supported'), item('second', 'supported')]);
    queue = startNextBatchExportItem(queue);
    queue = startNextBatchExportItem(queue);

    expect(queue.map(({ status }) => status)).toEqual(['processing', 'queued']);

    queue = completeBatchExportItem(queue, 'first');
    queue = startNextBatchExportItem(queue);
    expect(queue.map(({ status }) => status)).toEqual(['ready', 'processing']);
  });

  it('clamps active progress to its full duration and weights overall progress by duration', () => {
    let queue = createBatchExportQueue([
      item('short', 'supported', 30),
      item('long', 'supported', 90),
    ]);
    queue = startNextBatchExportItem(queue);
    queue = updateBatchExportProgress(queue, 'short', 60);

    expect(queue[0].completed).toBe(30);
    expect(batchExportProgress(queue)).toBe(25);

    queue = completeBatchExportItem(queue, 'short');
    queue = startNextBatchExportItem(queue);
    queue = updateBatchExportProgress(queue, 'long', 45);
    expect(batchExportProgress(queue)).toBe(63);
  });

  it('uses the shared preset, a full-duration trim, and the resolved Video Override', () => {
    const [exportItem] = processableBatchExportItems(createBatchExportQueue([item('video', 'supported', 120)]));
    const logoFile = new File([], 'logo.png');
    const logo = resolveBatchExportLogoSource(
      exportItem,
      logoFile,
      { width: 400, height: 200 },
      { ...DEFAULT_LOGO_SETTINGS, size: 0.2, opacity: 0.8 },
      { video: { opacity: 0.35 } },
    );
    const output = { kind: 'file', name: 'temporary.mp4' } as FileSystemFileHandle;
    const request = createBatchExportRequest(exportItem, 'high', logo, output);

    expect(request.preset).toBe('high');
    expect(request.trim).toEqual({ trimIn: 0, trimOut: 120 });
    expect(request.logo?.file).toBe(logoFile);
    expect(request.logo?.settings).toMatchObject({ size: 0.2, opacity: 0.35 });
    expect(request.output).toBe(output);
  });
});
