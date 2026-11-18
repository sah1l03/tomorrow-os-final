export function RaceScene() {
  return (
    <svg className="finish-scene" width="480" height="248" viewBox="0 0 480 248" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="finish-asphalt" x1="263" y1="22" x2="320" y2="248" gradientUnits="userSpaceOnUse">
          <stop stopColor="#263541" /><stop offset="1" stopColor="#10171d" />
        </linearGradient>
        <linearGradient id="finish-paint" x1="-75" y1="-30" x2="67" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b84a11" /><stop offset=".48" stopColor="#ff9a30" /><stop offset="1" stopColor="#ffcf73" />
        </linearGradient>
        <linearGradient id="finish-glass" x1="-20" y1="-24" x2="20" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#546b7d" /><stop offset="1" stopColor="#151b21" />
        </linearGradient>
        <pattern id="finish-checkers" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#19252d" />
          <path d="M0 0h11v11H0zM11 11h11v11H11z" fill="#edf4f7" />
        </pattern>
      </defs>
      <path d="M0 116 480 4v193L260 248H0z" fill="url(#finish-asphalt)" />
      <path d="M0 131 480 19M122 248l358-83" stroke="#6c7e8b" strokeOpacity=".48" />
      <path d="M0 145 480 33M179 248l301-70" stroke="#ffae56" strokeOpacity=".45" strokeWidth="2" strokeDasharray="21 11" />
      <path d="M0 210 480 98" stroke="#b3c1c9" strokeOpacity=".39" strokeWidth="2" strokeDasharray="28 16" />
      <g transform="rotate(-13 345 140)">
        <rect x="333" y="54" width="24" height="167" fill="url(#finish-checkers)" opacity=".83" />
        <path d="M333 54v167m24-167v167" stroke="#fff" strokeOpacity=".35" />
      </g>
      <g className="finish-streaks" transform="rotate(-13 250 150)" strokeLinecap="round">
        <path d="M96 120h139M54 151h175M114 183h111" stroke="#f9883e" strokeWidth="3" opacity=".6" />
        <path d="M138 112h68M33 161h162M123 194h116" stroke="#ffe2af" strokeWidth="1.25" opacity=".57" />
      </g>
      <g className="finish-car-travel">
        <g transform="translate(290 145) rotate(-13)">
          <ellipse cx="-1" cy="7" rx="99" ry="39" fill="#080a0d" opacity=".76" />
          <path d="M-61-30h23v13h-23zM-61 17h23v13h-23zM44-30h21v13H44zM44 17h21v13H44z" fill="#0a0d10" stroke="#788794" />
          <path d="M-83-21-55-28 48-28q25 2 40 16v24Q73 26 48 28H-55l-28-7-7-12V-9z" fill="url(#finish-paint)" stroke="#ffd892" strokeWidth="1.3" />
          <path d="M-55-21 48-21 72-12v24L48 21H-55l-18-7v-28z" stroke="#ffe2ad" strokeOpacity=".56" />
          <path d="M-72-29h10v58h-10z" fill="#21262b" stroke="#ffd591" />
          <path d="M-24-21H25l22 10v22L25 21h-49l-15-9v-24z" fill="url(#finish-glass)" stroke="#f5ca7d" />
          <path d="M-22-20-13-13v26l-9 7M25-20l-7 8v24l7 8" stroke="#91a2ad" strokeOpacity=".7" />
          <path d="M-11-11h27v22h-27z" fill="#d8e5ee" opacity=".86" />
          <path d="m-4 6 6-12m1 12 6-12" stroke="#25333e" strokeWidth="2.3" />
          <path d="M59-5h20m-20 10h20" stroke="#9a4514" strokeWidth="1.3" />
          <path d="M72-17l10 6m-10 28 10-6" stroke="#fff6d8" strokeWidth="3" strokeLinecap="round" />
          <path d="M-86-12v5m0 14v5" stroke="#ff5447" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <path d="M393 19h42m-3 7h19M58 230h38m7 0h12" stroke="#93a8b5" strokeOpacity=".5" />
    </svg>
  );
}

function Boxer({ rival = false }: { rival?: boolean }) {
  const plate = rival ? "#657780" : "#b7996c";
  const edge = rival ? "#a4b3bd" : "#efd4a4";
  const light = rival ? "#9ef1ff" : "#ffdd98";
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* Plated frame, with the arm and fist on separate animation joints. */}
      <path d="M-22-62-29-37-40-11l9 6 21-24 8-24m11-7L26-34 19-8l14 4 11-34-15-28"
        fill="#263238" stroke="#718087" strokeWidth="2" />
      <path d="M-34-25-24-31l9 5-13 21-17 1v-7zm60-6 14 1-7 26-16-1-5-5 9-6z" fill={plate} stroke="#29383f" strokeWidth="2" />
      <path d="m-43-9 13 2 6 6-26 2-1-5zm64 3 14 1 11 7-29 1-3-5z" fill="#171f22" stroke={edge} strokeWidth="1.4" />
      <path d="M-25-101-48-93-55-72l12 21 12-7-10-19 14-9" fill={plate} stroke="#23333b" strokeWidth="2" />
      <path d="m-52-67 13-5 10 9-4 11-13 4-10-10Z" fill="#454b45" stroke={edge} strokeWidth="1.5" />
      <path d="m-12-69-4 14 10 8 20-2 12-15-6-8" fill="#354348" stroke="#9eada9" strokeWidth="2" />
      <path d="m-7-111 24-1 18 13-3 23-16 13-29-1-18-12-2-23z" fill={plate} stroke="#1f2c33" strokeWidth="2.4" />
      <path d="m-30-96 15-9 27 2 17 11-13 16-24 3-17-9Z" fill="#38474a" stroke={edge} strokeWidth="1.5" />
      <path d="m-25-92 18 7 29-5m-23 15-2 11m-12-39 11 7m22-4 4 8" stroke={edge} strokeWidth="1.6" opacity=".78" />
      <path d="m-1-91 10-2 5 6-5 5-10-2z" fill={light} />
      <path d="M-7-112v-11h16v11m-22-13-2-17 8-10h20l10 12-3 14-10 8z"
        fill={plate} stroke="#1c282e" strokeWidth="2" />
      <path d="m-11-139 22-5 9 7-5 9-16 2-10-6z" fill="#263438" />
      <path d="m-6-136 9-2m4-1 9-1" stroke={light} strokeWidth="2.4" />
      <path d="m-8-149 10-2 11 1M-9-127l7 3 9-2" stroke={edge} strokeWidth="1.3" opacity=".78" />
      <path d="M-27-99-18-97m-7 39 7-3m43 32 9 1m-63 4 8-2" stroke={edge} strokeWidth="1.45" opacity=".78" />
      {rival ? (
        <>
          <path d="m28-104 17 7 2 19-11 12-9-4 8-16-13-6z" fill={plate} stroke="#24343a" strokeWidth="2" />
          <path d="m35-72 10-4 13 6-2 12-11 6-12-7z" fill="#455962" stroke={edge} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path className="ko-arm-guard" d="M21-98 39-98 42-84 54-106l-11-8-15 18-2-10z" fill={plate} stroke={edge} strokeWidth="1.8" />
          <path className="ko-arm-strike" d="M22-105 54-119l51-21 8 15-48 23-41 11z" fill={plate} stroke={edge} strokeWidth="2" />
          <g className="ko-fist">
            <path d="m44-113 10-6 14 4 2 11-11 8-13-2-5-7z" fill="#816c4c" stroke={edge} strokeWidth="1.8" />
            <path d="m55-114 11 4m-13 1 13 4m-15 1 10 3" stroke={light} strokeWidth="1.25" />
          </g>
        </>
      )}
    </g>
  );
}

export function RobotScene() {
  return (
    <svg className="finish-scene" width="480" height="248" viewBox="0 0 480 248" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ko-floor" x1="338" y1="159" x2="338" y2="248" gradientUnits="userSpaceOnUse">
          <stop stopColor="#263e40" /><stop offset="1" stopColor="#0b151a" />
        </linearGradient>
        <radialGradient id="ko-backlight" cx="345" cy="86" r="164" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b675d" stopOpacity=".8" /><stop offset="1" stopColor="#13272a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M0 0h480v248H0z" fill="url(#ko-backlight)" />
      <path d="M166 162h251l63 23v63H83z" fill="url(#ko-floor)" />
      <path d="m166 162-83 86m169-86-43 86m120-86 7 86m54-86 67 86M154 175h294m-321 26h353m-382 30h382"
        stroke="#7c9b9d" opacity=".27" />
      <path d="M115 160 186 107l219 5 75 24m-343 30 51-39 218 6 74 24m-313 8 22-19 216 6 75 26"
        stroke="#6f9a98" strokeWidth="1.2" opacity=".52" />
      <path d="M186 101v65m217-61v65" stroke="#b4cec4" strokeWidth="4" opacity=".56" />
      <ellipse cx="264" cy="211" rx="50" ry="9" fill="#070d0e" opacity=".78" />
      <ellipse cx="403" cy="210" rx="63" ry="11" fill="#070d0e" opacity=".68" />
      <g transform="translate(251 211)"><g className="ko-atom"><Boxer /></g></g>
      <g transform="translate(387 210)">
        <g className="ko-zeus">
          <g transform="scale(-1.02 1.02)"><Boxer rival /></g>
        </g>
      </g>
      <g className="ko-impact" transform="translate(365 73)" stroke="#ffdc8a" strokeLinecap="round">
        <circle r="17" strokeWidth="1.7" strokeOpacity=".67" />
        <path d="M-19 2h-35m78-9 27-12m-37 1 20-22m-42 19-12-22m21 66 6 18m14-21 24 13" strokeWidth="2.1" />
        <path d="m-24-7-10-4m62 12 12-2m-5 16 9 4m-21-40 10-15m-54 42-16 7" strokeWidth="1.1" />
      </g>
      <g fill="#b1c2bf" fontFamily="monospace" fontSize="10" fontWeight="700" letterSpacing="3">
        <text x="215" y="236">ATOM</text><text x="386" y="236" fill="#8da8aa">ZEUS</text>
      </g>
    </svg>
  );
}

export function GoalScene() {
  return (
    <svg className="finish-scene" width="480" height="248" viewBox="0 0 480 248" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="goal-pitch" x1="311" y1="129" x2="311" y2="248" gradientUnits="userSpaceOnUse">
          <stop stopColor="#204950" /><stop offset="1" stopColor="#113033" />
        </linearGradient>
        <linearGradient id="goal-jersey" x1="186" y1="108" x2="246" y2="173" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" /><stop offset="1" stopColor="#a5c9da" />
        </linearGradient>
        <clipPath id="goal-shirt">
          <path d="m205 109 14-4 15 4 15 15-9 11-8-6-1 36-29 3-5-32-10 1-7-10 18-15z" />
        </clipPath>
      </defs>
      <path d="M0 128c119-24 231-42 349-39l131 14v145H0z" fill="#122933" />
      <path d="M168 87c100-31 209-30 312-10M148 98c108-29 222-29 332-10M175 105c119-25 205-23 305-6"
        stroke="#7fa7bb" strokeOpacity=".23" />
      <path d="M0 179 299 115 480 139v109H0z" fill="url(#goal-pitch)" />
      <path d="m0 211 343-87 37 5-287 119H0zm222 37 191-114 36 5-122 109z" fill="#315d61" fillOpacity=".5" />
      <path d="m300 134 104 9 46 18-151-7-34-10m-25 26 213 19m-107-64-18 10" stroke="#a2c7c9" strokeOpacity=".38" strokeWidth="1.3" />
      <g className="goal-net">
        <path d="m310 137 21 9 122 8-15-22V59l-14-10-114-2z" fill="#a2c7de" fillOpacity=".08" stroke="#acc8d3" strokeOpacity=".78" />
        <path d="M331 145V48m16 98V48m17 99V49m17 99V49m17 101V49m17 103V50m17 103V55
          M310 62l118 2 19 12M310 77l119 3 19 13M310 92l119 4 20 13M310 107l120 5 21 15M310 122l120 7 22 15M327 144l117 6"
          stroke="#b9d9e5" strokeOpacity=".4" />
      </g>
      <path d="M310 138V46l116 3v92" stroke="#e5f6fc" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="m426 49 15 10v83" stroke="#a0bcc8" strokeWidth="1.5" />
      <path className="goal-trail" d="M228 186c24-35 68-77 117-101 27-13 47-16 64-8"
        stroke="#b6eaff" strokeWidth="1.4" pathLength="100" strokeDasharray="100" strokeLinecap="round" />
      <ellipse cx="216" cy="213" rx="46" ry="7" fill="#091b1f" opacity=".7" />
      <g className="goal-player">
        <path d="m204 160 13-3 6 15-9 19-10 15-9-3 4-15 2-16" fill="#203044" />
        <path d="m213 188-9 19-10-3 6-19z" fill="#d5e9f3" />
        <path d="m195 201 9 4-4 9-18 1-2-5 9-2z" fill="#b9e5a1" stroke="#243633" strokeWidth="1.5" />
        <g className="goal-kick">
          <path d="m223 159 10-2 9 17-5 9-10-2-9-13z" fill="#28364a" />
          <path d="m227 175 12 4-2 14-4 11-10-2 3-16z" fill="#c5916a" />
          <path d="m225 187 13 1-4 16-12-2z" fill="#cde5f2" />
          <path d="m222 199 12 3 8 6 1 4-22-1-4-5z" fill="#c0ebaa" stroke="#243633" strokeWidth="1.5" />
        </g>
        <path d="m188 122-10 5-13-9-6 4 12 15 17-1m56-12 9-4 7-11 6 2-5 16-14 8" stroke="#402c2b" strokeWidth="1.4" fill="#be8b68" strokeLinejoin="round" />
        <path d="m210 100 1 11 13 1 5-14-4-10-11-2z" fill="#b17e61" />
        <path d="m205 109 14-4 15 4 15 15-9 11-8-6-1 36-29 3-5-32-10 1-7-10 18-15z" fill="url(#goal-jersey)" stroke="#6d8a9a" strokeWidth="1.3" />
        <path d="m191 106 8-2 13 67-8 2zm15-4 9-1 11 70-9 1zm17 1 8-1 11 63-8 1z"
          clipPath="url(#goal-shirt)" fill="#69b8e7" />
        <path d="m206 109 9 6 10-8m-40 15 9 9m49-12-6 9" stroke="#234b6b" strokeWidth="1.4" />
        <path d="m209 89 7-8 13 1 6 7-4 12-6 3-3-8-11 2z" fill="#2e292b" stroke="#151c23" strokeWidth="1.2" />
        <path d="m223 97 4-2 2 5-5 4" fill="#b98463" />
        <text x="203" y="150" transform="rotate(-7 216 140)" fill="#132638" fontFamily="system-ui,sans-serif" fontSize="18" fontWeight="800">10</text>
      </g>
      <g transform="translate(228 186)">
        <g className="goal-ball-travel">
          <circle r="7" fill="#f3fcff" stroke="#8ab6ce" strokeWidth="1.3" />
          <path d="m-1-3 4 1v4l-3 2-3-3zm-5 0 2 1-1 3h-1zM1-6l2 1 2 2-2-1zM3 4l2-1 1 1-3 2z" fill="#1e394b" />
        </g>
      </g>
      <g className="goal-flash" transform="translate(410 77)">
        <circle r="13" stroke="#a3e7ff" strokeOpacity=".65" />
        <path d="M-18-5h8m-1-10 5 6m20-1-5 4m10 8-9-1m-6 14 3 6" stroke="#cceeff" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <path d="M371 207h65m-46 6h46" stroke="#a9d9db" strokeOpacity=".44" />
      <text x="372" y="202" fill="#9ce5ed" fontFamily="monospace" fontWeight="700" fontSize="13" letterSpacing="4">GOAL</text>
    </svg>
  );
}
