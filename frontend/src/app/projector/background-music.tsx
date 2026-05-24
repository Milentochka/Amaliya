"use client";

import { useEffect, useRef, useState } from "react";

import { FamilyMedia, projectorFamilyMediaList } from "@/lib/api";

export function BackgroundMusic({
  enabled,
  volume,
  audioUnlocked,
}: {
  enabled: boolean;
  volume: number; // 0..100
  audioUnlocked: boolean;
}) {
  const [tracks, setTracks] = useState<FamilyMedia[]>([]);
  const [idx, setIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pull track list, refresh occasionally so newly uploaded music joins.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await projectorFamilyMediaList();
        if (cancelled) return;
        setTracks(list.filter((m) => m.kind === "music"));
      } catch {
        // ignore — keep current playlist
      }
    }
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const current = tracks.length > 0 ? tracks[idx % tracks.length] : null;

  // Volume reacts live to host slider changes.
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume]);

  // Pause / resume based on enabled.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!enabled || !audioUnlocked) {
      a.pause();
    } else {
      a.play().catch(() => {
        // Autoplay blocked — overlay should still be visible.
      });
    }
  }, [enabled, audioUnlocked, current]);

  if (!current) return null;

  return (
    <audio
      ref={audioRef}
      key={`${idx}-${current.id}`}
      src={current.url}
      onEnded={() => setIdx((i) => i + 1)}
      onError={() => setIdx((i) => i + 1)}
      autoPlay
      preload="auto"
    />
  );
}
