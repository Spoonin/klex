<script lang="ts">
  import { logoPlacement, logoSafeArea, type LogoSource } from '../logo';
  import { t } from '../i18n';

  export let sourceUrl: string;
  export let logoUrl: string;
  export let videoWidth: number;
  export let videoHeight: number;
  export let logo: LogoSource;
  export let onReady: () => void;

  let videoLoaded = false;
  let logoLoaded = false;
  let readySent = false;
  $: placement = logoPlacement(logo, { width: videoWidth, height: videoHeight }, logo.settings);
  $: safeArea = logoSafeArea({ width: videoWidth, height: videoHeight }, logo.settings.safeMargin);
  $: if (videoLoaded && logoLoaded && !readySent) {
    readySent = true;
    onReady();
  }
</script>

<section class="preview-panel logo-preview" aria-label={$t('stage.preview')}>
  <div
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
      src={logoUrl}
      alt={$t('logo.previewAlt')}
      style:left={`${placement.left * 100}%`}
      style:top={`${placement.top * 100}%`}
      style:width={`${placement.width * 100}%`}
      style:height={`${placement.height * 100}%`}
      style:opacity={logo.settings.opacity}
      onload={() => logoLoaded = true}
    />
  </div>
</section>
