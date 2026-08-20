import { describe, expect, it } from 'vitest';
import type { ExportPreset, ExportRequest, WorkerMessage } from './export-protocol';

describe('export worker protocol', () => {
  it('defines the supported export presets', () => {
    const presets: ExportPreset[] = ['high', 'standard', 'light'];

    expect(presets).toHaveLength(3);
  });

  it('keeps export and completion messages transferable', () => {
    const request: Pick<ExportRequest, 'type' | 'preset' | 'trim'> = {
      type: 'export',
      preset: 'standard',
      trim: { trimIn: 0, trimOut: 8 },
    };
    const completed: WorkerMessage = {
      type: 'complete',
      file: new ArrayBuffer(0),
    };

    expect(request.type).toBe('export');
    expect(completed.type).toBe('complete');
  });
});
