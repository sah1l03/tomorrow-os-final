import { clamp, ease, mix, oval, strokePath, type SceneDrawing, type SceneEvent } from "./scene-drawing";

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, direction: number, stride: number, jump: number, time: number) {
  oval(ctx, x - 8 * scale * direction, y + 25 * scale, (35 - 8 * jump) * scale, 5 * scale, "#67432125");
  ctx.save();
  ctx.translate(x, y - 22 * jump * scale);
  ctx.scale(scale * direction, scale);
  const tail = Math.sin(time * 3.3) * 9;
  strokePath(ctx, `M-33 4c-22 2-39-4-38-${13 + tail} 0-14 15-17 20-9`, "#9c4b2d", 9);
  strokePath(ctx, `M-36 4c-20 0-33-4-33-${13 + tail} 0-12 12-13 16-6`, "#db8753", 4.2);

  const phase = Math.sin(time * 15) * stride;
  for (const [leg, offset, shade] of [[-27, phase, "#9e4b2b"], [14, -phase, "#a7552e"], [-19, -phase, "#c86e42"], [23, phase, "#d4814f"]] as const) {
    strokePath(ctx, `M${leg} 9q${offset * 7 + jump * 9} 10 ${offset * 13 + jump * 14} 16l5 0`, shade, 8);
  }

  const coat = ctx.createLinearGradient(0, -18, 4, 17);
  coat.addColorStop(0, "#dc925d");
  coat.addColorStop(1, "#bc5d36");
  ctx.fillStyle = coat;
  ctx.fill(new Path2D("M-41 5c0-14 13-22 34-19 14 2 24-4 35-5l13 22c-6 14-29 14-54 13-16-1-25-4-28-11Z"));
  ctx.fillStyle = "#eabb88";
  ctx.fill(new Path2D("M-23 13c10-1 28-4 35-9l16-6 3 9c-8 11-37 15-54 6Z"));
  for (const n of [-24, -11, 2]) {
    strokePath(ctx, `M${n} -11q-3 4-2 8`, "#a85533", 2.5);
  }
  ctx.fillStyle = "#d1814d";
  ctx.fill(new Path2D("M16-16l3-21 12 10 8-2 10-12 3 23 5 9-4 11c-6 7-24 5-31-2-4-5-7-9-6-16Z"));
  ctx.fillStyle = "#edb087";
  ctx.fill(new Path2D("m21-32 7 7-8 5Zm20 8 6-10 1 13Z"));
  oval(ctx, 46, -5, 10, 6, "#f5d6ab", -.13);
  strokePath(ctx, "M40-19q3-3 6 0", "#392421", 1.9);
  oval(ctx, 43.5, -16.7, 1.3, 1.8, "#2e2521");
  oval(ctx, 54, -8.7, 2.5, 1.8, "#633a35", -.2);
  strokePath(ctx, "m48-4 11-2m-11 4 12 2", "#805a44", 1.05);
  ctx.restore();
}

function drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number, caught: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, caught ? .52 : 1);
  strokePath(ctx, "M-8 2c-7 4-13 1-13-4 0-3 2-4 4-5", "#b27c7e", 1.65);
  oval(ctx, -2, 0, 9, 6, "#777782", -.13);
  oval(ctx, 5, -4, 4.8, 4.8, "#888895");
  oval(ctx, 4.8, -4.4, 2.7, 2.7, "#d5a0a6");
  oval(ctx, 7.1, .1, 5, 3.8, "#9596a0", -.1);
  oval(ctx, 8.1, -1, 1.12, 1.12, "#25252e");
  oval(ctx, 12, .2, 1.4, 1.18, "#ae717d");
  ctx.restore();
}

export function makeCat(report: (event: SceneEvent) => void): SceneDrawing {
  let x = 0, y = 0, direction = 1, cooldown = 0;
  let leap: { at: number; x: number; y: number; toX: number; toY: number } | null = null;
  let landedAt = -2000, caught = false;
  return (ctx, { width, height, now, time, dt, pointer }) => {
    const size = clamp(height / 210, .65, 2.1);
    if (x === 0) { x = width * .45; y = height * .65; }
    const active = pointer.active;
    const mouseX = clamp(pointer.x * width, 12, width - 12);
    const mouseY = clamp(pointer.y * height, 14, height - 15);
    const goalX = active ? mouseX : width * (.59 + Math.sin(time * .55) * .15);
    const goalY = active ? mouseY : height * (.65 + Math.sin(time * .72) * .07);
    const target = clamp(goalX - direction * size * 30, 44 * size, width - 44 * size);
    const targetY = clamp(goalY + size * 9, 37 * size, height - 29 * size);
    let jump = 0;
    let stride = 0;
    if (leap) {
      const p = clamp((now - leap.at) / 380, 0, 1);
      x = mix(leap.x, leap.toX, ease(p));
      y = mix(leap.y, leap.toY, ease(p));
      jump = Math.sin(p * Math.PI);
      if (p === 1) {
        caught = pointer.inside && Math.hypot(mouseX - (x + direction * 29 * size), mouseY - (y - 9 * size)) < 32 * size;
        landedAt = now;
        cooldown = now + (caught ? 1550 : 820);
        leap = null;
        if (caught) report({ kind: "pounce", label: "Caught you!" });
      }
    } else if (now - landedAt > (caught ? 720 : 210)) {
      if (Math.abs(goalX - x) > 36 * size) direction = goalX > x ? 1 : -1;
      const dx = target - x, dy = targetY - y;
      const distance = Math.hypot(dx, dy);
      stride = clamp(distance / 46, 0, 1);
      if (distance > .6) {
        const pace = Math.min(1, dt * (active ? 230 : 44) / distance);
        x += dx * pace; y += dy * pace;
      }
      if (pointer.inside && now > cooldown && distance < 78 * size && (!caught || pointer.movedAt > landedAt)) {
        leap = { at: now, x, y, toX: target, toY: targetY };
      }
    }
    x = clamp(x, 40 * size, width - 38 * size);
    y = clamp(y, 38 * size, height - 29 * size);
    drawCat(ctx, x, y, size, direction, stride, jump, time);
    if (pointer.inside) drawMouse(ctx, mouseX, mouseY, mouseX < x ? -1 : 1, caught && now - landedAt < 560);
    if (caught && now - landedAt < 460) {
      const p = (now - landedAt) / 460;
      ctx.globalAlpha = (1 - p) * .7;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        oval(ctx, x + 31 * size * direction + Math.cos(a) * (7 + p * 23), y - 9 * size + Math.sin(a) * (7 + p * 15), 2, 2, "#9b6d44");
      }
      ctx.globalAlpha = 1;
    }
  };
}
