import { describe, expect, it } from 'vitest';
import {
  batchExportProgress,
  completeBatchExportItem,
  createBatchExportRequest,
  createBatchExportQueue,
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
  it('keeps upload order and skips unsupported or unfinished videos', () => {
    const queue = createBatchExportQueue([
      item('first', 'supported'),
      item('unsupported', 'error'),
      item('checking', 'validating'),
      item('last', 'warning'),
    ]);

    expect(queue.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'first', status: 'queued' },
      { id: 'last', status: 'queued' },
    ]);
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
    const [exportItem] = createBatchExportQueue([item('video', 'supported', 120)]);
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
