"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminDashboardStats, DashboardStats, StatsCounts } from "@/lib/api";

function rsvpRow(counts: StatsCounts) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
        ✅ {counts.coming}
      </span>
      <span className="rounded-full bg-blush-100 px-2.5 py-0.5 text-blush-700">
        ❌ {counts.not_coming}
      </span>
      <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-mocha-700">
        ❓ {counts.maybe}
      </span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminDashboardStats()
      .then(setStats)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error)
    return (
      <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
        {error}
      </p>
    );
  if (!stats) return <p className="text-mocha-400">Загрузка…</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">
          Сводка <span className="font-medium text-blush-600">по празднику</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          Краткая картина: кто, что и сколько.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Гостей всего" value={stats.guests_total} link="/admin/guests" />
        <Card
          title="Подарков забронировано"
          value={`${stats.wishlist_booked} / ${stats.wishlist_total}`}
          sub={`свободно: ${stats.wishlist_free}`}
          link="/admin/wishlist"
        />
        <Card
          title="Сумма подарков"
          value={`${stats.bookings_sum_rub.toLocaleString("ru-RU")} ₽`}
          sub={`броней: ${stats.bookings_total}`}
          link="/admin/bookings"
        />
        <Card
          title="Игроков"
          value={stats.game_players}
          sub={`попыток: ${stats.game_attempts}`}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-mocha-900">Крестины</h3>
            {rsvpRow(stats.christening)}
          </div>
          <p className="mt-2 text-xs text-mocha-400">
            Подтвердили: {stats.christening.coming} из {stats.guests_total}
          </p>
        </div>
        <div className="rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-mocha-900">Банкет</h3>
            {rsvpRow(stats.banquet)}
          </div>
          <p className="mt-2 text-xs text-mocha-400">
            Подтвердили: {stats.banquet.coming} из {stats.guests_total}
            {stats.banquet.maybe > 0 &&
              `, ещё ${stats.banquet.maybe} «может быть»`}
          </p>
        </div>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  link,
}: {
  title: string;
  value: number | string;
  sub?: string;
  link?: string;
}) {
  const inner = (
    <div className="rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle transition hover:shadow-soft">
      <p className="text-xs uppercase tracking-wider text-mocha-400">{title}</p>
      <p className="mt-1.5 text-2xl font-medium text-mocha-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-mocha-500">{sub}</p>}
    </div>
  );
  return link ? <Link href={link}>{inner}</Link> : inner;
}
