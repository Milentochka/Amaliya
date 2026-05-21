"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Contest1Overview, projectorContest1Overview } from "@/lib/api";

function TraitBar({
  name,
  votes,
  total,
  color,
}: {
  name: string;
  votes: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-mocha-700">{name}</span>
        <span className="text-xs text-mocha-400">
          {votes} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Contest1Projector() {
  const [data, setData] = useState<Contest1Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const d = await projectorContest1Overview();
        if (!cancelled) setData(d);
      } catch {
        // keep last state
      }
    }
    tick();
    const t = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 text-mocha-400">
        Загрузка…
      </main>
    );

  const summary = data.summary;
  const isClosed = data.state.status === "closed";
  const rawStage = (data.state.active_step as { stage?: number } | null)?.stage;
  const stage: 1 | 2 | 3 = rawStage === 2 || rawStage === 3 ? rawStage : 1;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-10 py-10">
      <header className="text-center">
        <p className="text-lg uppercase tracking-widest text-mocha-400">
          Конкурс 1
        </p>
        <h1 className="mt-3 text-7xl font-medium tracking-wide text-mocha-900">
          На кого похожа{" "}
          <span className="text-blush-600">Амалия?</span>
        </h1>
      </header>

      {stage === 1 && (
        <div className="mt-16 flex flex-col items-center justify-center gap-10">
          <div className="flex items-center justify-center gap-14">
            <PolaroidPhoto
              src="/contests/contest1/mom-young.jpg"
              alt="Мама в детстве"
              caption="мама в детстве"
              width={300}
              height={372}
              rotate={-6}
            />
            <PolaroidPhoto
              src="/contests/contest1/amalia.jpg"
              alt="Амалия"
              caption="Амалия"
              width={360}
              height={446}
              rotate={0}
            />
            <PolaroidPhoto
              src="/contests/contest1/dad-young.jpg"
              alt="Папа в детстве"
              caption="папа в детстве"
              width={300}
              height={372}
              rotate={6}
            />
          </div>
          <PolaroidPhoto
            src="/contests/contest1/parents-now.jpg"
            alt="Мама и папа сейчас"
            caption="мама и папа сейчас"
            width={420}
            height={274}
            rotate={3}
          />
        </div>
      )}

      {stage === 2 && (
        <section className="mt-10 grid grid-cols-2 gap-x-10 gap-y-3 rounded-3xl border border-cream-200 bg-white/70 p-8 shadow-soft">
          {data.traits.map((t) => {
            const relTotal = t.votes_relatives.reduce(
              (a, r) => a + r.count,
              0,
            );
            const total =
              t.votes_mom + t.votes_dad + t.votes_unique + relTotal;
            return (
              <div key={t.id} className="space-y-1">
                <div className="text-lg font-semibold tracking-wide text-mocha-900">
                  {t.order_index}. {t.name}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <TraitBar
                    name="мама"
                    votes={t.votes_mom}
                    total={total}
                    color="#c4897a"
                  />
                  <TraitBar
                    name="папа"
                    votes={t.votes_dad}
                    total={total}
                    color="#7d6c5f"
                  />
                  <TraitBar
                    name="уникально"
                    votes={t.votes_unique}
                    total={total}
                    color="#a86f60"
                  />
                  <TraitBar
                    name="родственники"
                    votes={relTotal}
                    total={total}
                    color="#a08e80"
                  />
                </div>
                {t.votes_relatives.length > 0 && (
                  <div className="text-xs text-mocha-500">
                    {t.votes_relatives
                      .map((r) => `${r.name}×${r.count}`)
                      .join(" · ")}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {stage === 3 && (
        <section className="mt-20 rounded-3xl border border-blush-200 bg-blush-100/40 p-16 text-center">
          <p className="text-2xl uppercase tracking-widest text-blush-700">
            {isClosed ? "Итог конкурса" : "Текущий лидер"}
          </p>
          <p className="mt-6 text-[8rem] font-medium leading-tight tracking-wide text-mocha-900">
            {summary.verdict ?? "—"}
          </p>
          <p className="mt-10 text-3xl tracking-wide text-mocha-500">
            мама {summary.totals.mom} · папа {summary.totals.dad} · родственники{" "}
            {summary.totals.relatives}
            {summary.top_relative_name &&
              ` (${summary.top_relative_name})`}{" "}
            · уникально {summary.totals.unique}
          </p>
        </section>
      )}
    </main>
  );
}

function PolaroidPhoto({
  src,
  alt,
  caption,
  width,
  height,
  rotate,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  rotate: number;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-3 shadow-soft"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-cream-100"
        style={{ width, height }}
      >
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      </div>
      <p className="mt-2 text-center text-sm text-mocha-500">{caption}</p>
    </div>
  );
}
