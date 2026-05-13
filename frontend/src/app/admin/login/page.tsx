"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminLogin } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLogin(login, password);
      router.replace("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-cream-200 bg-white/80 p-7 shadow-soft backdrop-blur">
        <h1 className="text-2xl font-light text-mocha-900">
          Админ <span className="font-medium text-blush-600">Амалии</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          Это служебный раздел для мамы и папы.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Логин
            </span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-mocha-900 outline-none focus:border-blush-400"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-mocha-400">
              Пароль
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-2xl border border-cream-300 bg-white px-4 py-2.5 text-sm text-mocha-900 outline-none focus:border-blush-400"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-blush-200 bg-blush-100/60 px-3 py-2 text-xs text-blush-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-blush-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-blush-600 disabled:opacity-50"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
