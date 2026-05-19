"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Contest5Overview,
  Contest5QuestionCell,
  Contest5Team,
  ContestStatus,
  hostContest5Close,
  hostContest5Open,
  hostContest5OpenFinal,
  hostContest5Overview,
  hostContest5Reset,
  hostContest5Resolve,
  hostContest5ResolveFinal,
  hostContest5RevealFinal,
  hostContest5ShowAnswer,
  hostContest5UpdateTeam,
  hostSetContestStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

function activeQid(data: Contest5Overview | null): number | null {
  if (!data) return null;
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "question_id"
  ];
  return typeof v === "number" ? v : null;
}

function finalActive(data: Contest5Overview | null): boolean {
  if (!data) return false;
  return Boolean(
    (data.state.active_step as Record<string, unknown> | null)?.["final"],
  );
}

function showAnswer(data: Contest5Overview | null): boolean {
  if (!data) return false;
  return Boolean(
    (data.state.active_step as Record<string, unknown> | null)?.["show_answer"],
  );
}

export default function HostContest5Page() {
  const [data, setData] = useState<Contest5Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function refresh() {
    try {
      setData(await hostContest5Overview());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function withResult<T>(fn: () => Promise<T>) {
    setError(null);
    try {
      const res = (await fn()) as Contest5Overview;
      setData(res);
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
  const qid = activeQid(data);
  const fin = finalActive(data);
  const showAns = showAnswer(data);
  const activeQ: Contest5QuestionCell | null = qid
    ? data.categories
        .flatMap((c) => c.questions.map((q) => ({ ...q, _cat: c.name })))
        .find((q) => q.id === qid) || null
    : null;
  const activeCatName = qid
    ? data.categories.find((c) => c.questions.some((q) => q.id === qid))?.name
    : null;

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
          Своя <span className="font-medium text-blush-600">игра</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cream-200 px-3 py-1 text-xs text-mocha-700">
            {STATUS_LABEL[status]}
          </span>
          {status !== "active" && (
            <button
              onClick={() => hostSetContestStatus(5, "active").then(refresh)}
              className="rounded-full bg-blush-500 px-3 py-1 text-xs text-white hover:bg-blush-600"
            >
              Запустить
            </button>
          )}
          {status === "active" && (
            <button
              onClick={() => hostSetContestStatus(5, "closed").then(refresh)}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
            >
              Закрыть
            </button>
          )}
          {status === "closed" && (
            <button
              onClick={() => hostSetContestStatus(5, "active").then(refresh)}
              className="rounded-full border border-cream-300 px-3 py-1 text-xs text-mocha-700 hover:bg-cream-100"
            >
              Снова открыть
            </button>
          )}
          <button
            onClick={() => setConfirmReset(true)}
            className="rounded-full px-3 py-1 text-xs text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
          >
            Полный сброс
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Teams */}
      <section className="grid gap-3 sm:grid-cols-2">
        {data.teams.map((t) => (
          <TeamCard
            key={t.id}
            team={t}
            onSaved={refresh}
          />
        ))}
      </section>

      {/* Active question controls */}
      {activeQ && (
        <section className="rounded-3xl border border-blush-400 bg-blush-50 p-5 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-blush-700">
            На проекторе сейчас
          </p>
          <p className="mt-1 text-base font-medium text-mocha-900">
            {activeCatName} · {activeQ.value}
          </p>
          <p className="mt-2 text-sm text-mocha-700">{activeQ.text}</p>
          <p className="mt-2 text-xs text-mocha-500">
            <b>Правильный ответ:</b> {activeQ.answer}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!showAns && (
              <button
                onClick={() => withResult(hostContest5ShowAnswer)}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
              >
                Показать ответ
              </button>
            )}
            {data.teams.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: t.color }}
                />
                {t.name}
                <button
                  onClick={() =>
                    withResult(() =>
                      hostContest5Resolve(activeQ.id, t.id, true),
                    )
                  }
                  className="ml-1 rounded-full bg-emerald-100 px-1.5 text-emerald-700 hover:bg-emerald-200"
                >
                  +{activeQ.value}
                </button>
                <button
                  onClick={() =>
                    withResult(() =>
                      hostContest5Resolve(activeQ.id, t.id, false),
                    )
                  }
                  className="rounded-full bg-blush-100 px-1.5 text-blush-700 hover:bg-blush-200"
                >
                  −{activeQ.value}
                </button>
              </span>
            ))}
            <button
              onClick={() =>
                withResult(() => hostContest5Resolve(activeQ.id, null, false))
              }
              className="rounded-full border border-cream-300 px-3 py-1.5 text-xs text-mocha-700 hover:bg-cream-100"
            >
              Никто не ответил
            </button>
            <button
              onClick={() => withResult(hostContest5Close)}
              className="rounded-full px-3 py-1.5 text-xs text-mocha-400 hover:bg-cream-100"
            >
              Скрыть с проектора
            </button>
          </div>
        </section>
      )}

      {/* Board */}
      <section className="overflow-x-auto rounded-3xl border border-cream-200 bg-white/70 p-3 shadow-gentle">
        <div className="grid grid-cols-5 gap-2">
          {data.categories.map((c) => (
            <div key={c.id} className="text-center">
              <div className="rounded-2xl bg-mocha-900 px-2 py-3 text-xs font-medium uppercase tracking-wider text-cream-50">
                {c.name}
              </div>
            </div>
          ))}
          {[100, 200, 300, 400, 500].map((value) =>
            data.categories.map((c) => {
              const q = c.questions.find((qq) => qq.value === value);
              if (!q) return <div key={`${c.id}-${value}`} />;
              const team = q.answered_team_id
                ? data.teams.find((t) => t.id === q.answered_team_id)
                : null;
              const isActive = qid === q.id;
              const isAnswered = q.answered_status !== "unanswered";
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    if (!isAnswered) withResult(() => hostContest5Open(q.id));
                  }}
                  disabled={isAnswered}
                  className={
                    "rounded-2xl px-2 py-5 text-xl font-medium transition " +
                    (isActive
                      ? "bg-blush-500 text-white ring-2 ring-blush-300"
                      : isAnswered
                      ? "bg-cream-100 text-mocha-300 cursor-not-allowed"
                      : "bg-blush-100 text-blush-700 hover:bg-blush-200")
                  }
                  style={
                    isAnswered && team
                      ? { borderLeft: `4px solid ${team.color}` }
                      : undefined
                  }
                >
                  {value}
                </button>
              );
            }),
          )}
        </div>
      </section>

      {/* Final */}
      <section className="rounded-3xl border border-cream-200 bg-cream-50/60 p-5">
        <p className="text-xs uppercase tracking-wider text-mocha-400">
          Финал
        </p>
        <p className="mt-1 text-base text-mocha-700">
          {data.final?.text ?? "—"}
        </p>
        <p className="mt-1 text-xs text-mocha-500">
          <b>Ответ:</b> {data.final?.answer ?? "—"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => withResult(hostContest5OpenFinal)}
            className={
              "rounded-full px-3 py-1.5 text-xs " +
              (fin
                ? "bg-blush-100 text-blush-700"
                : "bg-blush-500 text-white hover:bg-blush-600")
            }
          >
            {fin ? "Финал на экране" : "Показать финальный вопрос"}
          </button>
          {fin && !data.final?.revealed && (
            <button
              onClick={() => withResult(hostContest5RevealFinal)}
              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
            >
              Показать правильный ответ
            </button>
          )}
          {fin && (
            <button
              onClick={() => withResult(hostContest5Close)}
              className="rounded-full border border-cream-300 px-3 py-1.5 text-xs text-mocha-700 hover:bg-cream-100"
            >
              Скрыть финал
            </button>
          )}
          <button
            onClick={() => withResult(hostContest5ResolveFinal)}
            className="rounded-full bg-blush-500 px-3 py-1.5 text-xs text-white hover:bg-blush-600"
          >
            Применить ставки команд
          </button>
        </div>
      </section>

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Сбросить всю игру?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              Очки команд, статусы вопросов и финал обнулятся. Текст вопросов
              сохранится.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  await withResult(hostContest5Reset);
                  setConfirmReset(false);
                }}
                className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team,
  onSaved,
}: {
  team: Contest5Team;
  onSaved: () => void;
}) {
  const [name, setName] = useState(team.name);
  const [score, setScore] = useState<number>(team.score);
  const [wager, setWager] = useState<number>(team.final_wager);

  useEffect(() => {
    setName(team.name);
    setScore(team.score);
    setWager(team.final_wager);
  }, [team]);

  async function commit(patch: Parameters<typeof hostContest5UpdateTeam>[1]) {
    try {
      await hostContest5UpdateTeam(team.id, patch);
      onSaved();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div
      className="rounded-3xl border bg-white/80 p-4 shadow-gentle"
      style={{ borderColor: team.color }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 rounded-full"
          style={{ background: team.color }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== team.name && commit({ name })}
          className="flex-1 rounded-2xl border border-transparent bg-transparent px-2 py-1 text-base font-medium text-mocha-900 focus:border-cream-300 focus:bg-white"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-mocha-400">
            Очки
          </span>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value || 0))}
            onBlur={() => score !== team.score && commit({ score })}
            className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-center text-base outline-none focus:border-blush-400"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-mocha-400">
            Ставка финал
          </span>
          <input
            type="number"
            min={0}
            value={wager}
            onChange={(e) => setWager(Number(e.target.value || 0))}
            onBlur={() =>
              wager !== team.final_wager && commit({ final_wager: wager })
            }
            className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-center text-base outline-none focus:border-blush-400"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="text-xs text-mocha-500">Финал:</span>
        <button
          onClick={() => commit({ final_correct: true })}
          className={
            "rounded-full px-2 py-0.5 text-xs " +
            (team.final_correct === true
              ? "bg-emerald-600 text-white"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
          }
        >
          ✓ верно
        </button>
        <button
          onClick={() => commit({ final_correct: false })}
          className={
            "rounded-full px-2 py-0.5 text-xs " +
            (team.final_correct === false
              ? "bg-blush-500 text-white"
              : "bg-blush-100 text-blush-700 hover:bg-blush-200")
          }
        >
          ✕ нет
        </button>
        <button
          onClick={() => commit({ final_correct: null })}
          className="rounded-full bg-cream-100 px-2 py-0.5 text-xs text-mocha-500 hover:bg-cream-200"
        >
          —
        </button>
      </div>
    </div>
  );
}
