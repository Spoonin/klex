<script lang="ts">
  import { logoPlacement, logoSafeArea, moveLogo, type LogoSettings, type LogoSource } from '../logo';
  import { t } from '../i18n';

  export let sourceUrl: string;
  export let logoUrl: string;
  export let videoWidth: number;
  export let videoHeight: number;
  export let logo: LogoSource;
  export let onReady: () => void;
  export let onChange: (patch: Partial<LogoSettings>) => void;

  const SNAP_DISTANCE_PX = 10;
  let stage: HTMLElement;
  let logoElement: HTMLImageElement;
  let videoLoaded = false;
  let logoLoaded = false;
  let readySent = false;
  let drag: { pointerId: number; grabX: number; grabY: number } | undefined;
  $: placement = logoPlacement(logo, { width: videoWidth, height: videoHeight }, logo.settings);
  $: safeArea = logoSafeArea({ width: videoWidth, height: videoHeight }, logo.settings.safeMargin);
  $: if (videoLoaded && logoLoaded && !readySent) {
    readySent = true;
    onReady();
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
    onChange(settings);
  }

  function endDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) drag = undefined;
  }
</script>

<section class="preview-panel logo-preview" aria-label={$t('stage.preview')}>
  <div
    bind:this={stage}
    class="stage logo-stage"
    style={`aspect-ratio:${videoWidth}/${videoHeight};width:min(100%,calc(68vh * ${videoWidth / videoHeight}))`}
  >
    <video
      src={sourceUrl}
      controls
      playsinline
      preload="metadata"
      onloadeddata={() => videoLoaded = true}
    ><track kind="captions" /></video>
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
</section>
