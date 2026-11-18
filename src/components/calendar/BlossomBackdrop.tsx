import type { CSSProperties } from "react";
import Petal from "@/components/planner/Petal";

const palette = ["#d071a5", "#e89bbb", "#b997de", "#e8acc7"];
const flowers = [[88, 81, .83], [133, 114, .76], [180, 58, .78], [219, 88, .96], [254, 38, .65], [286, 68, .8], [316, 29, .72], [352, 59, .67], [384, 18, .82]];
const angles = [0, 72, 144, 216, 288];

export default function BlossomBackdrop() {
  return (
    <div className="blossom-scene" aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg className="blossom-branch" width="430" height="180" viewBox="0 0 430 180" fill="none" preserveAspectRatio="xMaxYMin meet"
        style={{ position: "absolute", top: 0, right: 0, width: "min(55%, 28rem)", height: "auto", opacity: .5 }}>
        <circle cx="354" cy="36" r="28" fill="#f4bb8c" opacity=".3" />
        <path d="M444 1c-56 22-89 46-148 58-57 12-107 8-153 29-22 10-46 13-80 17" stroke="#b18da9" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M328 51c-27 6-42-4-70-18-12-6-24-10-47-12M259 67c-26 12-33 21-54 35-10 6-22 9-39 11M190 74c-18-14-39-20-57-22m14 36c-5 12-13 24-31 32M369 34c-10-4-20-9-29-20" stroke="#b18da9" strokeWidth="2" strokeLinecap="round" />
        {flowers.map(([x, y, size], index) => (
          <g key={x} transform={"translate(" + x + " " + y + ") scale(" + size + ")"}>
            {angles.map((angle) => (
              <path key={angle} transform={"rotate(" + (angle + index * 11) + ")"}
                d="M0 0c-4-3.2-6.6-8-3.8-11.5C-2.7-13 .3-13 0-10.4c.9-2.5 3.8-2.4 4.7-.6C7-7 3-2.5 0 0Z"
                fill={palette[index % palette.length]} />
            ))}
            <circle r="1.9" fill="#b675a3" />
          </g>
        ))}
      </svg>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="blossom-track" style={{
          position: "absolute",
          left: 3 + (i * 29) % 95 + "%",
          color: palette[i % palette.length],
          "--petal-size": 8 + (i * 7) % 10 + "px",
          "--petal-drift": -62 + (i * 47) % 150 + "px",
          "--petal-duration": 10 + (i * 11) % 9 + "s",
          "--petal-delay": -1 - (i * 31) % 16 + "s",
          "--petal-tilt": -100 + (i * 51) % 230 + "deg",
        } as CSSProperties}>
          <Petal className="blossom-petal" />
        </span>
      ))}
    </div>
  );
}
