"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ContestState,
  ProjectorMode,
  projectorContestsList,
  projectorGetMode,
} from "@/lib/api";
import { BackgroundMusic } from "./background-music";
import { Contest1Projector } from "./contest1-view";
import { Contest2Projector } from "./contest2-view";
import { Contest3Projector } from "./contest3-view";
import { Contest4Projector } from "./contest4-view";
import { Contest5Projector } from "./contest5-view";
import { FamilySlideshow } from "./family-slideshow";

function Idle() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      <div className="text-center">
        <p className="text-lg uppercase tracking-widest text-mocha-400">
          <span className="text-blush-600">Амалия</span> · 24 мая 2026
        </p>
        <h1 className="mt-4 text-8xl font-medium tracking-wide text-mocha-900">
          Минуточку <span className="text-blush-600">…</span>
        </h1>
        <p className="mt-6 text-2xl tracking-wide text-mocha-500">
          Ведущий вот-вот начнёт конкурс.
        </p>
      </div>
    </main>
  );
}

function Slideshow() {
  const [empty, setEmpty] = useState(false);
  const handleEmpty = useCallback(() => setEmpty(true), []);
  if (empty) return <Idle />;
  return <FamilySlideshow onEmpty={handleEmpty} />;
}

function AudioUnlockBadge({ onUnlock }: { onUnlock: () => void }) {
  return (
    <button
      onClick={onUnlock}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-mocha-900/85 px-5 py-3 text-base font-medium text-cream-50 shadow-soft backdrop-blur hover:bg-mocha-900"
    >
      <span className="text-xl">▶</span>
      Включить музыку
    </button>
  );
}

export default function ProjectorPage() {
  const [states, setStates] = useState<ContestState[] | null>(null);
  const [mode, setMode] = useState<ProjectorMode | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const [s, m] = await Promise.all([
          projectorContestsList(),
          projectorGetMode(),
        ]);
        if (!cancelled) {
          setStates(s);
          setMode(m);
        }
      } catch {
        // ignore — projector should keep showing whatever it has
      }
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const active = states?.find((s) => s.status === "active");
  const contestsEnabled = mode?.contests_enabled ?? null;

  let view: React.ReactNode;
  if (contestsEnabled === false) {
    view = <Slideshow />;
  } else if (active?.contest_id === 1) view = <Contest1Projector />;
  else if (active?.contest_id === 2) view = <Contest2Projector />;
  else if (active?.contest_id === 3) view = <Contest3Projector />;
  else if (active?.contest_id === 4) view = <Contest4Projector />;
  else if (active?.contest_id === 5) view = <Contest5Projector />;
  else view = <Idle />;

  // Background music plays only in slideshow mode and only after the user
  // has tapped the unlock overlay (browser autoplay rules).
  const musicPlaying =
    !!mode && !mode.contests_enabled && mode.music_enabled && audioUnlocked;

  // Show the unlock badge only when music actually has somewhere to go —
  // i.e. we are in slideshow mode and the host left music enabled.
  const showUnlock =
    !audioUnlocked && !!mode && !mode.contests_enabled && mode.music_enabled;

  return (
    <>
      {view}
      {showUnlock && (
        <AudioUnlockBadge onUnlock={() => setAudioUnlocked(true)} />
      )}
      {mode && (
        <BackgroundMusic
          enabled={musicPlaying}
          volume={mode.music_volume}
          audioUnlocked={audioUnlocked}
        />
      )}
    </>
  );
}
