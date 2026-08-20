<script lang="ts">
  import type { ProjectLayer } from '../editor-project';
  import { t, type MessageKey } from '../i18n';
  import { TEXT_COLORS, type LayerStyle } from '../layer';

  export let layer: ProjectLayer;
  export let canRemove: boolean;
  export let onUpdate: (patch: Partial<LayerStyle>) => void;
  export let onRemove: () => void;

  const fonts = [
    { value: 'sans-serif' as const, label: 'font.sans' as MessageKey },
    { value: 'serif' as const, label: 'font.serif' as MessageKey },
    { value: 'monospace' as const, label: 'font.mono' as MessageKey },
  ];
</script>

<section class="inspector card">
  <div class="section-heading">
    <div><span class="kicker">{$t('inspector.content')}</span><h3>{$t('inspector.caption')}</h3></div>
    <button class="icon danger" onclick={onRemove} disabled={!canRemove} aria-label={$t('inspector.deleteLayer')}>{$t('inspector.delete')}</button>
  </div>

  <label class="field">
    <span>{$t('inspector.text')}</span>
    <textarea rows="2" value={layer.text} oninput={(event) => onUpdate({ text: event.currentTarget.value })}></textarea>
  </label>

  <div class="divider"></div>
  <div class="section-heading compact"><div><span class="kicker">{$t('inspector.appearance')}</span><h3>{$t('inspector.typography')}</h3></div></div>

  <div class="control-group">
    <span>{$t('inspector.typeface')}</span>
    <div class="segmented">
      {#each fonts as font}
        <button class:active={layer.fontFamily === font.value} onclick={() => onUpdate({ fontFamily: font.value })}>{$t(font.label)}</button>
      {/each}
    </div>
  </div>

  <label class="range-field"><span>{$t('inspector.size')} <output>{Math.round(layer.fontSizeFraction * 100)}%</output></span><input type="range" min="0.025" max="0.12" step="0.005" value={layer.fontSizeFraction} oninput={(event) => onUpdate({ fontSizeFraction: Number(event.currentTarget.value) })} /></label>

  <div class="control-group">
    <span>{$t('inspector.textColor')}</span>
    <div class="swatches">
      {#each TEXT_COLORS as color}
        <button class="swatch" class:active={layer.textColor === color} style={`--color:${color}`} aria-label={color} onclick={() => onUpdate({ textColor: color })}></button>
      {/each}
    </div>
  </div>

  <div class="option-row">
    <label class="switch"><input type="checkbox" checked={layer.plateOpacity > 0} onchange={(event) => onUpdate({ plateOpacity: event.currentTarget.checked ? 0.75 : 0 })} /><span></span>{$t('style.plate')}</label>
    <label class="switch"><input type="checkbox" checked={layer.strokeWidth !== 'none'} onchange={(event) => onUpdate({ strokeWidth: event.currentTarget.checked ? 'medium' : 'none' })} /><span></span>{$t('style.stroke')}</label>
    <label class="switch"><input type="checkbox" checked={layer.fadeIn} onchange={(event) => onUpdate({ fadeIn: event.currentTarget.checked })} /><span></span>{$t('style.fadeIn')}</label>
    <label class="switch"><input type="checkbox" checked={layer.fadeOut} onchange={(event) => onUpdate({ fadeOut: event.currentTarget.checked })} /><span></span>{$t('style.fadeOut')}</label>
  </div>

  <div class="control-group">
    <span>{$t('style.alignment')}</span>
    <div class="segmented compact-buttons">
      {#each ['left', 'center', 'right'] as alignment}
        <button class:active={layer.textAlign === alignment} aria-label={alignment} onclick={() => onUpdate({ textAlign: alignment as LayerStyle['textAlign'] })}>{alignment === 'left' ? '≡←' : alignment === 'right' ? '→≡' : '≡'}</button>
      {/each}
    </div>
  </div>
</section>
