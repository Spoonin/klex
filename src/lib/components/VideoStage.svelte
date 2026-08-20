<script lang="ts">
  import { onMount } from 'svelte';
  import { CAPTION_TOOLS_OFFSET, captionDragPosition, captionEditorWidth, captionToolsPlacement } from '../caption-layout';
  import { isPreviewLayerEditable, previewComposition, type PreviewLayer } from '../composition';
  import type { ProjectLayer } from '../editor-project';
  import { t, type MessageKey } from '../i18n';
  import { TEXT_COLORS, type LayerColor, type LayerStyle } from '../layer';
  import { MAX_TRIM_DURATION, moveTrimBoundary, type TrimWindow } from '../trim';

  export let sourceUrl: string;
  export let duration: number;
  export let layers: ProjectLayer[];
  export let activeLayerId: string;
  export let playhead: number;
  export let trim: TrimWindow;
  export let onSeek: (time: number) => void;
  export let onReady: () => void;
  export let onSelectLayer: (id: string) => void;
  export let onMoveLayer: (id: string, patch: Pick<LayerStyle, 'x' | 'y'>) => void;
  export let onUpdateLayer: (patch: Partial<LayerStyle>) => void;
  export let onConfirmTrim: (trim: TrimWindow) => void;
  export let forceTrim = false;

  type ColorTarget = 'textColor' | 'plateColor' | 'strokeColor';
  const colorTargets: Array<{ key: ColorTarget; label: MessageKey }> = [
    { key: 'textColor', label: 'style.text' },
    { key: 'plateColor', label: 'style.plate' },
    { key: 'strokeColor', label: 'style.stroke' },
  ];

  let stage: HTMLElement;
  let video: HTMLVideoElement;
  let activeCaption: HTMLElement;
  let activeEditor: HTMLTextAreaElement;
  let styleMenu: HTMLElement;
  let styleMenuTrigger: HTMLButtonElement;
  let captionLayoutFrame = 0;
  let draggingCaption = false;
  let playing = false;
  let trimMode = false;
  let draftTrim: TrimWindow = trim;
  let trimPreviewTime = playhead;
  let styleMenuOpen = false;
  let colorPickerOpen = false;
  let menuLayerId = activeLayerId;
  let colorTarget: ColorTarget = 'textColor';
  let visibleLayers: PreviewLayer<ProjectLayer>[] = [];
  $: activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0];
  $: previewTime = trimMode ? trimPreviewTime : playhead;
  $: visibleLayers = previewComposition(layers, previewTime, activeLayerId, playing);
  $: trimDuration = trim.trimOut - trim.trimIn;
  $: layerStart = trimDuration ? (activeLayer.startTime - trim.trimIn) / trimDuration * 100 : 0;
  $: layerWidth = trimDuration ? (activeLayer.endTime - activeLayer.startTime) / trimDuration * 100 : 0;
  $: draftDuration = draftTrim.trimOut - draftTrim.trimIn;
  $: draftStart = duration ? draftTrim.trimIn / duration * 100 : 0;
  $: draftWidth = duration ? draftDuration / duration * 100 : 0;
  $: if (forceTrim && !trimMode) beginTrim();
  $: if (menuLayerId !== activeLayerId) { menuLayerId = activeLayerId; styleMenuOpen = false; colorPickerOpen = false; }
  $: if (video && !trimMode && Math.abs(video.currentTime - playhead) > 0.08) video.currentTime = playhead;
  $: captionLayoutKey = activeLayer
    ? `${activeLayer.id}:${activeLayer.text}:${activeLayer.fontFamily}:${activeLayer.fontSizeFraction}:${activeLayer.x}`
    : '';
  $: if (activeCaption && activeEditor && captionLayoutKey) scheduleCaptionLayout();

  async function togglePlayback() {
    if (trimMode) return;
    if (video.paused) {
      if (video.currentTime >= trim.trimOut - 0.05) seek(trim.trimIn);
      styleMenuOpen = false;
      colorPickerOpen = false;
      playing = true;
      await video.play();
    } else {
      video.pause();
      playing = false;
    }
  }

  function syncTime() {
    if (trimMode) {
      trimPreviewTime = video.currentTime;
      return;
    }
    if (video.currentTime >= trim.trimOut) {
      video.pause();
      playing = false;
      seek(trim.trimOut);
      return;
    }
    onSeek(video.currentTime);
  }

  function seek(time: number) {
    const next = Math.min(trim.trimOut, Math.max(trim.trimIn, time));
    video.currentTime = next;
    onSeek(next);
  }

  function updateStart(time: number) {
    onUpdateLayer({ startTime: time });
  }

  function updateStop(time: number) {
    onUpdateLayer({ endTime: time });
  }

  function beginTrim() {
    video?.pause();
    playing = false;
    draftTrim = { ...trim };
    trimPreviewTime = draftTrim.trimIn;
    trimMode = true;
    if (video) video.currentTime = trimPreviewTime;
  }

  function cancelTrim() {
    if (forceTrim) return;
    trimMode = false;
    seek(playhead);
  }

  function updateTrim(boundary: keyof TrimWindow, value: number) {
    draftTrim = moveTrimBoundary(draftTrim, boundary, value, duration);
    trimPreviewTime = boundary === 'trimIn' ? draftTrim.trimIn : draftTrim.trimOut;
    if (video) video.currentTime = trimPreviewTime;
  }

  function confirmTrim() {
    onConfirmTrim(draftTrim);
    trimMode = false;
  }

  function relativeTime(value: number) {
    return Math.max(0, value - trim.trimIn);
  }

  function startDrag(event: PointerEvent, layer: ProjectLayer, dragBox?: HTMLElement) {
    event.stopPropagation();
    onSelectLayer(layer.id);
    const target = event.currentTarget as HTMLElement;
    const measuredBox = dragBox ?? target;
    const initialBox = measuredBox.getBoundingClientRect();
    const grabOffset = {
      x: event.clientX - (initialBox.left + initialBox.width / 2),
      y: event.clientY - (initialBox.top + initialBox.height / 2),
    };
    draggingCaption = true;
    cancelAnimationFrame(captionLayoutFrame);
    target.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      const xInset = Math.min(0.45, measuredBox.offsetWidth / 2 / bounds.width + 0.02);
      const yInset = Math.min(0.45, measuredBox.offsetHeight / 2 / bounds.height + 0.02);
      onMoveLayer(layer.id, captionDragPosition(
        { x: moveEvent.clientX, y: moveEvent.clientY },
        grabOffset,
        { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
        { x: xInset, y: yInset },
      ));
    };
    const end = () => {
      draggingCaption = false;
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      scheduleCaptionLayout();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  function updateText(event: Event) {
    const textarea = event.currentTarget as HTMLTextAreaElement;
    onUpdateLayer({ text: textarea.value });
  }

  function scheduleCaptionLayout() {
    if (draggingCaption) return;
    cancelAnimationFrame(captionLayoutFrame);
    captionLayoutFrame = requestAnimationFrame(() => {
      fitCaptionEditor(activeEditor);
      keepCaptionToolsVisible(activeCaption);
    });
  }

  function observeStage(node: HTMLElement) {
    const observer = new ResizeObserver(scheduleCaptionLayout);
    observer.observe(node);
    void document.fonts.ready.then(scheduleCaptionLayout);
    return {
      destroy() {
        cancelAnimationFrame(captionLayoutFrame);
        observer.disconnect();
      },
    };
  }

  function fitCaptionEditor(node: HTMLTextAreaElement) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const style = getComputedStyle(node);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const textWidth = Math.max(0, ...node.value.split(/\r?\n/).map((line) => context.measureText(line).width));
    const minimumTextWidth = context.measureText('000000').width;
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    node.style.width = `${captionEditorWidth(textWidth, minimumTextWidth, stage.clientWidth, horizontalPadding)}px`;
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }

  function keepCaptionToolsVisible(node: HTMLElement) {
    const bounds = stage.getBoundingClientRect();
    const caption = node.getBoundingClientRect();
    const placement = captionToolsPlacement(caption.left - bounds.left, bounds.right - caption.right);
    node.classList.toggle('tools-left', placement.side === 'left');
    node.style.setProperty('--tools-offset', `${Math.min(CAPTION_TOOLS_OFFSET, placement.offset)}px`);
  }

  function setColor(color: LayerColor) {
    onUpdateLayer({ [colorTarget]: color });
    colorPickerOpen = false;
  }

  function toggleColorPicker(target: ColorTarget) {
    colorPickerOpen = colorTarget !== target || !colorPickerOpen;
    colorTarget = target;
  }

  function toggleStyleMenu() {
    styleMenuOpen = !styleMenuOpen;
    if (!styleMenuOpen) colorPickerOpen = false;
  }

  function handleStyleMenuPointer(event: PointerEvent) {
    event.stopPropagation();
    if (event.target instanceof Element && !event.target.closest('.color-indicator, .canvas-color-dropdown')) colorPickerOpen = false;
  }

  function closeStyleMenuOnOutsidePointer(event: PointerEvent) {
    if (!styleMenuOpen || !(event.target instanceof Node)) return;
    if (styleMenu?.contains(event.target) || styleMenuTrigger?.contains(event.target)) return;
    styleMenuOpen = false;
    colorPickerOpen = false;
  }

  onMount(() => {
    window.addEventListener('pointerdown', closeStyleMenuOnOutsidePointer, { capture: true });
    return () => window.removeEventListener('pointerdown', closeStyleMenuOnOutsidePointer, { capture: true });
  });
</script>

<section class="preview-panel" class:trimming={trimMode} class:trim-required={forceTrim} aria-label={$t('stage.preview')}>
  <div class="stage" bind:this={stage} use:observeStage>
    <video
      bind:this={video}
      src={sourceUrl}
      playsinline
      preload="metadata"
      onloadeddata={onReady}
      ontimeupdate={syncTime}
      onpause={() => playing = false}
      onplay={() => playing = true}
    ><track kind="captions" /></video>
    {#each visibleLayers as item (item.layer.id)}
      {@const captionStyle = `left:${item.layer.x * 100}%;top:${item.layer.y * 100}%;opacity:${item.opacity};--font-size:${item.layer.fontSizeFraction * 100}cqh;--plate:${item.layer.plateColor};--plate-opacity:${item.layer.plateOpacity};--stroke:${item.layer.strokeColor};--stroke-width:${item.layer.strokeWidth === 'thick' ? 0.14 : item.layer.strokeWidth === 'medium' ? 0.08 : item.layer.strokeWidth === 'thin' ? 0.04 : 0}em;font-family:${item.layer.fontFamily};color:${item.layer.textColor};text-align:${item.layer.textAlign}`}
      {#if isPreviewLayerEditable(item.layer.id, activeLayerId, playing)}
        <div class="caption-shell active" class:outside-time={item.outsideTime} style={captionStyle} bind:this={activeCaption}>
          <textarea
            class="caption-editor"
            aria-label={$t('stage.activeText')}
            rows="1"
            value={item.layer.text}
            bind:this={activeEditor}
            oninput={updateText}
            onpointerdown={(event) => event.stopPropagation()}
          ></textarea><div class="caption-tools">
            <button class="caption-grip" aria-label={$t('stage.move')} onpointerdown={(event) => startDrag(event, item.layer, event.currentTarget.closest('.caption-shell') as HTMLElement)}>✥</button>
            <button bind:this={styleMenuTrigger} class="caption-style-trigger" class:active={styleMenuOpen} aria-label={$t('stage.editStyle')} aria-expanded={styleMenuOpen} onpointerdown={(event) => event.stopPropagation()} onclick={toggleStyleMenu}>☷</button>
          </div>
        </div>
      {:else}
        <button class="caption" class:outside-time={item.outsideTime} style={captionStyle} aria-label={$t('stage.selectLayer', { name: item.layer.text })} onpointerdown={(event) => startDrag(event, item.layer)}>{item.layer.text}</button>
      {/if}
    {/each}
    <div class="safe-area" aria-hidden="true"></div>
    {#if styleMenuOpen && !playing}
      <section bind:this={styleMenu} class="canvas-style-menu" class:dock-top={activeLayer.y >= 0.5} aria-label={$t('stage.captionStyle')} onpointerdown={handleStyleMenuPointer}>
        <div class="canvas-toggle-row">
          <button class:active={activeLayer.plateOpacity > 0} onclick={() => onUpdateLayer({ plateOpacity: activeLayer.plateOpacity > 0 ? 0 : 0.75 })}>{$t('style.plate')}</button>
          <button class:active={activeLayer.strokeWidth !== 'none'} onclick={() => onUpdateLayer({ strokeWidth: activeLayer.strokeWidth === 'none' ? 'medium' : 'none' })}>{$t('style.stroke')}</button>
          <button class:active={activeLayer.fadeIn} onclick={() => onUpdateLayer({ fadeIn: !activeLayer.fadeIn })}>{$t('style.fadeIn')}</button>
          <button class:active={activeLayer.fadeOut} onclick={() => onUpdateLayer({ fadeOut: !activeLayer.fadeOut })}>{$t('style.fadeOut')}</button>
        </div>
        <div class="canvas-color-targets">
          <span>{$t('style.color')}</span>
          <div>
            {#each colorTargets as target}
              <div class="canvas-color-control"><span>{$t(target.label)}</span><button class="color-indicator" class:active={colorPickerOpen && colorTarget === target.key} style={`--color:${activeLayer[target.key]}`} aria-label={$t('style.changeColor', { target: $t(target.label) })} aria-expanded={colorPickerOpen && colorTarget === target.key} onclick={() => toggleColorPicker(target.key)}></button></div>
            {/each}
          </div>
        </div>
        {#if colorPickerOpen}<div class="canvas-color-dropdown" aria-label={$t('style.chooseColor')}>
          {#each TEXT_COLORS as color}<button class:active={activeLayer[colorTarget] === color} style={`--color:${color}`} aria-label={color} onclick={() => setColor(color)}></button>{/each}
        </div>{/if}
        <div class="canvas-font-row">
          <span>{$t('style.font')}</span>
          <div>{#each ['sans-serif', 'serif', 'monospace'] as font}<button class:active={activeLayer.fontFamily === font} onclick={() => onUpdateLayer({ fontFamily: font as LayerStyle['fontFamily'] })}>{$t(font === 'sans-serif' ? 'font.sans' : font === 'serif' ? 'font.serif' : 'font.mono')}</button>{/each}</div>
        </div>
        <label class="canvas-size-row"><span>{$t('inspector.size')} <output>{Math.round(activeLayer.fontSizeFraction * 100)}%</output></span><input type="range" min="0.025" max="0.12" step="0.005" value={activeLayer.fontSizeFraction} oninput={(event) => onUpdateLayer({ fontSizeFraction: Number(event.currentTarget.value) })} /></label>
      </section>
    {/if}
  </div>

  <div class="timeline-editor">
    <div class="timeline-toolbar">
      <div class="timeline-tools"><button class="play" disabled={trimMode} onclick={togglePlayback} aria-label={$t(playing ? 'stage.pause' : 'stage.play')}>{playing ? 'Ⅱ' : '▶'}</button><button class="trim-trigger" class:active={trimMode} aria-disabled={forceTrim} onclick={() => trimMode ? cancelTrim() : beginTrim()} aria-label={$t(forceTrim ? 'stage.trimRequired' : trimMode ? 'stage.cancelTrim' : 'stage.trimVideo')}>✂</button></div>
      {#if trimMode}<output>{formatTime(draftDuration)} <span>/ {formatTime(duration)}</span></output>{:else}<output>{formatTime(relativeTime(playhead))} <span>/ {formatTime(trimDuration)}</span></output>{/if}
    </div>

    <div class="timeline-row" class:trim-timeline={trimMode}>
      {#if trimMode}
        <div class="timeline-meta"><span>{$t('stage.trim')}</span><div><output><b>{$t('stage.in')}</b> {formatTime(draftTrim.trimIn)}</output><output><b>{$t('stage.out')}</b> {formatTime(draftTrim.trimOut)}</output></div></div>
        <div class="timeline-track dual-range trim-range">
          <div class="range-rail"><span style={`left:${draftStart}%;width:${draftWidth}%`}></span></div>
          <input class="start-handle" aria-label={$t('stage.clipStart')} type="range" min="0" max={duration} step="0.1" value={draftTrim.trimIn} oninput={(event) => updateTrim('trimIn', Number(event.currentTarget.value))} />
          <input class="stop-handle" aria-label={$t('stage.clipEnd')} type="range" min="0" max={duration} step="0.1" value={draftTrim.trimOut} oninput={(event) => updateTrim('trimOut', Number(event.currentTarget.value))} />
        </div>
        <div class="trim-actions"><small>{$t('stage.maxDuration', { seconds: MAX_TRIM_DURATION })}</small>{#if !forceTrim}<button class="trim-cancel" onclick={cancelTrim}>{$t('common.cancel')}</button>{/if}<button class="trim-confirm" onclick={confirmTrim}>{$t('stage.apply')} <span>✓</span></button></div>
      {:else}
        <div class="timeline-meta"><span>{$t('stage.playhead')}</span><output>{formatTime(relativeTime(playhead))}</output></div>
        <div class="timeline-track">
        <input
          class="scrub-range"
          aria-label={$t('stage.currentTime')}
          type="range"
          min="0"
          max={trimDuration}
          step="0.01"
          value={relativeTime(playhead)}
          oninput={(event) => seek(trim.trimIn + Number(event.currentTarget.value))}
        />
        </div>
      {/if}
      </div>

    <div class="timeline-row layer-timeline">
      <div class="timeline-meta"><span>{$t('stage.caption')}</span><div><output><b>{$t('stage.start')}</b> {formatTime(relativeTime(activeLayer.startTime))}</output><output><b>{$t('stage.stop')}</b> {formatTime(relativeTime(activeLayer.endTime))}</output></div></div>
      <div class="timeline-track dual-range">
        <div class="range-rail"><span style={`left:${layerStart}%;width:${layerWidth}%`}></span></div>
        <input
          class="start-handle"
          aria-label={$t('stage.captionStart')}
          type="range"
          min="0"
          max={trimDuration}
          step="0.1"
          value={relativeTime(activeLayer.startTime)}
          oninput={(event) => updateStart(trim.trimIn + Number(event.currentTarget.value))}
        />
        <input
          class="stop-handle"
          aria-label={$t('stage.captionEnd')}
          type="range"
          min="0"
          max={trimDuration}
          step="0.1"
          value={relativeTime(activeLayer.endTime)}
          oninput={(event) => updateStop(trim.trimIn + Number(event.currentTarget.value))}
        />
      </div>
    </div>
  </div>
</section>

<script lang="ts" context="module">
  function formatTime(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = (value % 60).toFixed(1).padStart(4, '0');
    return `${minutes}:${seconds}`;
  }
</script>
