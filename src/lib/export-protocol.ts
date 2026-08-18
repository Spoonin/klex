export type ExportPreset = 'high' | 'standard' | 'light';

export type ExportRequest = {
  type: 'export';
  file: File;
  preset: ExportPreset;
};

export type WorkerMessage =
  | { type: 'progress'; completed: number; total: number }
  | { type: 'complete'; file: ArrayBuffer }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };
