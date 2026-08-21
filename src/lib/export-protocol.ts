export type ExportPreset = 'high' | 'standard' | 'light';
export type WorkerErrorCode = 'webCodecs' | 'container' | 'noVideo' | 'videoCodec' | 'resolution' | 'duration' | 'durationLimit' | 'capabilities' | 'storage' | 'decoder' | 'encoder' | 'logoDecode' | 'generic';

export type ExportRequest = {
  type: 'export';
  file: File;
  preset: ExportPreset;
  layers: import('./layer').LayerStyle[];
  logo?: import('./logo').LogoSource;
  trim: import('./trim').TrimWindow;
  output: FileSystemFileHandle;
};

export type ValidateRequest = { type: 'validate'; file: File; maxDuration?: number };

export type SourceMetadata = {
  duration: number;
  width: number;
  height: number;
  unsupportedAudio: boolean;
};

export type WorkerMessage =
  | { type: 'validated'; metadata: SourceMetadata }
  | { type: 'progress'; completed: number; total: number }
  | { type: 'complete'; file: File }
  | { type: 'error'; code: WorkerErrorCode }
  | { type: 'cancelled' };
