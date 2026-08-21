/// <reference lib="webworker" />
import {
  BlobSource,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  StreamTarget,
} from 'mediabunny';
import { EXPORT_VIDEO_BITRATES, type ExportPreset, type ExportRequest, type ValidateRequest, type WorkerErrorCode, type WorkerMessage } from '../lib/export-protocol';
import { isInTrimWindow } from '../lib/trim';
import { createVideoRenderer, type VideoRenderer } from '../lib/video-renderer';

declare const self: DedicatedWorkerGlobalScope;

const MAX_IN_FLIGHT_FRAMES = 2;
const codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];

self.onmessage = ({ data }: MessageEvent<ExportRequest | ValidateRequest>) => {
  const task = data.type === 'validate' ? validateFile(data) : exportFile(data);
  void task.catch((cause: unknown) => {
    post({ type: 'error', code: cause instanceof WorkerFailure ? cause.code : 'generic' });
  });
};

async function validateFile({ file, maxDuration }: ValidateRequest) {
  if (!isSupportedContainer(file)) throw new WorkerFailure('container');
  if (!('VideoDecoder' in self)) throw new WorkerFailure('webCodecs');
  if (maxDuration !== undefined && (!('OffscreenCanvas' in self) || !('VideoEncoder' in self))) {
    throw new WorkerFailure('capabilities');
  }
  const input = new Input({ formats: [MP4], source: new BlobSource(file) });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new WorkerFailure('noVideo');
    const [decoderConfig, width, height, duration, audioTrack] = await Promise.all([
      videoTrack.getDecoderConfig(),
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      input.getDurationFromMetadata([videoTrack]),
      input.getPrimaryAudioTrack(),
    ]);
    if (!decoderConfig || !(await VideoDecoder.isConfigSupported(decoderConfig)).supported) throw new WorkerFailure('videoCodec');
    if (width > 3840 || height > 3840) throw new WorkerFailure('resolution');
    if (!duration || duration <= 0) throw new WorkerFailure('duration');
    if (maxDuration !== undefined && duration > maxDuration) throw new WorkerFailure('durationLimit');
    const supportedAudio = audioTrack ? await isAacLc(audioTrack) : true;
    const audioStats = audioTrack && supportedAudio ? await audioTrack.computePacketStats() : undefined;
    const audioBitrate = audioStats?.averageBitrate ?? 0;
    post({
      type: 'validated',
      metadata: {
        duration,
        width,
        height,
        unsupportedAudio: !supportedAudio,
        audioBitrate: Number.isFinite(audioBitrate) ? audioBitrate : 0,
      },
    });
  } finally {
    input.dispose();
  }
}

async function exportFile({ file, preset, layers, logo, trim, output: outputHandle }: ExportRequest) {
  if (!('OffscreenCanvas' in self) || !('VideoDecoder' in self) || !('VideoEncoder' in self)) {
    throw new WorkerFailure('capabilities');
  }
  if (!outputHandle || typeof outputHandle.createWritable !== 'function') throw new WorkerFailure('storage');

  const input = new Input({ formats: [MP4], source: new BlobSource(file) });
  let output: Output | undefined;
  let decoder: VideoDecoder | undefined;
  let encoder: VideoEncoder | undefined;
  let renderer: VideoRenderer | undefined;
  let logoImage: ImageBitmap | undefined;
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new WorkerFailure('noVideo');
    const decoderConfig = await videoTrack.getDecoderConfig();
    if (!decoderConfig) throw new WorkerFailure('decoder');

    const audioTrack = await input.getPrimaryAudioTrack();
    // MP4 edit lists and B-frames may make the first presentation timestamp
    // negative. All output tracks share this origin so A/V stays in sync.
    const timelineStart = await input.getFirstTimestamp(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);
    const timelineStartMicroseconds = Math.round(timelineStart * 1_000_000);
    const [displayWidth, displayHeight, rotation] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      videoTrack.getRotation(),
    ]);
    const { width, height } = outputSize(displayWidth, displayHeight, preset);
    const encoderConfig = await supportedEncoderConfig(width, height, preset);
    const canvas = new OffscreenCanvas(width, height);
    if (logo) {
      try {
        logoImage = await createImageBitmap(logo.file);
      } catch {
        throw new WorkerFailure('logoDecode');
      }
    }
    renderer = createVideoRenderer(canvas, layers, rotation, logo && logoImage
      ? { image: logoImage, width: logo.width, height: logo.height, settings: logo.settings }
      : undefined);
    logoImage?.close();
    logoImage = undefined;
    let writable: FileSystemWritableFileStream;
    try {
      writable = await outputHandle.createWritable();
    } catch {
      throw new WorkerFailure('storage');
    }
    output = new Output({
      format: new Mp4OutputFormat(),
      target: new StreamTarget(
        writable as WritableStream<import('mediabunny').StreamTargetChunk>,
        { chunked: true },
      ),
    });
    const videoSource = new EncodedVideoPacketSource('avc');
    output.addVideoTrack(videoSource);

    let audioSource: EncodedAudioPacketSource | undefined;
    if (audioTrack && await isAacLc(audioTrack)) {
      audioSource = new EncodedAudioPacketSource('aac');
      output.addAudioTrack(audioSource, { decoderConfig: await audioTrack.getDecoderConfig() ?? undefined });
    }
    await output.start();

    let packetWrites = Promise.resolve();
    let firstVideoPacket = true;
    encoder = new VideoEncoder({
      output(chunk, metadata) {
        const packet = EncodedPacket.fromEncodedChunk(chunk);
        const isFirstPacket = firstVideoPacket;
        packetWrites = packetWrites.then(() => videoSource.add(packet, isFirstPacket ? metadata : undefined));
        firstVideoPacket = false;
      },
      error(error) { throw error; },
    });
    encoder.configure(encoderConfig);

    let rendered = Promise.resolve();
    const firstEncodedFrame = { value: true };
    decoder = new VideoDecoder({
      output(frame) {
        rendered = rendered.then(() => {
          return renderAndEncode(frame, renderer!, canvas, encoder!, timelineStartMicroseconds, trim.trimIn, trim.trimOut, firstEncodedFrame);
        });
      },
      error(error) { throw error; },
    });
    decoder.configure(decoderConfig);

    const videoPackets = new EncodedPacketSink(videoTrack);
    const trimStartKeyPacket = await videoPackets.getKeyPacket(timelineStart + trim.trimIn, { verifyKeyPackets: true });
    const trimDuration = trim.trimOut - trim.trimIn;
    let progressSeconds = 0;
    for await (const packet of videoPackets.packets(trimStartKeyPacket ?? undefined)) {
      if (packet.timestamp >= timelineStart + trim.trimOut) break;
      decoder.decode(packet.toEncodedVideoChunk());
      if (decoder.decodeQueueSize >= MAX_IN_FLIGHT_FRAMES) await rendered;
      progressSeconds = Math.max(progressSeconds, Math.min(trimDuration, packet.timestamp - timelineStart - trim.trimIn));
      post({ type: 'progress', completed: progressSeconds, total: trimDuration });
    }
    await decoder.flush();
    await rendered;
    await encoder.flush();
    await packetWrites;
    post({ type: 'progress', completed: trimDuration, total: trimDuration });
    decoder.close();
    encoder.close();
    renderer.close();
    renderer = undefined;
    videoSource.close();

    if (audioTrack && audioSource) {
      const audioPackets = new EncodedPacketSink(audioTrack);
      for await (const packet of audioPackets.packets()) {
        const relativeTimestamp = packet.timestamp - timelineStart;
        if (relativeTimestamp >= trim.trimOut) break;
        if (!isInTrimWindow(relativeTimestamp, trim)) continue;
        await audioSource.add(packet.clone({ timestamp: nonNegativeTimestamp(relativeTimestamp - trim.trimIn) }));
      }
      audioSource.close();
    }
    await output.finalize();
    const result = await outputHandle.getFile();
    post({ type: 'complete', file: result });
  } catch (cause) {
    await output?.cancel().catch(() => {});
    throw cause;
  } finally {
    if (decoder?.state !== 'closed') decoder?.close();
    if (encoder?.state !== 'closed') encoder?.close();
    renderer?.close();
    logoImage?.close();
    input.dispose();
  }
}

async function supportedEncoderConfig(width: number, height: number, preset: ExportPreset): Promise<VideoEncoderConfig> {
  const bitrate = EXPORT_VIDEO_BITRATES[preset];
  for (const codec of codecs) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: 30, hardwareAcceleration: 'prefer-hardware' };
    if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
  }
  throw new WorkerFailure('encoder');
}

function outputSize(sourceWidth: number, sourceHeight: number, preset: ExportPreset) {
  const ceiling = preset === 'light' ? 1280 : 1920;
  const scale = Math.min(1, ceiling / Math.max(sourceWidth, sourceHeight));
  const even = (value: number) => Math.max(2, Math.floor(value * scale / 2) * 2);
  return { width: even(sourceWidth), height: even(sourceHeight) };
}

async function renderAndEncode(frame: VideoFrame, renderer: VideoRenderer, canvas: OffscreenCanvas, encoder: VideoEncoder, timelineStartMicroseconds: number, trimIn: number, trimOut: number, firstEncodedFrame: { value: boolean }) {
  try {
    const sourceTimestamp = frame.timestamp / 1_000_000 - timelineStartMicroseconds / 1_000_000;
    if (sourceTimestamp < trimIn || sourceTimestamp >= trimOut) return;
    renderer.draw(frame, sourceTimestamp);
    const timestamp = Math.max(0, frame.timestamp - timelineStartMicroseconds - Math.round(trimIn * 1_000_000));
    const encodedFrame = new VideoFrame(canvas, { timestamp, duration: frame.duration ?? undefined });
    encoder.encode(encodedFrame, { keyFrame: firstEncodedFrame.value });
    firstEncodedFrame.value = false;
    encodedFrame.close();
    while (encoder.encodeQueueSize >= MAX_IN_FLIGHT_FRAMES) await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    frame.close();
  }
}

function isSupportedContainer(file: File) {
  return file.type === 'video/mp4' || file.type === 'video/quicktime' || /\.(mp4|mov)$/i.test(file.name);
}

async function isAacLc(audioTrack: Awaited<ReturnType<Input['getPrimaryAudioTrack']>> & {}) {
  if (!audioTrack || await audioTrack.getCodec() !== 'aac') return false;
  const config = await audioTrack.getDecoderConfig();
  return config?.codec === 'mp4a.40.2';
}

function nonNegativeTimestamp(timestamp: number) {
  // Tiny negative values can remain after floating point timebase conversion.
  return Math.max(0, timestamp);
}

function post(message: WorkerMessage, transfer?: Transferable[]) { self.postMessage(message, transfer ?? []); }

class WorkerFailure extends Error {
  constructor(readonly code: WorkerErrorCode) {
    super(code);
  }
}
