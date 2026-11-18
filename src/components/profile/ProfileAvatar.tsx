"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProfileAvatar({ src, initials, large = false }: {
  src: string | null; initials: string; large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const size = large ? 80 : 36;
  return (
    <span aria-hidden="true" className={"relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-900 " +
      (large ? "size-20 text-xl" : "size-9 text-xs")}>
      {initials}
      {src && failed !== src && (
        <Image src={src} unoptimized alt="" width={size} height={size}
          className="absolute inset-0 size-full object-cover" onError={() => setFailed(src)} />
      )}
    </span>
  );
}
