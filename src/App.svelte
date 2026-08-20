<script lang="ts">
  import { createEmptyProject } from '@ariefsn/svelte-video-editor';
  import type { ExportPreset, ExportRequest, SourceMetadata, WorkerMessage } from './lib/export-protocol';
  import { DEFAULT_LAYER, TEXT_COLORS, layerOpacity, type LayerStyle } from './lib/layer';
  import { clampTrimWindow, defaultTrimWindow, MAX_TRIM_DURATION, type TrimWindow } from './lib/trim';

  type ProjectLayer = LayerStyle & { id: string };
  const editorProject = createEmptyProject('klex Stories Overlay');
  let file: File | null = null;
  let sourceUrl = '';
  let video: HTMLVideoElement;
  let preset: ExportPreset = 'standard';
  let state: 'idle' | 'exporting' | 'done' | 'error' = 'idle';
  let progress = 0;
  let elapsed = 0;
  let exportTimer: ReturnType<typeof setInterval> | undefined;
  let keyboardOpen = false;
  let error = '';
  let duration = 0;
  let trim: TrimWindow = { trimIn: 0, trimOut: 0 };
  let audioWarning = '';
  let playhead = 0;
  let activeId = 'layer-1';
  let layers: ProjectLayer[] = [{ ...DEFAULT_LAYER, id: activeId, endTime: 8 }];
  let worker: Worker | undefined;

  const activeLayer = () => layers.find((layer) => layer.id === activeId) ?? layers[0];
  const visibleLayers = () => layers.filter((layer) => layerOpacity(layer, playhead) > 0);

  async function selectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const next = input.files?.[0] ?? null;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    file = null; sourceUrl = ''; state = 'idle'; error = ''; audioWarning = ''; playhead = 0; duration = 0; trim = { trimIn: 0, trimOut: 0 };
    if (!next) return;
    const metadata = await validateFile(next);
    if (!metadata) return;
    file = next; sourceUrl = URL.createObjectURL(next); duration = metadata.duration; trim = defaultTrimWindow(metadata.duration); audioWarning = metadata.audioWarning ?? '';
  }

  function loadedMetadata() { layers = layers.map((layer) => ({ ...layer, endTime: Math.min(layer.endTime, duration) })); }
  function seek(value: number) { playhead = Math.max(trim.trimIn, Math.min(trim.trimOut, value)); if (video) video.currentTime = playhead; }
  function syncTime() { playhead = video.currentTime; }
  function updateTrim(patch: Partial<TrimWindow>) { trim = clampTrimWindow({ ...trim, ...patch }, duration); seek(playhead); }
  function updateLayer(patch: Partial<LayerStyle>) { layers = layers.map((layer) => layer.id === activeId ? { ...layer, ...patch } : layer); }
  function addLayer() { const id = crypto.randomUUID(); const layer = { ...DEFAULT_LAYER, id, text: 'Новая надпись', y: Math.min(.92, .18 + layers.length * .16), startTime: playhead, endTime: Math.min(duration || 8, playhead + 4) }; layers = [...layers, layer]; activeId = id; }
  function removeLayer() { if (layers.length === 1) return; layers = layers.filter((layer) => layer.id !== activeId); activeId = layers[0].id; }
  function dragLayer(event: PointerEvent) { const target = event.currentTarget as HTMLElement; target.setPointerCapture(event.pointerId); const move = (moveEvent: PointerEvent) => { const bounds = target.getBoundingClientRect(); const caption = target.querySelector<HTMLButtonElement>('.caption.active'); const xInset = Math.min(.5, (caption?.offsetWidth ?? 0) / 2 / bounds.width + 16 / bounds.width); const yInset = Math.min(.5, (caption?.offsetHeight ?? 0) / 2 / bounds.height + 16 / bounds.height); updateLayer({ x: clamp((moveEvent.clientX - bounds.left) / bounds.width, xInset), y: clamp((moveEvent.clientY - bounds.top) / bounds.height, yInset) }); }; const end = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); }; target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); }
  function clamp(value: number, inset = .05) { return Math.min(1 - inset, Math.max(inset, value)); }
  function save(buffer: ArrayBuffer) { const url = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${file?.name.replace(/\.[^.]+$/, '') ?? 'klex-export'}-klex.mp4`; anchor.click(); URL.revokeObjectURL(url); }
  function stopTimer() { if (exportTimer) clearInterval(exportTimer); exportTimer = undefined; }
  function cancelExport() { worker?.terminate(); stopTimer(); state = 'idle'; progress = 0; }
  function validateFile(next: File): Promise<SourceMetadata | null> { return new Promise((resolve) => { worker?.terminate(); worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' }); worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => { if (data.type === 'validated') { worker?.terminate(); resolve(data.metadata); } else if (data.type === 'error') { error = data.message; state = 'error'; worker?.terminate(); resolve(null); } }; worker.postMessage({ type: 'validate', file: next }); }); }
  function exportVideo(nextPreset = preset) { if (!file) return; worker?.terminate(); stopTimer(); worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' }); state = 'exporting'; progress = 0; elapsed = 0; error = ''; exportTimer = setInterval(() => elapsed += 1, 1000); worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => { if (data.type === 'progress') progress = Math.round(data.completed / data.total * 100); else if (data.type === 'complete') { progress = 100; stopTimer(); save(data.file); state = 'done'; worker?.terminate(); } else if (data.type === 'error') { stopTimer(); error = data.message; state = 'error'; worker?.terminate(); } }; const request: ExportRequest = { type: 'export', file, preset: nextPreset, layers: layers.map(({ id: _id, ...layer }) => ({ ...layer, startTime: Math.max(0, layer.startTime - trim.trimIn), endTime: Math.max(0, layer.endTime - trim.trimIn) })), trim }; worker.postMessage(request); }
</script>

<style>
  :global(.empty) { position: absolute; inset: 0; width: 100%; padding: 24px; text-align: center; }
  :global(.caption) { max-width: calc(100% - 32px); padding: .28em .55em; border-radius: .28em; overflow-wrap: anywhere; }
  .stage.keyboard-open { max-height: 33svh; transition: max-height .2s ease; }
  .progress-overlay { position: fixed; inset: 0; z-index: 2; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / .62); }
  .progress-card { width: min(100%, 340px); padding: 22px; border-radius: 16px; background: #24232b; display: grid; gap: 14px; text-align: center; }
  progress { width: 100%; height: 10px; accent-color: #b8b2ff; }
  .retry { width: 100%; color: #17151e; background: #ffd28a; font-weight: 700; }
</style>

<main>
  <header><div><p class="eyebrow">klex · stories overlay</p><h1>Надписи</h1></div><button class="add" onclick={addLayer}>+ Надпись</button></header>
  <label class="file-picker"><span>{file ? file.name : 'Выбрать MP4 или MOV'}</span><input accept="video/mp4,video/quicktime,.mp4,.mov" type="file" onchange={selectFile} /></label>
  <section class:keyboard-open={keyboardOpen} class="stage" onpointerdown={dragLayer} role="presentation">
    {#if sourceUrl}<video bind:this={video} src={sourceUrl} playsinline onloadedmetadata={loadedMetadata} ontimeupdate={syncTime}><track kind="captions" /></video>{:else}<div class="empty">Выберите видео для предпросмотра</div>{/if}
    {#each visibleLayers() as layer (layer.id)}
      <button class:active={layer.id === activeId} class="caption" style={`left:${layer.x * 100}%;top:${layer.y * 100}%;--plate:${layer.plateColor};--plate-opacity:${layer.plateOpacity};--stroke:${layer.strokeColor};--stroke-width:${layer.strokeWidth === 'thick' ? 4 : layer.strokeWidth === 'medium' ? 2 : layer.strokeWidth === 'thin' ? 1 : 0}px; font-family:${layer.fontFamily}; color:${layer.textColor}; text-align:${layer.textAlign}`} onclick={(event) => { event.stopPropagation(); activeId = layer.id; }}>{layer.text}</button>
    {/each}
  </section>
  <div class="chips" aria-label="Слои">{#each layers as layer (layer.id)}<button class:active={layer.id === activeId} onclick={() => activeId = layer.id}><span></span>{layer.text || 'Без текста'}</button>{/each}</div>
  <section class="scrubber"><label for="playhead">Скраб <output>{playhead.toFixed(1)} c</output></label><input id="playhead" type="range" min={trim.trimIn} max={trim.trimOut} step="0.1" value={playhead} oninput={(event) => seek(Number(event.currentTarget.value))} /><div class="range">{#each layers as layer (layer.id)}<i style={`left:${duration ? layer.startTime / duration * 100 : 0}%;width:${duration ? (layer.endTime - layer.startTime) / duration * 100 : 0}%`}></i>{/each}</div></section>
  {#if file}<section class="trim"><div><strong>Диапазон обрезки</strong><output>{trim.trimIn.toFixed(1)}–{trim.trimOut.toFixed(1)} c · {(trim.trimOut - trim.trimIn).toFixed(1)} / {MAX_TRIM_DURATION} c</output></div><label>Вход<input type="range" min="0" max={Math.max(0, trim.trimOut - 0.1)} step="0.1" value={trim.trimIn} oninput={(event) => updateTrim({ trimIn: Number(event.currentTarget.value) })} /></label><label>Выход<input type="range" min={trim.trimIn + 0.1} max={duration} step="0.1" value={trim.trimOut} oninput={(event) => updateTrim({ trimOut: Number(event.currentTarget.value) })} /></label></section>{/if}
  {#if activeLayer()}<section class="inspector"><label>Текст<input value={activeLayer().text} onfocus={() => keyboardOpen = true} onblur={() => keyboardOpen = false} oninput={(event) => updateLayer({ text: event.currentTarget.value })} /></label><div class="row"><span>Цвет</span>{#each TEXT_COLORS as color}<button class:active={activeLayer().textColor === color} class="swatch" style={`--color:${color}`} aria-label={color} onclick={() => updateLayer({ textColor: color })}></button>{/each}</div><div class="row"><span>Гарнитура</span>{#each ['sans-serif', 'serif', 'monospace'] as font}<button class:active={activeLayer().fontFamily === font} onclick={() => updateLayer({ fontFamily: font as LayerStyle['fontFamily'] })}>{font}</button>{/each}</div><div class="row"><label><input type="checkbox" checked={activeLayer().plateOpacity > 0} onchange={(event) => updateLayer({ plateOpacity: event.currentTarget.checked ? .75 : 0 })} /> Плашка</label><label><input type="checkbox" checked={activeLayer().strokeWidth !== 'none'} onchange={(event) => updateLayer({ strokeWidth: event.currentTarget.checked ? 'medium' : 'none' })} /> Stroke</label><label><input type="checkbox" checked={Number.isFinite(activeLayer().endTime)} onchange={(event) => updateLayer({ endTime: event.currentTarget.checked ? Math.min(duration || 8, activeLayer().startTime + 4) : Infinity })} /> Fade</label></div><button class="danger" onclick={removeLayer} disabled={layers.length === 1}>Удалить слой</button></section>{/if}
  <section class="export"><select bind:value={preset}><option value="high">Высокое</option><option value="standard">Обычное</option><option value="light">Лёгкое</option></select><button onclick={() => exportVideo()} disabled={!file || state === 'exporting'}>Экспортировать</button>{#if audioWarning}<p class="warning">{audioWarning}</p>{/if}{#if state === 'error'}<p class="error">{error}</p><button class="retry" onclick={() => exportVideo('light')}>Повторить в лёгком режиме</button>{/if}</section>
  <small>Проект таймлайна подготовлен через svelte-video-editor: {editorProject.name}</small>
</main>
{#if state === 'exporting'}<div class="progress-overlay" role="dialog" aria-modal="true" aria-label="Экспорт"><section class="progress-card"><strong>Экспорт видео</strong><output>{progress}% · {elapsed} c</output><progress value={progress} max="100"></progress><button onclick={cancelExport}>Отменить</button></section></div>{/if}
