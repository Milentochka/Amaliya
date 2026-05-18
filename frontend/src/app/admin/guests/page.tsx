"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  adminCreateGuest,
  adminDeleteGuest,
  adminListAvatars,
  adminListGuests,
  adminPatchGuestRsvp,
  adminUpdateGuest,
  AvatarShort,
  GuestAdmin,
  RsvpStatus,
} from "@/lib/api";

const RSVP_LABEL: Record<RsvpStatus, string> = {
  coming: "✅ приду",
  not_coming: "❌ нет",
  maybe: "❓ может",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBirth(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<GuestAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GuestAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GuestAdmin | null>(null);

  async function refresh() {
    try {
      setGuests(await adminListGuests());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function patchRsvp(
    guest: GuestAdmin,
    field: "christening" | "banquet",
    value: RsvpStatus,
  ) {
    setError(null);
    setSavingId(guest.id);
    try {
      await adminPatchGuestRsvp(guest.id, { [field]: value });
      setGuests((prev) =>
        prev
          ? prev.map((g) =>
              g.id === guest.id
                ? {
                    ...g,
                    rsvp_christening:
                      field === "christening" ? value : g.rsvp_christening,
                    rsvp_banquet: field === "banquet" ? value : g.rsvp_banquet,
                  }
                : g,
            )
          : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setError(null);
    try {
      await adminDeleteGuest(confirmDelete.id);
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-light text-mocha-900">Гости</h1>
          <p className="mt-2 text-sm text-mocha-500">
            {guests
              ? `${guests.length} зарегистрировались`
              : "Загружаю…"}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600"
        >
          + Добавить гостя
        </button>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl border border-cream-200 bg-white/70 shadow-gentle">
        <table className="min-w-full text-sm">
          <thead className="border-b border-cream-200 text-xs uppercase tracking-wider text-mocha-400">
            <tr>
              <th className="px-4 py-3 text-left">Гость</th>
              <th className="px-4 py-3 text-left">ДР</th>
              <th className="px-4 py-3 text-left">Крестины</th>
              <th className="px-4 py-3 text-left">Банкет</th>
              <th className="px-4 py-3 text-right">Подарки</th>
              <th className="px-4 py-3 text-left">Активность</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {guests?.map((g) => (
              <tr
                key={g.id}
                className="border-b border-cream-100 last:border-0 hover:bg-cream-50/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full bg-cream-100">
                      <Image
                        src={g.avatar_url}
                        alt={g.avatar_name}
                        fill
                        sizes="36px"
                        className="object-contain p-0.5"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="text-mocha-900">{g.name}</div>
                      <div className="text-xs text-mocha-400">
                        {g.avatar_name}
                      </div>
                      {g.has_telegram && g.telegram_username && (
                        <div className="text-xs text-mocha-400">
                          @{g.telegram_username}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-mocha-500">
                  {fmtBirth(g.birth_date)}
                </td>
                <td className="px-4 py-3">
                  <RsvpSelect
                    value={g.rsvp_christening}
                    disabled={savingId === g.id}
                    onChange={(v) => patchRsvp(g, "christening", v)}
                  />
                </td>
                <td className="px-4 py-3">
                  <RsvpSelect
                    value={g.rsvp_banquet}
                    disabled={savingId === g.id}
                    onChange={(v) => patchRsvp(g, "banquet", v)}
                  />
                </td>
                <td className="px-4 py-3 text-right text-mocha-700">
                  {g.bookings_count}
                </td>
                <td className="px-4 py-3 text-mocha-400">
                  {fmtDate(g.last_activity)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(g)}
                      className="rounded-full px-2 py-1 text-xs text-mocha-500 transition hover:bg-cream-100 hover:text-mocha-900"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => setConfirmDelete(g)}
                      className="rounded-full px-2 py-1 text-xs text-mocha-400 transition hover:bg-blush-100 hover:text-blush-700"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateGuestModal
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {editing && (
        <EditGuestModal
          guest={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Удалить гостя?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              <b>{confirmDelete.name}</b> — все его RSVP, бронирования и
              попытки в игре пропадут. Действие необратимо.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
              >
                Отмена
              </button>
              <button
                onClick={doDelete}
                className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function maskDob(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function CreateGuestModal({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [rsvpC, setRsvpC] = useState<RsvpStatus>("coming");
  const [rsvpB, setRsvpB] = useState<RsvpStatus>("coming");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminCreateGuest({
        name: name.trim(),
        birth_date: birthDate,
        gender,
        rsvp_christening: rsvpC,
        rsvp_banquet: rsvpB,
      });
      await onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5 py-8">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-soft"
        style={{ maxHeight: "90vh" }}
      >
        <h3 className="text-lg font-medium text-mocha-900">
          Добавить гостя вручную
        </h3>
        <p className="text-xs text-mocha-500">
          Полезно, если гость не может зарегистрироваться сам. Аватар
          присвоится случайно.
        </p>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-mocha-400">
            Имя
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              ДР (ДД/ММ/ГГ)
            </span>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(maskDob(e.target.value))}
              placeholder="05/02/90"
              required
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Пол
            </span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "M" | "F")}
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            >
              <option value="F">Ж</option>
              <option value="M">М</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Крестины
            </span>
            <select
              value={rsvpC}
              onChange={(e) => setRsvpC(e.target.value as RsvpStatus)}
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            >
              <option value="coming">{RSVP_LABEL.coming}</option>
              <option value="not_coming">{RSVP_LABEL.not_coming}</option>
              <option value="maybe">{RSVP_LABEL.maybe}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Банкет
            </span>
            <select
              value={rsvpB}
              onChange={(e) => setRsvpB(e.target.value as RsvpStatus)}
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            >
              <option value="coming">{RSVP_LABEL.coming}</option>
              <option value="not_coming">{RSVP_LABEL.not_coming}</option>
              <option value="maybe">{RSVP_LABEL.maybe}</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-blush-200 bg-blush-100/60 px-3 py-2 text-xs text-blush-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600 disabled:opacity-50"
          >
            {submitting ? "Добавляю…" : "Добавить"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditGuestModal({
  guest,
  onCancel,
  onSaved,
}: {
  guest: GuestAdmin;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(guest.name);
  const [birthDate, setBirthDate] = useState(
    (() => {
      const [y, m, d] = guest.birth_date.split("-");
      return `${d}/${m}/${y.slice(2)}`;
    })(),
  );
  const [gender, setGender] = useState<"M" | "F">(guest.gender);
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [avatars, setAvatars] = useState<AvatarShort[] | null>(null);
  const [unbindTg, setUnbindTg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListAvatars()
      .then((list) => {
        setAvatars(list);
        // pre-select current avatar by matching by url (we don't store avatar_id on guest)
        const cur = list.find((a) => a.image_url === guest.avatar_url);
        if (cur) setAvatarId(cur.id);
      })
      .catch(() => setAvatars([]));
  }, [guest]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Parameters<typeof adminUpdateGuest>[1] = {};
      if (name.trim() && name.trim() !== guest.name) payload.name = name.trim();
      const [d, m, yy] = birthDate.split("/");
      const currentDob = guest.birth_date; // YYYY-MM-DD
      if (d && m && yy) {
        const yyyy = currentDob.slice(0, 4);
        const reformatted = `${yyyy.slice(0, 2)}${yy}-${m}-${d}`;
        if (reformatted !== currentDob) payload.birth_date = birthDate;
      }
      if (gender !== guest.gender) payload.gender = gender;
      if (avatarId !== null) {
        const cur = avatars?.find((a) => a.image_url === guest.avatar_url);
        if (!cur || cur.id !== avatarId) payload.avatar_id = avatarId;
      }
      if (unbindTg) payload.unbind_telegram = true;

      if (Object.keys(payload).length === 0) {
        onCancel();
        return;
      }
      await adminUpdateGuest(guest.id, payload);
      await onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const currentAvatarUrl =
    avatars?.find((a) => a.id === avatarId)?.image_url ?? guest.avatar_url;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5 py-8">
      <form
        onSubmit={submit}
        className="w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-soft"
        style={{ maxHeight: "92vh" }}
      >
        <h3 className="text-lg font-medium text-mocha-900">
          Изменить гостя · {guest.name}
        </h3>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-mocha-400">
            Имя
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              ДР (ДД/ММ/ГГ)
            </span>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(maskDob(e.target.value))}
              required
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Пол
            </span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "M" | "F")}
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            >
              <option value="F">Ж</option>
              <option value="M">М</option>
            </select>
          </label>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-mocha-400">
            Аватар
          </span>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-cream-100 ring-2 ring-cream-100">
              <Image
                src={currentAvatarUrl}
                alt=""
                fill
                sizes="56px"
                className="object-contain p-1"
                unoptimized
              />
            </div>
            <div className="text-sm text-mocha-700">
              {avatars?.find((a) => a.id === avatarId)?.name ??
                guest.avatar_name}
            </div>
          </div>
          <div className="mt-3 grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-2xl border border-cream-200 bg-cream-50 p-2 sm:grid-cols-8">
            {(avatars ?? [])
              .filter((a) => !a.reserved_for_admin)
              .map((a) => {
                const isSelected = a.id === avatarId;
                const isCurrent = a.image_url === guest.avatar_url;
                const taken = a.is_taken && !isCurrent;
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => {
                      if (!taken) setAvatarId(a.id);
                    }}
                    title={a.name + (taken ? " · занят" : "")}
                    disabled={taken}
                    className={
                      "relative h-12 w-12 overflow-hidden rounded-full bg-white transition " +
                      (isSelected
                        ? "ring-2 ring-blush-500"
                        : "ring-1 ring-cream-200 hover:ring-blush-300") +
                      (taken ? " opacity-40 cursor-not-allowed" : "")
                    }
                  >
                    <Image
                      src={a.image_url}
                      alt={a.name}
                      fill
                      sizes="48px"
                      className="object-contain p-0.5"
                      unoptimized
                    />
                  </button>
                );
              })}
          </div>
          <p className="mt-1 text-xs text-mocha-400">
            Серые — уже у других гостей. Кликни любой свободный, чтобы поменять.
          </p>
        </div>

        {guest.has_telegram && (
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-cream-200 bg-cream-50/60 px-3 py-2 text-sm text-mocha-700">
            <input
              type="checkbox"
              checked={unbindTg}
              onChange={(e) => setUnbindTg(e.target.checked)}
              className="h-4 w-4 rounded border-cream-300"
            />
            Отвязать Telegram (@{guest.telegram_username})
          </label>
        )}

        {error && (
          <div className="rounded-2xl border border-blush-200 bg-blush-100/60 px-3 py-2 text-xs text-blush-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600 disabled:opacity-50"
          >
            {submitting ? "Сохраняю…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RsvpSelect({
  value,
  onChange,
  disabled,
}: {
  value: RsvpStatus;
  onChange: (v: RsvpStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RsvpStatus)}
      disabled={disabled}
      className="rounded-full border border-cream-300 bg-white px-2.5 py-1 text-xs text-mocha-700 outline-none focus:border-blush-400 disabled:opacity-50"
    >
      <option value="coming">{RSVP_LABEL.coming}</option>
      <option value="not_coming">{RSVP_LABEL.not_coming}</option>
      <option value="maybe">{RSVP_LABEL.maybe}</option>
    </select>
  );
}
