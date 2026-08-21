<script lang="ts">
  import LayerInspector from './lib/components/LayerInspector.svelte';
  import BatchExportProgress from './lib/components/BatchExportProgress.svelte';
  import LogoInspector from './lib/components/LogoInspector.svelte';
  import LogoStage from './lib/components/LogoStage.svelte';
  import StepIndicator from './lib/components/StepIndicator.svelte';
  import VideoBatchList from './lib/components/VideoBatchList.svelte';
  import VideoStage from './lib/components/VideoStage.svelte';
  import { canExportProject, createEditorProject, getActiveLayer, updateEditorProject, type EditorProjectAction } from './lib/editor-project';
  import { batchExportProgress, completeBatchExportItem, createBatchExportQueue, createBatchExportRequest, resolveBatchExportLogoSource, startNextBatchExportItem, updateBatchExportProgress, type BatchExportItem } from './lib/batch-export';
  import type { ExportPreset, ExportRequest, SourceMetadata, WorkerErrorCode, WorkerMessage } from './lib/export-protocol';
  import { languages, locale, setLocale, t, type Locale, type MessageKey } from './lib/i18n';
  import type { LayerStyle } from './lib/layer';
  import { DEFAULT_LOGO_SETTINGS, LogoValidationError, fitLogoSettings, maximumLogoSize, validateLogoFile, type LogoSettings, type LogoSource } from './lib/logo';
  import { createTemporaryOutput, TemporaryStorageUnavailableError, type TemporaryOutput } from './lib/temporary-output';
  import { MAX_TRIM_DURATION, type TrimWindow } from './lib/trim';
  import { appendVideoBatch, fittedLogoSettingKeys, hasLogoBatchDefault, initialLogoBatchEditorTarget, rejectVideoBatchItem, removeVideoBatchItem, resetVideoLogoOverride, resetVideoLogoOverrideProperty, resolveVideoLogoSettings, seekVideoBatchItem, supportedVideoBatchItems, updateVideoLogoOverride, validateVideoBatchItem, videoBatchPlayhead, type LogoBatchEditorTarget, type LogoSettingKey, type VideoBatchItem, type VideoBatchPlayheads, type VideoLogoOverrides } from './lib/video-batch';
  import { needsDiscardConfirmation, type Workflow, type WorkflowStep } from './lib/workflow';

  type ExportState = 'idle' | 'exporting' | 'done' | 'error';
  type BatchExportResult = { item: BatchExportItem; file: File; output: TemporaryOutput };
  const MAX_CONCURRENT_VALIDATIONS = 2;
  const BATCH_DEFAULT_FRAME = { width: 1000, height: 1000 } as const;

  let workflow: Workflow | null = null;
  let step: WorkflowStep = 1;
  let project = createEditorProject('layer-1');
  let file: File | null = null;
  let sourceMetadata: SourceMetadata | null = null;
  let sourceUrl = '';
  let fileState: 'idle' | 'validating' | 'ready' | 'error' = 'idle';
  let previewReady = false;
  let exportUnlocked = false;
  let preset: ExportPreset = 'standard';
  let exportState: ExportState = 'idle';
  let progress = 0;
  let elapsed = 0;
  let exportTimer: ReturnType<typeof setInterval> | undefined;
  let error: MessageKey | '' = '';
  let unsupportedAudio = false;
  let worker: Worker | undefined;
  let trimRequired = false;
  let temporaryOutput: TemporaryOutput | undefined;
  let batchExportQueue: BatchExportItem[] = [];
  let batchExportResults: BatchExportResult[] = [];
  let cancelWorkerTask: (() => void) | undefined;
  let exportAttempt = 0;
  let logoFile: File | null = null;
  let logoUrl = '';
  let logoMetadata: { width: number; height: number } | null = null;
  let logoState: 'idle' | 'validating' | 'ready' | 'error' = 'idle';
  let logoValidationAttempt = 0;
  let logoBatchDefault: LogoSettings = { ...DEFAULT_LOGO_SETTINGS };
  let logoVideoOverrides: VideoLogoOverrides = {};
  let videoBatch: VideoBatchItem[] = [];
  let logoBatchEditorTarget: LogoBatchEditorTarget | undefined;
  let videoBatchPlayheads: VideoBatchPlayheads = {};
  const validationWorkers = new Map<string, Worker>();
  let validationQueue: string[] = [];

  $: activeLayer = getActiveLayer(project);
  $: editorReady = workflow === 'text' && previewReady && !trimRequired && canExportProject(project);
  $: logoEditorReady = workflow === 'logo' && previewReady && !!file && !!logoSource && !!sourceMetadata && validatingVideoCount === 0;
  $: readyToExport = editorReady || logoEditorReady;
  $: supportedBatch = supportedVideoBatchItems(videoBatch);
  $: batchDefaultAvailable = hasLogoBatchDefault(videoBatch);
  $: editingBatchDefault = logoBatchEditorTarget?.type === 'batch-default';
  $: selectedBatchItemId = logoBatchEditorTarget?.type === 'video' ? logoBatchEditorTarget.id : undefined;
  $: selectedBatchItem = videoBatch.find(({ id }) => id === selectedBatchItemId);
  $: logoEditorFrame = editingBatchDefault
    ? BATCH_DEFAULT_FRAME
    : selectedBatchItem?.metadata ?? sourceMetadata ?? BATCH_DEFAULT_FRAME;
  $: selectedLogoOverride = selectedBatchItemId ? logoVideoOverrides[selectedBatchItemId] : undefined;
  $: rawLogoEditorSettings = editingBatchDefault
    ? logoBatchDefault
    : resolveVideoLogoSettings(logoBatchDefault, selectedLogoOverride);
  $: logoEditorSettings = logoMetadata
    ? fitLogoSettings(logoMetadata, logoEditorFrame, rawLogoEditorSettings)
    : rawLogoEditorSettings;
  $: fittedLogoProperties = fittedLogoSettingKeys(rawLogoEditorSettings, logoEditorSettings);
  $: overriddenLogoProperties = Object.keys(selectedLogoOverride ?? {}) as LogoSettingKey[];
  $: logoSource = logoFile && logoMetadata
    ? { file: logoFile, ...logoMetadata, settings: logoEditorSettings } satisfies LogoSource
    : undefined;
  $: exportLogoSource = logoFile && logoMetadata && sourceMetadata
    ? {
        file: logoFile,
        ...logoMetadata,
        settings: fitLogoSettings(logoMetadata, sourceMetadata, rawLogoEditorSettings),
      } satisfies LogoSource
    : undefined;
  $: logoPreviewPlayhead = selectedBatchItem?.metadata
    ? videoBatchPlayhead(videoBatchPlayheads, selectedBatchItem.id, selectedBatchItem.metadata.duration)
    : 0;
  $: validatingVideoCount = videoBatch.filter(({ status }) => status === 'validating').length;
  $: batchHasUnsupportedAudio = supportedBatch.some(({ metadata }) => metadata?.unsupportedAudio);

  function dispatch(action: EditorProjectAction) { project = updateEditorProject(project, action); }

  async function selectFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const next = input.files?.[0];
    if (next) await acceptFile(next);
    input.value = '';
  }

  async function dropFile(event: DragEvent) {
    event.preventDefault();
    const next = event.dataTransfer?.files[0];
    if (next) await acceptFile(next);
  }

  function selectBatchFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    addBatchFiles(input.files ?? []);
    input.value = '';
  }

  function dropBatchFiles(event: DragEvent) {
    event.preventDefault();
    addBatchFiles(event.dataTransfer?.files ?? []);
  }

  async function selectLogoFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const next = input.files?.[0];
    if (next) await acceptLogo(next);
    input.value = '';
  }

  async function dropLogoFile(event: DragEvent) {
    event.preventDefault();
    const next = event.dataTransfer?.files[0];
    if (next) await acceptLogo(next);
  }

  async function acceptLogo(next: File) {
    const attempt = ++logoValidationAttempt;
    error = '';
    logoState = 'validating';
    try {
      const metadata = await validateLogoFile(next);
      if (attempt !== logoValidationAttempt) return;
      // Image and video validation may run concurrently on the file step.
      invalidateExport(false);
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      logoFile = next;
      logoMetadata = metadata;
      logoUrl = URL.createObjectURL(next);
      logoState = 'ready';
      previewReady = false;
    } catch (cause) {
      if (attempt !== logoValidationAttempt) return;
      error = `error.${cause instanceof LogoValidationError ? cause.code : 'logoDecode'}` as MessageKey;
      logoState = 'error';
    }
  }

  async function acceptFile(next: File) {
    resetSource();
    fileState = 'validating';
    const metadata = await validateFile(next);
    if (!metadata) return;
    useSource(next, metadata);
    trimRequired = metadata.duration > MAX_TRIM_DURATION;
    step = 2;
  }

  function addBatchFiles(files: Iterable<File>) {
    const nextFiles = Array.from(files);
    if (!nextFiles.length) return;
    if (exportUnlocked || exportState !== 'idle') invalidateExport();
    const previousIds = new Set(videoBatch.map(({ id }) => id));
    videoBatch = appendVideoBatch(videoBatch, nextFiles, () => crypto.randomUUID());
    for (const item of videoBatch) {
      if (!previousIds.has(item.id)) validationQueue.push(item.id);
    }
    pumpBatchValidations();
  }

  function pumpBatchValidations() {
    while (validationWorkers.size < MAX_CONCURRENT_VALIDATIONS && validationQueue.length) {
      const id = validationQueue.shift();
      const item = videoBatch.find((candidate) => candidate.id === id && candidate.status === 'validating');
      if (item) validateBatchItem(item);
    }
  }

  function validateBatchItem(item: VideoBatchItem) {
    const validationWorker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });
    validationWorkers.set(item.id, validationWorker);
    validationWorker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (!videoBatch.some(({ id }) => id === item.id)) return finishBatchValidation(item.id);
      if (data.type === 'validated') videoBatch = validateVideoBatchItem(videoBatch, item.id, data.metadata);
      else if (data.type === 'error') videoBatch = rejectVideoBatchItem(videoBatch, item.id, data.code);
      if (data.type === 'validated' || data.type === 'error') finishBatchValidation(item.id);
    };
    validationWorker.onerror = () => {
      if (videoBatch.some(({ id }) => id === item.id)) videoBatch = rejectVideoBatchItem(videoBatch, item.id, 'generic');
      finishBatchValidation(item.id);
    };
    validationWorker.postMessage({ type: 'validate', file: item.file, maxDuration: MAX_TRIM_DURATION });
  }

  function finishBatchValidation(id: string) {
    validationWorkers.get(id)?.terminate();
    validationWorkers.delete(id);
    pumpBatchValidations();
  }

  function removeBatchVideo(id: string) {
    const removedActiveSource = videoBatch.find((item) => item.id === id)?.file === file;
    validationQueue = validationQueue.filter((queuedId) => queuedId !== id);
    videoBatch = removeVideoBatchItem(videoBatch, id);
    logoVideoOverrides = resetVideoLogoOverride(logoVideoOverrides, id);
    finishBatchValidation(id);
    invalidateExport();
    if (removedActiveSource) resetSource();
  }

  function continueLogoBatch() {
    const first = supportedVideoBatchItems(videoBatch)[0];
    if (!first?.metadata || !logoSource) return;
    const target = initialLogoBatchEditorTarget(videoBatch);
    useSource(first.file, first.metadata);
    logoBatchEditorTarget = target;
    step = 2;
  }

  function showBatchDefault() {
    if (!batchDefaultAvailable || !logoMetadata || editingBatchDefault) return;
    logoBatchEditorTarget = { type: 'batch-default' };
    previewReady = false;
  }

  function showBatchVideo(item: VideoBatchItem) {
    if (item.status === 'validating' || logoBatchEditorTarget?.type === 'video' && logoBatchEditorTarget.id === item.id) return;
    logoBatchEditorTarget = { type: 'video', id: item.id };
    previewReady = false;
    if (!item.metadata) return;
    useSource(item.file, item.metadata);
    const playhead = videoBatchPlayhead(videoBatchPlayheads, item.id, item.metadata.duration);
    project = updateEditorProject(project, { type: 'seeked', time: playhead });
  }

  function seekBatchVideo(time: number) {
    if (!selectedBatchItem?.metadata) return;
    videoBatchPlayheads = seekVideoBatchItem(
      videoBatchPlayheads,
      selectedBatchItem.id,
      time,
      selectedBatchItem.metadata.duration,
    );
    project = updateEditorProject(project, { type: 'seeked', time });
  }

  function useSource(next: File, metadata: SourceMetadata) {
    invalidateExport();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    file = next;
    sourceMetadata = metadata;
    sourceUrl = URL.createObjectURL(next);
    unsupportedAudio = metadata.unsupportedAudio;
    project = updateEditorProject(project, { type: 'source-loaded', duration: metadata.duration });
    fileState = 'ready';
    previewReady = false;
  }

  function resetSource() {
    invalidateExport();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = '';
    file = null;
    sourceMetadata = null;
    fileState = 'idle';
    previewReady = false;
    unsupportedAudio = false;
    trimRequired = false;
    project = createEditorProject('layer-1');
  }

  function resetVideoBatch() {
    for (const validationWorker of validationWorkers.values()) validationWorker.terminate();
    validationWorkers.clear();
    validationQueue = [];
    videoBatch = [];
    logoBatchEditorTarget = undefined;
    videoBatchPlayheads = {};
  }

  function invalidateExport(terminateWorker = true) {
    exportAttempt += 1;
    if (terminateWorker) {
      cancelWorkerTask?.();
      cancelWorkerTask = undefined;
      worker?.terminate();
      worker = undefined;
    }
    void cleanupTemporaryOutput();
    void cleanupBatchExportResults();
    stopTimer();
    exportUnlocked = false;
    exportState = 'idle';
    progress = 0;
    batchExportQueue = [];
    elapsed = 0;
    error = '';
  }

  function resetLogo() {
    logoValidationAttempt += 1;
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoFile = null;
    logoUrl = '';
    logoMetadata = null;
    logoState = 'idle';
    logoBatchDefault = { ...DEFAULT_LOGO_SETTINGS };
    logoVideoOverrides = {};
  }

  function chooseWorkflow(next: Workflow) {
    workflow = next;
    step = 1;
  }

  function returnToWorkflowChoice() {
    const hasWork = fileState !== 'idle' || logoState !== 'idle' || videoBatch.length > 0 || exportState !== 'idle';
    if (needsDiscardConfirmation(workflow, hasWork) && !window.confirm($t('scenario.confirmDiscard'))) return;
    resetSource();
    resetLogo();
    resetVideoBatch();
    workflow = null;
    step = 1;
  }

  function navigate(next: WorkflowStep) {
    if (next === 1) step = next;
    else if (next === 2 && workflow === 'logo') continueLogoBatch();
    else if ((next === 2 && !!file) || (next === 3 && exportUnlocked)) step = next;
  }

  function addLayer() { dispatch({ type: 'layer-added', id: crypto.randomUUID(), text: $t('inspector.caption') }); }
  function removeLayer(id: string) { dispatch({ type: 'layer-removed', id }); }
  function updateLayer(patch: Partial<LayerStyle>) { dispatch({ type: 'layer-updated', patch }); }
  function moveLayer(id: string, patch: Pick<LayerStyle, 'x' | 'y'>) {
    dispatch({ type: 'layer-selected', id });
    dispatch({ type: 'layer-updated', patch });
  }
  function updateLogoSettings(patch: Partial<LogoSettings>) {
    if (!logoMetadata) return;
    invalidateExport();
    const next = { ...logoEditorSettings, ...patch };
    if (patch.size !== undefined) {
      next.size = Math.min(patch.size, maximumLogoSize(logoMetadata, logoEditorFrame, next));
    }
    const fitted = fitLogoSettings(logoMetadata, logoEditorFrame, next);
    if (editingBatchDefault) {
      logoBatchDefault = fitted;
      return;
    }
    if (!selectedBatchItemId) return;
    const explicitPatch: Partial<LogoSettings> = {};
    for (const key of Object.keys(patch) as LogoSettingKey[]) {
      assignLogoSetting(explicitPatch, key, fitted[key]);
    }
    logoVideoOverrides = updateVideoLogoOverride(
      logoVideoOverrides,
      selectedBatchItemId,
      logoBatchDefault,
      explicitPatch,
    );
  }
  function resetLogoOverrideProperty(key: LogoSettingKey) {
    if (!selectedBatchItemId) return;
    invalidateExport();
    logoVideoOverrides = resetVideoLogoOverrideProperty(logoVideoOverrides, selectedBatchItemId, key);
  }
  function resetAllLogoOverrides() {
    if (!selectedBatchItemId) return;
    invalidateExport();
    logoVideoOverrides = resetVideoLogoOverride(logoVideoOverrides, selectedBatchItemId);
  }
  function openExport() { if (readyToExport) { exportUnlocked = true; step = 3; } }

  function confirmTrim(trim: TrimWindow) {
    const remountPreview = trimRequired;
    dispatch({ type: 'trim-updated', patch: trim });
    trimRequired = false;
    if (remountPreview) previewReady = false;
  }

  function relativeTime(value: number) {
    return Math.max(0, value - project.trim.trimIn);
  }

  function validateFile(next: File): Promise<SourceMetadata | null> {
    return new Promise((resolve) => {
      worker?.terminate();
      worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        if (data.type === 'validated') { worker?.terminate(); resolve(data.metadata); }
        else if (data.type === 'error') { error = errorKey(data.code); fileState = 'error'; worker?.terminate(); resolve(null); }
      };
      worker.postMessage({ type: 'validate', file: next });
    });
  }

  async function exportVideo(nextPreset = preset) {
    if (workflow === 'logo') {
      await exportLogoBatch(nextPreset);
      return;
    }
    await exportSingleVideo(nextPreset);
  }

  async function exportSingleVideo(nextPreset = preset) {
    if (!file || !readyToExport) return;
    const attempt = ++exportAttempt;
    worker?.terminate(); stopTimer();
    exportState = 'exporting'; progress = 0; elapsed = 0; error = '';
    const cleaned = await cleanupTemporaryOutput();
    if (!cleaned) {
      exportState = 'error';
      return;
    }
    if (attempt !== exportAttempt) return;
    try {
      temporaryOutput = await createTemporaryOutput();
    } catch (cause) {
      error = errorKey(cause instanceof TemporaryStorageUnavailableError ? 'storage' : 'generic');
      exportState = 'error';
      return;
    }
    if (attempt !== exportAttempt) {
      await cleanupTemporaryOutput();
      return;
    }
    worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });
    exportTimer = setInterval(() => elapsed += 1, 1000);
    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      if (attempt !== exportAttempt) return;
      if (data.type === 'progress') progress = Math.round(data.completed / data.total * 100);
      else if (data.type === 'complete') {
        progress = 100; stopTimer();
        const completedOutput = temporaryOutput;
        temporaryOutput = undefined;
        save(data.file, completedOutput, file);
        exportState = 'done'; worker?.terminate(); worker = undefined;
      } else if (data.type === 'error') {
        stopTimer(); error = errorKey(data.code); exportState = 'error'; worker?.terminate(); worker = undefined;
        void cleanupTemporaryOutput();
      }
    };
    worker.onerror = () => {
      if (attempt !== exportAttempt) return;
      stopTimer(); error = errorKey('generic'); exportState = 'error'; worker?.terminate(); worker = undefined;
      void cleanupTemporaryOutput();
    };
    const request: ExportRequest = {
      type: 'export', file, preset: nextPreset,
      layers: workflow === 'text' ? project.layers.map(({ id: _id, kind: _kind, ...layer }) => layer) : [],
      logo: workflow === 'logo' ? exportLogoSource : undefined,
      trim: project.trim,
      output: temporaryOutput.handle,
    };
    try {
      worker.postMessage(request);
    } catch {
      stopTimer(); error = errorKey('storage'); exportState = 'error'; worker.terminate(); worker = undefined;
      void cleanupTemporaryOutput();
    }
  }

  async function exportLogoBatch(nextPreset: ExportPreset) {
    if (!logoFile || !logoMetadata || !readyToExport || validatingVideoCount > 0) return;
    const batchLogoFile = logoFile;
    const batchLogoMetadata = logoMetadata;
    const attempt = ++exportAttempt;
    cancelWorkerTask?.(); cancelWorkerTask = undefined;
    worker?.terminate(); worker = undefined; stopTimer();
    exportState = 'exporting'; progress = 0; elapsed = 0; error = '';
    const currentCleaned = await cleanupTemporaryOutput();
    const resultsCleaned = await cleanupBatchExportResults();
    if (!currentCleaned || !resultsCleaned) {
      exportState = 'error';
      return;
    }
    if (attempt !== exportAttempt) return;

    batchExportQueue = createBatchExportQueue(videoBatch);
    const exportItems = batchExportQueue.map((item) => ({
      item,
      logo: resolveBatchExportLogoSource(
        item,
        batchLogoFile,
        batchLogoMetadata,
        logoBatchDefault,
        logoVideoOverrides,
      ),
    }));
    exportTimer = setInterval(() => elapsed += 1, 1000);

    for (const { item, logo } of exportItems) {
      if (attempt !== exportAttempt) return;
      batchExportQueue = startNextBatchExportItem(batchExportQueue);
      const result = await exportLogoBatchItem(item, logo, nextPreset, attempt);
      if (attempt !== exportAttempt || result.type === 'cancelled') return;
      if (result.type === 'error') {
        stopTimer();
        error = errorKey(result.code);
        exportState = 'error';
        await cleanupTemporaryOutput();
        await cleanupBatchExportResults();
        return;
      }
      batchExportResults = [...batchExportResults, { item, file: result.file, output: result.output }];
      batchExportQueue = completeBatchExportItem(batchExportQueue, item.id);
      progress = batchExportProgress(batchExportQueue);
    }

    stopTimer();
    progress = 100;
    exportState = 'done';
    if (batchExportResults.length === 1) {
      const [result] = batchExportResults;
      batchExportResults = [];
      save(result.file, result.output, result.item.file);
    }
  }

  async function exportLogoBatchItem(
    item: BatchExportItem,
    logo: LogoSource,
    nextPreset: ExportPreset,
    attempt: number,
  ): Promise<
    | { type: 'complete'; file: File; output: TemporaryOutput }
    | { type: 'error'; code: WorkerErrorCode }
    | { type: 'cancelled' }
  > {
    try {
      temporaryOutput = await createTemporaryOutput();
    } catch (cause) {
      return {
        type: 'error',
        code: cause instanceof TemporaryStorageUnavailableError ? 'storage' : 'generic',
      };
    }
    if (attempt !== exportAttempt) {
      await cleanupTemporaryOutput();
      return { type: 'cancelled' };
    }

    const output = temporaryOutput;
    worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result:
        | { type: 'complete'; file: File; output: TemporaryOutput }
        | { type: 'error'; code: WorkerErrorCode }
        | { type: 'cancelled' },
      ) => {
        if (settled) return;
        settled = true;
        cancelWorkerTask = undefined;
        worker?.terminate();
        worker = undefined;
        resolve(result);
      };
      cancelWorkerTask = () => finish({ type: 'cancelled' });
      worker!.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        if (attempt !== exportAttempt) return finish({ type: 'cancelled' });
        if (data.type === 'progress') {
          batchExportQueue = updateBatchExportProgress(batchExportQueue, item.id, data.completed);
          progress = batchExportProgress(batchExportQueue);
        } else if (data.type === 'complete') {
          temporaryOutput = undefined;
          finish({ type: 'complete', file: data.file, output });
        } else if (data.type === 'error') {
          finish({ type: 'error', code: data.code });
        }
      };
      worker!.onerror = () => finish({ type: 'error', code: 'generic' });
      const request = createBatchExportRequest(item, nextPreset, logo, output.handle);
      try {
        worker!.postMessage(request);
      } catch {
        finish({ type: 'error', code: 'storage' });
      }
    });
  }

  function save(result: File, output: TemporaryOutput | undefined, source: File | null) {
    const url = URL.createObjectURL(result);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${source?.name.replace(/\.[^.]+$/, '') ?? 'klex-export'}-klex.mp4`;
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      void output?.dispose().catch(() => { error = errorKey('storage'); });
    }, 1000);
  }
  function stopTimer() { if (exportTimer) clearInterval(exportTimer); exportTimer = undefined; }
  function cancelExport() {
    exportAttempt += 1;
    cancelWorkerTask?.(); cancelWorkerTask = undefined;
    worker?.terminate(); worker = undefined;
    stopTimer(); exportState = 'idle'; progress = 0; batchExportQueue = [];
    void cleanupTemporaryOutput();
    void cleanupBatchExportResults();
  }
  async function cleanupTemporaryOutput() {
    const output = temporaryOutput;
    temporaryOutput = undefined;
    if (!output) return true;
    try {
      await output.dispose();
      return true;
    } catch {
      temporaryOutput = output;
      error = errorKey('storage');
      return false;
    }
  }
  async function cleanupBatchExportResults() {
    const results = batchExportResults;
    batchExportResults = [];
    if (!results.length) return true;
    const disposed = await Promise.all(results.map(async ({ output }) => {
      try {
        await output.dispose();
        return true;
      } catch {
        return false;
      }
    }));
    const failed = results.filter((_, index) => !disposed[index]);
    if (!failed.length) return true;
    batchExportResults = failed;
    error = errorKey('storage');
    return false;
  }
  function formatDuration(value: number) { return `${Math.floor(value / 60)}:${Math.round(value % 60).toString().padStart(2, '0')}`; }
  function errorKey(code: WorkerErrorCode): MessageKey {
    return code === 'durationLimit' ? 'error.logoVideoDuration' : `error.${code}` as MessageKey;
  }
  function chooseLocale(event: Event) { setLocale((event.currentTarget as HTMLSelectElement).value as Locale); }
  function assignLogoSetting<K extends LogoSettingKey>(
    settings: Partial<LogoSettings>,
    key: K,
    value: LogoSettings[K],
  ) {
    settings[key] = value;
  }
</script>

<svelte:head><title>{$t('meta.title')}</title><meta name="theme-color" content="#0b0d10" /></svelte:head>

<main class="app-shell">
  <header class="app-header">
    <div class="header-context">
      <button class="brand" aria-label={$t('brand.home')} onclick={returnToWorkflowChoice}><span class="brand-mark">k</span><span><b>klex</b><small>{$t('brand.tagline')}</small></span></button>
      {#if workflow && file}<div class="project-file"><span></span><p>{workflow === 'logo' && step === 2 ? editingBatchDefault ? $t('logo.batchDefault') : selectedBatchItem?.file.name ?? file.name : file.name}<small>{workflow === 'logo' && step === 2 && editingBatchDefault ? $t('logo.batchDefaultNotVideo') : `${formatDuration(selectedBatchItem?.metadata?.duration ?? project.duration)} · ${workflow === 'text' ? $t('layer.count', { count: project.layers.length }) : logoFile?.name}`}</small></p></div>{/if}
    </div>
    <div class="header-actions">
      <label class="language-picker"><span class="sr-only">{$t('language.label')}</span><select aria-label={$t('language.label')} value={$locale} onchange={chooseLocale}>{#each languages as language}<option value={language.code}>{language.name}</option>{/each}</select></label>
      {#if workflow && step === 2 && file}<button class="primary header-export" disabled={!readyToExport} onclick={openExport}>{$t('header.export')} <b>→</b></button>{/if}
    </div>
  </header>

  {#if workflow}<StepIndicator {workflow} current={step} {exportUnlocked} onNavigate={navigate} />{/if}

  {#if workflow === null}
    <section class="scenario-step step-view">
      <div class="hero-copy scenario-copy">
        <span class="eyebrow">{$t('scenario.eyebrow')}</span>
        <h1>{$t('scenario.title')}</h1>
        <p>{$t('scenario.subtitle')}</p>
      </div>
      <div class="scenario-grid">
        <button class="scenario-card text-scenario" onclick={() => chooseWorkflow('text')}>
          <span class="scenario-icon" aria-hidden="true">Aa</span>
          <span class="scenario-meta">{$t('scenario.text.meta')}</span>
          <strong>{$t('scenario.text.title')}</strong>
          <p>{$t('scenario.text.description')}</p>
          <span class="scenario-route"><span>{$t('steps.video')} · {$t('steps.overlays')} · {$t('steps.export')}</span><b aria-hidden="true">→</b></span>
        </button>
        <button class="scenario-card logo-scenario" onclick={() => chooseWorkflow('logo')}>
          <span class="scenario-icon logo-icon" aria-hidden="true">◇</span>
          <span class="scenario-meta">{$t('scenario.logo.meta')}</span>
          <strong>{$t('scenario.logo.title')}</strong>
          <p>{$t('scenario.logo.description')}</p>
          <span class="scenario-route"><span>{$t('steps.files')} · {$t('steps.position')} · {$t('steps.export')}</span><b aria-hidden="true">→</b></span>
        </button>
      </div>
      <div class="privacy-note"><span>✦</span><p><strong>{$t('privacy.title')}</strong><br />{$t('privacy.body')}</p></div>
    </section>
  {:else if workflow === 'logo' && step === 1}
    <section class="logo-files-step step-view">
      <div class="hero-copy logo-files-copy">
        <span class="eyebrow">{$t('logo.filesEyebrow')}</span>
        <h1>{$t('logo.filesTitle')}</h1>
        <p>{$t('logo.filesDescription')}</p>
      </div>
      <div class="logo-file-grid">
        <div class="file-picker">
          <span class="kicker">{$t('logo.imageLabel')}</span>
          <label class:loading={logoState === 'validating'} class:ready={logoState === 'ready'} class="dropzone logo-dropzone" ondragover={(event) => event.preventDefault()} ondrop={dropLogoFile}>
            <input type="file" accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg" onchange={selectLogoFile} disabled={logoState === 'validating'} />
            <span class="upload-icon">◇</span><strong>{$t(logoState === 'ready' ? 'logo.selected' : 'logo.imageDrop')}</strong><p>{logoFile?.name ?? $t('logo.imageHint')}</p>
            <div><span>{$t('logo.imageLimits')}</span></div>
          </label>
        </div>
        <div class="file-picker">
          <span class="kicker">{$t('logo.videoLabel')}</span>
          <label class:loading={validatingVideoCount > 0} class:ready={supportedBatch.length > 0} class="dropzone logo-dropzone" ondragover={(event) => event.preventDefault()} ondrop={dropBatchFiles}>
            <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple onchange={selectBatchFiles} />
            <span class="upload-icon">↑</span><strong>{$t('logo.videoDrop')}</strong><p>{$t('logo.videoHint')}</p>
            <div><span>{$t('logo.videoLimits', { seconds: MAX_TRIM_DURATION })}</span></div>
          </label>
        </div>
      </div>
      <VideoBatchList items={videoBatch} onRemove={removeBatchVideo} />
      {#if logoState === 'error' && error}<div class="notice error" role="alert">{$t(error, { seconds: MAX_TRIM_DURATION })}</div>{/if}
      <div class="batch-actions">
        <span>{$t('logo.batchSupported', { count: supportedBatch.length })}</span>
        <button class="primary" disabled={!logoSource || supportedBatch.length === 0 || validatingVideoCount > 0} onclick={continueLogoBatch}>{$t('logo.batchContinue')} →</button>
      </div>
      <div class="privacy-note"><span>✦</span><p><strong>{$t('privacy.title')}</strong><br />{$t('privacy.body')}</p></div>
      <button class="secondary workflow-back" onclick={returnToWorkflowChoice}>← {$t('brand.home')}</button>
    </section>
  {:else if workflow === 'logo' && step === 2 && logoBatchEditorTarget && logoSource && logoUrl}
    <section class="logo-editor-step step-view">
      <div class="step-title"><div><span class="eyebrow">{$t('logo.previewEyebrow')}</span><h1>{$t(editingBatchDefault ? 'logo.batchDefault' : 'logo.previewTitle')}</h1><p>{$t(editingBatchDefault ? 'logo.batchDefaultDescription' : 'logo.previewDescription')}</p></div></div>
      {#if videoBatch.length > 1}
        <nav class="logo-preview-targets" aria-label={$t('logo.previewTarget')}>
          {#if batchDefaultAvailable}
            <button class:active={editingBatchDefault} aria-pressed={editingBatchDefault} onclick={showBatchDefault}>
              <span aria-hidden="true">◇</span>
              <span><strong>{$t('logo.batchDefault')}</strong><small>{$t('logo.returnToBatchDefault')}</small></span>
            </button>
          {/if}
          {#each videoBatch as item, index (item.id)}
            <button
              class:active={selectedBatchItem?.id === item.id}
              class:error={item.status === 'error'}
              class:warning={item.status === 'warning'}
              aria-pressed={selectedBatchItem?.id === item.id}
              disabled={item.status === 'validating'}
              onclick={() => showBatchVideo(item)}
            >
              <span aria-hidden="true">{index + 1}</span>
              <span>
                <strong>{item.file.name}</strong>
                <small>{item.metadata ? `${formatDuration(item.metadata.duration)} · ${item.metadata.width}×${item.metadata.height}` : item.error ? $t(errorKey(item.error), { seconds: MAX_TRIM_DURATION }) : $t('logo.batchChecking')}</small>
              </span>
            </button>
          {/each}
        </nav>
      {/if}
      <div class="logo-workspace">
        {#if editingBatchDefault}
          {#key `batch-default:${logoUrl}`}
            <LogoStage {sourceUrl} {logoUrl} videoWidth={logoEditorFrame.width} videoHeight={logoEditorFrame.height} logo={logoSource} batchDefault onReady={() => previewReady = true} onChange={updateLogoSettings} />
          {/key}
        {:else if selectedBatchItem?.metadata && sourceUrl}
          {#key `${selectedBatchItem.id}:${sourceUrl}:${logoUrl}`}
            <LogoStage {sourceUrl} {logoUrl} videoWidth={logoEditorFrame.width} videoHeight={logoEditorFrame.height} duration={selectedBatchItem.metadata.duration} playhead={logoPreviewPlayhead} logo={logoSource} onSeek={seekBatchVideo} onReady={() => previewReady = true} onChange={updateLogoSettings} />
          {/key}
        {:else if selectedBatchItem}
          <section class="preview-panel logo-preview logo-preview-error" role="alert">
            <span aria-hidden="true">!</span>
            <strong>{$t(`logo.batchStatus.${selectedBatchItem.status}` as MessageKey)}</strong>
            <p>{selectedBatchItem.error ? $t(errorKey(selectedBatchItem.error), { seconds: MAX_TRIM_DURATION }) : $t('logo.batchChecking')}</p>
          </section>
        {/if}
        <LogoInspector
          image={logoSource}
          frame={logoEditorFrame}
          settings={logoEditorSettings}
          onChange={updateLogoSettings}
          videoOverride={!editingBatchDefault}
          overridden={overriddenLogoProperties}
          fitted={fittedLogoProperties}
          onReset={resetLogoOverrideProperty}
          onResetAll={resetAllLogoOverrides}
        />
      </div>
      <footer class="step-actions"><button class="secondary" onclick={() => navigate(1)}>← {$t('logo.replaceFiles')}</button><div><span class:ready={logoEditorReady}>{$t(logoEditorReady ? 'editor.previewReady' : 'editor.previewPreparing')}</span></div></footer>
    </section>
  {:else if step === 1}
    <section class="upload-step step-view">
      <div class="hero-copy"><span class="eyebrow">{$t('hero.eyebrow')}</span><h1>{$t('hero.before')}<br/><em>{$t('hero.emphasis')}</em><br/>{$t('hero.after')}</h1><p>{$t('hero.subtitle')}</p></div>
      <label class:loading={fileState === 'validating'} class="dropzone" ondragover={(event) => event.preventDefault()} ondrop={dropFile}>
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onchange={selectFile} disabled={fileState === 'validating'} />
        <span class="upload-icon">↑</span><strong>{$t(fileState === 'validating' ? 'upload.checking' : 'upload.drop')}</strong><p>{$t(fileState === 'validating' ? 'upload.checkingHint' : 'upload.selectHint')}</p>
        <div><span>MP4 / MOV</span><span>{$t('upload.upTo4k')}</span><span>{$t('upload.limit', { seconds: MAX_TRIM_DURATION })}</span></div>
      </label>
      {#if fileState === 'error' && error}<div class="notice error" role="alert">{$t(error)}</div>{/if}
      <div class="privacy-note"><span>✦</span><p><strong>{$t('privacy.title')}</strong><br />{$t('privacy.body')}</p></div>
    </section>
  {:else if step === 2 && file && sourceUrl}
    <section class="editor-step step-view">
      <div class="step-title"><div><span class="eyebrow">{$t('editor.step')}</span><p>{$t('editor.description')}</p></div><button class="primary add-layer" onclick={addLayer}><span>＋</span> {$t('editor.addOverlay')}</button></div>
      <div class="workspace">
        <div class="preview-column">
          {#if !trimRequired}<VideoStage {sourceUrl} duration={project.duration} layers={project.layers} activeLayerId={project.activeLayerId} playhead={project.playhead} trim={project.trim} onSeek={(time) => dispatch({ type: 'seeked', time })} onReady={() => previewReady = true} onSelectLayer={(id) => dispatch({ type: 'layer-selected', id })} onMoveLayer={moveLayer} onUpdateLayer={updateLayer} onConfirmTrim={confirmTrim} />{/if}
          <div class="mobile-layer-bar" aria-label={$t('editor.overlays')}>
            {#each project.layers as layer (layer.id)}
              <div class="mobile-layer-chip" class:active={layer.id === project.activeLayerId}>
                <button class="chip-select" onclick={() => dispatch({ type: 'layer-selected', id: layer.id })}>{layer.text || $t('editor.noText')}</button>
                <button class="chip-remove" aria-label={$t('editor.removeNamed', { name: layer.text })} disabled={project.layers.length === 1} onclick={() => removeLayer(layer.id)}>×</button>
              </div>
            {/each}
            <button class="chip-add" aria-label={$t('editor.addOverlay')} onclick={addLayer}>＋</button>
          </div>
        </div>
        <div class="controls-column">
          <section class="layers-card card">
            <div class="section-heading"><div><span class="kicker">{$t('editor.composition')}</span><h3>{$t('editor.layers')} <span class="count">{project.layers.length}</span></h3></div><button class="icon-add" onclick={addLayer} aria-label={$t('editor.addLayer')}>＋</button></div>
            <div class="layer-list">{#each project.layers as layer, index (layer.id)}<button class="layer-item" class:active={layer.id === project.activeLayerId} onclick={() => dispatch({ type: 'layer-selected', id: layer.id })}><span class="layer-index">{String(index + 1).padStart(2, '0')}</span><span class="layer-copy"><strong>{layer.text || $t('editor.noText')}</strong><small>{$t('editor.seconds', { value: `${relativeTime(layer.startTime).toFixed(1)}—${relativeTime(layer.endTime).toFixed(1)}` })}</small></span><span class="layer-dot"></span></button>{/each}</div>
          </section>
          {#if activeLayer}<LayerInspector layer={activeLayer} canRemove={project.layers.length > 1} onUpdate={updateLayer} onRemove={() => dispatch({ type: 'layer-removed' })} />{/if}
        </div>
      </div>
      <footer class="step-actions"><button class="secondary" onclick={() => navigate(1)}>← {$t('editor.replaceVideo')}</button><div><span class:ready={editorReady}>{$t(editorReady ? 'editor.previewReady' : 'editor.previewPreparing')}</span></div></footer>
    </section>
  {:else if step === 3 && file}
    <section class="export-step step-view">
      <div class="export-layout">
        <div class="export-copy"><span class="eyebrow">{$t('export.finalStep')}</span><h1>{$t('export.ready')}</h1><p>{$t('export.description')}</p><div class="summary card"><div><span>{$t('export.file')}</span><strong>{workflow === 'logo' ? $t('logo.batchSupported', { count: supportedBatch.length }) : file.name}</strong></div><div><span>{$t('export.clip')}</span><strong>{workflow === 'logo' ? $t('logo.fullVideo') : $t('editor.seconds', { value: `${project.trim.trimIn.toFixed(1)}—${project.trim.trimOut.toFixed(1)}` })}</strong></div><div><span>{$t('export.composition')}</span><strong>{workflow === 'logo' ? logoFile?.name : $t('layer.count', { count: project.layers.length })}</strong></div></div></div>
        <section class="preset-panel card"><span class="kicker">{$t('export.quality')}</span><h2>{$t('export.chooseSize')}</h2><div class="preset-list"><button class:active={preset === 'high'} onclick={() => preset = 'high'}><span class="radio"></span><span><strong>{$t('export.high')}</strong><small>{$t('export.highDetail')}</small></span><em>{$t('export.best')}</em></button><button class:active={preset === 'standard'} onclick={() => preset = 'standard'}><span class="radio"></span><span><strong>{$t('export.standard')}</strong><small>{$t('export.standardDetail')}</small></span><em>{$t('export.balance')}</em></button><button class:active={preset === 'light'} onclick={() => preset = 'light'}><span class="radio"></span><span><strong>{$t('export.light')}</strong><small>{$t('export.lightDetail')}</small></span><em>{$t('export.fast')}</em></button></div>{#if workflow === 'logo' ? batchHasUnsupportedAudio : unsupportedAudio}<div class="notice warning">{$t('error.audio')}</div>{/if}{#if exportState === 'error' && error}<div class="notice error">{$t(error)}</div>{/if}{#if exportState === 'done'}<div class="notice success">{$t(workflow === 'logo' && supportedBatch.length > 1 ? 'logo.exportComplete' : 'export.saved')}</div>{#if workflow === 'logo'}<BatchExportProgress items={batchExportQueue} />{/if}{/if}<button class="export-button" onclick={() => exportVideo()} disabled={exportState === 'exporting'}><span>{$t('export.button')}</span><b>→</b></button>{#if exportState === 'error'}<button class="retry" onclick={() => exportVideo('light')}>{$t('export.retry')}</button>{/if}</section>
      </div>
      <footer class="step-actions"><button class="secondary" onclick={() => navigate(2)}>← {$t('export.back')}</button></footer>
    </section>
  {/if}
</main>

{#if workflow === 'text' && step === 2 && file && sourceUrl && trimRequired}
  <div class="trim-gate" role="dialog" aria-modal="true" aria-labelledby="trim-gate-title">
    <div class="trim-gate-dialog">
      <div class="trim-gate-copy"><span class="eyebrow">{$t('trim.required')}</span><h2 id="trim-gate-title">{$t('trim.tooLong')}</h2><p>{$t('trim.choose', { seconds: MAX_TRIM_DURATION })}</p></div>
      <VideoStage {sourceUrl} duration={project.duration} layers={project.layers} activeLayerId={project.activeLayerId} playhead={project.playhead} trim={project.trim} forceTrim onSeek={(time) => dispatch({ type: 'seeked', time })} onReady={() => previewReady = true} onSelectLayer={(id) => dispatch({ type: 'layer-selected', id })} onMoveLayer={moveLayer} onUpdateLayer={updateLayer} onConfirmTrim={confirmTrim} />
    </div>
  </div>
{/if}

{#if exportState === 'exporting'}<div class="progress-overlay" role="dialog" aria-modal="true" aria-label={$t('progress.label')}><section class="progress-card" class:batch-progress-card={workflow === 'logo'}><div class="render-orbit"><span></span><b>{progress}%</b></div><span class="eyebrow">{$t(workflow === 'logo' ? 'logo.exportOverall' : 'progress.rendering')}</span><h2>{$t('progress.composing')}</h2><p>{$t('progress.elapsed', { seconds: elapsed })}</p>{#if workflow === 'logo'}<BatchExportProgress items={batchExportQueue} />{/if}<progress value={progress} max="100"></progress><button class="secondary" onclick={cancelExport}>{$t('common.cancel')}</button></section></div>{/if}
