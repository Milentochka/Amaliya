"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Contest4Overview,
  Contest4Zodiac,
  ContestStatus,
  hostContest4Overview,
  hostContest4SetActive,
  hostContest4ToggleTrait,
  hostSetContestStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

function activeKey(data: Contest4Overview | null): string | null {
  if (!data) return null;
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "zodiac_key"
  ];
  return typeof v === "string" ? v : null;
}

function selectedTraitIndices(data: Contest4Overview | null): number[] {
  if (!data) return [];
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "selected_trait_indices"
  ];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is number => typeof x === "number");
}

export default function HostContest4Page() {
  const [data, setData] = useState<Contest4Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setData(await hostContest4Overview());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function changeStatus(s: ContestStatus) {
    setError(null);
    try {
      await hostSetContestStatus(4, s);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function showZodiac(key: string) {
    setError(null);
    try {
      await hostContest4SetActive(key);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function clearActive() {
    setError(null);
    try {
      await hostContest4SetActive(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleTrait(orderIndex: number) {
    setError(null);
    try {
      await hostContest4ToggleTrait(orderIndex);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!data && !error) return <p className="text-mocha-400">Загрузка…</p>;
  if (error && !data)
    return (
      <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
        {error}
      </p>
    );
  if (!data) return null;

  const status = data.state.status;
  const active = activeKey(data);
  const selected = selectedTraitIndices(data);
  const populated = data.zodiacs.filter((z) => z.guests.length > 0);
  const empty = data.zodiacs.filter((z) => z.guests.length === 0);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/host"
          className="text-xs uppercase tracking-wider text-mocha-400 hover:text-mocha-700"
        >
          ← к списку конкурсов
        </Link>
        <h1 className="text-3xl font-light text-mocha-900">
          Знак <span className="font-medium text-blush-600">зодиака</span>
        </h1>
        <p className="text-sm text-mocha-500">
          {populated.length} знак{populated.length === 1 ? "" : "ов"} с
          гостями · пустые пропускаются
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cream-200 px-3 py-1 text-xs text-mocha-700">
            {STATUS_LABEL[status]}
          </span>
          {status !== "active" && (
            <button
              onClick={() => changeStatus("active")}
              className="rounded-full bg-blush-500 px-3 py-1 text-xs text-white hover:bg-blush-600"
            >
              Запустить
            </button>
          )}
          {status === "active" && (
            <>
              <button
                onClick={() => changeStatus("closed")}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
              >
                Закрыть
              </button>
              {active && (
                <button
                  onClick={clearActive}
                  className="rounded-full border border-cream-300 px-3 py-1 text-xs text-mocha-700 hover:bg-cream-100"
                >
                  Скрыть с проектора
                </button>
              )}
            </>
          )}
          {status === "closed" && (
            <button
              onClick={() => changeStatus("active")}
              className="rounded-full border border-cream-300 px-3 py-1 text-xs text-mocha-700 hover:bg-cream-100"
            >
              Снова открыть
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* PDF downloads */}
      <section className="grid gap-3 sm:grid-cols-2">
        <a
          href="/api/host/contest4/blanks-all.pdf"
          target="_blank"
          className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-center text-sm text-mocha-700 shadow-gentle hover:bg-cream-50"
        >
          📄 Все 12 бланков одним PDF
        </a>
        <div className="rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-center text-xs text-mocha-500">
          Печатай для каждого знака столько копий, сколько у него гостей.
        </div>
      </section>

      {/* Populated zodiacs */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-mocha-400">
          Знаки с гостями
        </h2>
        {populated.length === 0 && (
          <p className="text-sm text-mocha-400">
            Ни одного гостя ни в одном знаке.
          </p>
        )}
        {populated.map((z) => (
          <ZodiacCard
            key={z.key}
            z={z}
            isActive={active === z.key}
            selectedTraitIndices={active === z.key ? selected : []}
            onShow={() => showZodiac(z.key)}
            onToggleTrait={toggleTrait}
          />
        ))}
      </section>

      {/* Empty zodiacs collapsed */}
      {empty.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-mocha-400">
            Без гостей (пропускаются)
          </h2>
          <div className="flex flex-wrap gap-2">
            {empty.map((z) => (
              <span
                key={z.key}
                className="rounded-full bg-cream-100 px-3 py-1 text-xs text-mocha-500"
              >
                {z.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ZodiacCard({
  z,
  isActive,
  selectedTraitIndices,
  onShow,
  onToggleTrait,
}: {
  z: Contest4Zodiac;
  isActive: boolean;
  selectedTraitIndices: number[];
  onShow: () => void;
  onToggleTrait: (orderIndex: number) => void;
}) {
  const expectedSelections = z.guests.length * 2;
  return (
    <div
      className={
        "rounded-3xl border bg-white/80 p-5 shadow-gentle transition " +
        (isActive ? "border-blush-400 ring-2 ring-blush-200" : "border-cream-200")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-mocha-400">
            Знак · {z.guests.length} {z.guests.length === 1 ? "гость" : "гостя/ей"}
          </p>
          <h3 className="mt-1 text-2xl font-medium text-mocha-900">
            {z.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {z.guests.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-2 py-1 text-xs text-mocha-700"
              >
                <span className="relative h-5 w-5 overflow-hidden rounded-full bg-white">
                  <Image
                    src={g.avatar_url}
                    alt={g.avatar_name}
                    fill
                    sizes="20px"
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </span>
                {g.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onShow}
            className={
              "rounded-full px-3 py-1.5 text-xs " +
              (isActive
                ? "bg-blush-100 text-blush-700"
                : "bg-blush-500 text-white hover:bg-blush-600")
            }
          >
            {isActive ? "на экране" : "На проектор"}
          </button>
          <a
            href={`/api/host/contest4/blanks/${z.key}.pdf`}
            target="_blank"
            className="rounded-full border border-cream-300 px-3 py-1.5 text-center text-xs text-mocha-700 hover:bg-cream-100"
          >
            📄 Бланк
          </a>
        </div>
      </div>

      {isActive ? (
        <section className="mt-4">
          <p className="text-xs uppercase tracking-wider text-mocha-400">
            Тапни на черту → подсветка на проекторе ·{" "}
            <span className="text-mocha-700">
              выбрано {selectedTraitIndices.length} из {expectedSelections}
            </span>
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {z.traits.map((t) => {
              const on = selectedTraitIndices.includes(t.order_index);
              return (
                <button
                  key={t.order_index}
                  onClick={() => onToggleTrait(t.order_index)}
                  className={
                    "flex items-start gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition " +
                    (on
                      ? "border-blush-400 bg-blush-100 text-blush-800 ring-1 ring-blush-300"
                      : "border-cream-200 bg-white text-mocha-700 hover:bg-cream-50")
                  }
                >
                  <span className={on ? "text-blush-500" : "text-mocha-400"}>
                    {t.order_index}.
                  </span>
                  <span className="flex-1">{t.text}</span>
                  {on && <span className="text-blush-600">✓</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-mocha-400 hover:text-mocha-700">
            Показать 10 черт
          </summary>
          <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-mocha-700">
            {z.traits.map((t) => (
              <li key={t.order_index}>
                <span className="text-mocha-400 mr-1">{t.order_index}.</span>
                {t.text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
