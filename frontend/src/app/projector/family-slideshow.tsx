"use client";

import { useEffect, useRef, useState } from "react";

import { FamilyMedia, projectorFamilyMediaList } from "@/lib/api";

const PHOTO_DURATION_MS = 7000;

export function FamilySlideshow({ onEmpty }: { onEmpty: () => void }) {
  const [items, setItems] = useState<FamilyMedia[] | null>(null);
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch list once + refresh every 60s so newly-uploaded media joins the loop.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await projectorFamilyMediaList();
        if (!cancelled) {
          setItems(list);
          if (list.length === 0) onEmpty();
        }
      } catch {
        // network blip — keep what we have
      }
    }
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [onEmpty]);

  const current = items && items.length > 0 ? items[idx % items.length] : null;

  // Advance: photos on a fixed timer, videos via onEnded handler.
  useEffect(() => {
    if (!current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (current.kind === "photo") {
      timerRef.current = setTimeout(
        () => setIdx((i) => i + 1),
        PHOTO_DURATION_MS,
      );
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current]);

  if (items === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mocha-900 text-cream-300">
        Загрузка…
      </main>
    );
  }

  if (!current) {
    // onEmpty already fired — parent renders fallback. Render nothing here.
    return null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {current.kind === "photo" ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={current.id}
          src={current.url}
          alt=""
          className="max-h-screen max-w-full object-contain"
        />
      ) : (
        <video
          ref={videoRef}
          key={current.id}
          src={current.url}
          autoPlay
          muted
          playsInline
          onEnded={() => setIdx((i) => i + 1)}
          onError={() => setIdx((i) => i + 1)}
          className="max-h-screen max-w-full object-contain"
        />
      )}
    </main>
  );
}
