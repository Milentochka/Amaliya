"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Contest3CurrentGuest,
  Contest3Stats,
  ContestStatus,
  hostContest3Assign,
  hostContest3ClearActive,
  hostContest3MarkRead,
  hostContest3Next,
  hostContest3Reset,
  hostContest3Stats,
  hostSetContestStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

export default function HostContest3Page() {
  const [stats, setStats] = useState<Contest3Stats | null>(null);
  const [current, setCurrent] = useState<Contest3CurrentGuest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [working, setWorking] = useState(false);

  async function refresh() {
    try {
      setStats(await hostContest3Stats());
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
      await hostSetContestStatus(3, s);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doAssign() {
    setError(null);
    setWorking(true);
    try {
      await hostContest3Assign(2);
      setConfirmAssign(false);
      setCurrent(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function nextGuest() {
    setError(null);
    setWorking(true);
    try {
      // First, if there's a current guest, mark their promises read.
      if (current && current.promises.length > 0) {
        await hostContest3MarkRead(current.promises.map((p) => p.id));
      }
      const g = await hostContest3Next();
      setCurrent(g);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function clearActive() {
    setError(null);
    setWorking(true);
    try {
      // Persist current guest's promises as read before clearing
      if (current && current.promises.length > 0) {
        await hostContest3MarkRead(current.promises.map((p) => p.id));
      }
      await hostContest3ClearActive();
      setCurrent(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function doReset() {
    setError(null);
    try {
      await hostContest3Reset();
      setCurrent(null);
      setConfirmReset(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!stats && !error) return <p className="text-mocha-400">Загрузка…</p>;
  if (error && !stats)
    return (
      <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
        {error}
      </p>
    );
  if (!stats) return null;

  const status = stats.state.status;
  const assigned = stats.assigned_total > 0;
  const allDone =
    assigned && stats.read_total >= stats.assigned_total;

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
          50 <span className="font-medium text-blush-600">обещаний</span>
        </h1>
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
            <button
              onClick={() => changeStatus("closed")}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
            >
              Закрыть
            </button>
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
            Полный сброс
          </button>
        </div>
      </header>

      {/* Spoiler-free progress */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 shadow-gentle">
          <p className="text-xs uppercase tracking-wider text-mocha-400">
            Раздача
          </p>
          <p className="mt-1 text-2xl font-medium text-mocha-900">
            {stats.guests_with_assignments} / {stats.guests_total}
          </p>
          <p className="mt-1 text-xs text-mocha-500">
            гостей с обещаниями · по {Math.round(
              stats.assigned_total /
                Math.max(stats.guests_with_assignments, 1),
            )} на каждого
          </p>
        </div>
        <div className="rounded-3xl border border-cream-200 bg-white/80 p-5 shadow-gentle">
          <p className="text-xs uppercase tracking-wider text-mocha-400">
            Прочитано
          </p>
          <p className="mt-1 text-2xl font-medium text-mocha-900">
            {stats.read_total} / {stats.assigned_total}
          </p>
          <p className="mt-1 text-xs text-mocha-500">
            гостей завершили: {stats.guests_done} из{" "}
            {stats.guests_with_assignments}
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Actions row */}
      <section className="space-y-3">
        {!assigned ? (
          <div className="rounded-3xl border border-cream-200 bg-cream-50/60 p-5">
            <p className="text-sm text-mocha-700">
              Сначала раздайте обещания. Каждому зарегистрированному гостю
              достанется по 2 случайных обещания. Кто кому — ни ты, ни Микаел
              не увидите до момента показа на проекторе.
            </p>
            <button
              onClick={() => setConfirmAssign(true)}
              disabled={working}
              className="mt-3 rounded-full bg-blush-500 px-4 py-2 text-sm text-white hover:bg-blush-600 disabled:opacity-50"
            >
              🎲 Раздать обещания
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-3xl border border-cream-200 bg-cream-50/60 p-5">
            <p className="text-sm text-mocha-700">
              Обещания уже разданы. Нажми «Следующий гость» — система выберет
              случайного и покажет его на проекторе вместе с обещаниями.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={nextGuest}
                disabled={working || allDone}
                className="rounded-full bg-blush-500 px-4 py-2 text-sm text-white hover:bg-blush-600 disabled:opacity-50"
              >
                {allDone ? "🎉 Все прочитали" : "→ Следующий гость"}
              </button>
              {current && (
                <button
                  onClick={clearActive}
                  disabled={working}
                  className="rounded-full border border-cream-300 px-4 py-2 text-sm text-mocha-700 hover:bg-cream-100"
                >
                  Скрыть с проектора
                </button>
              )}
              <button
                onClick={() => setConfirmAssign(true)}
                disabled={working}
                className="rounded-full px-4 py-2 text-sm text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
              >
                🎲 Перераспределить
              </button>
            </div>
          </div>
        )}

        <a
          href="/api/host/contest3/cards.pdf"
          target="_blank"
          className="block rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-center text-sm text-mocha-700 shadow-gentle hover:bg-cream-50"
        >
          📄 Скачать карточки для нарезки (бумажный вариант)
        </a>
      </section>

      {/* Current guest (after pressing next) */}
      {current && (
        <section className="rounded-3xl border border-blush-200 bg-blush-100/40 p-6">
          <p className="text-xs uppercase tracking-wider text-blush-700">
            Сейчас на проекторе
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-cream-100 ring-2 ring-cream-100">
              <Image
                src={current.avatar_url}
                alt={current.avatar_name}
                fill
                sizes="56px"
                className="object-contain p-1"
                unoptimized
              />
            </div>
            <div>
              <div className="text-2xl font-medium text-mocha-900">
                {current.guest_name}
              </div>
              <div className="text-xs text-mocha-500">
                {current.avatar_name}
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {current.promises.map((p, i) => (
              <li
                key={p.id}
                className="rounded-2xl bg-white/70 p-3 text-mocha-900"
              >
                <span className="mr-2 text-blush-600">№{i + 1}.</span>
                {p.text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mocha-500">
            Нажми «Следующий гость» когда зачитают — обещания пометятся как
            прочитанные автоматически.
          </p>
        </section>
      )}

      {confirmAssign && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              {assigned ? "Перераспределить?" : "Раздать обещания?"}
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              {assigned
                ? "Все текущие назначения и пометки «прочитано» обнулятся, обещания будут розданы заново."
                : "Каждому из зарегистрированных гостей достанется по 2 случайных обещания. Никто не увидит распределение заранее."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAssign(false)}
                className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
              >
                Отмена
              </button>
              <button
                onClick={doAssign}
                disabled={working}
                className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600 disabled:opacity-50"
              >
                Раздать
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Полный сброс?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              Все назначения и пометки «прочитано» удалятся. Тексты обещаний
              сохранятся.
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
