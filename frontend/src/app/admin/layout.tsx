"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminLogout, adminMe } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Сводка" },
  { href: "/admin/guests", label: "Гости" },
  { href: "/admin/wishlist", label: "Виш-лист" },
  { href: "/admin/bookings", label: "Брони" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [checking, setChecking] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }
    setChecking(true);
    adminMe()
      .then((res) => {
        if (res === null) router.replace("/admin/login");
        else setChecking(false);
      })
      .catch(() => router.replace("/admin/login"));
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <Link
            href="/admin"
            className="text-base font-medium text-mocha-900"
          >
            Админка <span className="text-blush-600">Амалии</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => {
              const active =
                n.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    "rounded-full px-3 py-1.5 transition " +
                    (active
                      ? "bg-blush-500 text-white"
                      : "text-mocha-500 hover:bg-cream-100 hover:text-mocha-900")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={async () => {
              await adminLogout();
              router.replace("/admin/login");
            }}
            className="rounded-full border border-cream-300 px-3 py-1.5 text-xs text-mocha-500 transition hover:bg-cream-100"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
