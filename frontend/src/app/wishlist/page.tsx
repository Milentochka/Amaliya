"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  bookItem,
  cancelBooking,
  GuestOut,
  listWishlist,
  me,
  WishlistItem,
} from "@/lib/api";

export default function WishlistPage() {
  const [guest, setGuest] = useState<GuestOut | null>(null);
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [bookingTarget, setBookingTarget] = useState<WishlistItem | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    me().then(setGuest);
    listWishlist()
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const fresh = await listWishlist();
    setItems(fresh);
  }

  async function handleBookSubmit() {
    if (!bookingTarget) return;
    setError(null);
    setSubmitting(true);
    try {
      await bookItem(bookingTarget.id, comment.trim());
      await refresh();
      setBookingTarget(null);
      setComment("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Отменить бронь?")) return;
    setError(null);
    try {
      await cancelBooking(bookingId);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-mocha-400">
        Загрузка…
      </main>
    );
  }

  if (!guest) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-mocha-500">Сначала зайди в свой аккаунт.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-2xl bg-blush-500 px-5 py-2.5 text-sm text-white"
        >
          На главную
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-mocha-400 transition hover:text-mocha-700"
        >
          ← в кабинет
        </Link>
        <span className="text-xs text-mocha-400">{guest.name}</span>
      </header>

      <h1 className="text-3xl font-light tracking-tight text-mocha-900">
        Виш-лист
        <br />
        <span className="font-medium text-blush-600">подарков</span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mocha-500">
        Это список того, чему Амалия будет рада. Выбери подарок и забронируй —
        чтобы никто не подарил то же самое.
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {items && items.length === 0 && (
          <li className="rounded-3xl border border-cream-200 bg-white/70 p-6 text-center text-sm text-mocha-400 shadow-soft backdrop-blur-sm">
            Пока пусто — мама и папа скоро добавят подарки.
          </li>
        )}
        {items?.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onBook={() => {
              setComment("");
              setBookingTarget(item);
            }}
            onCancel={() => item.my_booking_id && handleCancel(item.my_booking_id)}
          />
        ))}
      </ul>

      {bookingTarget && (
        <BookModal
          item={bookingTarget}
          comment={comment}
          setComment={setComment}
          submitting={submitting}
          onSubmit={handleBookSubmit}
          onClose={() => {
            if (!submitting) {
              setBookingTarget(null);
              setComment("");
            }
          }}
        />
      )}
    </main>
  );
}

function ItemCard({
  item,
  onBook,
  onCancel,
}: {
  item: WishlistItem;
  onBook: () => void;
  onCancel: () => void;
}) {
  const showBookButton = !item.is_booked || (item.can_be_shared && !item.booked_by_me);
  return (
    <li className="rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-soft backdrop-blur-sm">
      <div className="flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cream-100">
          {item.photo_url ? (
            <Image
              src={item.photo_url}
              alt={item.name}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-mocha-300">
              🎁
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-medium leading-tight text-mocha-900">
              {item.priority === "high" && (
                <span className="mr-1 text-blush-500">★</span>
              )}
              {item.name}
            </h3>
            {item.price_rub != null && (
              <span className="shrink-0 text-xs text-mocha-400">
                ≈ {item.price_rub.toLocaleString("ru")} ₽
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-mocha-500">
              {item.description}
            </p>
          )}
          {item.ozon_url && (
            <a
              href={item.ozon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-blush-600 hover:underline"
            >
              Открыть на Ozon →
            </a>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-mocha-400">
          {item.booked_by_me ? (
            <span className="text-blush-700">
              Ты забронировал
              {item.my_comment ? `: «${item.my_comment}»` : ""}
            </span>
          ) : item.is_booked ? (
            item.can_be_shared ? (
              <span>Уже выбрали — но можно дарить нескольким</span>
            ) : (
              <span>Уже выбрали</span>
            )
          ) : (
            <span>Свободно</span>
          )}
        </div>
        {item.booked_by_me ? (
          <button
            onClick={onCancel}
            className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2 text-xs font-medium text-mocha-700 transition hover:bg-cream-100"
          >
            Отменить бронь
          </button>
        ) : showBookButton ? (
          <button
            onClick={onBook}
            className="rounded-2xl bg-blush-500 px-4 py-2 text-xs font-medium text-white shadow-gentle transition hover:bg-blush-600"
          >
            Забронировать
          </button>
        ) : null}
      </div>
    </li>
  );
}

function BookModal({
  item,
  comment,
  setComment,
  submitting,
  onSubmit,
  onClose,
}: {
  item: WishlistItem;
  comment: string;
  setComment: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mocha-900/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-cream-200 bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-mocha-900">
          Забронировать подарок
        </h3>
        <p className="mt-1 text-xs text-mocha-500">{item.name}</p>

        <label className="mt-5 block text-xs font-medium uppercase tracking-wider text-mocha-500">
          Комментарий
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="Например: куплю до 20 мая, везу из Москвы"
          className="mt-2 block w-full resize-none rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-sm text-mocha-900 placeholder-mocha-300 focus:border-blush-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-200"
        />

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-2xl border border-cream-300 bg-cream-50 py-2.5 text-sm font-medium text-mocha-700 transition hover:bg-cream-100 disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !comment.trim()}
            className="flex-1 rounded-2xl bg-blush-500 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-blush-600 disabled:opacity-60"
          >
            {submitting ? "Минутку…" : "Забронировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
