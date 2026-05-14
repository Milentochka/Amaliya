"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Contest1Overview,
  Contest1Trait,
  ContestStatus,
  hostContest1Overview,
  hostContest1Reset,
  hostContest1SetTally,
  hostSetContestStatus,
  RelativeVote,
} from "@/lib/api";

const STATUS_LABEL: Record<ContestStatus, string> = {
  not_started: "не запущен",
  active: "идёт",
  closed: "закрыт",
};

export default function HostContest1Page() {
  const [data, setData] = useState<Contest1Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function refresh() {
    try {
      setData(await hostContest1Overview());
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
      await hostSetContestStatus(1, s);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doReset() {
    setError(null);
    try {
      await hostContest1Reset();
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
  const summary = data.summary;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/host"
          className="text-xs uppercase tracking-wider text-mocha-400 hover:text-mocha-700"
        >
          ← к списку конкурсов
        </Link>
        <h1 className="text-2xl font-light text-mocha-900">
          На кого <span className="font-medium text-blush-600">похожа</span>
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
            Сбросить голоса
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-3">
        <a
          href="/api/host/contest1/blank.pdf"
          target="_blank"
          className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-center text-sm text-mocha-700 shadow-gentle hover:bg-cream-50"
        >
          📄 Бланк для гостей
        </a>
        <a
          href="/api/host/contest1/results.pdf"
          target="_blank"
          className="rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-center text-sm text-mocha-700 shadow-gentle hover:bg-cream-50"
        >
          📄 Бланк итогов
        </a>
      </section>

      <section className="rounded-3xl border border-blush-200 bg-blush-100/40 p-4">
        <p className="text-xs uppercase tracking-wider text-blush-700">Итог</p>
        <p className="mt-1 text-xl font-medium text-mocha-900">
          {summary.verdict ?? "—"}
        </p>
        <p className="mt-1 text-xs text-mocha-500">
          мама {summary.totals.mom} · папа {summary.totals.dad} · родственники{" "}
          {summary.totals.relatives}
          {summary.top_relative_name &&
            ` (топ: ${summary.top_relative_name})`}{" "}
          · уникально {summary.totals.unique}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-mocha-400">
          Черты — впишите количество голосов
        </h2>
        {data.traits.map((t) => (
          <TraitCard key={t.id} trait={t} onChanged={refresh} />
        ))}
      </section>

      {confirmReset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Сбросить все голоса?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              Все цифры по всем чертам обнулятся. Действие необратимо.
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

function TraitCard({
  trait,
  onChanged,
}: {
  trait: Contest1Trait;
  onChanged: () => void;
}) {
  const [mom, setMom] = useState<number>(trait.votes_mom);
  const [dad, setDad] = useState<number>(trait.votes_dad);
  const [uniq, setUniq] = useState<number>(trait.votes_unique);
  const [rels, setRels] = useState<RelativeVote[]>(trait.votes_relatives);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    setMom(trait.votes_mom);
    setDad(trait.votes_dad);
    setUniq(trait.votes_unique);
    setRels(trait.votes_relatives);
  }, [trait]);

  async function save(payload: Parameters<typeof hostContest1SetTally>[1], field: string) {
    setSavingField(field);
    try {
      await hostContest1SetTally(trait.id, payload);
      onChanged();
    } finally {
      setSavingField(null);
    }
  }

  function updateRelative(idx: number, patch: Partial<RelativeVote>) {
    setRels((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRelative() {
    setRels((prev) => [...prev, { name: "", count: 0 }]);
  }

  function removeRelative(idx: number) {
    setRels((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="rounded-3xl border border-cream-200 bg-white/70 p-4 shadow-gentle">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mocha-900">
          {trait.order_index}. {trait.name}
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <CountField
          label="мама"
          value={mom}
          onChange={setMom}
          onBlur={() => save({ votes_mom: mom }, "mom")}
          saving={savingField === "mom"}
        />
        <CountField
          label="папа"
          value={dad}
          onChange={setDad}
          onBlur={() => save({ votes_dad: dad }, "dad")}
          saving={savingField === "dad"}
        />
        <CountField
          label="уникально"
          value={uniq}
          onChange={setUniq}
          onBlur={() => save({ votes_unique: uniq }, "uniq")}
          saving={savingField === "uniq"}
        />
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-mocha-400">
          Родственники
        </div>
        {rels.length === 0 && (
          <p className="text-xs text-mocha-400">
            Нажмите «+» если кто-то отметил «другой родственник».
          </p>
        )}
        {rels.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => updateRelative(i, { name: e.target.value })}
              onBlur={() => save({ votes_relatives: rels }, "rels")}
              placeholder="Имя"
              className="flex-1 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-sm text-mocha-900 outline-none focus:border-blush-400"
            />
            <input
              type="number"
              min={0}
              value={r.count}
              onChange={(e) =>
                updateRelative(i, { count: Number(e.target.value) })
              }
              onBlur={() => save({ votes_relatives: rels }, "rels")}
              className="w-16 rounded-full border border-cream-300 bg-white px-3 py-1.5 text-center text-sm text-mocha-900 outline-none focus:border-blush-400"
            />
            <button
              onClick={async () => {
                const newRels = rels.filter((_, idx) => idx !== i);
                setRels(newRels);
                await save({ votes_relatives: newRels }, "rels");
              }}
              className="rounded-full px-2 py-1 text-xs text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addRelative}
          className="rounded-full border border-cream-300 px-3 py-1 text-xs text-mocha-500 hover:bg-cream-100"
        >
          + добавить
        </button>
      </div>
    </div>
  );
}

function CountField({
  label,
  value,
  onChange,
  onBlur,
  saving,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
  saving: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-mocha-400">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        onBlur={onBlur}
        className={
          "mt-0.5 w-full rounded-2xl border bg-white px-3 py-2 text-center text-base outline-none transition " +
          (saving
            ? "border-blush-400"
            : "border-cream-300 focus:border-blush-400")
        }
      />
    </label>
  );
}
