import type { MessageKey } from './i18n';

export type Workflow = 'text' | 'logo';
export type WorkflowStep = 1 | 2 | 3;

const stepsByWorkflow: Record<Workflow, readonly [MessageKey, MessageKey, MessageKey]> = {
  text: ['steps.video', 'steps.overlays', 'steps.export'],
  logo: ['steps.files', 'steps.position', 'steps.export'],
};

export function getWorkflowSteps(workflow: Workflow) {
  return stepsByWorkflow[workflow];
}

export function needsDiscardConfirmation(workflow: Workflow | null, hasWork: boolean) {
  return workflow !== null && hasWork;
}
