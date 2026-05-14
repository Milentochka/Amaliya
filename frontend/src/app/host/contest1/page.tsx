"use client";

import Image from "next/image";
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

  if (!data && !error) return <p className="text-mocha-400">Загрузка…</p>;
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
        <h1 className="text-3xl font-light text-mocha-900">
          На кого <span className="font-medium text-blush-600">похожа Амалия?</span>
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

      {/* Photo collage — like the PDF */}
      <section className="flex flex-wrap items-end justify-center gap-3 rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle">
        <Polaroid src="/contests/contest1/mom-young.jpg" caption="мама" rotate={-6} />
        <Polaroid src="/contests/contest1/amalia.jpg" caption="Амалия" rotate={0} bigger />
        <Polaroid src="/contests/contest1/dad-young.jpg" caption="папа" rotate={6} />
        <Polaroid src="/contests/contest1/parents-now.jpg" caption="мама и папа" rotate={-3} wide />
      </section>

      {/* PDF download */}
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

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Tally table — like the paper results blank */}
      <section className="overflow-hidden rounded-3xl border border-cream-200 bg-white/70 shadow-gentle">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50 text-xs uppercase tracking-wider text-mocha-400">
              <th className="px-4 py-3 text-left">Черта</th>
              <th className="px-2 py-3 text-center">Мама</th>
              <th className="px-2 py-3 text-center">Папа</th>
              <th className="px-4 py-3 text-left">Родственники</th>
              <th className="px-2 py-3 text-center">Уникально</th>
            </tr>
          </thead>
          <tbody>
            {data.traits.map((t, idx) => (
              <TraitRow
                key={t.id}
                trait={t}
                even={idx % 2 === 0}
                onChanged={refresh}
              />
            ))}
          </tbody>
        </table>
      </section>

      {/* Verdict */}
      <section className="rounded-3xl border border-blush-200 bg-blush-100/40 p-6">
        <p className="text-xs uppercase tracking-wider text-blush-700">
          Итог конкурса
        </p>
        <p className="mt-1 text-2xl font-medium text-mocha-900">
          {summary.verdict ?? "—"}
        </p>
        <p className="mt-2 text-xs text-mocha-500">
          мама {summary.totals.mom} · папа {summary.totals.dad} · родственники{" "}
          {summary.totals.relatives}
          {summary.top_relative_name &&
            ` (топ: ${summary.top_relative_name})`}
          {" "}· уникально {summary.totals.unique}
        </p>
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

function Polaroid({
  src,
  caption,
  rotate,
  bigger,
  wide,
}: {
  src: string;
  caption: string;
  rotate: number;
  bigger?: boolean;
  wide?: boolean;
}) {
  const w = wide ? 140 : bigger ? 110 : 90;
  const h = wide ? 90 : bigger ? 136 : 112;
  return (
    <div
      className="rounded-2xl bg-white p-2 shadow-soft"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-cream-100"
        style={{ width: w, height: h }}
      >
        <Image src={src} alt={caption} fill className="object-cover" unoptimized />
      </div>
      <p className="mt-1 text-center text-xs text-mocha-500">{caption}</p>
    </div>
  );
}

function TraitRow({
  trait,
  even,
  onChanged,
}: {
  trait: Contest1Trait;
  even: boolean;
  onChanged: () => void;
}) {
  const [mom, setMom] = useState<number>(trait.votes_mom);
  const [dad, setDad] = useState<number>(trait.votes_dad);
  const [uniq, setUniq] = useState<number>(trait.votes_unique);
  const [rels, setRels] = useState<RelativeVote[]>(trait.votes_relatives);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMom(trait.votes_mom);
    setDad(trait.votes_dad);
    setUniq(trait.votes_unique);
    setRels(trait.votes_relatives);
  }, [trait]);

  async function save(payload: Parameters<typeof hostContest1SetTally>[1]) {
    setSaving(true);
    try {
      await hostContest1SetTally(trait.id, payload);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  function patchRel(idx: number, patch: Partial<RelativeVote>) {
    setRels((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function addRel() {
    const next = [...rels, { name: "", count: 1 }];
    setRels(next);
  }

  async function removeRel(idx: number) {
    const next = rels.filter((_, i) => i !== idx);
    setRels(next);
    await save({ votes_relatives: next });
  }

  return (
    <tr
      className={
        "border-b border-cream-100 last:border-0 " +
        (even ? "bg-white" : "bg-cream-50/50") +
        (saving ? " ring-1 ring-blush-300" : "")
      }
    >
      <td className="px-4 py-3 text-mocha-900 align-top">
        <span className="text-mocha-400 mr-1">{trait.order_index}.</span>
        {trait.name}
      </td>
      <td className="px-2 py-3 align-top">
        <NumberCell
          value={mom}
          onChange={setMom}
          onCommit={() => save({ votes_mom: mom })}
        />
      </td>
      <td className="px-2 py-3 align-top">
        <NumberCell
          value={dad}
          onChange={setDad}
          onCommit={() => save({ votes_dad: dad })}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          {rels.map((r, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={r.name}
                onChange={(e) => patchRel(i, { name: e.target.value })}
                onBlur={() => save({ votes_relatives: rels })}
                placeholder="имя"
                className="flex-1 rounded-full border border-cream-300 bg-white px-2 py-1 text-xs text-mocha-900 outline-none focus:border-blush-400"
              />
              <input
                type="number"
                min={0}
                value={r.count}
                onChange={(e) =>
                  patchRel(i, { count: Number(e.target.value || 0) })
                }
                onBlur={() => save({ votes_relatives: rels })}
                className="w-12 rounded-full border border-cream-300 bg-white px-2 py-1 text-center text-xs outline-none focus:border-blush-400"
              />
              <button
                onClick={() => removeRel(i)}
                className="rounded-full px-1.5 py-0.5 text-xs text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addRel}
            className="rounded-full border border-cream-300 px-2 py-0.5 text-xs text-mocha-500 hover:bg-cream-100"
          >
            + добавить
          </button>
        </div>
      </td>
      <td className="px-2 py-3 align-top">
        <NumberCell
          value={uniq}
          onChange={setUniq}
          onCommit={() => save({ votes_unique: uniq })}
        />
      </td>
    </tr>
  );
}

function NumberCell({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      onBlur={onCommit}
      className="mx-auto block w-16 rounded-xl border border-cream-300 bg-white px-2 py-1.5 text-center text-base text-mocha-900 outline-none focus:border-blush-400"
    />
  );
}
