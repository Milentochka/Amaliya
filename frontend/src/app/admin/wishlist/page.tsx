"use client";

import { useEffect, useState } from "react";

import {
  adminCreateWishlistItem,
  adminDeleteWishlistItem,
  adminListWishlist,
  adminUpdateWishlistItem,
  Priority,
  WishlistItemAdmin,
  WishlistItemPayload,
} from "@/lib/api";

const EMPTY: WishlistItemPayload = {
  name: "",
  description: "",
  photo_url: "",
  price_rub: null,
  ozon_url: "",
  category: "",
  priority: "normal",
  can_be_shared: false,
};

export default function AdminWishlistPage() {
  const [items, setItems] = useState<WishlistItemAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<WishlistItemAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WishlistItemAdmin | null>(
    null,
  );

  async function refresh() {
    try {
      setItems(await adminListWishlist());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function doDelete() {
    if (!confirmDelete) return;
    setError(null);
    try {
      await adminDeleteWishlistItem(confirmDelete.id);
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
          <h1 className="text-3xl font-light text-mocha-900">Виш-лист</h1>
          <p className="mt-2 text-sm text-mocha-500">
            {items ? `${items.length} позиций` : "Загружаю…"}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600"
        >
          + Добавить позицию
        </button>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {items?.map((item) => (
          <li
            key={item.id}
            className="rounded-3xl border border-cream-200 bg-white/70 p-4 shadow-gentle"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.priority === "high" && (
                    <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs text-blush-700">
                      ★ важно
                    </span>
                  )}
                  <h3 className="text-base font-medium text-mocha-900">
                    {item.name}
                  </h3>
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-mocha-500">
                    {item.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-mocha-400">
                  {item.category && <span>{item.category}</span>}
                  {item.price_rub !== null && (
                    <span>{item.price_rub.toLocaleString("ru-RU")} ₽</span>
                  )}
                  {item.is_booked && (
                    <span className="text-emerald-700">
                      забронировано: {item.bookers.length}
                    </span>
                  )}
                  {item.can_be_shared && <span>можно дарить нескольким</span>}
                </div>
                {item.bookers.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-mocha-500">
                    {item.bookers.map((b) => (
                      <li key={b.guest_id}>
                        • <b>{b.name}</b>
                        {b.comment ? ` — ${b.comment}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(item)}
                  className="rounded-full border border-cream-300 px-3 py-1.5 text-xs text-mocha-700 hover:bg-cream-100"
                >
                  Изменить
                </button>
                <button
                  onClick={() => setConfirmDelete(item)}
                  className="rounded-full px-3 py-1.5 text-xs text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(editing || creating) && (
        <ItemForm
          initial={
            editing
              ? {
                  name: editing.name,
                  description: editing.description ?? "",
                  photo_url: editing.photo_url ?? "",
                  price_rub: editing.price_rub,
                  ozon_url: editing.ozon_url ?? "",
                  category: editing.category ?? "",
                  priority: editing.priority,
                  can_be_shared: editing.can_be_shared,
                }
              : EMPTY
          }
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={async (payload) => {
            setError(null);
            try {
              if (editing) {
                await adminUpdateWishlistItem(editing.id, payload);
              } else {
                await adminCreateWishlistItem(payload);
              }
              setEditing(null);
              setCreating(false);
              await refresh();
            } catch (e) {
              setError((e as Error).message);
              throw e;
            }
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Удалить подарок?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              <b>{confirmDelete.name}</b> — все его бронирования тоже пропадут.
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

function ItemForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: WishlistItemPayload;
  onCancel: () => void;
  onSubmit: (p: WishlistItemPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<WishlistItemPayload>(initial);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof WishlistItemPayload>(
    key: K,
    value: WishlistItemPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: WishlistItemPayload = {
        ...form,
        description: form.description?.trim() || null,
        photo_url: form.photo_url?.trim() || null,
        ozon_url: form.ozon_url?.trim() || null,
        category: form.category?.trim() || null,
        price_rub: form.price_rub ?? null,
      };
      await onSubmit(payload);
    } catch {
      // parent shows error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-3 overflow-y-auto rounded-3xl bg-white p-6 shadow-soft"
        style={{ maxHeight: "90vh" }}
      >
        <h3 className="text-lg font-medium text-mocha-900">Позиция</h3>
        <Field label="Название">
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </Field>
        <Field label="Описание">
          <textarea
            rows={2}
            value={form.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <input
              value={form.category ?? ""}
              onChange={(e) => update("category", e.target.value)}
              placeholder="напр. игрушки"
              className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            />
          </Field>
          <Field label="Цена ₽">
            <input
              type="number"
              min={0}
              value={form.price_rub ?? ""}
              onChange={(e) =>
                update(
                  "price_rub",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            />
          </Field>
        </div>
        <Field label="Фото URL (например /wishlist/foo.webp)">
          <input
            value={form.photo_url ?? ""}
            onChange={(e) => update("photo_url", e.target.value)}
            className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </Field>
        <Field label="Ozon URL">
          <input
            value={form.ozon_url ?? ""}
            onChange={(e) => update("ozon_url", e.target.value)}
            className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Приоритет">
            <select
              value={form.priority}
              onChange={(e) => update("priority", e.target.value as Priority)}
              className="w-full rounded-2xl border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-blush-400"
            >
              <option value="high">★ важно</option>
              <option value="normal">обычный</option>
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-mocha-700">
            <input
              type="checkbox"
              checked={form.can_be_shared}
              onChange={(e) => update("can_be_shared", e.target.checked)}
              className="h-4 w-4 rounded border-cream-300"
            />
            Можно дарить нескольким
          </label>
        </div>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-mocha-400">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
