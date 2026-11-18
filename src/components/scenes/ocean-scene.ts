import { clamp, mix, oval, seeded, sprite, type SceneDrawing, type SceneEvent, type Sprite } from "./scene-drawing";

// The boxes are the actual silhouettes in the transparent atlas, with two pixels of padding.
const fish = [
  { name: "Clownfish",       area: [10, 93, 344, 208],    size: .31, speed: .84, bite: true },
  { name: "Blue tang",       area: [378, 101, 339, 183],  size: .35, speed: 1.05, bite: true },
  { name: "Butterflyfish",   area: [742, 63, 337, 255],   size: .29, speed: .8, bite: false },
  { name: "Emperor angelfish",area: [1104, 85, 337, 228], size: .36, speed: .8, bite: false },
  { name: "Yellowtail snapper",area: [8, 457, 347, 156],  size: .4, speed: 1.22, bite: true },
  { name: "Squirrelfish",    area: [370, 434, 347, 196],  size: .32, speed: .82, bite: true },
  { name: "Lionfish",        area: [730, 370, 347, 315],  size: .35, speed: .48, bite: false },
  { name: "Bluefin tuna",    area: [1092, 451, 351, 151], size: .54, speed: 1.34, bite: true },
  { name: "Reef shark",      area: [4, 791, 359, 180],    size: .76, speed: .87, bite: false },
  { name: "Spotted eagle ray",area: [363, 777, 352, 207],  size: .57, speed: .69, bite: false },
  { name: "Green sea turtle",area: [728, 795, 356, 210],   size: .45, speed: .46, bite: false },
  { name: "Moon jelly",      area: [1102, 743, 322, 322],  size: .24, speed: .29, bite: false },
] as const satisfies readonly { name: string; area: Sprite; size: number; speed: number; bite: boolean }[];

function swimFish(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, species: number, size: number, time: number, id: number) {
  const { area: [sx, sy, sw, sh] } = fish[species];
  if (species >= 9) {
    ctx.scale(1, 1 + Math.sin(time * 2.7 + id) * .049);
    sprite(ctx, atlas, fish[species].area, size);
    return;
  }
  const h = size * sh / sw;
  const tail = Math.round(sw * .245);
  const hinge = -size / 2 + size * tail / sw;
  ctx.save();
  ctx.translate(hinge, 0);
  ctx.rotate(Math.sin(time * (5 + fish[species].speed * 2) + id * 2.1) * .11);
  ctx.drawImage(atlas, sx, sy, tail + 3, sh, -size * tail / sw, -h / 2, size * (tail + 3) / sw, h);
  ctx.restore();
  ctx.drawImage(atlas, sx + tail, sy, sw - tail, sh, hinge, -h / 2, size * (sw - tail) / sw, h);
}

export function makeOcean(report: (event: SceneEvent) => void): SceneDrawing {
  const school = [...fish.keys(), 0, 1, 4, 5].map((species, i) => ({
    species, i, x: .06 + seeded(i + 3) * .87, y: .21 + seeded(i + 83) * .53,
    dir: i % 3 === 0 ? -1 : 1, turn: i % 3 === 0 ? -1 : 1,
    depth: .65 + seeded(i + 50) * .35,
    interestedUntil: 0, waitUntil: 0,
  }));
  let nextVisit = 0;
  let nibble = -1000;
  let biting: (typeof school)[number] | null = null;
  return (ctx, { width, height, now, time, dt, pointer, atlas }) => {
    const bait = pointer.inside || pointer.pinned;
    const resting = now - pointer.movedAt > 530 || pointer.wiggleUntil > now || pointer.pinned;
    const bx = pointer.x * width, by = pointer.y * height;
    const fishSize = (f: (typeof school)[number]) => clamp(height, 135, 475) * fish[f.species].size * f.depth * Math.min(1, width / 335);
    if (dt > 0 && bait && resting && now >= nextVisit) {
      const ready = school.filter(f => f.species < 10 && f.waitUntil < now && f.interestedUntil === 0);
      const near = ready.sort((a, b) => Math.hypot((a.x - pointer.x) * width, (a.y - pointer.y) * height) -
        Math.hypot((b.x - pointer.x) * width, (b.y - pointer.y) * height));
      if (near.length && school.filter(f => f.interestedUntil > 0).length < 2) {
        near[0].interestedUntil = now + 4300;
        near[0].dir = near[0].x < pointer.x ? 1 : -1;
      }
      nextVisit = now + 760;
    }

    for (let i = 0; i < 33; i++) {
      const x = ((seeded(i + 12) * width + time * (1 + seeded(i) * 3)) % width);
      const y = ((seeded(i + 391) * height - time * (2 + seeded(i + 5) * 4)) % height + height) % height;
      const radius = .32 + seeded(i + 200) * 1.1;
      oval(ctx, x, y, radius, radius, i % 4 ? "#cbeaf451" : "#cbeaf478");
    }
    for (const f of school) {
      const type = fish[f.species];
      const size = fishSize(f);
      const active = f.interestedUntil > 0;
      if (dt > 0 && active && (!bait || now > f.interestedUntil)) {
        f.interestedUntil = 0;
        f.waitUntil = now + 900;
      } else if (dt > 0 && active) {
        if ((bx - f.x * width) * f.dir < -size * .24) f.dir *= -1;
        const targetX = bx - f.dir * size * .44;
        const tx = targetX - f.x * width, ty = by - f.y * height;
        const distance = Math.hypot(tx, ty);
        const shy = !type.bite && distance < Math.max(24, size * .54);
        if (shy || distance < 10) {
          f.interestedUntil = 0;
          f.waitUntil = now + (shy ? 4500 : 3100);
          if (shy) {
            f.dir *= -1;
            report({ kind: "pass", label: type.name + " swam past" });
          } else {
            nibble = now;
            biting = f;
            report({ kind: "bite", label: type.name + " took the bait" });
          }
        } else {
          const move = Math.min(1, dt * (72 + type.speed * 61) / distance);
          f.x += tx * move / width;
          f.y += ty * move / height;
        }
      } else if (dt > 0) {
        f.x += f.dir * dt * type.speed * (26 + f.depth * 25) / width;
        f.y = clamp(f.y + dt * Math.cos(time * .58 + f.i * 1.5) * .027, .16, .79);
        if (f.x > 1 + size / width) f.x = -size / width;
        if (f.x < -size / width) f.x = 1 + size / width;
      }
      if (!atlas) continue;
      f.turn = mix(f.turn, f.dir, Math.min(1, dt * 8));
      const turning = Math.abs(f.turn) < .18 ? .18 * f.dir : f.turn;
      ctx.save();
      ctx.translate(f.x * width, f.y * height + Math.sin(time * 1.7 + f.i) * (active ? 1 : 3.2));
      ctx.rotate(active ? 0 : Math.sin(time * 1.05 + f.i) * .066);
      ctx.scale(f.species === 11 ? 1 : turning, 1);
      ctx.globalAlpha = f.depth * .92 + .08;
      swimFish(ctx, atlas, f.species, size, time, f.i);
      ctx.restore();
    }
    if (!bait) return;

    const bit = now - nibble;
    ctx.save();
    let lureX = bx, lureY = by;
    if (biting && bit < 660) {
      const tension = Math.sin(Math.PI * clamp(bit / 660, 0, 1)) * .9;
      lureX = mix(bx, biting.x * width + biting.dir * fishSize(biting) * .43, tension);
      lureY = mix(by, biting.y * height, tension);
      ctx.strokeStyle = "#cbeef1a0";
      ctx.lineWidth = .85;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((lureX + bx) / 2, (lureY + by) / 2 + 4, lureX, lureY);
      ctx.stroke();
    }
    ctx.translate(lureX, lureY);
    const ring = pointer.wiggleUntil > now ? 1 - ((pointer.wiggleUntil - now) % 400) / 400 : bit < 600 ? bit / 600 : -1;
    if (ring >= 0) {
      ctx.strokeStyle = `rgba(188,239,251,${.6 * (1 - ring)})`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + ring * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowColor = "#ffbe8e";
    ctx.shadowBlur = 9;
    oval(ctx, 0, 0, 3.1, 3.1, "#ffda95");
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f3a07b";
    ctx.beginPath();
    ctx.moveTo(-1, 1);
    ctx.quadraticCurveTo(-5, 6, -12, 5 + Math.sin(time * 8) * 2);
    ctx.quadraticCurveTo(-8, -.8, -1, -1);
    ctx.fill();
    if (pointer.pinned) {
      ctx.strokeStyle = "#bdeff4b0";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };
}
