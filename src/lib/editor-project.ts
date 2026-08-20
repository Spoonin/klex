import { DEFAULT_LAYER, type LayerStyle } from './layer';
import { clampTrimWindow, defaultTrimWindow, MIN_TRIM_DURATION, type TrimWindow } from './trim';

export const MIN_LAYER_DURATION = 0.5;

export type ProjectLayer = LayerStyle & {
  id: string;
  kind: 'text';
};

export type EditorProject = {
  duration: number;
  trim: TrimWindow;
  playhead: number;
  layers: ProjectLayer[];
  activeLayerId: string;
};

export type EditorProjectAction =
  | { type: 'source-loaded'; duration: number }
  | { type: 'seeked'; time: number }
  | { type: 'trim-updated'; patch: Partial<TrimWindow> }
  | { type: 'layer-added'; id: string; text?: string }
  | { type: 'layer-selected'; id: string }
  | { type: 'layer-updated'; patch: Partial<LayerStyle> }
  | { type: 'layer-removed'; id?: string };

export function createEditorProject(firstLayerId: string): EditorProject {
  return {
    duration: 0,
    trim: { trimIn: 0, trimOut: 0 },
    playhead: 0,
    layers: [{ ...DEFAULT_LAYER, id: firstLayerId, kind: 'text', endTime: 8 }],
    activeLayerId: firstLayerId,
  };
}

/** The single mutation seam for editor invariants. */
export function updateEditorProject(project: EditorProject, action: EditorProjectAction): EditorProject {
  switch (action.type) {
    case 'source-loaded': {
      const duration = Math.max(0, action.duration);
      const trim = defaultTrimWindow(duration);
      const layers = project.layers.map((layer) => normaliseLayer(layer, trim));
      const active = layers.find((layer) => layer.id === project.activeLayerId) ?? layers[0];
      const previewTime = active ? Math.min(trim.trimOut, active.startTime + 0.5) : trim.trimIn;
      return { ...project, duration, trim, layers, playhead: previewTime };
    }
    case 'seeked':
      return { ...project, playhead: clamp(action.time, project.trim.trimIn, project.trim.trimOut) };
    case 'trim-updated': {
      const trim = normaliseTrim({ ...project.trim, ...action.patch }, project.duration, action.patch);
      return {
        ...project,
        trim,
        playhead: clamp(project.playhead, trim.trimIn, trim.trimOut),
        layers: project.layers.map((layer) => normaliseLayer(layer, trim)),
      };
    }
    case 'layer-added': {
      const latestStart = Math.max(project.trim.trimIn, project.trim.trimOut - MIN_LAYER_DURATION);
      const startTime = Math.min(project.playhead, latestStart);
      const layer = normaliseLayer({
        ...DEFAULT_LAYER,
        id: action.id,
        kind: 'text',
        text: action.text ?? 'klex',
        y: Math.min(0.86, 0.22 + project.layers.length * 0.14),
        startTime,
        endTime: Math.min(project.trim.trimOut, startTime + 4),
      }, project.trim);
      return {
        ...project,
        layers: [...project.layers, layer],
        activeLayerId: layer.id,
        playhead: Math.min(layer.endTime, layer.startTime + 0.5),
      };
    }
    case 'layer-selected':
      return project.layers.some((layer) => layer.id === action.id)
        ? { ...project, activeLayerId: action.id }
        : project;
    case 'layer-updated': {
      const layers = project.layers.map((layer) => layer.id === project.activeLayerId
        ? normaliseLayer({ ...layer, ...action.patch }, project.trim, action.patch)
        : layer);
      const active = layers.find((layer) => layer.id === project.activeLayerId) ?? layers[0];
      const playhead = action.patch.startTime !== undefined
        ? active?.startTime ?? project.playhead
        : action.patch.endTime !== undefined
          ? active?.endTime ?? project.playhead
          : project.playhead;
      return {
        ...project,
        layers,
        playhead,
      };
    }
    case 'layer-removed': {
      if (project.layers.length <= 1) return project;
      const removedId = action.id ?? project.activeLayerId;
      const index = project.layers.findIndex((layer) => layer.id === removedId);
      if (index < 0) return project;
      const layers = project.layers.filter((layer) => layer.id !== removedId);
      const activeLayerId = removedId === project.activeLayerId
        ? layers[Math.max(0, index - 1)]?.id ?? layers[0].id
        : project.activeLayerId;
      return { ...project, layers, activeLayerId };
    }
  }
}

export function getActiveLayer(project: EditorProject): ProjectLayer | undefined {
  return project.layers.find((layer) => layer.id === project.activeLayerId) ?? project.layers[0];
}

export function canExportProject(project: EditorProject): boolean {
  return project.duration > 0
    && project.trim.trimOut > project.trim.trimIn
    && project.layers.some((layer) => layer.text.trim() && layer.endTime > layer.startTime);
}

function normaliseLayer<T extends ProjectLayer>(layer: T, trim: TrimWindow, patch?: Partial<LayerStyle>): T {
  let startTime = clamp(layer.startTime, trim.trimIn, trim.trimOut);
  let endTime = clamp(Number.isFinite(layer.endTime) ? layer.endTime : trim.trimOut, trim.trimIn, trim.trimOut);
  if (patch?.startTime !== undefined && patch.endTime === undefined) {
    if (endTime < startTime + MIN_LAYER_DURATION) {
      endTime = Math.min(trim.trimOut, startTime + MIN_LAYER_DURATION);
      startTime = Math.max(trim.trimIn, endTime - MIN_LAYER_DURATION);
    }
    return { ...layer, startTime, endTime };
  }
  if (patch?.endTime !== undefined && patch.startTime === undefined) {
    if (endTime < startTime + MIN_LAYER_DURATION) {
      startTime = Math.max(trim.trimIn, endTime - MIN_LAYER_DURATION);
      endTime = Math.min(trim.trimOut, startTime + MIN_LAYER_DURATION);
    }
    return { ...layer, startTime, endTime };
  }
  if (endTime < startTime + MIN_LAYER_DURATION) {
    endTime = Math.min(trim.trimOut, startTime + MIN_LAYER_DURATION);
    if (endTime < startTime + MIN_LAYER_DURATION) startTime = Math.max(trim.trimIn, endTime - MIN_LAYER_DURATION);
  }
  return { ...layer, startTime, endTime };
}

function normaliseTrim(window: TrimWindow, duration: number, patch: Partial<TrimWindow>): TrimWindow {
  let trim = clampTrimWindow(window, duration);
  if (trim.trimOut >= trim.trimIn + MIN_TRIM_DURATION) return trim;
  if (patch.trimIn !== undefined) {
    trim = { trimIn: Math.max(0, trim.trimOut - MIN_TRIM_DURATION), trimOut: trim.trimOut };
  } else {
    trim = { trimIn: trim.trimIn, trimOut: Math.min(duration, trim.trimIn + MIN_TRIM_DURATION) };
  }
  return trim;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
