"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  GuestOut,
  loginOrRegister,
  logout,
  me,
  RegisterPayload,
  RsvpStatus,
} from "@/lib/api";

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "coming", label: "Приду" },
  { value: "not_coming", label: "Не приду" },
  { value: "maybe", label: "Возможно" },
];

function maskDob(value: string): string {
  // keep digits only, then format DD/MM/YY
  const d = value.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export default function Home() {
  const [guest, setGuest] = useState<GuestOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [rsvpC, setRsvpC] = useState<RsvpStatus | "">("");
  const [rsvpB, setRsvpB] = useState<RsvpStatus | "">("");

  useEffect(() => {
    me()
      .then(setGuest)
      .catch(() => setGuest(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gender || !rsvpC || !rsvpB) {
      setError("Заполни все поля.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: RegisterPayload = {
        name,
        birth_date: birthDate,
        gender,
        rsvp_christening: rsvpC,
        rsvp_banquet: rsvpB,
      };
      const res = await loginOrRegister(payload);
      setGuest(res.guest);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    setGuest(null);
    setName("");
    setBirthDate("");
    setGender("");
    setRsvpC("");
    setRsvpB("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        Загрузка…
      </main>
    );
  }

  if (guest) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100">
              <Image
                src={guest.avatar.image_url}
                alt={guest.avatar.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Привет, {guest.name}!</h1>
              <p className="text-sm text-slate-500">
                Твой герой: {guest.avatar.name}
              </p>
            </div>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Дата рождения</dt>
              <dd>{guest.birth_date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Знак зодиака</dt>
              <dd>{guest.zodiac}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Год животного</dt>
              <dd>{guest.chinese_zodiac}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telegram</dt>
              <dd>{guest.has_telegram ? "Привязан" : "Не привязан"}</dd>
            </div>
          </dl>
          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Выйти
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Приглашение к Амалии
      </h1>
      <p className="mt-2 text-slate-600">
        Чтобы попасть в систему, представься — этого достаточно.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Дата рождения (ДД/ММ/ГГ)
          </label>
          <input
            type="text"
            value={birthDate}
            onChange={(e) => setBirthDate(maskDob(e.target.value))}
            placeholder="15/03/85"
            inputMode="numeric"
            maxLength={8}
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Пол</label>
          <div className="mt-2 flex gap-3">
            {(["M", "F"] as const).map((g) => (
              <label
                key={g}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm ${
                  gender === g
                    ? "border-slate-700 bg-slate-100"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="sr-only"
                />
                {g === "M" ? "Мужской" : "Женский"}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Приду на Крестины
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {RSVP_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs ${
                  rsvpC === o.value
                    ? "border-slate-700 bg-slate-100"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="rsvp_c"
                  value={o.value}
                  checked={rsvpC === o.value}
                  onChange={() => setRsvpC(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Приду на Банкет
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {RSVP_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs ${
                  rsvpB === o.value
                    ? "border-slate-700 bg-slate-100"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="rsvp_b"
                  value={o.value}
                  checked={rsvpB === o.value}
                  onChange={() => setRsvpB(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Отправляем…" : "Войти / зарегистрироваться"}
        </button>
      </form>
    </main>
  );
}
