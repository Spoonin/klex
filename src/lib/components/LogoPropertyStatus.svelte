<script lang="ts">
  import { t } from '../i18n';
  import type { LogoSettingKey } from '../video-batch';

  export let property: LogoSettingKey;
  export let label: string;
  export let overridden = false;
  export let fitted = false;
  export let onReset: (property: LogoSettingKey) => void;
</script>

{#if overridden || fitted}
  <span class="logo-property-status">
    {#if overridden}<em class="overridden">{$t('logo.overridden')}</em>{/if}
    {#if fitted}<em class="fitted">{$t('logo.fitted')}</em>{/if}
    {#if overridden}
      <button
        type="button"
        aria-label={$t('logo.resetProperty', { property: label })}
        title={$t('logo.resetProperty', { property: label })}
        onclick={() => onReset(property)}
      >↶</button>
    {/if}
  </span>
{/if}
