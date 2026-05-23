"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ContestState,
  projectorContestsList,
  projectorGetMode,
} from "@/lib/api";
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

export default function ProjectorPage() {
  const [states, setStates] = useState<ContestState[] | null>(null);
  const [contestsEnabled, setContestsEnabled] = useState<boolean | null>(null);

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
          setContestsEnabled(m.contests_enabled);
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

  // Master toggle off → always slideshow (with Idle fallback when empty).
  if (contestsEnabled === false) return <Slideshow />;

  // Toggle on (or still loading): contest view if any contest is active,
  // otherwise the «Минуточку…» card between contests.
  const active = states?.find((s) => s.status === "active");
  if (active?.contest_id === 1) return <Contest1Projector />;
  if (active?.contest_id === 2) return <Contest2Projector />;
  if (active?.contest_id === 3) return <Contest3Projector />;
  if (active?.contest_id === 4) return <Contest4Projector />;
  if (active?.contest_id === 5) return <Contest5Projector />;
  return <Idle />;
}
