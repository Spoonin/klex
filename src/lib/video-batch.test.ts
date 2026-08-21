import { describe, expect, it } from 'vitest';
import {
  appendVideoBatch,
  hasLogoBatchDefault,
  initialLogoBatchEditorTarget,
  fittedLogoSettingKeys,
  rejectVideoBatchItem,
  removeVideoBatchItem,
  resetVideoLogoOverride,
  resetVideoLogoOverrideProperty,
  resolveVideoLogoSettings,
  seekVideoBatchItem,
  supportedVideoBatchItems,
  validateVideoBatchItem,
  videoBatchPlayhead,
  updateVideoLogoOverride,
} from './video-batch';
import { DEFAULT_LOGO_SETTINGS } from './logo';

const metadata = { duration: 12, width: 1920, height: 1080, unsupportedAudio: false };

describe('video Batch', () => {
  it('preserves addition order across selections without imposing a limit', () => {
    let id = 0;
    const createId = () => String(++id);
    const first = Array.from({ length: 20 }, (_, index) => new File([], `${index}.mp4`));
    let batch = appendVideoBatch([], first, createId);
    batch = appendVideoBatch(batch, [new File([], 'later.mov')], createId);

    expect(batch.map(({ file }) => file.name)).toEqual([...first.map(({ name }) => name), 'later.mov']);
    expect(batch.every(({ status }) => status === 'validating')).toBe(true);
  });

  it('tracks every result independently and only continues with supported videos', () => {
    let id = 0;
    let batch = appendVideoBatch(
      [],
      [new File([], 'ok.mp4'), new File([], 'silent.mov'), new File([], 'broken.mp4')],
      () => String(++id),
    );
    batch = validateVideoBatchItem(batch, '2', { ...metadata, unsupportedAudio: true });
    batch = rejectVideoBatchItem(batch, '3', 'videoCodec');
    batch = validateVideoBatchItem(batch, '1', metadata);

    expect(batch.map(({ status }) => status)).toEqual(['supported', 'warning', 'error']);
    expect(supportedVideoBatchItems(batch).map(({ file }) => file.name)).toEqual(['ok.mp4', 'silent.mov']);
    expect(batch[2].error).toBe('videoCodec');
  });

  it('removes any item without changing the order of the rest', () => {
    let id = 0;
    const batch = appendVideoBatch(
      [],
      [new File([], 'one.mp4'), new File([], 'two.mp4'), new File([], 'three.mp4')],
      () => String(++id),
    );

    expect(removeVideoBatchItem(batch, '2').map(({ file }) => file.name)).toEqual(['one.mp4', 'three.mp4']);
  });

  it('opens two or more supported videos on Batch Default', () => {
    let id = 0;
    let batch = appendVideoBatch(
      [],
      [new File([], 'one.mp4'), new File([], 'broken.mp4'), new File([], 'two.mov')],
      () => String(++id),
    );
    batch = validateVideoBatchItem(batch, '1', metadata);
    batch = rejectVideoBatchItem(batch, '2', 'videoCodec');
    batch = validateVideoBatchItem(batch, '3', { ...metadata, unsupportedAudio: true });

    expect(hasLogoBatchDefault(batch)).toBe(true);
    expect(initialLogoBatchEditorTarget(batch)).toEqual({ type: 'batch-default' });
  });

  it('opens one supported video directly without creating Batch Default', () => {
    let batch = appendVideoBatch([], [new File([], 'only.mp4')], () => 'only');
    batch = validateVideoBatchItem(batch, 'only', metadata);

    expect(hasLogoBatchDefault(batch)).toBe(false);
    expect(initialLogoBatchEditorTarget(batch)).toEqual({ type: 'video', id: 'only' });
  });

  it('keeps an independent full-duration playhead for every video', () => {
    let playheads = seekVideoBatchItem({}, 'one', 9.25, 12);
    playheads = seekVideoBatchItem(playheads, 'two', 90, 60);

    expect(videoBatchPlayhead(playheads, 'one', 12)).toBe(9.25);
    expect(videoBatchPlayhead(playheads, 'two', 60)).toBe(60);
    expect(videoBatchPlayhead(playheads, 'unseen', 20)).toBe(0);
  });

  it('normalises invalid preview positions without changing other videos', () => {
    const playheads = seekVideoBatchItem({ one: 4 }, 'two', Number.NaN, 10);

    expect(playheads).toEqual({ one: 4, two: 0 });
    expect(videoBatchPlayhead({ one: -2 }, 'one', 10)).toBe(0);
  });

  it('inherits every Logo property except sparse Video Overrides', () => {
    const batchDefault = { ...DEFAULT_LOGO_SETTINGS, opacity: 0.8 };
    const overrides = updateVideoLogoOverride({}, 'one', batchDefault, { opacity: 0.45 });

    expect(overrides).toEqual({ one: { opacity: 0.45 } });
    expect(resolveVideoLogoSettings({ ...batchDefault, size: 0.3 }, overrides.one)).toEqual({
      ...batchDefault,
      size: 0.3,
      opacity: 0.45,
    });
  });

  it('updates only edited Video Override properties and resumes inheritance at the Batch Default', () => {
    const batchDefault = { ...DEFAULT_LOGO_SETTINGS };
    let overrides = updateVideoLogoOverride({}, 'one', batchDefault, { size: 0.3 });
    overrides = updateVideoLogoOverride(overrides, 'one', batchDefault, { opacity: 0.7 });
    overrides = updateVideoLogoOverride(overrides, 'one', batchDefault, { size: batchDefault.size });

    expect(overrides).toEqual({ one: { opacity: 0.7 } });
  });

  it('resets one property or the complete Video Override without touching another video', () => {
    const overrides = {
      one: { size: 0.3, opacity: 0.7 },
      two: { safeMargin: 0.1 },
    } as const;

    const onePropertyReset = resetVideoLogoOverrideProperty(overrides, 'one', 'size');
    expect(onePropertyReset).toEqual({ one: { opacity: 0.7 }, two: { safeMargin: 0.1 } });
    expect(resetVideoLogoOverride(onePropertyReset, 'one')).toEqual({ two: { safeMargin: 0.1 } });
  });

  it('reports Safe Margin fitting separately from persisted Video Overrides', () => {
    const raw = { ...DEFAULT_LOGO_SETTINGS, size: 0.9, offsetX: 0.4 };
    const fitted = { ...raw, size: 0.5, offsetX: 0.05 };

    expect(fittedLogoSettingKeys(raw, fitted)).toEqual(['offsetX', 'size']);
  });
});
