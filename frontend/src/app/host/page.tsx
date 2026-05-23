"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ContestState,
  ContestStatus,
  hostContestsList,
  hostGetProjectorMode,
  hostSetProjectorMode,
} from "@/lib/api";

const CONTESTS: { id: number; title: string; subtitle: string; href: string | null }[] = [
  {
    id: 1,
    title: "На кого похожа",
    subtitle: "15 черт · бумажные бланки · голосование на проекторе",
    href: "/host/contest1",
  },
  {
    id: 2,
    title: "Знаете ли вы",
    subtitle: "15 вопросов · кто первый ответил",
    href: "/host/contest2",
  },
  {
    id: 3,
    title: "50 обещаний",
    subtitle: "Раздача и зачитывание на проекторе",
    href: "/host/contest3",
  },
  {
    id: 4,
    title: "Знак зодиака",
    subtitle: "12 знаков × 10 черт · бумажные бланки",
    href: "/host/contest4",
  },
  {
    id: 5,
    title: "Своя игра",
    subtitle: "5 × 5 = 25 вопросов · 2 команды · финал с тайной ставкой",
    href: "/host/contest5",
  },
];

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

const STATUS_STYLE: Record<ContestStatus, string> = {
  not_started: "bg-cream-200 text-mocha-700",
  active: "bg-blush-100 text-blush-700",
  closed: "bg-emerald-100 text-emerald-700",
};

export default function HostHomePage() {
  const [states, setStates] = useState<ContestState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contestsEnabled, setContestsEnabled] = useState<boolean | null>(null);
  const [modeBusy, setModeBusy] = useState(false);

  useEffect(() => {
    hostContestsList()
      .then(setStates)
      .catch((e) => setError((e as Error).message));
    hostGetProjectorMode()
      .then((m) => setContestsEnabled(m.contests_enabled))
      .catch((e) => setError((e as Error).message));
  }, []);

  async function toggleMode() {
    if (contestsEnabled === null || modeBusy) return;
    setError(null);
    setModeBusy(true);
    try {
      const next = await hostSetProjectorMode(!contestsEnabled);
      setContestsEnabled(next.contests_enabled);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setModeBusy(false);
    }
  }

  function stateFor(id: number): ContestStatus {
    return states?.find((s) => s.contest_id === id)?.status ?? "not_started";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">
          Режим <span className="font-medium text-blush-600">ведущего</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          Управляйте конкурсами с телефона — гости видят то же на проекторе.
          Проектор открывается по адресу{" "}
          <Link
            href="/projector"
            className="underline decoration-blush-300 underline-offset-2"
          >
            /projector
          </Link>
          .
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Master mode switch — controls whether projector shows the slideshow
          or any contest. Off by default. */}
      <section
        className={
          "rounded-3xl border-2 p-5 shadow-gentle transition " +
          (contestsEnabled
            ? "border-blush-400 bg-blush-50/60"
            : "border-cream-300 bg-cream-50/60")
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-mocha-400">
              Режим проектора
            </p>
            <p className="mt-1 text-lg font-medium text-mocha-900">
              {contestsEnabled === null
                ? "…"
                : contestsEnabled
                ? "Конкурсы"
                : "Слайд-шоу семьи"}
            </p>
            <p className="mt-1 text-xs text-mocha-500">
              {contestsEnabled
                ? "Проектор показывает активный конкурс или «Минуточку…» между ними."
                : "Проектор крутит фото/видео из раздела «Слайд-шоу»."}
            </p>
          </div>
          <button
            onClick={toggleMode}
            disabled={contestsEnabled === null || modeBusy}
            className={
              "shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 " +
              (contestsEnabled
                ? "bg-cream-200 text-mocha-700 hover:bg-cream-300"
                : "bg-blush-500 text-white hover:bg-blush-600")
            }
          >
            {contestsEnabled ? "Вернуть слайд-шоу" : "Запустить конкурсы"}
          </button>
        </div>
      </section>

      <ul className="space-y-3">
        {CONTESTS.map((c) => {
          const st = stateFor(c.id);
          const body = (
            <div className="flex items-start justify-between gap-3 rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-mocha-400">
                    Конкурс {c.id}
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " + STATUS_STYLE[st]
                    }
                  >
                    {STATUS_LABEL[st]}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-medium text-mocha-900">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs text-mocha-500">{c.subtitle}</p>
              </div>
              <div className="shrink-0 text-mocha-400">
                {c.href ? "→" : "скоро"}
              </div>
            </div>
          );
          return (
            <li key={c.id}>
              {c.href ? <Link href={c.href}>{body}</Link> : body}
            </li>
          );
        })}
      </ul>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-mocha-400">
          Печатные материалы
        </h2>
        <a
          href="/api/host/thank-you.pdf"
          target="_blank"
          className="block rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle transition hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-mocha-400">
                Открытка благодарности
              </p>
              <h3 className="mt-1 text-lg font-medium text-mocha-900">
                Спасибо гостям
              </h3>
              <p className="mt-1 text-xs text-mocha-500">
                A6 × 4 штуки на A4 · нарезка по линиям · раздача после
                банкета
              </p>
            </div>
            <div className="shrink-0 text-mocha-400">📄</div>
          </div>
        </a>
      </section>
    </div>
  );
}
