"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Contest3ProjectorView, projectorContest3View } from "@/lib/api";
import { withNames } from "@/lib/highlightNames";

export function Contest3Projector() {
  const [data, setData] = useState<Contest3ProjectorView | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const d = await projectorContest3View();
        if (!cancelled) setData(d);
      } catch {
        // keep last state
      }
    }
    tick();
    const t = setInterval(tick, 2000);
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

  const isClosed = data.state.status === "closed";

  // Closed → thank-you screen
  if (isClosed && !data.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mocha-400">
            Конкурс 3 · итог
          </p>
          <h1 className="mt-3 text-6xl font-light leading-tight text-mocha-900">
            Спасибо за <span className="font-medium text-blush-600">обещания</span>,
            <br />
            мы все записали! <span className="inline-block">😊</span>
          </h1>
        </div>
      </main>
    );
  }

  // No active guest → intro
  if (!data.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mocha-400">
            Конкурс 3
          </p>
          <h1 className="mt-3 text-7xl font-light text-mocha-900">
            50 <span className="font-medium text-blush-600">обещаний</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mocha-500">
            Каждому из гостей досталось по два обещания для{" "}
            <span className="text-blush-600">Амалии</span>. Ведущий покажет,
            кто что обещал — встаньте и зачитайте!
          </p>
        </div>
      </main>
    );
  }

  const g = data.current;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12 py-12">
      <header className="flex flex-col items-center text-center">
        <p className="text-xl uppercase tracking-widest text-mocha-400">
          Твои обещания, <span className="text-blush-600">Амалия</span> — от
        </p>
        <div className="mt-5 flex items-center gap-6">
          <div className="relative h-40 w-40 overflow-hidden rounded-full bg-cream-100 ring-4 ring-cream-100 shadow-soft">
            <Image
              src={g.avatar_url}
              alt={g.avatar_name}
              fill
              sizes="160px"
              className="object-contain p-2"
              unoptimized
            />
          </div>
          <div className="text-left">
            <h1 className="text-8xl font-medium tracking-wide text-mocha-900">
              {withNames(g.guest_name)}
            </h1>
            <p className="mt-2 text-2xl tracking-wide text-mocha-500">
              {g.avatar_name}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2">
        {g.promises.map((p, i) => (
          <div
            key={p.id}
            className="rounded-3xl border border-cream-200 bg-white/80 p-10 shadow-soft"
          >
            <p className="text-lg uppercase tracking-widest text-blush-600">
              обещание {i + 1}
            </p>
            <p className="mt-4 text-4xl font-medium leading-snug tracking-wide text-mocha-900">
              {withNames(p.text)}
            </p>
          </div>
        ))}
      </section>

      <p className="mt-12 text-center text-xl tracking-wide text-mocha-400">
        — с любовью, <span className="text-blush-600">Амалии</span>
      </p>
    </main>
  );
}
