import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYER } from './layer';
import { createVideoRenderer } from './video-renderer';

describe('video renderer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('draws the video frame and every visible Layer', () => {
    vi.stubGlobal('OffscreenCanvas', FakeRasterCanvas);
    const gl = fakeWebGl();
    const canvas = { width: 1080, height: 1920, getContext: () => gl } as unknown as OffscreenCanvas;
    const layers = [
      { ...DEFAULT_LAYER, text: 'Один', endTime: 8 },
      { ...DEFAULT_LAYER, text: 'Два', endTime: 8 },
    ];

    const renderer = createVideoRenderer(canvas, layers);
    renderer.draw({} as VideoFrame, 2);

    expect(gl.drawArrays).toHaveBeenCalledTimes(3);
    renderer.close();
  });

  it('passes the source rotation to the video shader', () => {
    vi.stubGlobal('OffscreenCanvas', FakeRasterCanvas);
    const gl = fakeWebGl();
    const canvas = { width: 1080, height: 1920, getContext: () => gl } as unknown as OffscreenCanvas;

    createVideoRenderer(canvas, [], 90);

    expect(gl.uniform1i).toHaveBeenCalledWith('videoRotation', 1);
  });
});

class FakeRasterCanvas {
  constructor(public width: number, public height: number) {}
  getContext() {
    return {
      measureText: (text: string) => ({ width: text.length * 10 }),
      beginPath() {}, roundRect() {}, fill() {}, strokeText() {}, fillText() {},
      font: '', textBaseline: '', textAlign: '', lineJoin: '', fillStyle: '', strokeStyle: '', lineWidth: 0,
    };
  }
  transferToImageBitmap() { return { width: this.width, height: this.height, close() {} }; }
}

function fakeWebGl() {
  const constantNames = [
    'TEXTURE0', 'TEXTURE_2D', 'RGBA', 'UNSIGNED_BYTE', 'TRIANGLE_STRIP', 'BLEND',
    'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ARRAY_BUFFER', 'STATIC_DRAW', 'FLOAT',
    'TEXTURE_MIN_FILTER', 'TEXTURE_MAG_FILTER', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T',
    'LINEAR', 'CLAMP_TO_EDGE', 'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS',
  ];
  const gl: Record<string, unknown> = {};
  constantNames.forEach((name, index) => gl[name] = index + 1);
  Object.assign(gl, {
    createVertexArray: () => ({}), createBuffer: () => ({}), createProgram: () => ({}),
    createShader: () => ({}), createTexture: () => ({}), getUniformLocation: (_program: unknown, name: string) => name,
    getShaderParameter: () => true, getProgramParameter: () => true, getShaderInfoLog: () => '',
    getProgramInfoLog: () => '', drawArrays: vi.fn(), bindVertexArray() {}, bindBuffer() {},
    bufferData() {}, enableVertexAttribArray() {}, vertexAttribPointer() {}, shaderSource() {},
    compileShader() {}, attachShader() {}, linkProgram() {}, activeTexture() {}, bindTexture() {},
    texParameteri() {}, texImage2D() {}, useProgram() {}, uniform1i: vi.fn(), uniform1f() {},
    uniform2f() {}, disable() {}, enable() {}, blendFunc() {}, deleteTexture() {},
    deleteProgram() {}, deleteVertexArray() {},
  });
  return gl as unknown as WebGL2RenderingContext & {
    drawArrays: ReturnType<typeof vi.fn>;
    uniform1i: ReturnType<typeof vi.fn>;
  };
}
