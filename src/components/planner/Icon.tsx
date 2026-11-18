const paths = {
  logo: "M4 19V9l8-5 8 5v10M8 19v-7l4-2.5 4 2.5v7M12 14v5",
  sunrise: "M3 19h18M6 16a6 6 0 0 1 12 0M12 4v3M4 9l2 2m14-2-2 2M2 15h2m16 0h2",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  download: "M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4",
  lock: "M5 10h14v10H5zM8 10V7a4 4 0 0 1 8 0v3m-4 4v2",
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  calendar: "M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  personal: "M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z",
  courses: "m3 9 9-5 9 5-9 5-9-5Zm4 2v5c2 3 8 3 10 0v-5m4-2v5",
  deadlines: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  work: "M9 6V4h6v2m-11 6h16m-8-1v3M5 6h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  tasks: "M10 6h10m-10 6h10m-10 6h10M3 6l1.5 1.5L7 5m-4 7 1.5 1.5L7 11m-4 7 1.5 1.5L7 17",
  shared: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m14-6a4 4 0 0 1 4 4v2M13 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm3-3a3.5 3.5 0 0 1 0 7",
  import: "M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-6-6 6 6h-5a1 1 0 0 1-1-1V3m-1 9v5m-2.5-2.5h5",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  down: "M12 4v15m-6-6 6 6 6-6",
  send: "M3 11.5 21 4l-5 16-4.5-6L3 11.5Zm8.5 2.5L21 4",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.7 14.5a8.6 8.6 0 0 1-11.2-11A8.7 8.7 0 1 0 20.7 14.5Z",
  cat: "m5 12-1-8 5 4h6l5-4-1 8v2a7 6 0 0 1-14 0Zm4 1h.01m6 0h.01M11 16l1 1 1-1",
  ocean: "M2 7c2.7 0 2.7-2 5-2s2.3 2 5 2 2.7-2 5-2 2.3 2 5 2M2 13c2.7 0 2.7-2 5-2s2.3 2 5 2 2.7-2 5-2 2.3 2 5 2M2 19c2.7 0 2.7-2 5-2s2.3 2 5 2 2.7-2 5-2 2.3 2 5 2",
  expand: "M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5",
  motion: "M3 12h4l3-6 4 12 3-6h4",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  goal: "M3 19V6h18v13M3 9h18M8 6v9m4-9v6m4-6v9M8 19h.01",
  flag: "M5 21V4m0 1c4-3 9 3 14 0v10c-5 3-10-3-14 0m7-8v6m-6-4c4-2 8 3 12 1",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  menu: "M4 6h16M4 12h16M4 18h16",
  location: "M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 0 1 14 0ZM12 10h.01",
  check: "m4 12 5 5L20 6",
  logout: "M11 4H5v16h6m-2-8h12m-4-4 4 4-4 4",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
