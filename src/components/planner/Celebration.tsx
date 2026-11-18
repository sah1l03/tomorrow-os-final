"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/planner/Icon";
import { GoalScene, RaceScene, RobotScene } from "@/components/planner/CompletionScenes";

type Celebrate = (message: string, title: string) => void;
const CompletionContext = createContext<Celebrate>(() => {});
const duration = 3100;
const rotationKey = "tomorrow-os:completion-next";
const finishes = [
  { id: "knockout", label: "Knockout", icon: "bolt", Scene: RobotScene },
  { id: "goal", label: "Top corner · No. 10", icon: "goal", Scene: GoalScene },
  { id: "race", label: "Finish line", icon: "flag", Scene: RaceScene },
] as const;

export function useCelebrate() {
  return useContext(CompletionContext);
}

export default function CelebrationProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<{ id: number; message: string; title: string; finish: number } | null>(null);
  const sequence = useRef(0);
  const nextFinish = useRef<number | null>(null);
  const dismiss = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const celebrate = useCallback<Celebrate>((message, title) => {
    clearTimeout(dismiss.current);
    let finish = nextFinish.current ?? 0;
    if (nextFinish.current === null) {
      try {
        const saved = Number(localStorage.getItem(rotationKey));
        if (Number.isInteger(saved) && saved >= 0 && saved < finishes.length) finish = saved;
      } catch {
        // The sequence still works within this tab if storage is unavailable.
      }
    }
    nextFinish.current = (finish + 1) % finishes.length;
    try { localStorage.setItem(rotationKey, String(nextFinish.current)); } catch {}
    setMoment({ id: ++sequence.current, message, title, finish });
    dismiss.current = setTimeout(() => setMoment(null), duration);
  }, []);

  useEffect(() => () => clearTimeout(dismiss.current), []);

  const effect = moment ? finishes[moment.finish] : null;
  return (
    <CompletionContext.Provider value={celebrate}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {moment && <span key={moment.id}>{moment.message} {moment.title}</span>}
      </div>
      {moment && effect && (
        <div key={moment.id} className="completion-layer" aria-hidden="true">
          <div className="finish-card" data-finish={effect.id}>
            <effect.Scene />
            <div className="finish-copy">
              <div className="finish-kicker"><Icon name={effect.icon} className="size-4" />{effect.label}</div>
              <p className="finish-title">{moment.message}</p>
              <p className="finish-item">{moment.title}</p>
            </div>
            <span className="finish-progress" />
          </div>
        </div>
      )}
    </CompletionContext.Provider>
  );
}
