import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOGO_SETTINGS,
  LogoValidationError,
  MAX_LOGO_BYTES,
  isLogoVideoDurationSupported,
  logoPlacement,
  validateLogoFile,
} from './logo';

describe('Logo', () => {
  it.each([
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ['JPEG', [0xff, 0xd8, 0xff]],
    ['WebP', [...bytes('RIFF'), 0, 0, 0, 0, ...bytes('WEBP')]],
  ])('accepts a decoded %s within the limits', async (_format, signature) => {
    const close = vi.fn();
    const result = await validateLogoFile(file(signature), async () => ({ width: 1200, height: 800, close }));

    expect(result).toEqual({ width: 1200, height: 800 });
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects unsupported encoded formats with a concrete reason', async () => {
    await expect(validateLogoFile(file(bytes('GIF89a')), async () => ({ width: 1, height: 1, close() {} })))
      .rejects.toEqual(new LogoValidationError('logoType'));
  });

  it('rejects oversized files before decoding', async () => {
    const oversized = { size: MAX_LOGO_BYTES + 1 } as File;
    await expect(validateLogoFile(oversized)).rejects.toEqual(new LogoValidationError('logoSize'));
  });

  it('rejects decoded images over 4096 px and releases them', async () => {
    const close = vi.fn();
    await expect(validateLogoFile(file([0xff, 0xd8, 0xff]), async () => ({ width: 4097, height: 20, close })))
      .rejects.toEqual(new LogoValidationError('logoDimensions'));
    expect(close).toHaveBeenCalledOnce();
  });

  it('places the default Logo at 20% in the lower-right 5% Safe Margin', () => {
    const placement = logoPlacement(
      { width: 1000, height: 500 },
      { width: 1080, height: 1920 },
      DEFAULT_LOGO_SETTINGS,
    );

    expect(placement).toEqual({ left: 0.75, top: 0.915625, width: 0.2, height: 0.05625 });
  });

  it('accepts a full video only within the Logo duration limit', () => {
    expect(isLogoVideoDurationSupported(120, 120)).toBe(true);
    expect(isLogoVideoDurationSupported(120.001, 120)).toBe(false);
  });
});

function file(signature: number[]) {
  return new File([new Uint8Array(signature)], 'logo.bin');
}

function bytes(value: string) {
  return [...value].map((character) => character.charCodeAt(0));
}
