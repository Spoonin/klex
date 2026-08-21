<script lang="ts">
  import { t } from '../i18n';
  import { getWorkflowSteps, type Workflow, type WorkflowStep } from '../workflow';

  export let workflow: Workflow;
  export let current: WorkflowStep;
  export let exportUnlocked: boolean;
  export let onNavigate: (step: WorkflowStep) => void;

  $: steps = getWorkflowSteps(workflow).map((label, index) => ({
    id: (index + 1) as WorkflowStep,
    label,
  }));
</script>

<nav class="steps" aria-label={$t('steps.label')}>
  {#each steps as step}
    {@const disabled = step.id === 2 ? current === 1 : step.id === 3 && !exportUnlocked}
    <button
      class:active={current === step.id}
      class:complete={current > step.id}
      {disabled}
      aria-current={current === step.id ? 'step' : undefined}
      onclick={() => onNavigate(step.id)}
    >
      <span>{current > step.id ? '✓' : step.id}</span>
      {$t(step.label)}
    </button>
  {/each}
</nav>
