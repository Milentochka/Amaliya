"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  GuestOut,
  loginOrRegister,
  logout,
  lookup,
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
  const d = value.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function formatDob(iso: string): string {
  // ISO "YYYY-MM-DD" → "DD/MM/YYYY"
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function Home() {
  const [guest, setGuest] = useState<GuestOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [step, setStep] = useState<1 | 2>(1);
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

  // If user edits name/dob after reaching step 2, snap back so they re-check.
  useEffect(() => {
    if (step === 2) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, birthDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      setSubmitting(true);
      try {
        const res = await lookup({ name, birth_date: birthDate });
        if (res === null) {
          // not registered → reveal step 2 fields
          setStep(2);
        } else {
          setGuest(res.guest);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // step 2 — full registration
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
    setStep(1);
    setName("");
    setBirthDate("");
    setGender("");
    setRsvpC("");
    setRsvpB("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-mocha-400">
        Загрузка…
      </main>
    );
  }

  if (guest) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-3xl border border-cream-200 bg-white/70 p-8 shadow-soft backdrop-blur-sm">
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-cream-100 ring-4 ring-cream-100">
              <Image
                src={guest.avatar.image_url}
                alt={guest.avatar.name}
                fill
                sizes="96px"
                className="object-contain p-1.5"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-mocha-900">
                Привет, {guest.name}
              </h1>
              <p className="mt-1 text-sm text-mocha-400">
                Твой герой — {guest.avatar.name}
              </p>
            </div>
          </div>

          <dl className="mt-8 space-y-3 text-sm">
            <Row label="Дата рождения" value={formatDob(guest.birth_date)} />
            <Row label="Знак зодиака" value={guest.zodiac} />
            <Row label="Год животного" value={guest.chinese_zodiac} />
            <Row
              label="Telegram"
              value={guest.has_telegram ? "Привязан" : "Не привязан"}
            />
          </dl>

          <Link
            href="/wishlist"
            className="mt-8 block w-full rounded-2xl bg-blush-500 py-3 text-center text-sm font-medium text-white shadow-soft transition hover:bg-blush-600"
          >
            Виш-лист подарков →
          </Link>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 text-sm font-medium text-mocha-700 transition hover:bg-cream-100"
          >
            Выйти
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <header className="text-center">
        <h1 className="text-4xl font-light tracking-tight text-mocha-900">
          Приглашение
          <br />
          <span className="font-medium text-blush-600">к Амалии</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mocha-500">
          {step === 1 ? (
            <>
              Чтобы попасть в систему, представься —<br />
              этого достаточно.
            </>
          ) : (
            <>
              Кажется, ты впервые. Заполни ещё пару полей,<br />
              и пропустим в свой кабинет.
            </>
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6 rounded-3xl border border-cream-200 bg-white/70 p-7 shadow-soft backdrop-blur-sm"
      >
        <Field label="Имя">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="block w-full rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-sm text-mocha-900 placeholder-mocha-300 transition focus:border-blush-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-200"
          />
        </Field>

        <Field label="Дата рождения (ДД/ММ/ГГ)">
          <input
            type="text"
            value={birthDate}
            onChange={(e) => setBirthDate(maskDob(e.target.value))}
            placeholder="15/03/85"
            inputMode="numeric"
            maxLength={8}
            required
            className="block w-full rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-sm text-mocha-900 placeholder-mocha-300 transition focus:border-blush-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-200"
          />
        </Field>

        {/* Step 2 fields — slide in once we know the guest is new */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            step === 2
              ? "max-h-[700px] space-y-6 opacity-100"
              : "max-h-0 opacity-0"
          }`}
          aria-hidden={step !== 2}
        >
          <Field label="Пол">
            <div className="grid grid-cols-2 gap-3">
              {(["M", "F"] as const).map((g) => (
                <Pill
                  key={g}
                  selected={gender === g}
                  onClick={() => setGender(g)}
                  label={g === "M" ? "Мужской" : "Женский"}
                />
              ))}
            </div>
          </Field>

          <Field label="Приду на Крестины">
            <div className="grid grid-cols-3 gap-2">
              {RSVP_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  small
                  selected={rsvpC === o.value}
                  onClick={() => setRsvpC(o.value)}
                  label={o.label}
                />
              ))}
            </div>
          </Field>

          <Field label="Приду на Банкет">
            <div className="grid grid-cols-3 gap-2">
              {RSVP_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  small
                  selected={rsvpB === o.value}
                  onClick={() => setRsvpB(o.value)}
                  label={o.label}
                />
              ))}
            </div>
          </Field>
        </div>

        {error && (
          <div className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-blush-500 py-3.5 text-sm font-medium text-white shadow-soft transition hover:bg-blush-600 disabled:opacity-60"
        >
          {submitting
            ? "Минуточку…"
            : step === 1
            ? "Продолжить"
            : "Зарегистрироваться"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-mocha-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({
  label,
  selected,
  onClick,
  small,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  const padding = small ? "px-2 py-2.5 text-xs" : "px-4 py-3 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border ${padding} font-medium transition ${
        selected
          ? "border-blush-300 bg-blush-100 text-blush-700 shadow-gentle"
          : "border-cream-200 bg-cream-50/60 text-mocha-500 hover:bg-cream-100"
      }`}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-mocha-400">{label}</dt>
      <dd className="font-medium text-mocha-700">{value}</dd>
    </div>
  );
}
