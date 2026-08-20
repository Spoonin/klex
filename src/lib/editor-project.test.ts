import { describe, expect, it } from 'vitest';
import {
  canExportProject,
  createEditorProject,
  getActiveLayer,
  updateEditorProject,
} from './editor-project';

describe('editor project', () => {
  it('creates a visible Layer and keeps its timing on the source timeline', () => {
    let project = createEditorProject('layer-1');
    project = updateEditorProject(project, { type: 'source-loaded', duration: 30 });
    project = updateEditorProject(project, { type: 'trim-updated', patch: { trimIn: 10, trimOut: 20 } });
    project = updateEditorProject(project, { type: 'seeked', time: 12 });
    project = updateEditorProject(project, { type: 'layer-added', id: 'layer-2' });

    const layer = getActiveLayer(project);
    expect(layer?.startTime).toBe(12);
    expect(layer?.endTime).toBe(16);
  });

  it('normalises edited Layer boundaries and exposes export readiness', () => {
    let project = createEditorProject('layer-1');
    project = updateEditorProject(project, { type: 'source-loaded', duration: 20 });
    project = updateEditorProject(project, {
      type: 'layer-updated',
      patch: { text: 'Готово', startTime: 18, endTime: 4 },
    });

    const layer = getActiveLayer(project);
    expect(layer?.endTime).toBeGreaterThan(layer?.startTime ?? 0);
    expect(canExportProject(project)).toBe(true);
  });

  it('pushes the opposite timing boundary while preserving half a second', () => {
    let project = createEditorProject('layer-1');
    project = updateEditorProject(project, { type: 'source-loaded', duration: 20 });
    project = updateEditorProject(project, {
      type: 'layer-updated',
      patch: { startTime: 4, endTime: 8 },
    });

    project = updateEditorProject(project, { type: 'layer-updated', patch: { startTime: 12 } });
    expect(getActiveLayer(project)).toMatchObject({ startTime: 12, endTime: 12.5 });
    expect(project.playhead).toBe(12);

    project = updateEditorProject(project, { type: 'layer-updated', patch: { endTime: 2 } });
    expect(getActiveLayer(project)).toMatchObject({ startTime: 1.5, endTime: 2 });
    expect(project.playhead).toBe(2);

    project = updateEditorProject(project, { type: 'layer-updated', patch: { startTime: 19.9 } });
    expect(getActiveLayer(project)).toMatchObject({ startTime: 19.5, endTime: 20 });
    expect(project.playhead).toBe(19.5);

    project = updateEditorProject(project, { type: 'layer-updated', patch: { endTime: 0.1 } });
    expect(getActiveLayer(project)).toMatchObject({ startTime: 0, endTime: 0.5 });
    expect(project.playhead).toBe(0.5);
  });

  it('removes a selected chip without changing another active Layer', () => {
    let project = createEditorProject('layer-1');
    project = updateEditorProject(project, { type: 'source-loaded', duration: 20 });
    project = updateEditorProject(project, { type: 'layer-added', id: 'layer-2' });
    project = updateEditorProject(project, { type: 'layer-selected', id: 'layer-1' });
    project = updateEditorProject(project, { type: 'layer-removed', id: 'layer-2' });

    expect(project.layers.map((layer) => layer.id)).toEqual(['layer-1']);
    expect(project.activeLayerId).toBe('layer-1');
  });
});
