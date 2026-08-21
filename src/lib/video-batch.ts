import type { SourceMetadata, WorkerErrorCode } from './export-protocol';
import type { LogoSettings } from './logo';

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

export type VideoBatchPlayheads = Readonly<Record<string, number>>;

export type LogoSettingKey = keyof LogoSettings;
export type LogoSettingsOverride = Partial<LogoSettings>;
export type VideoLogoOverrides = Readonly<Record<string, LogoSettingsOverride>>;

export const LOGO_SETTING_KEYS: readonly LogoSettingKey[] = [
  'anchor', 'offsetX', 'offsetY', 'size', 'safeMargin', 'opacity',
];

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

/** Each video keeps its own full-duration preview position while targets change. */
export function videoBatchPlayhead(
  playheads: VideoBatchPlayheads,
  id: string,
  duration: number,
) {
  return clamp(playheads[id] ?? 0, duration);
}

export function seekVideoBatchItem(
  playheads: VideoBatchPlayheads,
  id: string,
  time: number,
  duration: number,
): VideoBatchPlayheads {
  return { ...playheads, [id]: clamp(time, duration) };
}

/** Resolves one video's Logo settings without materialising inherited values. */
export function resolveVideoLogoSettings(
  batchDefault: LogoSettings,
  override: LogoSettingsOverride | undefined,
): LogoSettings {
  return { ...batchDefault, ...override };
}

/**
 * Records only explicitly edited properties. A value equal to the current
 * Batch Default resumes inheritance for that property.
 */
export function updateVideoLogoOverride(
  overrides: VideoLogoOverrides,
  id: string,
  batchDefault: LogoSettings,
  patch: LogoSettingsOverride,
): VideoLogoOverrides {
  const nextOverride: LogoSettingsOverride = { ...overrides[id] };

  for (const key of LOGO_SETTING_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    if (Object.is(value, batchDefault[key])) delete nextOverride[key];
    else assignLogoSetting(nextOverride, key, value);
  }

  const next = { ...overrides };
  if (Object.keys(nextOverride).length) next[id] = nextOverride;
  else delete next[id];
  return next;
}

export function resetVideoLogoOverrideProperty(
  overrides: VideoLogoOverrides,
  id: string,
  key: LogoSettingKey,
): VideoLogoOverrides {
  const current = overrides[id];
  if (!current || current[key] === undefined) return overrides;
  const nextOverride = { ...current };
  delete nextOverride[key];
  const next = { ...overrides };
  if (Object.keys(nextOverride).length) next[id] = nextOverride;
  else delete next[id];
  return next;
}

export function resetVideoLogoOverride(
  overrides: VideoLogoOverrides,
  id: string,
): VideoLogoOverrides {
  if (!overrides[id]) return overrides;
  const next = { ...overrides };
  delete next[id];
  return next;
}

/** Properties changed only by Safe Margin fitting, not by persistence. */
export function fittedLogoSettingKeys(raw: LogoSettings, fitted: LogoSettings): LogoSettingKey[] {
  return LOGO_SETTING_KEYS.filter((key) => !Object.is(raw[key], fitted[key]));
}

function assignLogoSetting<K extends LogoSettingKey>(
  settings: LogoSettingsOverride,
  key: K,
  value: LogoSettings[K],
) {
  settings[key] = value;
}

function clamp(time: number, duration: number) {
  if (!Number.isFinite(time)) return 0;
  return Math.min(Math.max(0, duration), Math.max(0, time));
}
