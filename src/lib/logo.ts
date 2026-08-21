export const MAX_LOGO_BYTES = 20 * 1024 * 1024;
export const MAX_LOGO_SIDE = 4096;
export const MIN_LOGO_SIZE = 0.05;
export const MAX_SAFE_MARGIN = 0.25;
export const MIN_LOGO_OPACITY = 0.05;

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
  offsetX: -0.05,
  offsetY: -0.05,
};

type Size = { width: number; height: number };
type OffsetBounds = { minX: number; maxX: number; minY: number; maxY: number };
type Position = { left: number; top: number };
type SnapDistance = { x: number; y: number };

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

/** Returns the offset that places a Logo against the Safe Margin at an Anchor. */
export function canonicalLogoOffset(anchor: LogoAnchor, safeMargin: number) {
  return {
    offsetX: anchor.endsWith('left') ? safeMargin : anchor.endsWith('right') ? -safeMargin : 0,
    offsetY: anchor.startsWith('top') ? safeMargin : anchor.startsWith('bottom') ? -safeMargin : 0,
  };
}

/** Returns valid Logo Offset ranges in fractions of the frame's shortest side. */
export function logoOffsetBounds(
  image: Size,
  frame: Size,
  settings: Pick<LogoSettings, 'anchor' | 'size' | 'safeMargin'>,
): OffsetBounds {
  const geometry = logoGeometry(image, frame, settings.size);
  const anchor = anchorPoint(settings.anchor, geometry.frameWidth, geometry.frameHeight);
  const reference = logoReference(settings.anchor);
  const margin = clamp(settings.safeMargin, 0, MAX_SAFE_MARGIN);

  return {
    minX: margin - anchor.x + reference.x * geometry.width,
    maxX: geometry.frameWidth - margin - anchor.x - (1 - reference.x) * geometry.width,
    minY: margin - anchor.y + reference.y * geometry.height,
    maxY: geometry.frameHeight - margin - anchor.y - (1 - reference.y) * geometry.height,
  };
}

/** Returns the largest Logo Size possible at the current Anchor and Logo Offset. */
export function maximumLogoSize(
  image: Size,
  frame: Size,
  settings: Pick<LogoSettings, 'anchor' | 'safeMargin' | 'offsetX' | 'offsetY'>,
) {
  const geometry = logoGeometry(image, frame, 1);
  const anchor = anchorPoint(settings.anchor, geometry.frameWidth, geometry.frameHeight);
  const reference = logoReference(settings.anchor);
  const margin = clamp(settings.safeMargin, 0, MAX_SAFE_MARGIN);
  const limits: number[] = [];

  if (reference.x > 0) limits.push((anchor.x + settings.offsetX - margin) / (reference.x * geometry.width));
  if (reference.x < 1) limits.push((geometry.frameWidth - margin - anchor.x - settings.offsetX) / ((1 - reference.x) * geometry.width));
  if (reference.y > 0) limits.push((anchor.y + settings.offsetY - margin) / (reference.y * geometry.height));
  if (reference.y < 1) limits.push((geometry.frameHeight - margin - anchor.y - settings.offsetY) / ((1 - reference.y) * geometry.height));

  return Math.max(MIN_LOGO_SIZE, Math.min(...limits));
}

/** Clamps persisted settings after any edit, video change or Logo replacement. */
export function fitLogoSettings(image: Size, frame: Size, settings: LogoSettings): LogoSettings {
  const safeMargin = clamp(settings.safeMargin, 0, MAX_SAFE_MARGIN);
  const opacity = clamp(settings.opacity, MIN_LOGO_OPACITY, 1);
  const absoluteMaximum = maximumLogoSize(image, frame, {
    anchor: 'center', safeMargin, offsetX: 0, offsetY: 0,
  });
  const size = clamp(settings.size, MIN_LOGO_SIZE, absoluteMaximum);
  const bounds = logoOffsetBounds(image, frame, { anchor: settings.anchor, size, safeMargin });

  return {
    anchor: settings.anchor,
    size,
    safeMargin,
    opacity,
    offsetX: clamp(settings.offsetX, bounds.minX, bounds.maxX),
    offsetY: clamp(settings.offsetY, bounds.minY, bounds.maxY),
  };
}

/** Returns the Safe Margin as frame-normalised insets for DOM preview. */
export function logoSafeArea(frame: Size, safeMargin: number) {
  const shortSide = Math.min(frame.width, frame.height);
  const margin = clamp(safeMargin, 0, MAX_SAFE_MARGIN);
  return {
    x: shortSide * margin / frame.width,
    y: shortSide * margin / frame.height,
  };
}

/** Returns frame-normalised geometry shared by DOM preview and WebGL export. */
export function logoPlacement(
  image: Pick<LogoSource, 'width' | 'height'>,
  frame: Size,
  settings: LogoSettings = DEFAULT_LOGO_SETTINGS,
) {
  const geometry = logoGeometry(image, frame, settings.size);
  const anchor = anchorPoint(settings.anchor, geometry.frameWidth, geometry.frameHeight);
  const reference = logoReference(settings.anchor);
  const left = anchor.x + settings.offsetX - reference.x * geometry.width;
  const top = anchor.y + settings.offsetY - reference.y * geometry.height;

  return {
    left: left / geometry.frameWidth,
    top: top / geometry.frameHeight,
    width: geometry.width / geometry.frameWidth,
    height: geometry.height / geometry.frameHeight,
  };
}

/**
 * Moves a Logo from its top-left frame-normalised position, constraining it to
 * the Safe Margin and snapping its edges/centre to the canonical guide lines.
 */
export function moveLogo(
  image: Pick<LogoSource, 'width' | 'height'>,
  frame: Size,
  settings: LogoSettings,
  position: Position,
  snapDistance: SnapDistance,
): LogoSettings {
  const placement = logoPlacement(image, frame, settings);
  const safeArea = logoSafeArea(frame, settings.safeMargin);
  const horizontalTargets = [safeArea.x, 0.5 - placement.width / 2, 1 - safeArea.x - placement.width];
  const verticalTargets = [safeArea.y, 0.5 - placement.height / 2, 1 - safeArea.y - placement.height];
  const left = clamp(
    snapped(position.left, horizontalTargets, snapDistance.x),
    safeArea.x,
    1 - safeArea.x - placement.width,
  );
  const top = clamp(
    snapped(position.top, verticalTargets, snapDistance.y),
    safeArea.y,
    1 - safeArea.y - placement.height,
  );

  return logoSettingsAtPosition(image, frame, settings, { left, top });
}

/** Re-expresses an unchanged visual position using its nearest Logo Anchor. */
export function logoSettingsAtPosition(
  image: Pick<LogoSource, 'width' | 'height'>,
  frame: Size,
  settings: LogoSettings,
  position: Position,
): LogoSettings {
  const geometry = logoGeometry(image, frame, settings.size);
  const left = position.left * geometry.frameWidth;
  const top = position.top * geometry.frameHeight;
  const anchors: LogoAnchor[] = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
  const candidates = anchors.map((anchor) => {
    const frameAnchor = anchorPoint(anchor, geometry.frameWidth, geometry.frameHeight);
    const reference = logoReference(anchor);
    const offsetX = left + reference.x * geometry.width - frameAnchor.x;
    const offsetY = top + reference.y * geometry.height - frameAnchor.y;
    return { anchor, offsetX, offsetY, distance: offsetX ** 2 + offsetY ** 2 };
  });
  const nearest = candidates.reduce((best, candidate) => candidate.distance < best.distance ? candidate : best);

  return {
    ...settings,
    anchor: nearest.anchor,
    offsetX: nearest.offsetX,
    offsetY: nearest.offsetY,
  };
}

function logoGeometry(image: Size, frame: Size, size: number) {
  const shortSide = Math.min(frame.width, frame.height);
  const longSide = Math.max(image.width, image.height);
  return {
    frameWidth: frame.width / shortSide,
    frameHeight: frame.height / shortSide,
    width: image.width / longSide * size,
    height: image.height / longSide * size,
  };
}

function anchorPoint(anchor: LogoAnchor, frameWidth: number, frameHeight: number) {
  return {
    x: anchor.endsWith('left') ? 0 : anchor.endsWith('right') ? frameWidth : frameWidth / 2,
    y: anchor.startsWith('top') ? 0 : anchor.startsWith('bottom') ? frameHeight : frameHeight / 2,
  };
}

function logoReference(anchor: LogoAnchor) {
  return {
    x: anchor.endsWith('left') ? 0 : anchor.endsWith('right') ? 1 : 0.5,
    y: anchor.startsWith('top') ? 0 : anchor.startsWith('bottom') ? 1 : 0.5,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function snapped(value: number, targets: number[], distance: number) {
  const nearest = targets.reduce((best, target) => (
    Math.abs(target - value) < Math.abs(best - value) ? target : best
  ));
  return Math.abs(nearest - value) <= Math.max(0, distance) ? nearest : value;
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
