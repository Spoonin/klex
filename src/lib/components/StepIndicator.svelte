<script lang="ts">
  import { t, type MessageKey } from '../i18n';

  export let current: 1 | 2 | 3;
  export let exportUnlocked: boolean;
  export let onNavigate: (step: 1 | 2 | 3) => void;

  const steps = [
    { id: 1 as const, label: 'steps.video' as MessageKey },
    { id: 2 as const, label: 'steps.overlays' as MessageKey },
    { id: 3 as const, label: 'steps.export' as MessageKey },
  ];
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
