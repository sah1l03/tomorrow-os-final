import { clamp, ease, mix, oval, seeded, sprite, type SceneDrawing, type Sprite } from "./scene-drawing";

const worlds = [
  { name: "Saturn", area: [772, 58, 737, 390], x: .76, y: .51, size: .80, depth: 1 },
  { name: "Jupiter", area: [148, 16, 463, 480], x: .47, y: .61, size: .40, depth: .72 },
  { name: "Earth", area: [146, 537, 470, 475], x: .91, y: .72, size: .22, depth: .54 },
  { name: "Neptune", area: [914, 536, 467, 480], x: .60, y: .25, size: .15, depth: .34 },
] as const satisfies readonly { name: string; area: Sprite; x: number; y: number; size: number; depth: number }[];

export const planetNames = worlds.map(planet => planet.name);

export function makeSpace(): SceneDrawing {
  let px = 0, py = 0;
  const focus = worlds.map(() => 0);
  return (ctx, { width, height, time, dt, warp, pointer, atlas }) => {
    px = mix(px, pointer.active ? pointer.x - .5 : 0, Math.min(1, dt * 3));
    py = mix(py, pointer.active ? pointer.y - .5 : 0, Math.min(1, dt * 3));
    const centerX = width * .60, centerY = height * .54;
    const lightSpeed = warp < 1 ? Math.sin(Math.PI * ease(warp)) : 0;
    if (lightSpeed > .025) {
      const zoom = 1 + ease(warp) * 4.8;
      for (let i = 1; i < 122; i++) {
        const fromX = (seeded(i * 7) - .5) * width * .79;
        const fromY = (seeded(i * 13 + 9) - .5) * height * 1.03;
        const shift = zoom * (.48 + seeded(i * 5) * .64);
        const x = centerX + fromX * shift, y = centerY + fromY * shift;
        if (x < 0 || x > width || y < 0 || y > height) continue;
        const tail = Math.max(.77, 1 - lightSpeed * (.05 + seeded(i * 3) * .21));
        ctx.strokeStyle = `rgba(203,226,255,${lightSpeed * (.24 + seeded(i + 7) * .69)})`;
        ctx.lineWidth = .5 + seeded(i * 11);
        ctx.beginPath();
        ctx.moveTo(centerX + fromX * shift * tail, centerY + fromY * shift * tail);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    for (let i = 1; i <= 21; i++) {
      const a = .28 + Math.sin(time * (1.4 + seeded(i)) + i) * .17;
      oval(ctx, seeded(i * 3 + 45) * width + px * 6, seeded(i * 6 + 17) * height + py * 5, .58, .58, `rgba(215,232,255,${a})`);
    }

    if (!atlas) return;
    for (let i = 0; i < worlds.length; i++) {
      focus[i] = mix(focus[i], pointer.focus === i ? 1 : 0, Math.min(1, dt * 3.6));
    }
    const backToFront = [3, 2, 1, 0].sort((a, b) => focus[a] - focus[b]);
    for (const i of backToFront) {
      const planet = worlds[i];
      const enter = ease((warp - .37 - i * .045) / .51);
      if (enter <= 0) continue;
      const amount = focus[i];
      const drift = Math.sin(time * .31 + i * 1.1) * (4 + 3 * planet.depth);
      const x = mix(width * planet.x + drift + px * 22 * planet.depth, width * .63, amount);
      const y = mix(height * planet.y + Math.cos(time * .28 + i) * 4 + py * 13 * planet.depth, height * .55, amount);
      const size = clamp(height, 128, 600) * planet.size * Math.min(1, width / 370) *
        (.28 + .72 * enter) * (1 + .44 * amount);
      ctx.save();
      ctx.translate(mix(centerX, x, enter), mix(centerY, y, enter));
      ctx.globalAlpha = enter * (1 - .14 * (pointer.focus >= 0 && pointer.focus !== i ? 1 : 0));
      sprite(ctx, atlas, planet.area, size);
      if (i === 0 || amount > .62) {
        ctx.fillStyle = "#d2dff3d8";
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(planet.name.toUpperCase(), 0, Math.min(size * planet.area[3] / planet.area[2] / 2 + 11, height - y - 14));
      }
      ctx.restore();
    }
  };
}
