export type ScenePointer = {
  x: number;
  y: number;
  active: boolean;
  inside: boolean;
  pinned: boolean;
  movedAt: number;
  wiggleUntil: number;
  focus: number;
};

export type SceneFrame = {
  width: number;
  height: number;
  now: number;
  time: number;
  dt: number;
  warp: number;
  pointer: ScenePointer;
  atlas: HTMLImageElement | null;
};

export type SceneEvent = { kind: "bite" | "pass" | "pounce"; label: string };
export type SceneDrawing = (ctx: CanvasRenderingContext2D, frame: SceneFrame) => void;
export type Sprite = readonly [x: number, y: number, width: number, height: number];

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const mix = (from: number, to: number, fraction: number) => from + (to - from) * fraction;
export const ease = (value: number) => {
  const n = clamp(value, 0, 1);
  return n * n * (3 - 2 * n);
};
export const seeded = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, angle = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

export function strokePath(ctx: CanvasRenderingContext2D, path: string, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(path));
}

export function sprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, area: Sprite, size: number) {
  const [x, y, w, h] = area;
  const height = size * h / w;
  ctx.drawImage(image, x, y, w, h, -size / 2, -height / 2, size, height);
}
