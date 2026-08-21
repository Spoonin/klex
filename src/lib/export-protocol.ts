export type ExportPreset = 'high' | 'standard' | 'light';
export type WorkerErrorCode = 'webCodecs' | 'container' | 'noVideo' | 'videoCodec' | 'resolution' | 'duration' | 'durationLimit' | 'capabilities' | 'storage' | 'decoder' | 'encoder' | 'logoDecode' | 'generic';

export const EXPORT_VIDEO_BITRATES: Readonly<Record<ExportPreset, number>> = {
  high: 12_000_000,
  standard: 8_000_000,
  light: 4_000_000,
};

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
  /** Average bitrate of the AAC packets copied to the export, or zero when audio is omitted. */
  audioBitrate: number;
};

export type WorkerMessage =
  | { type: 'validated'; metadata: SourceMetadata }
  | { type: 'progress'; completed: number; total: number }
  | { type: 'complete'; file: File }
  | { type: 'error'; code: WorkerErrorCode }
  | { type: 'cancelled' };
