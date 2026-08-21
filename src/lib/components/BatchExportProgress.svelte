<script lang="ts">
  import { t } from '../i18n';
  import type { BatchExportItem } from '../batch-export';

  export let items: readonly BatchExportItem[];

  function itemProgress(item: BatchExportItem) {
    return Math.round(item.completed / item.metadata.duration * 100);
  }
</script>

<ol class="batch-export-progress" aria-label={$t('logo.exportQueue')}>
  {#each items as item, index (item.id)}
    <li class:processing={item.status === 'processing'} class:ready={item.status === 'ready'}>
      <span class="batch-index">{index + 1}</span>
      <span class="batch-export-copy">
        <strong>{item.file.name}</strong>
        <small>{$t(`logo.exportStatus.${item.status}`)}</small>
      </span>
      {#if item.status === 'processing'}
        <output>{itemProgress(item)}%</output>
      {:else if item.status === 'ready'}
        <output aria-label={$t('logo.exportStatus.ready')}>✓</output>
      {/if}
    </li>
  {/each}
</ol>
