"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useAppearance } from "@/components/layout/WorkspaceMotion";
import Icon, { type IconName } from "@/components/planner/Icon";
import PlannerDialog from "@/components/planner/PlannerDialog";
import type { LightScene, Scene } from "@/lib/appearance";
import { makeCat } from "./cat-scene";
import { makeOcean } from "./ocean-scene";
import { makeSpace, planetNames } from "./space-scene";
import { clamp, type SceneEvent, type ScenePointer } from "./scene-drawing";

const sceneDetails: Record<Scene, {
  title: string; icon: IconName; mode: string; hint: string; action: string; atlas?: string;
}> = {
  cat: { title: "Cat & mouse", icon: "cat", mode: "01 / CAT", hint: "Move here to lead the chase", action: "Play cat and mouse" },
  ocean: { title: "Open ocean", icon: "ocean", mode: "02 / OCEAN", hint: "Hold still or wiggle · Click to leave bait", action: "Leave bait in the ocean", atlas: "/scenes/fish.webp" },
  space: { title: "Beyond Earth", icon: "moon", mode: "03 / SPACE", hint: "Move to look around · Click to cycle planets", action: "Focus the next planet", atlas: "/scenes/planets.webp" },
};

export default function SceneWindow({ placement }: { placement: "dashboard" | "calendar" }) {
  const { scene, lightScene, moving, warpStarted } = useAppearance();
  const [expanded, setExpanded] = useState(false);
  const modeKey = scene + (moving ? "-moving" : "-still");
  return (
    <>
      <SceneView key={modeKey} scene={scene} lightScene={lightScene} moving={moving && !expanded} warpStarted={warpStarted}
        placement={placement} expand={() => setExpanded(true)} />
      {expanded && (
        <PlannerDialog title={sceneDetails[scene].title} variant="scene" onClose={() => setExpanded(false)}>
          <SceneView key={modeKey} scene={scene} lightScene={lightScene} moving={moving} warpStarted={null} placement="expanded" />
        </PlannerDialog>
      )}
    </>
  );
}

function SceneView({ scene, lightScene, moving, warpStarted, placement, expand }: {
  scene: Scene; lightScene: LightScene; moving: boolean; warpStarted: number | null;
  placement: "dashboard" | "calendar" | "expanded"; expand?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const zone = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pointer = useRef<ScenePointer>({ x: .63, y: .62, active: false, inside: false, pinned: false, movedAt: 0, wiggleUntil: 0, focus: -1 });
  const initialWarp = useRef(warpStarted);
  const [pinned, setPinned] = useState(false);
  const [bites, setBites] = useState(0);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const details = sceneDetails[scene];

  function announce(label: string) {
    clearTimeout(noticeTimer.current);
    setNotice(label);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  }

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    const surface = canvas.current;
    const hit = zone.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) return;
    const main = surface.closest<HTMLElement>(".planner-main");
    const input = pointer.current;
    const mountedAt = performance.now();
    const entrance = initialWarp.current;
    let width = 1, height = 1, pixelRatio = 1, frameId = 0, previous = 0, onScreen = true;
    let disposed = false;
    let art: HTMLImageElement | null = null;
    let lastClientX = 0, lastDirection = 0, lastChange = 0, changes = 0;
    function report(event: SceneEvent) {
      if (event.kind === "bite") setBites(n => n + 1);
      announce(event.label);
    }
    const draw = scene === "cat" ? makeCat(report) : scene === "ocean" ? makeOcean(report) : makeSpace();
    const paint = (now: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      draw(ctx, { width, height, now, time: moving ? (now - mountedAt) / 1000 : 0, dt,
        warp: moving && entrance !== null ? clamp((now - entrance) / 2050, 0, 1) : 1, pointer: input, atlas: art });
    };
    function tick(now: number) {
      frameId = 0;
      const dt = previous ? clamp((now - previous) / 1000, 0, .045) : 0;
      previous = now;
      paint(now, dt);
      schedule();
    }
    function schedule() {
      if (!frameId && !disposed && moving && onScreen && !document.hidden) frameId = requestAnimationFrame(tick);
    }
    function pause() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      previous = 0;
    }
    function measure() {
      if (!surface || !ctx || disposed) return;
      width = Math.max(1, surface.clientWidth);
      height = Math.max(1, surface.clientHeight);
      pixelRatio = Math.min(1.7, window.devicePixelRatio || 1);
      surface.width = Math.round(width * pixelRatio);
      surface.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paint(performance.now(), 0);
    }
    function handleVisibility() {
      if (document.hidden) pause();
      else schedule();
    }
    function move(event: PointerEvent) {
      if (!moving || event.pointerType === "touch" || input.pinned || !surface) return;
      if (event.target === hit) {
        const rect = surface.getBoundingClientRect();
        const wasInside = input.inside;
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        const now = performance.now();
        const dx = wasInside ? event.clientX - lastClientX : 0;
        const sign = Math.sign(dx);
        if (!wasInside || now - lastChange > 380) changes = 0;
        if (Math.abs(dx) >= 2 && Math.abs(dx) < 95) {
          if (sign !== lastDirection && lastDirection !== 0 && wasInside) {
            if (++changes >= 2) input.wiggleUntil = now + 1650;
            lastChange = now;
          }
          lastDirection = sign;
        }
        lastClientX = event.clientX;
        Object.assign(input, { x, y, active: true, inside: true, movedAt: now });
      } else {
        input.inside = false;
        // The cat and the planets also react as the pointer travels across the workspace.
        if (scene === "ocean" || !(event.target instanceof Element) || event.target.closest("button, a, input, select, textarea, dialog")) {
          input.active = false;
          return;
        }
        const rect = main?.getBoundingClientRect();
        if (rect) {
          input.active = true;
          input.x = clamp((event.clientX - rect.left) / rect.width, .09, .91);
          input.y = clamp((event.clientY - rect.top) / rect.height, .22, .8);
        }
      }
    }
    function leave() {
      if (!input.pinned) {
        input.inside = false;
        input.active = false;
      }
    }
    const resize = new ResizeObserver(measure);
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) schedule();
      else pause();
    });
    resize.observe(surface);
    intersection.observe(surface);
    if (moving) {
      main?.addEventListener("pointermove", move, { passive: true });
      main?.addEventListener("pointerleave", leave, { passive: true });
      document.addEventListener("visibilitychange", handleVisibility);
      hit?.setAttribute("data-ready", "true");
    }
    const src = sceneDetails[scene].atlas;
    if (src) {
      const asset = new window.Image();
      asset.onload = () => {
        if (!disposed) { art = asset; paint(performance.now(), 0); }
      };
      asset.src = src;
    }
    measure();
    schedule();
    return () => {
      disposed = true;
      pause();
      resize.disconnect();
      intersection.disconnect();
      main?.removeEventListener("pointermove", move);
      main?.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", handleVisibility);
      hit?.removeAttribute("data-ready");
    };
  }, [scene, moving]);

  function act(event: MouseEvent<HTMLButtonElement>) {
    const input = pointer.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.detail ? clamp((event.clientX - rect.left) / rect.width, .035, .965) : .63;
    const y = event.detail ? clamp((event.clientY - rect.top) / rect.height, .095, .9) : .6;
    Object.assign(input, { x, y, active: true, inside: true, movedAt: performance.now() });
    if (scene === "ocean") {
      input.pinned = true;
      setPinned(true);
      announce("Bait left in place");
    } else if (scene === "space") {
      input.focus = (input.focus + 1) % planetNames.length;
      announce(planetNames[input.focus] + " in focus");
    }
  }

  function reelIn() {
    Object.assign(pointer.current, { pinned: false, inside: false, active: false, focus: -1 });
    setPinned(false);
    setNotice("");
  }

  return (
    <section className={`scene-window scene-window--${placement}`} data-scene={scene}
      data-travel={moving && warpStarted !== null ? "warp" : undefined} aria-label={details.title}>
      <div className="scene-plate" aria-hidden="true" />
      <canvas className="scene-drawing" ref={canvas} aria-hidden="true" />
      {scene === "space" && moving && warpStarted !== null && (
        <div className="scene-departure" data-from={lightScene} aria-hidden="true" />
      )}
      {moving && (
        <button type="button" className="scene-hit" ref={zone} aria-label={details.action} aria-describedby={id}
          onClick={act} onKeyDown={event => {
            if (event.key === "Escape" && (pointer.current.pinned || pointer.current.focus >= 0)) {
              event.preventDefault();
              reelIn();
            }
          }} />
      )}
      <div className="scene-heading" aria-hidden="true">
        <span className="scene-kicker"><Icon name={details.icon} className="size-3.5" />{details.mode}</span>
        <strong>{details.title}</strong>
      </div>
      <div className="scene-actions">
        {scene === "ocean" && <span className="scene-count">{bites ? bites + (bites === 1 ? " bite" : " bites") : "12 species"}</span>}
        {expand && (
          <button type="button" className="scene-expand" aria-label="Expand scene" title="Expand scene" onClick={expand}>
            <Icon name="expand" className="size-4" />
          </button>
        )}
      </div>
      <p className="scene-hint" id={id}>{moving ? notice || (pinned ? "Bait in place · Click to move it" : details.hint) : "Motion paused"}</p>
      {pinned && <button type="button" className="scene-reel" onClick={reelIn}>Reel in</button>}
      <span className="sr-only" role="status">{notice}</span>
    </section>
  );
}
