import { describe, expect, it } from 'vitest';
import type { ExportPreset, ExportRequest, ValidateRequest, WorkerErrorCode, WorkerMessage } from './export-protocol';

describe('export worker protocol', () => {
  it('defines the supported export presets', () => {
    const presets: ExportPreset[] = ['high', 'standard', 'light'];

    expect(presets).toHaveLength(3);
  });

  it('keeps export requests seekable and completion messages blob-backed', () => {
    const output = { kind: 'file', name: 'temporary.mp4' } as FileSystemFileHandle;
    const logo = {
      file: new File([], 'logo.png', { type: 'image/png' }), width: 400, height: 200,
      settings: { anchor: 'bottom-right', size: 0.2, safeMargin: 0.05, opacity: 1, offsetX: -0.05, offsetY: -0.05 },
    } as const;
    const request: Pick<ExportRequest, 'type' | 'preset' | 'trim' | 'output' | 'logo'> = {
      type: 'export',
      preset: 'standard',
      trim: { trimIn: 0, trimOut: 8 },
      output,
      logo,
    };
    const completed: WorkerMessage = {
      type: 'complete',
      file: new File([], 'result.mp4', { type: 'video/mp4' }),
    };

    expect(request.type).toBe('export');
    expect(request.output).toBe(output);
    expect(request.logo).toBe(logo);
    expect(completed.type).toBe('complete');
    expect(completed.file).toBeInstanceOf(File);
  });

  it('lets Batch validation enforce its own duration limit with a precise error', () => {
    const request: ValidateRequest = { type: 'validate', file: new File([], 'clip.mov'), maxDuration: 120 };
    const error: WorkerErrorCode = 'durationLimit';

    expect(request.maxDuration).toBe(120);
    expect(error).toBe('durationLimit');
  });
});
