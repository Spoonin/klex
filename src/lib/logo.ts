export const MAX_LOGO_BYTES = 20 * 1024 * 1024;
export const MAX_LOGO_SIDE = 4096;

export type LogoAnchor = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

export type LogoSettings = {
  anchor: LogoAnchor;
  size: number;
  safeMargin: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
};

export type LogoSource = {
  file: File;
  width: number;
  height: number;
  settings: LogoSettings;
};

export type LogoValidationCode = 'logoType' | 'logoSize' | 'logoDimensions' | 'logoDecode';

export const DEFAULT_LOGO_SETTINGS: Readonly<LogoSettings> = {
  anchor: 'bottom-right',
  size: 0.2,
  safeMargin: 0.05,
  opacity: 1,
  offsetX: 0,
  offsetY: 0,
};

type DecodedImage = { width: number; height: number; close(): void };
type ImageDecoder = (file: File) => Promise<DecodedImage>;

export class LogoValidationError extends Error {
  constructor(readonly code: LogoValidationCode) {
    super(code);
  }
}

/** Validates the encoded format first, then the decoded pixel dimensions. */
export async function validateLogoFile(
  file: File,
  decode: ImageDecoder = (value) => createImageBitmap(value),
) {
  if (file.size > MAX_LOGO_BYTES) throw new LogoValidationError('logoSize');
  if (!isSupportedLogo(await file.slice(0, 12).arrayBuffer())) throw new LogoValidationError('logoType');

  let image: DecodedImage;
  try {
    image = await decode(file);
  } catch {
    throw new LogoValidationError('logoDecode');
  }
  try {
    if (!image.width || !image.height) throw new LogoValidationError('logoDecode');
    if (image.width > MAX_LOGO_SIDE || image.height > MAX_LOGO_SIDE) {
      throw new LogoValidationError('logoDimensions');
    }
    return { width: image.width, height: image.height };
  } finally {
    image.close();
  }
}

export function isLogoVideoDurationSupported(duration: number, limit: number) {
  return Number.isFinite(duration) && duration > 0 && duration <= limit;
}

/** Returns frame-normalised geometry shared by DOM preview and WebGL export. */
export function logoPlacement(
  image: Pick<LogoSource, 'width' | 'height'>,
  frame: { width: number; height: number },
  settings: LogoSettings = DEFAULT_LOGO_SETTINGS,
) {
  const shortSide = Math.min(frame.width, frame.height);
  const imageLongSide = Math.max(image.width, image.height);
  const scale = shortSide * settings.size / imageLongSide;
  const width = image.width * scale / frame.width;
  const height = image.height * scale / frame.height;
  const marginX = shortSide * settings.safeMargin / frame.width;
  const marginY = shortSide * settings.safeMargin / frame.height;
  const offsetX = shortSide * settings.offsetX / frame.width;
  const offsetY = shortSide * settings.offsetY / frame.height;

  const horizontal = settings.anchor.endsWith('left')
    ? marginX
    : settings.anchor.endsWith('right')
      ? 1 - marginX - width
      : (1 - width) / 2;
  const vertical = settings.anchor.startsWith('top')
    ? marginY
    : settings.anchor.startsWith('bottom')
      ? 1 - marginY - height
      : (1 - height) / 2;

  return { left: horizontal + offsetX, top: vertical + offsetY, width, height };
}

function isSupportedLogo(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const png = bytes.length >= 8
    && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12
    && ascii(bytes, 0, 'RIFF')
    && ascii(bytes, 8, 'WEBP');
  return png || jpeg || webp;
}

function ascii(bytes: Uint8Array, offset: number, expected: string) {
  return [...expected].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}
