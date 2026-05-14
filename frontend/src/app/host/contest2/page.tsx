"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  adminListGuests,
  Contest2Overview,
  Contest2Question,
  ContestStatus,
  GuestAdmin,
  hostContest2ClearFirst,
  hostContest2Overview,
  hostContest2Reset,
  hostContest2SetActive,
  hostContest2SetFirst,
  hostSetContestStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

function activeQid(data: Contest2Overview | null): number | null {
  if (!data) return null;
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "question_id"
  ];
  return typeof v === "number" ? v : null;
}

function showAnswer(data: Contest2Overview | null): boolean {
  if (!data) return false;
  const v = (data.state.active_step as Record<string, unknown> | null)?.[
    "show_answer"
  ];
  return Boolean(v);
}

export default function HostContest2Page() {
  const [data, setData] = useState<Contest2Overview | null>(null);
  const [guests, setGuests] = useState<GuestAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function refresh() {
    try {
      setData(await hostContest2Overview());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
    adminListGuests()
      .then(setGuests)
      .catch(() => setGuests([]));
  }, []);

  async function changeStatus(s: ContestStatus) {
    setError(null);
    try {
      await hostSetContestStatus(2, s);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function open(qid: number) {
    await hostContest2SetActive(qid, false);
    await refresh();
  }
  async function reveal(qid: number) {
    await hostContest2SetActive(qid, true);
    await refresh();
  }
  async function clearActive() {
    await hostContest2SetActive(null, false);
    await refresh();
  }
  async function setFirst(
    qid: number,
    payload: { guest_id?: string | null; guest_name?: string | null },
  ) {
    try {
      await hostContest2SetFirst(qid, payload);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function clearFirst(qid: number) {
    await hostContest2ClearFirst(qid);
    await refresh();
  }
  async function doReset() {
    setError(null);
    try {
      await hostContest2Reset();
      setConfirmReset(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!data && !error)
    return <p className="text-mocha-400">Загрузка…</p>;
  if (error && !data)
    return (
      <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
        {error}
      </p>
    );
  if (!data) return null;

  const status = data.state.status;
  const activeId = activeQid(data);
  const isAnswer = showAnswer(data);

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
          Знаете ли <span className="font-medium text-blush-600">вы?</span>
        </h1>
        <p className="text-sm text-mocha-500">
          Прогресс: {data.answered} из {data.total}
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
              {activeId !== null && (
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
          <button
            onClick={() => setConfirmReset(true)}
            className="rounded-full px-3 py-1 text-xs text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
          >
            Сбросить ответы
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Leaderboard preview */}
      {data.leaderboard.length > 0 && (
        <section className="rounded-3xl border border-blush-200 bg-blush-100/40 p-5">
          <p className="text-xs uppercase tracking-wider text-blush-700">
            Лидер{data.leaderboard.length > 1 ? "ы" : ""}
          </p>
          <p className="mt-1 text-xl font-medium text-mocha-900">
            {data.winner_name ?? "—"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mocha-500">
            {data.leaderboard.slice(0, 6).map((row) => (
              <li key={row.name}>
                <span className="text-mocha-700">{row.name}</span> · {row.wins}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Questions */}
      <section className="space-y-3">
        {data.questions.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            guests={guests}
            isActive={activeId === q.id}
            isAnswer={isAnswer && activeId === q.id}
            onOpen={() => open(q.id)}
            onReveal={() => reveal(q.id)}
            onSetFirst={(p) => setFirst(q.id, p)}
            onClearFirst={() => clearFirst(q.id)}
          />
        ))}
      </section>

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Сбросить все ответы?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              Имена первых правильно ответивших и активный вопрос обнулятся.
              Сами вопросы останутся.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
              >
                Отмена
              </button>
              <button
                onClick={doReset}
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

function QuestionCard({
  q,
  guests,
  isActive,
  isAnswer,
  onOpen,
  onReveal,
  onSetFirst,
  onClearFirst,
}: {
  q: Contest2Question;
  guests: GuestAdmin[];
  isActive: boolean;
  isAnswer: boolean;
  onOpen: () => void;
  onReveal: () => void;
  onSetFirst: (p: { guest_id?: string | null; guest_name?: string | null }) => void;
  onClearFirst: () => void;
}) {
  const [customName, setCustomName] = useState("");

  return (
    <div
      className={
        "rounded-3xl border bg-white/80 p-5 shadow-gentle transition " +
        (isActive ? "border-blush-400 ring-2 ring-blush-200" : "border-cream-200")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-mocha-400">
            Вопрос {q.order_index}
          </p>
          <h3 className="mt-1 text-base font-medium text-mocha-900">
            {q.text}
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {q.options.map((o, i) => (
              <li
                key={i}
                className={
                  "rounded-xl px-3 py-1.5 " +
                  (i === q.correct_index
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-mocha-700")
                }
              >
                {String.fromCharCode(0x0410 + i)}. {o}
                {i === q.correct_index && " ✓"}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          {!isActive && (
            <button
              onClick={onOpen}
              className="rounded-full bg-blush-500 px-3 py-1.5 text-xs text-white hover:bg-blush-600"
            >
              На проектор
            </button>
          )}
          {isActive && !isAnswer && (
            <button
              onClick={onReveal}
              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
            >
              Показать ответ
            </button>
          )}
          {isActive && (
            <span className="rounded-full bg-blush-100 px-3 py-1 text-center text-xs text-blush-700">
              на экране
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-cream-100 pt-3">
        <p className="text-xs uppercase tracking-wider text-mocha-400">
          Первый правильный
        </p>
        {q.first_correct_name ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
              {q.first_correct_name}
            </span>
            <button
              onClick={onClearFirst}
              className="text-xs text-mocha-400 hover:text-blush-700"
            >
              ✕ убрать
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {guests.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onSetFirst({ guest_id: g.id })}
                  className="rounded-full border border-cream-300 px-2.5 py-1 text-xs text-mocha-700 hover:bg-cream-100"
                >
                  {g.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="другое имя…"
                className="flex-1 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blush-400"
              />
              <button
                onClick={() => {
                  const name = customName.trim();
                  if (!name) return;
                  onSetFirst({ guest_name: name });
                  setCustomName("");
                }}
                className="rounded-full bg-blush-500 px-3 py-1.5 text-xs text-white hover:bg-blush-600"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
