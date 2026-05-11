"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  EventInfo,
  EventPart,
  getEvent,
  GuestOut,
  listPublicGuests,
  me,
  Parent,
  PublicGuest,
} from "@/lib/api";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatPartTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

function buildMapsLink(part: EventPart): string | null {
  if (part.yandex_maps_link) return part.yandex_maps_link;
  if (part.address) {
    return `https://yandex.ru/maps/?text=${encodeURIComponent(part.address)}`;
  }
  return null;
}

function useCountdown(targetIso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

export default function EventPage() {
  const [guest, setGuest] = useState<GuestOut | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [guests, setGuests] = useState<PublicGuest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([me(), getEvent(), listPublicGuests()])
      .then(([g, e, gs]) => {
        setGuest(g);
        setEvent(e);
        setGuests(gs);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const countdown = useCountdown(event?.countdown_target ?? null);

  const filteredGuests = useMemo(() => {
    if (!guests) return [];
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, search]);

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
        <p className="text-mocha-500">Сначала войдите в свой аккаунт.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-2xl bg-blush-500 px-5 py-2.5 text-sm text-white"
        >
          На главную
        </Link>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center text-blush-700">
        {error ?? "Не удалось загрузить страницу"}
      </main>
    );
  }

  const christening = event.parts.find((p) => p.type === "christening");
  const banquet = event.parts.find((p) => p.type === "banquet");
  const mother = event.parents.find((p) => p.role === "mother");
  const father = event.parents.find((p) => p.role === "father");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-mocha-400 transition hover:text-mocha-700"
        >
          ← в кабинет
        </Link>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-cream-100 ring-2 ring-cream-100">
            <Image
              src={guest.avatar.image_url}
              alt={guest.avatar.name}
              fill
              sizes="48px"
              className="object-contain p-0.5"
              unoptimized
            />
          </div>
          <span className="text-sm font-medium text-mocha-700">
            {guest.name}
          </span>
        </div>
      </header>

      <section className="text-center">
        <h1 className="text-4xl font-light leading-tight tracking-tight text-mocha-900">
          {event.title}
        </h1>

        {countdown && (
          <div className="mt-8 grid grid-cols-4 gap-3 rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-soft backdrop-blur-sm">
            <Countdown value={countdown.days} unit="дн." />
            <Countdown value={countdown.hours} unit="ч." />
            <Countdown value={countdown.minutes} unit="мин." />
            <Countdown value={countdown.seconds} unit="сек." />
          </div>
        )}
      </section>

      <section className="mt-10 space-y-5">
        {christening && (
          <PartCard part={christening} emoji="⛪" title="Крестины" />
        )}
        {banquet && <PartCard part={banquet} emoji="🎂" title="Банкет" />}
      </section>

      {event.dress_code && (
        <InfoCard title="Дресс-код" emoji="👗">
          <p>{event.dress_code}</p>
        </InfoCard>
      )}

      {event.wishes && (
        <InfoCard title="Пожелания семьи" emoji="💌">
          <p>{event.wishes}</p>
        </InfoCard>
      )}

      <section className="mt-6 rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
        <h2 className="text-lg font-medium text-mocha-900">Родители</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mother && <ParentCard parent={mother} />}
          {father && <ParentCard parent={father} />}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-mocha-900">
            Гости{" "}
            <span className="text-sm font-normal text-mocha-400">
              · {guests?.length ?? 0}
            </span>
          </h2>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="mt-3 block w-full rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-2.5 text-sm text-mocha-900 placeholder-mocha-300 focus:border-blush-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blush-200"
        />
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredGuests.map((g) => (
            <li
              key={g.name}
              className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/60 p-3"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cream-100">
                <Image
                  src={g.avatar_url}
                  alt={g.avatar_name}
                  fill
                  sizes="40px"
                  className="object-contain p-0.5"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mocha-900">
                  {g.name}
                </p>
                <p className="truncate text-xs text-mocha-400">
                  {g.zodiac} · {g.chinese_zodiac}
                </p>
              </div>
            </li>
          ))}
          {filteredGuests.length === 0 && (
            <li className="col-span-full text-center text-sm text-mocha-400">
              Никого не нашлось
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Countdown({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-light text-blush-600">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-mocha-400">
        {unit}
      </div>
    </div>
  );
}

function PartCard({
  part,
  emoji,
  title,
}: {
  part: EventPart;
  emoji: string;
  title: string;
}) {
  const mapsLink = buildMapsLink(part);
  return (
    <article className="rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <h2 className="text-xl font-medium text-mocha-900">{title}</h2>
          <p className="text-sm text-mocha-500">
            {formatPartTime(part.start_time)}
          </p>
        </div>
      </div>
      {part.address && (
        <p className="mt-4 text-sm text-mocha-700">{part.address}</p>
      )}
      {mapsLink && (
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-2xl bg-blush-500 px-4 py-2 text-xs font-medium text-white shadow-gentle transition hover:bg-blush-600"
        >
          Открыть в Яндекс.Картах →
        </a>
      )}
      {part.program && (
        <div className="mt-5 rounded-2xl border border-cream-200 bg-cream-50/60 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-mocha-500">
            Программа
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-mocha-700">
            {part.program}
          </pre>
        </div>
      )}
    </article>
  );
}

function InfoCard({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
      <h2 className="text-lg font-medium text-mocha-900">
        <span className="mr-2">{emoji}</span>
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-mocha-700">
        {children}
      </div>
    </section>
  );
}

function ParentCard({ parent }: { parent: Parent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50/60 p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-cream-100">
        {parent.photo_url ? (
          <Image
            src={parent.photo_url}
            alt={parent.name}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl text-mocha-300">
            {parent.role === "mother" ? "👩" : "👨"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mocha-900">
          {parent.name}
        </p>
        <p className="text-xs text-mocha-400">
          {parent.role === "mother" ? "Мама" : "Папа"}
        </p>
        <div className="mt-1 flex gap-2 text-xs">
          {parent.phone && (
            <a
              href={`tel:${parent.phone}`}
              className="text-blush-600 hover:underline"
            >
              {parent.phone}
            </a>
          )}
          {parent.telegram_username && (
            <a
              href={`https://t.me/${parent.telegram_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blush-600 hover:underline"
            >
              @{parent.telegram_username}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
