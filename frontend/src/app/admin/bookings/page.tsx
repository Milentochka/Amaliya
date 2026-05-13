"use client";

import { useEffect, useState } from "react";

import {
  adminCancelBooking,
  adminListBookings,
  BookingAdmin,
} from "@/lib/api";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<BookingAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingAdmin | null>(null);

  async function refresh() {
    try {
      setRows(await adminListBookings());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function doCancel() {
    if (!confirmCancel) return;
    setError(null);
    try {
      await adminCancelBooking(confirmCancel.booking_id);
      setConfirmCancel(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const totalSum =
    rows?.reduce((acc, r) => acc + (r.item_price_rub ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">Бронирования</h1>
        <p className="mt-2 text-sm text-mocha-500">
          {rows
            ? `${rows.length} броней · сумма ${totalSum.toLocaleString("ru-RU")} ₽`
            : "Загружаю…"}
        </p>
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
              <th className="px-4 py-3 text-left">Дата</th>
              <th className="px-4 py-3 text-left">Гость</th>
              <th className="px-4 py-3 text-left">Подарок</th>
              <th className="px-4 py-3 text-right">Цена</th>
              <th className="px-4 py-3 text-left">Комментарий</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-mocha-400"
                >
                  Пока нет броней.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr
                key={r.booking_id}
                className="border-b border-cream-100 last:border-0 hover:bg-cream-50/50"
              >
                <td className="px-4 py-3 text-mocha-400">
                  {fmt(r.created_at)}
                </td>
                <td className="px-4 py-3 text-mocha-700">{r.guest_name}</td>
                <td className="px-4 py-3 text-mocha-900">{r.item_name}</td>
                <td className="px-4 py-3 text-right text-mocha-700">
                  {r.item_price_rub !== null
                    ? `${r.item_price_rub.toLocaleString("ru-RU")} ₽`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-mocha-500">{r.comment}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setConfirmCancel(r)}
                    className="rounded-full px-2 py-1 text-xs text-mocha-400 transition hover:bg-blush-100 hover:text-blush-700"
                  >
                    Отменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-mocha-900/30 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-medium text-mocha-900">
              Отменить бронь?
            </h3>
            <p className="mt-2 text-sm text-mocha-500">
              <b>{confirmCancel.guest_name}</b> → {confirmCancel.item_name}. Подарок
              снова станет доступным для других гостей.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                className="rounded-full px-4 py-2 text-sm text-mocha-500 hover:bg-cream-100"
              >
                Назад
              </button>
              <button
                onClick={doCancel}
                className="rounded-full bg-blush-500 px-4 py-2 text-sm font-medium text-white hover:bg-blush-600"
              >
                Отменить бронь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
