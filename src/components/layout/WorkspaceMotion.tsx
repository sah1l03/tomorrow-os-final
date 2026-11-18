"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "@/components/planner/Icon";
import { appearanceCookie, type LightScene, type Look, type Scene, type Theme } from "@/lib/appearance";

const motionKey = "tomorrow-os:ambient";
const reduceQuery = "(prefers-reduced-motion: reduce)";
const motionEvent = "tomorrow-os:ambient-change";
let unsavedMotion: boolean | undefined;

function subscribe(listener: () => void) {
  window.addEventListener(motionEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(motionEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function currentMotion() {
  if (unsavedMotion !== undefined) return unsavedMotion;
  try {
    return localStorage.getItem(motionKey) !== "off";
  } catch {
    return true;
  }
}

function updateMotion(enabled: boolean) {
  try {
    localStorage.setItem(motionKey, enabled ? "on" : "off");
    unsavedMotion = undefined;
  } catch {
    unsavedMotion = enabled;
  }
  window.dispatchEvent(new Event(motionEvent));
}

function subscribeReduced(listener: () => void) {
  const media = window.matchMedia(reduceQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

type Appearance = Look & {
  scene: Scene;
  moving: boolean;
  motion: boolean;
  reduced: boolean;
  warpStarted: number | null;
  selectTheme: (theme: Theme) => void;
  selectLightScene: (scene: LightScene) => void;
};

const AppearanceContext = createContext<Appearance>({
  theme: "light", lightScene: "cat", scene: "cat",
  moving: false, motion: true, reduced: false, warpStarted: null,
  selectTheme: () => {}, selectLightScene: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function WorkspaceFrame({ children, initialLook }: { children: ReactNode; initialLook: Look }) {
  const [look, setLook] = useState(initialLook);
  const [warpStarted, setWarpStarted] = useState<number | null>(null);
  const motion = useSyncExternalStore(subscribe, currentMotion, () => true);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reduceQuery).matches, () => false);
  const moving = motion && !reduced;
  const scene = look.theme === "dark" ? "space" : look.lightScene;

  function save(next: Look) {
    setLook(next);
    // Read by the app layout on reload so the selected colors appear in the first paint.
    document.cookie = `${appearanceCookie}=${next.theme}.${next.lightScene}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function selectTheme(theme: Theme) {
    if (theme === look.theme) return;
    setWarpStarted(theme === "dark" && moving ? performance.now() : null);
    save({ ...look, theme });
  }

  function selectLightScene(lightScene: LightScene) {
    if (lightScene !== look.lightScene) save({ ...look, lightScene });
  }

  useEffect(() => {
    if (warpStarted === null) return;
    const stop = window.setTimeout(() => setWarpStarted(null), 2150);
    return () => window.clearTimeout(stop);
  }, [warpStarted]);

  return (
    <AppearanceContext.Provider value={{ ...look, scene, moving, motion, reduced, warpStarted, selectTheme, selectLightScene }}>
      <div className="planner-shell" data-ambient={moving ? "on" : "off"} data-theme={look.theme} data-scene={scene}
        data-travel={moving && warpStarted !== null ? "warp" : undefined}>
        {children}
      </div>
    </AppearanceContext.Provider>
  );
}

export function AmbientToggle() {
  const { motion, reduced } = useAppearance();
  return (
    <button type="button" className="button-quiet motion-toggle" aria-label="Ambient motion"
      aria-pressed={motion && !reduced} disabled={reduced} onClick={() => updateMotion(!motion)}>
      <Icon name="motion" className="size-4" />
      <span>{reduced ? "Reduced by device" : motion ? "Motion on" : "Motion off"}</span>
    </button>
  );
}

export function AppearanceControl() {
  const { theme, lightScene, selectTheme, selectLightScene } = useAppearance();
  const [open, setOpen] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="appearance-control" ref={control}>
      <button type="button" ref={trigger} className="button-secondary appearance-trigger" aria-label="Appearance"
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <Icon name={theme === "light" ? "sun" : "moon"} className="size-[1.05rem]" />
        <span className="hidden sm:inline">{theme === "light" ? "Light" : "Dark"}</span>
      </button>
      {open && (
        <div id={panelId} className="appearance-popover" role="group" aria-label="Appearance settings">
          <p className="appearance-title">Appearance</p>
          <div role="group" aria-label="Color mode" className="appearance-segment">
            <button type="button" aria-pressed={theme === "light"} onClick={() => selectTheme("light")}><Icon name="sun" className="size-4" />Light</button>
            <button type="button" aria-pressed={theme === "dark"} onClick={() => selectTheme("dark")}><Icon name="moon" className="size-4" />Dark</button>
          </div>
          {theme === "light" && (
            <>
              <p className="appearance-label">Light scene</p>
              <div role="group" aria-label="Light scene" className="appearance-segment">
                <button type="button" aria-pressed={lightScene === "cat"} onClick={() => selectLightScene("cat")}><Icon name="cat" className="size-4" />Cat</button>
                <button type="button" aria-pressed={lightScene === "ocean"} onClick={() => selectLightScene("ocean")}><Icon name="ocean" className="size-4" />Ocean</button>
              </div>
            </>
          )}
          <div className="appearance-footer"><AmbientToggle /></div>
        </div>
      )}
    </div>
  );
}
