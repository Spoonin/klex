<script lang="ts">
  import { t, type MessageKey } from '../i18n';
  import type { VideoBatchItem } from '../video-batch';

  export let items: readonly VideoBatchItem[];
  export let onRemove: (id: string) => void;

  function detail(item: VideoBatchItem) {
    if (item.status === 'validating') return $t('logo.batchChecking');
    if (item.status === 'warning') return $t('error.audio');
    if (item.status === 'error' && item.error) {
      const key = item.error === 'durationLimit' ? 'error.logoVideoDuration' : `error.${item.error}`;
      return $t(key as MessageKey, { seconds: 120 });
    }
    if (!item.metadata) return '';
    return $t('logo.batchMetadata', {
      duration: formatDuration(item.metadata.duration),
      width: item.metadata.width,
      height: item.metadata.height,
    });
  }

  function statusLabel(item: VideoBatchItem) {
    return $t(`logo.batchStatus.${item.status}` as MessageKey);
  }

  function formatDuration(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
</script>

{#if items.length}
  <ol class="video-batch" aria-label={$t('logo.batchLabel')}>
    {#each items as item, index (item.id)}
      <li class:error={item.status === 'error'} class:warning={item.status === 'warning'}>
        <span class="batch-index">{index + 1}</span>
        <span class="batch-copy">
          <strong>{item.file.name}</strong>
          <small>{detail(item)}</small>
        </span>
        <span class={`batch-status ${item.status}`}><i></i>{statusLabel(item)}</span>
        <button type="button" aria-label={$t('logo.batchRemove', { name: item.file.name })} onclick={() => onRemove(item.id)}>×</button>
      </li>
    {/each}
  </ol>
{/if}
