"use client";

import { useEffect, useState } from "react";

import { Contest5ProjectorView, projectorContest5View } from "@/lib/api";
import { withNames } from "@/lib/highlightNames";

const ACCENT_DARK = "font-semibold text-blush-300";

export function Contest5Projector() {
  const [data, setData] = useState<Contest5ProjectorView | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const d = await projectorContest5View();
        if (!cancelled) setData(d);
      } catch {
        // keep last state
      }
    }
    tick();
    const t = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center bg-mocha-900 text-cream-100">
        Загрузка…
      </main>
    );

  const isClosed = data.state.status === "closed";

  // Closed → final scoreboard
  if (isClosed) {
    const sorted = [...data.teams].sort((a, b) => b.score - a.score);
    return (
      <main className="min-h-screen bg-gradient-to-b from-mocha-900 via-mocha-700 to-mocha-900 px-12 py-14 text-cream-50">
        <div className="text-center">
          <p className="text-xl uppercase tracking-widest text-blush-300">
            Своя игра · итог
          </p>
          <h1 className="mt-4 text-8xl font-bold tracking-wide">
            Победитель — {withNames(sorted[0]?.name ?? "?", ACCENT_DARK)}
          </h1>
        </div>
        <section className="mx-auto mt-14 max-w-3xl space-y-5">
          {sorted.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-3xl bg-mocha-700/60 px-8 py-6 text-5xl font-semibold tracking-wide"
              style={{ borderLeft: `10px solid ${t.color}` }}
            >
              <span className="flex items-center gap-5">
                <span className="w-10 text-cream-300">{i + 1}</span>
                <span>{t.name}</span>
              </span>
              <span className="text-blush-300">{t.score}</span>
            </div>
          ))}
        </section>
      </main>
    );
  }

  // Final question on screen
  if (data.final_active && data.final_question) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-mocha-900 via-mocha-700 to-mocha-900 px-12 py-14 text-cream-50">
        <p className="text-center text-xl uppercase tracking-widest text-blush-300">
          Финальный вопрос
        </p>
        <h1 className="mx-auto mt-8 max-w-5xl text-center text-7xl font-medium leading-snug tracking-wide">
          {withNames(data.final_question.text, ACCENT_DARK)}
        </h1>
        {data.final_question.revealed && data.final_question.answer && (
          <p className="mx-auto mt-10 max-w-4xl rounded-3xl bg-emerald-600/30 px-10 py-8 text-center text-6xl font-semibold tracking-wide text-emerald-200">
            {withNames(data.final_question.answer, "font-bold text-emerald-100")}
          </p>
        )}
        <section className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2">
          {data.teams.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl bg-mocha-700/50 px-7 py-5"
              style={{ borderLeft: `10px solid ${t.color}` }}
            >
              <div className="text-base uppercase tracking-widest text-cream-300">
                {t.name}
              </div>
              <div className="mt-2 flex items-baseline gap-5">
                <span className="text-5xl font-semibold text-cream-50">
                  {t.score}
                </span>
                <span className="text-xl text-blush-300">
                  ставка: {t.final_wager}
                </span>
              </div>
            </div>
          ))}
        </section>
      </main>
    );
  }

  // Active question on screen
  if (data.active_question) {
    const q = data.active_question;
    return (
      <main className="min-h-screen bg-gradient-to-b from-mocha-900 via-mocha-700 to-mocha-900 px-10 py-10 text-cream-50">
        <p className="text-center text-2xl uppercase tracking-widest text-blush-300">
          {q.category_name} · {q.value}
        </p>
        <h1 className="mx-auto mt-6 max-w-6xl text-center text-7xl font-medium leading-snug tracking-wide">
          {withNames(q.text, ACCENT_DARK)}
        </h1>
        {q.image_key && (
          <div className="mx-auto mt-6 flex max-h-[32vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl bg-cream-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/contests/contest5/${q.image_key}.jpg`}
              alt=""
              className="max-h-[28vh] min-h-[20vh] w-auto object-contain"
            />
          </div>
        )}
        {q.answer && (
          <>
            <p className="mx-auto mt-10 max-w-5xl rounded-3xl bg-emerald-600/30 px-10 py-8 text-center text-5xl font-semibold leading-snug tracking-wide text-emerald-200">
              {withNames(q.answer, "font-bold text-emerald-100")}
            </p>
            {q.answer_image_key && (
              <div className="mx-auto mt-6 flex max-h-[55vh] w-full max-w-5xl items-center justify-center overflow-hidden rounded-3xl bg-mocha-900/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/contests/contest5/${q.answer_image_key}.jpg`}
                  alt=""
                  className="max-h-[55vh] min-h-[40vh] w-auto object-contain"
                />
              </div>
            )}
          </>
        )}
        <section className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-6">
          {data.teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-4 rounded-3xl bg-mocha-700/50 px-7 py-4 text-4xl font-semibold tracking-wide"
              style={{ borderLeft: `8px solid ${t.color}` }}
            >
              <span>{t.name}</span>
              <span className="text-blush-300">{t.score}</span>
            </div>
          ))}
        </section>
      </main>
    );
  }

  // Idle — show the 5×5 board
  return (
    <main className="min-h-screen bg-gradient-to-b from-mocha-900 via-mocha-700 to-mocha-900 px-10 py-8 text-cream-50">
      <header className="text-center">
        <p className="text-lg uppercase tracking-widest text-blush-300">
          Конкурс 5
        </p>
        <h1 className="mt-2 text-7xl font-medium tracking-wide">
          Своя <span className="text-blush-300">игра</span>
        </h1>
      </header>

      <section className="mx-auto mt-8 max-w-7xl">
        <div className="grid grid-cols-5 gap-3">
          {data.categories.map((c) => (
            <div
              key={c.id}
              className="flex min-h-[120px] items-center justify-center rounded-2xl bg-mocha-900 px-3 py-6 text-center text-4xl font-semibold uppercase tracking-wider text-blush-300"
            >
              {c.name}
            </div>
          ))}
          {[100, 200, 300, 400, 500].map((value) =>
            data.categories.map((c) => {
              const q = c.questions.find((qq) => qq.value === value);
              if (!q) return <div key={`${c.id}-${value}`} />;
              const used = q.answered_status !== "unanswered";
              return (
                <div
                  key={q.id}
                  className={
                    "flex items-center justify-center rounded-2xl px-3 py-10 text-5xl font-bold tracking-wide transition " +
                    (used
                      ? "bg-mocha-700/40 text-mocha-700/40"
                      : "bg-blush-500 text-white shadow-soft")
                  }
                >
                  {used ? "" : value}
                </div>
              );
            }),
          )}
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2">
        {data.teams.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-3xl bg-mocha-700/50 px-8 py-5 text-4xl font-semibold tracking-wide"
            style={{ borderLeft: `10px solid ${t.color}` }}
          >
            <span>{t.name}</span>
            <span className="text-blush-300">{t.score}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
