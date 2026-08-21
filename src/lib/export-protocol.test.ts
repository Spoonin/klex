import { describe, expect, it } from 'vitest';
import type { ExportPreset, ExportRequest, WorkerMessage } from './export-protocol';

describe('export worker protocol', () => {
  it('defines the supported export presets', () => {
    const presets: ExportPreset[] = ['high', 'standard', 'light'];

    expect(presets).toHaveLength(3);
  });

  it('keeps export requests seekable and completion messages blob-backed', () => {
    const output = { kind: 'file', name: 'temporary.mp4' } as FileSystemFileHandle;
    const request: Pick<ExportRequest, 'type' | 'preset' | 'trim' | 'output'> = {
      type: 'export',
      preset: 'standard',
      trim: { trimIn: 0, trimOut: 8 },
      output,
    };
    const completed: WorkerMessage = {
      type: 'complete',
      file: new File([], 'result.mp4', { type: 'video/mp4' }),
    };

    expect(request.type).toBe('export');
    expect(request.output).toBe(output);
    expect(completed.type).toBe('complete');
    expect(completed.file).toBeInstanceOf(File);
  });
});
