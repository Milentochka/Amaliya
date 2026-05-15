"use client";

import { useEffect, useState } from "react";

import { ContestState, projectorContestsList } from "@/lib/api";
import { Contest1Projector } from "./contest1-view";
import { Contest2Projector } from "./contest2-view";
import { Contest3Projector } from "./contest3-view";

function Idle() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-mocha-400">
          Амалия · 24 мая 2026
        </p>
        <h1 className="mt-3 text-5xl font-light text-mocha-900">
          Минуточку <span className="font-medium text-blush-600">…</span>
        </h1>
        <p className="mt-4 text-mocha-500">Ведущий вот-вот начнёт конкурс.</p>
      </div>
    </main>
  );
}

export default function ProjectorPage() {
  const [states, setStates] = useState<ContestState[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await projectorContestsList();
        if (!cancelled) setStates(s);
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

  if (active?.contest_id === 1) return <Contest1Projector />;
  if (active?.contest_id === 2) return <Contest2Projector />;
  if (active?.contest_id === 3) return <Contest3Projector />;
  return <Idle />;
}
