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
  type StreamTargetChunk,
} from 'mediabunny';
import type { ExportPreset, ExportRequest, WorkerMessage } from '../lib/export-protocol';
import { DEFAULT_LAYER, layerOpacity, type LayerStyle } from '../lib/layer';
import { rasterizeLayer } from '../lib/rasterizer';

declare const self: DedicatedWorkerGlobalScope;

const MAX_IN_FLIGHT_FRAMES = 2;
const codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];

self.onmessage = ({ data }: MessageEvent<ExportRequest>) => {
  if (data.type === 'export') void exportFile(data).catch((cause: unknown) => {
    post({ type: 'error', message: cause instanceof Error ? cause.message : 'Экспорт не выполнен.' });
  });
};

async function exportFile({ file, preset, layers }: ExportRequest) {
  if (!('OffscreenCanvas' in self) || !('VideoDecoder' in self) || !('VideoEncoder' in self)) {
    throw new Error('Этот браузер не поддерживает WebCodecs или OffscreenCanvas.');
  }

  const input = new Input({ formats: [MP4], source: new BlobSource(file) });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error('В выбранном файле нет видеодорожки.');
  const decoderConfig = await videoTrack.getDecoderConfig();
  if (!decoderConfig) throw new Error('Не удалось получить конфигурацию видеодекодера.');

  const audioTrack = await input.getPrimaryAudioTrack();
  // MP4 edit lists and B-frames may make the first presentation timestamp
  // negative. All output tracks share this origin so A/V stays in sync.
  const timelineStart = await input.getFirstTimestamp(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);
  const timelineStartMicroseconds = Math.round(timelineStart * 1_000_000);
  const { width, height } = outputSize(videoTrack.displayWidth, videoTrack.displayHeight, preset);
  const encoderConfig = await supportedEncoderConfig(width, height, preset);
  const canvas = new OffscreenCanvas(width, height);
  const renderer = createRenderer(canvas, layers[0] ?? DEFAULT_LAYER);
  const writer = new SeekableBufferWriter();
  const output = new Output({ format: new Mp4OutputFormat(), target: new StreamTarget(writer.stream) });
  const videoSource = new EncodedVideoPacketSource('avc');
  output.addVideoTrack(videoSource);

  let audioSource: EncodedAudioPacketSource | undefined;
  if (audioTrack?.codec === 'aac') {
    audioSource = new EncodedAudioPacketSource('aac');
    output.addAudioTrack(audioSource, { decoderConfig: await audioTrack.getDecoderConfig() ?? undefined });
  }
  await output.start();

  let packetWrites = Promise.resolve();
  let firstVideoPacket = true;
  const encoder = new VideoEncoder({
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
  let firstRenderedFrame = true;
  const decoder = new VideoDecoder({
    output(frame) {
      rendered = rendered.then(() => {
        const keyFrame = firstRenderedFrame;
        firstRenderedFrame = false;
        return renderAndEncode(frame, renderer, canvas, encoder, timelineStartMicroseconds, keyFrame);
      });
    },
    error(error) { throw error; },
  });
  decoder.configure(decoderConfig);

  const videoPackets = new EncodedPacketSink(videoTrack);
  let processed = 0;
  for await (const packet of videoPackets.packets()) {
    decoder.decode(packet.toEncodedVideoChunk());
    processed += 1;
    if (decoder.decodeQueueSize >= MAX_IN_FLIGHT_FRAMES) await rendered;
    post({ type: 'progress', completed: processed, total: 0 });
  }
  await decoder.flush();
  await rendered;
  await encoder.flush();
  await packetWrites;
  decoder.close();
  encoder.close();
  videoSource.close();

  if (audioTrack && audioSource) {
    const audioPackets = new EncodedPacketSink(audioTrack);
    for await (const packet of audioPackets.packets()) {
      await audioSource.add(packet.clone({ timestamp: nonNegativeTimestamp(packet.timestamp - timelineStart) }));
    }
    audioSource.close();
  }
  await output.finalize();
  const result = writer.toArrayBuffer();
  input.dispose();
  post({ type: 'complete', file: result }, [result]);
}

async function supportedEncoderConfig(width: number, height: number, preset: ExportPreset): Promise<VideoEncoderConfig> {
  const bitrate = preset === 'high' ? 12_000_000 : preset === 'light' ? 4_000_000 : 8_000_000;
  for (const codec of codecs) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: 30, hardwareAcceleration: 'prefer-hardware' };
    if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
  }
  throw new Error('В этом браузере нет подходящего H.264-кодера.');
}

function outputSize(sourceWidth: number, sourceHeight: number, preset: ExportPreset) {
  const ceiling = preset === 'light' ? 1280 : 1920;
  const scale = Math.min(1, ceiling / Math.max(sourceWidth, sourceHeight));
  const even = (value: number) => Math.max(2, Math.floor(value * scale / 2) * 2);
  return { width: even(sourceWidth), height: even(sourceHeight) };
}

async function renderAndEncode(frame: VideoFrame, renderer: Renderer, canvas: OffscreenCanvas, encoder: VideoEncoder, timelineStartMicroseconds: number, keyFrame: boolean) {
  try {
    renderer.draw(frame);
    const timestamp = Math.max(0, frame.timestamp - timelineStartMicroseconds);
    const encodedFrame = new VideoFrame(canvas, { timestamp, duration: frame.duration ?? undefined });
    encoder.encode(encodedFrame, { keyFrame });
    encodedFrame.close();
    while (encoder.encodeQueueSize >= MAX_IN_FLIGHT_FRAMES) await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    frame.close();
  }
}

function nonNegativeTimestamp(timestamp: number) {
  // Tiny negative values can remain after floating point timebase conversion.
  return Math.max(0, timestamp);
}

type Renderer = { draw(frame: VideoFrame): void };

function createRenderer(canvas: OffscreenCanvas, layer: LayerStyle): Renderer {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('WebGL2 недоступен.');
  const program = programFor(gl, `#version 300 es
    in vec2 position; in vec2 uv; out vec2 vUv;
    void main() { gl_Position = vec4(position, 0., 1.); vUv = vec2(uv.x, 1. - uv.y); }`, `#version 300 es
    precision mediump float; uniform sampler2D videoFrame; uniform sampler2D label; uniform vec2 labelOrigin; uniform vec2 labelSize; uniform float labelOpacity; in vec2 vUv; out vec4 color;
    void main() { vec4 video = texture(videoFrame, vUv); vec2 labelUv = (vUv - labelOrigin) / labelSize; if (any(lessThan(labelUv, vec2(0.))) || any(greaterThan(labelUv, vec2(1.)))) { color = video; return; } vec4 text = texture(label, labelUv); text.a *= labelOpacity; color = mix(video, text, text.a); }`);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1]), gl.STATIC_DRAW);
  for (const [name, offset] of [['position', 0], ['uv', 2]] as const) {
    const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset * 4);
  }
  const video = texture(gl, gl.TEXTURE0);
  const label = texture(gl, gl.TEXTURE1);
  const labelBitmap = rasterizeLayer(layer, canvas.height);
  const labelSize = [labelBitmap.width / canvas.width, labelBitmap.height / canvas.height] as const;
  const labelOrigin = [layer.x - labelSize[0] / 2, layer.y - labelSize[1] / 2] as const;
  gl.bindTexture(gl.TEXTURE_2D, label); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labelBitmap); labelBitmap.close();
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program); gl.uniform1i(gl.getUniformLocation(program, 'videoFrame'), 0); gl.uniform1i(gl.getUniformLocation(program, 'label'), 1);
  gl.uniform2f(gl.getUniformLocation(program, 'labelOrigin'), ...labelOrigin); gl.uniform2f(gl.getUniformLocation(program, 'labelSize'), ...labelSize);
  return { draw(frame) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, video); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame); gl.uniform1f(gl.getUniformLocation(program, 'labelOpacity'), layerOpacity(layer, frame.timestamp / 1_000_000)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } };
}

function texture(gl: WebGL2RenderingContext, unit: number) { const value = gl.createTexture()!; gl.activeTexture(unit); gl.bindTexture(gl.TEXTURE_2D, value); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return value; }
function programFor(gl: WebGL2RenderingContext, vertex: string, fragment: string) { const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Ошибка WebGL-шейдера'); return shader; }; const program = gl.createProgram()!; gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Ошибка WebGL-программы'); return program; }

class SeekableBufferWriter {
  private bytes = new Uint8Array(0);
  private length = 0;
  readonly stream = new WritableStream<StreamTargetChunk>({ write: ({ data, position }) => { const required = position + data.byteLength; if (required > this.bytes.byteLength) { const next = new Uint8Array(Math.max(required, this.bytes.byteLength * 2, 1024)); next.set(this.bytes); this.bytes = next; } this.bytes.set(data, position); this.length = Math.max(this.length, required); } });
  toArrayBuffer() { return this.bytes.slice(0, this.length).buffer; }
}

function post(message: WorkerMessage, transfer?: Transferable[]) { self.postMessage(message, transfer ?? []); }
