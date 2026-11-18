export default function Petal({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22C8.6 18 3 14 3 8.5 3 5 5.6 2.6 9 2.4l3 3.2 3-3.2c3.4.2 6 2.6 6 6.1C21 14 15.4 18 12 22Z"
        fill="currentColor" />
      <path d="M12 20c.8-3.6.7-6.2-.1-8.5" stroke="white" strokeWidth=".75" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
