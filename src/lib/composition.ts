import { layerOpacity, type LayerStyle } from './layer';

export type CompositedLayer<T extends LayerStyle = LayerStyle> = {
  layer: T;
  opacity: number;
};

export type PreviewLayer<T extends LayerStyle = LayerStyle> = CompositedLayer<T> & {
  outsideTime: boolean;
};

/** Builds the complete overlay plan for one frame on the source timeline. */
export function compositionAt<T extends LayerStyle>(layers: readonly T[], sourceTime: number): CompositedLayer<T>[] {
  const result: CompositedLayer<T>[] = [];
  for (const layer of layers) {
    if (!layer.text.trim()) continue;
    const opacity = layerOpacity(layer, sourceTime);
    if (opacity > 0) result.push({ layer, opacity });
  }
  return result;
}

export function previewComposition<T extends LayerStyle & { id: string }>(
  layers: readonly T[],
  sourceTime: number,
  activeLayerId: string,
  playing: boolean,
): PreviewLayer<T>[] {
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0];
  const preview = compositionAt(layers, sourceTime).map((item) => ({ ...item, outsideTime: false }));
  if (playing || !activeLayer) return preview;

  const activePreview = preview.find((item) => item.layer.id === activeLayerId);
  if (activePreview) activePreview.opacity = 1;
  else preview.push({ layer: activeLayer, opacity: 1, outsideTime: true });
  return preview;
}

export function isPreviewLayerEditable(layerId: string, activeLayerId: string, playing: boolean) {
  return !playing && layerId === activeLayerId;
}
