"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminLogout, adminMe } from "@/lib/api";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(true);
    adminMe()
      .then((res) => {
        if (res === null) router.replace("/admin/login");
        else setChecking(false);
      })
      .catch(() => router.replace("/admin/login"));
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center text-mocha-400">
        Загрузка…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-cream-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <Link href="/host" className="text-base font-medium text-mocha-900">
            Ведущий <span className="text-blush-600">·</span>{" "}
            <span className="text-mocha-500">Амалия</span>
          </Link>
          <div className="flex-1" />
          <Link
            href="/admin"
            className="text-xs text-mocha-400 hover:text-mocha-700"
          >
            В админку
          </Link>
          <button
            onClick={async () => {
              await adminLogout();
              router.replace("/admin/login");
            }}
            className="rounded-full border border-cream-300 px-3 py-1.5 text-xs text-mocha-500 hover:bg-cream-100"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  );
}
