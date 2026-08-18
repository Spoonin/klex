<script lang="ts">
  import type { ExportPreset, ExportRequest, WorkerMessage } from './lib/export-protocol';

  let file: File | null = null;
  let preset: ExportPreset = 'standard';
  let state: 'idle' | 'exporting' | 'done' | 'error' = 'idle';
  let progress = 0;
  let error = '';

  let worker: Worker | undefined;

  function selectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    state = 'idle';
    error = '';
  }

  function save(buffer: ArrayBuffer) {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${file?.name.replace(/\.[^.]+$/, '') ?? 'klex-export'}-klex.mp4`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportVideo() {
    if (!file) return;
    worker?.terminate();
    worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });
    state = 'exporting';
    progress = 0;
    error = '';
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (data.type === 'progress') {
        progress = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);
      } else if (data.type === 'complete') {
        save(data.file);
        state = 'done';
        worker?.terminate();
      } else if (data.type === 'error') {
        error = data.message;
        state = 'error';
        worker?.terminate();
      }
    };
    const request: ExportRequest = { type: 'export', file, preset };
    worker.postMessage(request);
  }
</script>

<main>
  <section aria-labelledby="title">
    <p class="eyebrow">klex · client-only</p>
    <h1 id="title">Надпись на видео</h1>
    <p class="hint">Видео обрабатывается только в этом браузере.</p>

    <label class="file-picker">
      <span>{file ? file.name : 'Выбрать MP4 или MOV'}</span>
      <input accept="video/mp4,video/quicktime,.mp4,.mov" type="file" onchange={selectFile} />
    </label>

    <label class="preset" for="preset">Качество экспорта</label>
    <select id="preset" bind:value={preset} disabled={state === 'exporting'}>
      <option value="high">Высокое</option>
      <option value="standard">Обычное</option>
      <option value="light">Лёгкое</option>
    </select>

    <button onclick={exportVideo} disabled={!file || state === 'exporting'}>
      {state === 'exporting' ? `Экспорт: ${progress}%` : 'Экспортировать'}
    </button>

    {#if state === 'exporting'}
      <progress aria-label="Прогресс экспорта" value={progress} max="100"></progress>
    {:else if state === 'done'}
      <p class="success">MP4 подготовлен и скачан.</p>
    {:else if state === 'error'}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>
</main>
