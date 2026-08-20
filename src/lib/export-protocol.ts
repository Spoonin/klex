export type ExportPreset = 'high' | 'standard' | 'light';

export type ExportRequest = {
  type: 'export';
  file: File;
  preset: ExportPreset;
  layers: import('./layer').LayerStyle[];
  trim: import('./trim').TrimWindow;
};

export type ValidateRequest = { type: 'validate'; file: File };

export type SourceMetadata = {
  duration: number;
  width: number;
  height: number;
  audioWarning: string | null;
};

export type WorkerMessage =
  | { type: 'validated'; metadata: SourceMetadata }
  | { type: 'progress'; completed: number; total: number }
  | { type: 'complete'; file: ArrayBuffer }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };
