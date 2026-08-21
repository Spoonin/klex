import { describe, expect, it } from 'vitest';
import { getWorkflowSteps, needsDiscardConfirmation } from './workflow';

describe('workflow', () => {
  it('defines an independent three-step path for each scenario', () => {
    expect(getWorkflowSteps('text')).toEqual(['steps.video', 'steps.overlays', 'steps.export']);
    expect(getWorkflowSteps('logo')).toEqual(['steps.files', 'steps.position', 'steps.export']);
  });

  it('only confirms leaving a scenario after work has started', () => {
    expect(needsDiscardConfirmation(null, true)).toBe(false);
    expect(needsDiscardConfirmation('text', false)).toBe(false);
    expect(needsDiscardConfirmation('text', true)).toBe(true);
    expect(needsDiscardConfirmation('logo', true)).toBe(true);
  });
});
