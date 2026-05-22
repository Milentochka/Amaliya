"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { adminListGame, GamePlayer } from "@/lib/api";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function AdminGamePage() {
  const [rows, setRows] = useState<GamePlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListGame()
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  const totalAttempts = rows?.reduce((a, r) => a + r.attempts, 0) ?? 0;
  const totalScore = rows?.reduce((a, r) => a + r.total_score, 0) ?? 0;
  const avgPerAttempt =
    totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">
          Игра <span className="font-medium text-blush-600">«Ангел Амалия»</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          {rows
            ? `${rows.length} игроков · ${totalAttempts} попыток · в среднем ${avgPerAttempt.toLocaleString("ru-RU")} за попытку`
            : "Загружаю…"}
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl border border-cream-200 bg-white/70 shadow-gentle">
        <table className="min-w-full text-sm">
          <thead className="border-b border-cream-200 text-xs uppercase tracking-wider text-mocha-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Игрок</th>
              <th className="px-4 py-3 text-right">Попыток</th>
              <th className="px-4 py-3 text-right">Всего</th>
              <th className="px-4 py-3 text-right">Лучшая</th>
              <th className="px-4 py-3 text-left">Первая</th>
              <th className="px-4 py-3 text-left">Последняя</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-mocha-400"
                >
                  Пока никто не играл.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr
                key={r.guest_id}
                className="border-b border-cream-100 last:border-0 hover:bg-cream-50/50"
              >
                <td className="px-4 py-3 text-mocha-700">{rankBadge(r.rank)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full bg-cream-100">
                      <Image
                        src={r.avatar_url}
                        alt={r.avatar_name}
                        fill
                        sizes="36px"
                        className="object-contain p-0.5"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="text-mocha-900">{r.guest_name}</div>
                      <div className="text-xs text-mocha-400">
                        {r.avatar_name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-mocha-700">
                  {r.attempts}
                </td>
                <td className="px-4 py-3 text-right font-medium text-mocha-900">
                  {r.total_score.toLocaleString("ru-RU")}
                </td>
                <td className="px-4 py-3 text-right text-mocha-700">
                  {r.best_score.toLocaleString("ru-RU")}
                </td>
                <td className="px-4 py-3 text-mocha-400">
                  {fmt(r.first_played_at)}
                </td>
                <td className="px-4 py-3 text-mocha-400">
                  {fmt(r.last_played_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
