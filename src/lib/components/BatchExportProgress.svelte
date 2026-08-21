<script lang="ts">
  import { t } from '../i18n';
  import type { BatchExportItem } from '../batch-export';
  import type { MessageKey } from '../i18n';
  import { MAX_TRIM_DURATION } from '../trim';

  export let items: readonly BatchExportItem[];
  export let showSummary = false;

  function itemProgress(item: BatchExportItem) {
    return item.metadata ? Math.round(item.completed / item.metadata.duration * 100) : 0;
  }

  function itemErrorKey(item: BatchExportItem): MessageKey {
    return item.error === 'durationLimit' ? 'error.logoVideoDuration' : `error.${item.error ?? 'generic'}` as MessageKey;
  }

  $: summary = items.reduce((result, item) => {
    if (item.status === 'ready') result.ready += 1;
    else if (item.status === 'error') result.error += 1;
    else if (item.status === 'skipped') result.skipped += 1;
    return result;
  }, { ready: 0, error: 0, skipped: 0 });
</script>

<ol class="batch-export-progress" aria-label={$t('logo.exportQueue')}>
  {#each items as item, index (item.id)}
    <li class:processing={item.status === 'processing'} class:ready={item.status === 'ready'} class:error={item.status === 'error'} class:skipped={item.status === 'skipped'}>
      <span class="batch-index">{index + 1}</span>
      <span class="batch-export-copy">
        <strong>{item.file.name}</strong>
        <small>{$t(`logo.exportStatus.${item.status}`)}</small>
        {#if item.error}<span class="batch-export-error">{$t(itemErrorKey(item), { seconds: MAX_TRIM_DURATION })}</span>{/if}
      </span>
      {#if item.status === 'processing'}
        <output>{itemProgress(item)}%</output>
      {:else if item.status === 'ready'}
        <output aria-label={$t('logo.exportStatus.ready')}>✓</output>
      {:else if item.status === 'error'}
        <output aria-label={$t('logo.exportStatus.error')}>×</output>
      {:else if item.status === 'skipped'}
        <output aria-label={$t('logo.exportStatus.skipped')}>—</output>
      {/if}
    </li>
  {/each}
</ol>

{#if showSummary}
  <p class="batch-export-summary" role="status">
    {$t('logo.exportSummary', summary)}
  </p>
{/if}
