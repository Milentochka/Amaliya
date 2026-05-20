"use client";

import { useEffect, useState } from "react";

import { Contest2Overview, projectorContest2Overview } from "@/lib/api";

function activeQid(data: Contest2Overview | null): number | null {
  if (!data) return null;
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "question_id"
  ];
  return typeof v === "number" ? v : null;
}

export function Contest2Projector() {
  const [data, setData] = useState<Contest2Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const d = await projectorContest2Overview();
        if (!cancelled) setData(d);
      } catch {
        // keep prior state
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

  const qid = activeQid(data);
  const isClosed = data.state.status === "closed";

  // Closed → final leaderboard.
  if (isClosed && data.leaderboard.length > 0) {
    return <FinalBoard data={data} />;
  }

  // No active question yet → big intro card.
  if (qid === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 via-cream-50 to-white">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-mocha-400">
            Конкурс 2
          </p>
          <h1 className="mt-3 text-7xl font-light text-mocha-900">
            Знаете ли{" "}
            <span className="font-medium text-blush-600">вы?</span>
          </h1>
          <p className="mt-4 text-mocha-500">
            Ведущий вот-вот покажет первый вопрос.
          </p>
          {data.answered > 0 && (
            <p className="mt-6 text-sm text-mocha-400">
              отвечено {data.answered} из {data.total}
            </p>
          )}
        </div>
      </main>
    );
  }

  const q = data.questions.find((x) => x.id === qid);
  if (!q) return null;
  const revealed = q.correct_index !== null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12 py-10">
      <header className="text-center">
        <p className="text-xl uppercase tracking-widest text-mocha-400">
          Вопрос {q.order_index} из {data.total}
        </p>
        <h1 className="mt-4 text-7xl font-medium leading-snug tracking-wide text-mocha-900">
          {q.text}
        </h1>
      </header>

      <section className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const correct = revealed && i === q.correct_index;
          return (
            <div
              key={i}
              className={
                "flex items-center gap-5 rounded-3xl border px-8 py-6 text-4xl font-semibold tracking-wide shadow-gentle transition " +
                (correct
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-cream-200 bg-white/80 text-mocha-900")
              }
            >
              <span
                className={
                  "flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold " +
                  (correct
                    ? "bg-emerald-600 text-white"
                    : "bg-cream-200 text-mocha-700")
                }
              >
                {String.fromCharCode(0x0410 + i)}
              </span>
              <span className="flex-1">{o}</span>
              {correct && <span className="text-5xl">✓</span>}
            </div>
          );
        })}
      </section>

      {revealed && q.first_correct_name && (
        <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-blush-200 bg-blush-100/40 p-8 text-center">
          <p className="text-xl uppercase tracking-widest text-blush-700">
            первым угадал
          </p>
          <p className="mt-3 text-6xl font-medium tracking-wide text-mocha-900">
            {q.first_correct_name}
          </p>
        </section>
      )}

      {data.answered > 0 && (
        <p className="mt-12 text-center text-lg tracking-wide text-mocha-400">
          лидеры:{" "}
          {data.leaderboard
            .slice(0, 5)
            .map((r) => `${r.name} — ${r.wins}`)
            .join(" · ")}
        </p>
      )}
    </main>
  );
}

function FinalBoard({ data }: { data: Contest2Overview }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 via-cream-50 to-white px-12 py-12">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-mocha-400">
          Конкурс 2 · итоги
        </p>
        <h1 className="mt-3 text-6xl font-light text-mocha-900">
          Знатоки <span className="font-medium text-blush-600">Амалии</span>
        </h1>
        {data.winner_name && (
          <p className="mt-4 text-3xl text-blush-600">
            🏆 {data.winner_name}
          </p>
        )}
      </header>

      <section className="mx-auto mt-10 max-w-2xl rounded-3xl border border-cream-200 bg-white/80 p-6 shadow-soft">
        <ul className="divide-y divide-cream-100">
          {data.leaderboard.map((r, i) => (
            <li
              key={r.name}
              className="flex items-center justify-between py-4 text-4xl font-semibold tracking-wide"
            >
              <span className="flex items-center gap-3">
                <span className="w-8 text-center text-mocha-400">
                  {i + 1}
                </span>
                <span className="text-mocha-900">{r.name}</span>
              </span>
              <span className="text-blush-600">{r.wins}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
