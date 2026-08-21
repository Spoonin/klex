<script lang="ts">
  import { changedLogoPosition, logoPlacement, logoSafeArea, moveLogo, type LogoSettings, type LogoSource } from '../logo';
  import { t } from '../i18n';

  export let sourceUrl: string;
  export let logoUrl: string;
  export let videoWidth: number;
  export let videoHeight: number;
  export let duration = 0;
  export let playhead = 0;
  export let logo: LogoSource;
  export let onReady: () => void;
  export let onSeek: (time: number) => void = () => {};
  export let onChange: (patch: Partial<LogoSettings>) => void;
  export let batchDefault = false;

  const SNAP_DISTANCE_PX = 10;
  let stage: HTMLElement;
  let video: HTMLVideoElement;
  let logoElement: HTMLImageElement;
  let videoLoaded = batchDefault;
  let logoLoaded = false;
  let playing = false;
  let readySent = false;
  let drag: { pointerId: number; grabX: number; grabY: number } | undefined;
  $: placement = logoPlacement(logo, { width: videoWidth, height: videoHeight }, logo.settings);
  $: safeArea = logoSafeArea({ width: videoWidth, height: videoHeight }, logo.settings.safeMargin);
  $: if (batchDefault) videoLoaded = true;
  $: if (videoLoaded && logoLoaded && !readySent) {
    readySent = true;
    onReady();
  }

  $: if (video && !batchDefault && Math.abs(video.currentTime - playhead) > 0.08) {
    video.currentTime = clampTime(playhead);
  }

  async function togglePlayback() {
    if (video.paused) {
      if (video.currentTime >= duration - 0.05) seek(0);
      try {
        await video.play();
      } catch {
        playing = false;
      }
    } else {
      video.pause();
    }
  }

  function loadVideo() {
    video.currentTime = clampTime(playhead);
    videoLoaded = true;
  }

  function syncTime() {
    onSeek(clampTime(video.currentTime));
  }

  function seek(time: number) {
    const next = clampTime(time);
    video.currentTime = next;
    onSeek(next);
  }

  function clampTime(time: number) {
    return Math.min(Math.max(0, duration), Math.max(0, Number.isFinite(time) ? time : 0));
  }

  function startDrag(event: PointerEvent) {
    event.preventDefault();
    const bounds = logoElement.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      grabX: event.clientX - bounds.left,
      grabY: event.clientY - bounds.top,
    };
    logoElement.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const bounds = stage.getBoundingClientRect();
    const settings = moveLogo(
      logo,
      { width: videoWidth, height: videoHeight },
      logo.settings,
      {
        left: (event.clientX - bounds.left - drag.grabX) / bounds.width,
        top: (event.clientY - bounds.top - drag.grabY) / bounds.height,
      },
      { x: SNAP_DISTANCE_PX / bounds.width, y: SNAP_DISTANCE_PX / bounds.height },
    );
    const patch = changedLogoPosition(logo.settings, settings);
    if (Object.keys(patch).length) onChange(patch);
  }

  function endDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) drag = undefined;
  }
</script>

<section class="preview-panel logo-preview" aria-label={$t('stage.preview')}>
  {#if batchDefault}
    <div class="batch-default-identity">
      <strong>{$t('logo.batchDefault')}</strong>
      <span>{$t('logo.batchDefaultNotVideo')}</span>
    </div>
  {/if}
  <div
    bind:this={stage}
    class="stage logo-stage"
    style={`aspect-ratio:${videoWidth}/${videoHeight};width:min(100%,calc(68vh * ${videoWidth / videoHeight}))`}
  >
    {#if batchDefault}
      <div class="batch-default-surface" aria-hidden="true"></div>
    {:else}
      <video
        bind:this={video}
        src={sourceUrl}
        playsinline
        preload="metadata"
        onloadeddata={loadVideo}
        ontimeupdate={syncTime}
        onplay={() => playing = true}
        onpause={() => playing = false}
      ><track kind="captions" /></video>
    {/if}
    <div
      class="safe-area"
      aria-hidden="true"
      style:left={`${safeArea.x * 100}%`}
      style:right={`${safeArea.x * 100}%`}
      style:top={`${safeArea.y * 100}%`}
      style:bottom={`${safeArea.y * 100}%`}
    ></div>
    <img
      bind:this={logoElement}
      class:dragging={!!drag}
      src={logoUrl}
      alt={$t('logo.previewAlt')}
      draggable="false"
      style:left={`${placement.left * 100}%`}
      style:top={`${placement.top * 100}%`}
      style:width={`${placement.width * 100}%`}
      style:height={`${placement.height * 100}%`}
      style:opacity={logo.settings.opacity}
      onload={() => logoLoaded = true}
      onpointerdown={startDrag}
      onpointermove={move}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      onlostpointercapture={endDrag}
    />
  </div>
  {#if !batchDefault}
    <div class="logo-timeline">
      <div class="timeline-toolbar">
        <button class="play" onclick={togglePlayback} aria-label={$t(playing ? 'stage.pause' : 'stage.play')}>{playing ? 'Ⅱ' : '▶'}</button>
        <output>{formatTime(playhead)} <span>/ {formatTime(duration)}</span></output>
      </div>
      <input
        class="scrub-range"
        aria-label={$t('stage.currentTime')}
        type="range"
        min="0"
        max={duration}
        step="0.01"
        value={playhead}
        oninput={(event) => seek(Number(event.currentTarget.value))}
      />
    </div>
  {/if}
</section>

<script lang="ts" context="module">
  function formatTime(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = (value % 60).toFixed(1).padStart(4, '0');
    return `${minutes}:${seconds}`;
  }
</script>
