import { describe, expect, it } from 'vitest';
import {
  appendVideoBatch,
  rejectVideoBatchItem,
  removeVideoBatchItem,
  supportedVideoBatchItems,
  validateVideoBatchItem,
} from './video-batch';

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
});
