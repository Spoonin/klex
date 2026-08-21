<script lang="ts">
  import {
    MIN_LOGO_OPACITY,
    MIN_LOGO_SIZE,
    canonicalLogoOffset,
    logoOffsetBounds,
    maximumLogoSize,
    type LogoAnchor,
    type LogoSettings,
  } from '../logo';
  import { t, type MessageKey } from '../i18n';

  export let image: { width: number; height: number };
  export let frame: { width: number; height: number };
  export let settings: LogoSettings;
  export let onChange: (patch: Partial<LogoSettings>) => void;

  const anchors: { value: LogoAnchor; label: MessageKey }[] = [
    { value: 'top-left', label: 'logo.anchorTopLeft' },
    { value: 'top-right', label: 'logo.anchorTopRight' },
    { value: 'center', label: 'logo.anchorCenter' },
    { value: 'bottom-left', label: 'logo.anchorBottomLeft' },
    { value: 'bottom-right', label: 'logo.anchorBottomRight' },
  ];

  $: offsetBounds = logoOffsetBounds(image, frame, settings);
  $: sizeMaximum = maximumLogoSize(image, frame, settings);

  function selectAnchor(anchor: LogoAnchor) {
    onChange({ anchor, ...canonicalLogoOffset(anchor, settings.safeMargin) });
  }

  function updateNumber(key: 'size' | 'safeMargin' | 'opacity' | 'offsetX' | 'offsetY', event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value) / 100;
    if (Number.isFinite(value)) onChange({ [key]: value });
  }

  function percent(value: number) {
    return Number((value * 100).toFixed(1));
  }

  function label(value: number) {
    const exact = percent(value);
    return `${exact.toFixed(Number.isInteger(exact) ? 0 : 1)}%`;
  }
</script>

<section class="logo-inspector card">
  <div class="section-heading">
    <div><span class="kicker">{$t('logo.settings')}</span><h3>{$t('logo.positionAppearance')}</h3></div>
  </div>

  <fieldset class="logo-anchor-field">
    <legend>{$t('logo.anchor')}</legend>
    <div class="logo-anchor-grid">
      {#each anchors as anchor}
        <button
          type="button"
          class:active={settings.anchor === anchor.value}
          data-anchor={anchor.value}
          aria-label={$t(anchor.label)}
          aria-pressed={settings.anchor === anchor.value}
          onclick={() => selectAnchor(anchor.value)}
        ><span aria-hidden="true"></span></button>
      {/each}
    </div>
    <output>{$t(anchors.find((anchor) => anchor.value === settings.anchor)?.label ?? 'logo.anchorCenter')}</output>
  </fieldset>

  <div class="logo-control-grid">
    <label class="logo-range-field">
      <span><b>{$t('logo.offsetX')}</b><span class="logo-number"><input aria-label={$t('logo.offsetX')} type="number" min={percent(offsetBounds.minX)} max={percent(offsetBounds.maxX)} step="0.1" value={percent(settings.offsetX)} oninput={(event) => updateNumber('offsetX', event)} /><em>%</em></span></span>
      <input aria-label={$t('logo.offsetX')} type="range" min={percent(offsetBounds.minX)} max={percent(offsetBounds.maxX)} step="0.1" value={percent(settings.offsetX)} oninput={(event) => updateNumber('offsetX', event)} />
      <small>{label(offsetBounds.minX)}—{label(offsetBounds.maxX)}</small>
    </label>

    <label class="logo-range-field">
      <span><b>{$t('logo.offsetY')}</b><span class="logo-number"><input aria-label={$t('logo.offsetY')} type="number" min={percent(offsetBounds.minY)} max={percent(offsetBounds.maxY)} step="0.1" value={percent(settings.offsetY)} oninput={(event) => updateNumber('offsetY', event)} /><em>%</em></span></span>
      <input aria-label={$t('logo.offsetY')} type="range" min={percent(offsetBounds.minY)} max={percent(offsetBounds.maxY)} step="0.1" value={percent(settings.offsetY)} oninput={(event) => updateNumber('offsetY', event)} />
      <small>{label(offsetBounds.minY)}—{label(offsetBounds.maxY)}</small>
    </label>

    <label class="logo-range-field">
      <span><b>{$t('logo.size')}</b><span class="logo-number"><input aria-label={$t('logo.size')} type="number" min={percent(MIN_LOGO_SIZE)} max={percent(sizeMaximum)} step="0.1" value={percent(settings.size)} oninput={(event) => updateNumber('size', event)} /><em>%</em></span></span>
      <input aria-label={$t('logo.size')} type="range" min={percent(MIN_LOGO_SIZE)} max={percent(sizeMaximum)} step="0.1" value={percent(settings.size)} oninput={(event) => updateNumber('size', event)} />
      <small>{$t('logo.minimumMaximum', { min: label(MIN_LOGO_SIZE), max: label(sizeMaximum) })}</small>
    </label>

    <label class="logo-range-field">
      <span><b>{$t('logo.safeMargin')}</b><span class="logo-number"><input aria-label={$t('logo.safeMargin')} type="number" min="0" max="25" step="0.1" value={percent(settings.safeMargin)} oninput={(event) => updateNumber('safeMargin', event)} /><em>%</em></span></span>
      <input aria-label={$t('logo.safeMargin')} type="range" min="0" max="25" step="0.1" value={percent(settings.safeMargin)} oninput={(event) => updateNumber('safeMargin', event)} />
      <small>0%—25%</small>
    </label>

    <label class="logo-range-field">
      <span><b>{$t('logo.opacity')}</b><span class="logo-number"><input aria-label={$t('logo.opacity')} type="number" min={percent(MIN_LOGO_OPACITY)} max="100" step="1" value={percent(settings.opacity)} oninput={(event) => updateNumber('opacity', event)} /><em>%</em></span></span>
      <input aria-label={$t('logo.opacity')} type="range" min={percent(MIN_LOGO_OPACITY)} max="100" step="1" value={percent(settings.opacity)} oninput={(event) => updateNumber('opacity', event)} />
      <small>5%—100%</small>
    </label>
  </div>
</section>
