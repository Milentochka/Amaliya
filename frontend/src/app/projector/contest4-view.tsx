"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Contest4ProjectorView, projectorContest4View } from "@/lib/api";

export function Contest4Projector() {
  const [data, setData] = useState<Contest4ProjectorView | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const d = await projectorContest4View();
        if (!cancelled) setData(d);
      } catch {
        // keep state
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

  // Closed → outro
  if (isClosed && !data.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
        <div className="text-center">
          <p className="text-lg uppercase tracking-widest text-mocha-400">
            Конкурс 4 · итог
          </p>
          <h1 className="mt-3 text-6xl font-light text-mocha-900">
            Спасибо за <span className="font-medium text-blush-600">черты</span>
          </h1>
          <p className="mt-6 text-2xl tracking-wide text-mocha-500">
            Каждая теперь — часть Амалии.
          </p>
        </div>
      </main>
    );
  }

  // No active zodiac → intro
  if (!data.current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
        <div className="text-center">
          <p className="text-lg uppercase tracking-widest text-mocha-400">
            Конкурс 4
          </p>
          <h1 className="mt-3 text-7xl font-light text-mocha-900">
            Знак <span className="font-medium text-blush-600">зодиака</span>
          </h1>
          <p className="mt-6 max-w-3xl text-2xl tracking-wide text-mocha-500">
            Каждый знак передаст <span className="text-blush-600">Амалии</span>{" "}
            по две своих черты. Берите бумажные бланки и выбирайте.
          </p>
        </div>
      </main>
    );
  }

  const z = data.current;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12 py-12">
      <header className="text-center">
        <p className="text-xl uppercase tracking-widest text-mocha-400">
          Знак зодиака
        </p>
        <h1 className="mt-3 text-9xl font-bold tracking-wide text-mocha-900">
          <span className="text-blush-600">{z.name}</span>
        </h1>
        <p className="mt-3 text-3xl text-mocha-500">{z.glyph}</p>
      </header>

      {z.guests.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl">
          <p className="text-center text-xl uppercase tracking-widest text-mocha-400">
            Берите свои бланки
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
            {z.guests.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-4 rounded-3xl border border-cream-200 bg-white/80 px-7 py-4 shadow-gentle"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-cream-100">
                  <Image
                    src={g.avatar_url}
                    alt={g.avatar_name}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
                <span className="text-4xl font-semibold tracking-wide text-mocha-900">
                  {g.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-14 text-center text-xl tracking-wide text-mocha-500">
        Каждый выбирает две черты, отмечает в бланке и зачитывает их{" "}
        <span className="text-blush-600">Амалии</span>.
      </p>
    </main>
  );
}
