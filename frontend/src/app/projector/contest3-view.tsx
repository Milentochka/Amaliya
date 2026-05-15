"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Contest3ProjectorView, projectorContest3View } from "@/lib/api";

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
            Каждому из гостей досталось по два обещания для Амалии.
            Ведущий покажет, кто что обещал — встань и зачитай!
          </p>
        </div>
      </main>
    );
  }

  const g = data.current;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12 py-12">
      <header className="flex flex-col items-center text-center">
        <p className="text-sm uppercase tracking-widest text-mocha-400">
          Твои обещания, Амалия — от
        </p>
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-32 w-32 overflow-hidden rounded-full bg-cream-100 ring-4 ring-cream-100 shadow-soft">
            <Image
              src={g.avatar_url}
              alt={g.avatar_name}
              fill
              sizes="128px"
              className="object-contain p-2"
              unoptimized
            />
          </div>
          <div className="text-left">
            <h1 className="text-6xl font-light text-mocha-900">
              {g.guest_name}
            </h1>
            <p className="mt-1 text-lg text-mocha-500">{g.avatar_name}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
        {g.promises.map((p, i) => (
          <div
            key={p.id}
            className="rounded-3xl border border-cream-200 bg-white/80 p-8 shadow-soft"
          >
            <p className="text-xs uppercase tracking-widest text-blush-600">
              обещание {i + 1}
            </p>
            <p className="mt-3 text-3xl font-light leading-snug text-mocha-900">
              {p.text}
            </p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-center text-sm text-mocha-400">
        — с любовью, Амалии
      </p>
    </main>
  );
}
