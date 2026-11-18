type Variant = "hero" | "dashboard" | "calendar";

const sweep = "M-87 429C42 328 82 337 166 318S292 247 343 185 437 85 526 91s136 47 202 24S829 25 912-27";
const contours = [0, 17, 36, 57, 81, 109, 140, 175, 212, 256, 306];
const grid = "M0 48h900M0 96h900M0 144h900M0 192h900M0 240h900M0 288h900M0 336h900M0 384h900M48 0v440M96 0v440M144 0v440M192 0v440M240 0v440M288 0v440M336 0v440M384 0v440M432 0v440M480 0v440M528 0v440M576 0v440M624 0v440M672 0v440M720 0v440M768 0v440M816 0v440M864 0v440";

export default function ContourField({ variant }: { variant: Variant }) {
  return (
    <div className={`contour-field contour-field--${variant}`} aria-hidden="true"
      style={{ position: "absolute", inset: variant === "hero" ? "0 0 0 24%" : 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
      <svg viewBox="0 0 900 440" width="900" height="440" fill="none" focusable="false"
        preserveAspectRatio={variant === "dashboard" ? "xMaxYMin meet" : variant === "calendar" ? "none" : "xMaxYMid slice"}>
        <path className="atlas-grid" d={grid} />
        <g className="atlas-contours">
          {contours.map((offset) => <path d={sweep} transform={`translate(${offset * .45} ${offset - 60})`} key={offset} />)}
        </g>
        <path className="atlas-route" d={sweep} />
        <path className="atlas-tracer" d={sweep} pathLength="100" strokeDasharray="6 94" />
        <g className="atlas-marks">
          <path d="M341 172v26m-13-13h26M718 101v28m-14-14h28M816 240v12m-6-6h12M143 323v12m-6-6h12" />
          <circle cx="343" cy="185" r="7" /><circle cx="728" cy="115" r="5" /><circle cx="526" cy="91" r="3" />
          <path d="M672 168h46l26-25m-221 84h-25l-15 15M769 315h58m-29 8h29" />
        </g>
      </svg>
    </div>
  );
}
