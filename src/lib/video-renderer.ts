import { compositionAt } from './composition';
import type { LayerStyle } from './layer';
import { logoPlacement, type LogoSettings } from './logo';
import { rasterizeLayer } from './rasterizer';

export type VideoRenderer = {
  draw(frame: VideoFrame, sourceTime: number): void;
  close(): void;
};

type LayerTexture = {
  layer: LayerStyle;
  texture: WebGLTexture;
  width: number;
  height: number;
};

export type VideoRotation = 0 | 90 | 180 | 270;

export type RenderLogo = {
  image: ImageBitmap;
  width: number;
  height: number;
  settings: LogoSettings;
};

/** WebGL adapter that composites every visible Layer over a decoded frame. */
export function createVideoRenderer(
  canvas: OffscreenCanvas,
  layers: readonly LayerStyle[],
  rotation: VideoRotation = 0,
  logo?: RenderLogo,
): VideoRenderer {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('WebGL2 is unavailable.');

  const vertexArray = createVertexArray(gl);
  const videoProgram = programFor(gl, VIDEO_VERTEX_SHADER, VIDEO_FRAGMENT_SHADER);
  const layerProgram = programFor(gl, LAYER_VERTEX_SHADER, LAYER_FRAGMENT_SHADER);
  const videoTexture = createTexture(gl, gl.TEXTURE0);
  const layerTextures = new Map(layers.map((layer) => [layer, rasterizedTexture(gl, canvas, layer)]));
  const logoTexture = logo ? imageTexture(gl, logo.image) : undefined;
  const logoGeometry = logo ? logoPlacement(logo, canvas, logo.settings) : undefined;

  gl.bindVertexArray(vertexArray);
  gl.useProgram(videoProgram);
  gl.uniform1i(gl.getUniformLocation(videoProgram, 'videoFrame'), 0);
  gl.uniform1i(gl.getUniformLocation(videoProgram, 'videoRotation'), rotation / 90);
  gl.useProgram(layerProgram);
  gl.uniform1i(gl.getUniformLocation(layerProgram, 'label'), 0);

  return {
    draw(frame, sourceTime) {
      gl.disable(gl.BLEND);
      gl.useProgram(videoProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(layerProgram);
      for (const { layer, opacity } of compositionAt(layers, sourceTime)) {
        const item = layerTextures.get(layer);
        if (!item) continue;
        const width = item.width / canvas.width;
        const height = item.height / canvas.height;
        gl.bindTexture(gl.TEXTURE_2D, item.texture);
        gl.uniform2f(gl.getUniformLocation(layerProgram, 'labelOrigin'), item.layer.x - width / 2, item.layer.y - height / 2);
        gl.uniform2f(gl.getUniformLocation(layerProgram, 'labelSize'), width, height);
        gl.uniform1f(gl.getUniformLocation(layerProgram, 'labelOpacity'), opacity);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (logo && logoTexture && logoGeometry) {
        gl.bindTexture(gl.TEXTURE_2D, logoTexture);
        gl.uniform2f(gl.getUniformLocation(layerProgram, 'labelOrigin'), logoGeometry.left, logoGeometry.top);
        gl.uniform2f(gl.getUniformLocation(layerProgram, 'labelSize'), logoGeometry.width, logoGeometry.height);
        gl.uniform1f(gl.getUniformLocation(layerProgram, 'labelOpacity'), logo.settings.opacity);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },
    close() {
      gl.deleteTexture(videoTexture);
      if (logoTexture) gl.deleteTexture(logoTexture);
      for (const item of layerTextures.values()) gl.deleteTexture(item.texture);
      gl.deleteProgram(videoProgram);
      gl.deleteProgram(layerProgram);
      gl.deleteVertexArray(vertexArray);
    },
  };
}

function imageTexture(gl: WebGL2RenderingContext, image: ImageBitmap) {
  const texture = createTexture(gl, gl.TEXTURE0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}

function rasterizedTexture(gl: WebGL2RenderingContext, canvas: OffscreenCanvas, layer: LayerStyle): LayerTexture {
  const bitmap = rasterizeLayer(layer, canvas.height);
  const texture = createTexture(gl, gl.TEXTURE0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  const result = { layer, texture, width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}

function createVertexArray(gl: WebGL2RenderingContext) {
  const vertexArray = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vertexArray || !buffer) throw new Error('Could not prepare the WebGL buffer.');
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1,
  ]), gl.STATIC_DRAW);
  for (const [location, offset] of [[0, 0], [1, 2]] as const) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset * 4);
  }
  return vertexArray;
}

function createTexture(gl: WebGL2RenderingContext, unit: number) {
  const value = gl.createTexture();
  if (!value) throw new Error('Could not create a WebGL texture.');
  gl.activeTexture(unit);
  gl.bindTexture(gl.TEXTURE_2D, value);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return value;
}

function programFor(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not create a WebGL shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'WebGL shader error.');
    return shader;
  };
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create a WebGL program.');
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL program error.');
  return program;
}

const VIDEO_VERTEX_SHADER = `#version 300 es
  layout(location = 0) in vec2 position; layout(location = 1) in vec2 uv; uniform int videoRotation; out vec2 vUv;
  void main() {
    gl_Position = vec4(position, 0., 1.);
    vec2 sourceUv = vec2(uv.x, 1. - uv.y);
    if (videoRotation == 1) vUv = vec2(sourceUv.y, 1. - sourceUv.x);
    else if (videoRotation == 2) vUv = vec2(1. - sourceUv.x, 1. - sourceUv.y);
    else if (videoRotation == 3) vUv = vec2(1. - sourceUv.y, sourceUv.x);
    else vUv = sourceUv;
  }`;

const VIDEO_FRAGMENT_SHADER = `#version 300 es
  precision mediump float; uniform sampler2D videoFrame; in vec2 vUv; out vec4 color;
  void main() { color = texture(videoFrame, vUv); }`;

const LAYER_VERTEX_SHADER = `#version 300 es
  layout(location = 0) in vec2 position; layout(location = 1) in vec2 uv; uniform vec2 labelOrigin; uniform vec2 labelSize; out vec2 vUv;
  void main() {
    vUv = vec2(uv.x, 1. - uv.y);
    vec2 point = labelOrigin + vUv * labelSize;
    gl_Position = vec4(point.x * 2. - 1., 1. - point.y * 2., 0., 1.);
  }`;

const LAYER_FRAGMENT_SHADER = `#version 300 es
  precision mediump float; uniform sampler2D label; uniform float labelOpacity; in vec2 vUv; out vec4 color;
  void main() { color = texture(label, vUv); color.a *= labelOpacity; }`;
