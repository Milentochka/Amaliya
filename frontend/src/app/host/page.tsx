"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ContestState, ContestStatus, hostContestsList } from "@/lib/api";

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
    href: null,
  },
  {
    id: 4,
    title: "Знак зодиака",
    subtitle: "12 знаков × 10 черт · бумажные бланки",
    href: null,
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

  useEffect(() => {
    hostContestsList()
      .then(setStates)
      .catch((e) => setError((e as Error).message));
  }, []);

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
    </div>
  );
}
