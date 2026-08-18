<script lang="ts">
  import { createEmptyProject } from '@ariefsn/svelte-video-editor';
  import type { ExportPreset, ExportRequest, WorkerMessage } from './lib/export-protocol';
  import { DEFAULT_LAYER, TEXT_COLORS, layerOpacity, type LayerStyle } from './lib/layer';

  type ProjectLayer = LayerStyle & { id: string };
  const editorProject = createEmptyProject('klex Stories Overlay');
  let file: File | null = null;
  let sourceUrl = '';
  let video: HTMLVideoElement;
  let preset: ExportPreset = 'standard';
  let state: 'idle' | 'exporting' | 'done' | 'error' = 'idle';
  let progress = 0;
  let error = '';
  let duration = 0;
  let playhead = 0;
  let activeId = 'layer-1';
  let layers: ProjectLayer[] = [{ ...DEFAULT_LAYER, id: activeId, endTime: 8 }];
  let worker: Worker | undefined;

  const activeLayer = () => layers.find((layer) => layer.id === activeId) ?? layers[0];
  const visibleLayers = () => layers.filter((layer) => layerOpacity(layer, playhead) > 0);

  function selectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const next = input.files?.[0] ?? null;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    file = next; sourceUrl = next ? URL.createObjectURL(next) : ''; state = 'idle'; error = ''; playhead = 0;
  }

  function loadedMetadata() { duration = video.duration; layers = layers.map((layer) => ({ ...layer, endTime: Math.min(layer.endTime, video.duration) })); }
  function seek(value: number) { playhead = Math.max(0, Math.min(duration || 0, value)); if (video) video.currentTime = playhead; }
  function syncTime() { playhead = video.currentTime; }
  function updateLayer(patch: Partial<LayerStyle>) { layers = layers.map((layer) => layer.id === activeId ? { ...layer, ...patch } : layer); }
  function addLayer() { const id = crypto.randomUUID(); const layer = { ...DEFAULT_LAYER, id, text: 'Новая надпись', y: Math.min(.92, .18 + layers.length * .16), startTime: playhead, endTime: Math.min(duration || 8, playhead + 4) }; layers = [...layers, layer]; activeId = id; }
  function removeLayer() { if (layers.length === 1) return; layers = layers.filter((layer) => layer.id !== activeId); activeId = layers[0].id; }
  function dragLayer(event: PointerEvent) { const target = event.currentTarget as HTMLElement; target.setPointerCapture(event.pointerId); const move = (moveEvent: PointerEvent) => { const bounds = target.getBoundingClientRect(); updateLayer({ x: clamp((moveEvent.clientX - bounds.left) / bounds.width), y: clamp((moveEvent.clientY - bounds.top) / bounds.height) }); }; const end = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); }; target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); }
  function clamp(value: number) { return Math.min(.95, Math.max(.05, value)); }
  function save(buffer: ArrayBuffer) { const url = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${file?.name.replace(/\.[^.]+$/, '') ?? 'klex-export'}-klex.mp4`; anchor.click(); URL.revokeObjectURL(url); }
  function exportVideo() { if (!file) return; worker?.terminate(); worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' }); state = 'exporting'; progress = 0; error = ''; worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => { if (data.type === 'progress') progress = data.total === 0 ? 0 : Math.round(data.completed / data.total * 100); else if (data.type === 'complete') { save(data.file); state = 'done'; worker?.terminate(); } else if (data.type === 'error') { error = data.message; state = 'error'; worker?.terminate(); } }; const request: ExportRequest = { type: 'export', file, preset, layers: layers.map(({ id: _id, ...layer }) => layer) }; worker.postMessage(request); }
</script>

<main>
  <header><div><p class="eyebrow">klex · stories overlay</p><h1>Надписи</h1></div><button class="add" onclick={addLayer}>+ Надпись</button></header>
  <label class="file-picker"><span>{file ? file.name : 'Выбрать MP4 или MOV'}</span><input accept="video/mp4,video/quicktime,.mp4,.mov" type="file" onchange={selectFile} /></label>
  <section class="stage" onpointerdown={dragLayer} role="presentation">
    {#if sourceUrl}<video bind:this={video} src={sourceUrl} playsinline onloadedmetadata={loadedMetadata} ontimeupdate={syncTime}><track kind="captions" /></video>{:else}<div class="empty">Выберите видео для предпросмотра</div>{/if}
    {#each visibleLayers() as layer (layer.id)}
      <button class:active={layer.id === activeId} class="caption" style={`left:${layer.x * 100}%;top:${layer.y * 100}%;--plate:${layer.plateColor};--plate-opacity:${layer.plateOpacity};--stroke:${layer.strokeColor};--stroke-width:${layer.strokeWidth === 'thick' ? 4 : layer.strokeWidth === 'medium' ? 2 : layer.strokeWidth === 'thin' ? 1 : 0}px; font-family:${layer.fontFamily}; color:${layer.textColor}; text-align:${layer.textAlign}`} onclick={(event) => { event.stopPropagation(); activeId = layer.id; }}>{layer.text}</button>
    {/each}
  </section>
  <div class="chips" aria-label="Слои">{#each layers as layer (layer.id)}<button class:active={layer.id === activeId} onclick={() => activeId = layer.id}><span></span>{layer.text || 'Без текста'}</button>{/each}</div>
  <section class="scrubber"><label for="playhead">Скраб <output>{playhead.toFixed(1)} c</output></label><input id="playhead" type="range" min="0" max={duration || 0} step="0.1" value={playhead} oninput={(event) => seek(Number(event.currentTarget.value))} /><div class="range">{#each layers as layer (layer.id)}<i style={`left:${duration ? layer.startTime / duration * 100 : 0}%;width:${duration ? (layer.endTime - layer.startTime) / duration * 100 : 0}%`}></i>{/each}</div></section>
  {#if activeLayer()}<section class="inspector"><label>Текст<input value={activeLayer().text} oninput={(event) => updateLayer({ text: event.currentTarget.value })} /></label><div class="row"><span>Цвет</span>{#each TEXT_COLORS as color}<button class:active={activeLayer().textColor === color} class="swatch" style={`--color:${color}`} aria-label={color} onclick={() => updateLayer({ textColor: color })}></button>{/each}</div><div class="row"><span>Гарнитура</span>{#each ['sans-serif', 'serif', 'monospace'] as font}<button class:active={activeLayer().fontFamily === font} onclick={() => updateLayer({ fontFamily: font as LayerStyle['fontFamily'] })}>{font}</button>{/each}</div><div class="row"><label><input type="checkbox" checked={activeLayer().plateOpacity > 0} onchange={(event) => updateLayer({ plateOpacity: event.currentTarget.checked ? .75 : 0 })} /> Плашка</label><label><input type="checkbox" checked={activeLayer().strokeWidth !== 'none'} onchange={(event) => updateLayer({ strokeWidth: event.currentTarget.checked ? 'medium' : 'none' })} /> Stroke</label><label><input type="checkbox" checked={Number.isFinite(activeLayer().endTime)} onchange={(event) => updateLayer({ endTime: event.currentTarget.checked ? Math.min(duration || 8, activeLayer().startTime + 4) : Infinity })} /> Fade</label></div><button class="danger" onclick={removeLayer} disabled={layers.length === 1}>Удалить слой</button></section>{/if}
  <section class="export"><select bind:value={preset}><option value="high">Высокое</option><option value="standard">Обычное</option><option value="light">Лёгкое</option></select><button onclick={exportVideo} disabled={!file || state === 'exporting'}>{state === 'exporting' ? `Экспорт: ${progress}%` : 'Экспортировать'}</button>{#if state === 'error'}<p class="error">{error}</p>{/if}</section>
  <small>Проект таймлайна подготовлен через svelte-video-editor: {editorProject.name}</small>
</main>
