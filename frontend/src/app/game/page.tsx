"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  GameStats,
  getGameStats,
  GuestOut,
  me,
  submitGameAttempt,
} from "@/lib/api";

// ---------- Game constants ----------

const GAME_W = 360;
const GAME_H = 540;
const PLAYER_SIZE = 76;
const PLAYER_Y = GAME_H - PLAYER_SIZE - 16;
const ITEM_SIZE = 54;
const PLAYER_SPEED = 280; // px/sec
const FALL_SPEED_MIN = 160; // px/sec
const FALL_SPEED_MAX = 280;
const SPAWN_INTERVAL_MS = 650;
const GAME_DURATION_S = 60;
const POINTS_PER_GOOD = 10;
const STARTING_LIVES = 3;
const BAD_RATIO = 0.28;

const GOOD_KINDS = ["🍼", "🧸", "🎀", "🥄", "☀️", "😇"];
const BAD_KINDS = ["🌧️", "⛈️", "🌩️", "😈"];

type Phase = "idle" | "playing" | "submitted" | "closed";

interface Item {
  id: number;
  type: "good" | "bad";
  emoji: string;
  x: number; // 0..GAME_W (center)
  y: number; // 0..GAME_H (center)
  speed: number;
}

// ---------- Page ----------

export default function GamePage() {
  const [guest, setGuest] = useState<GuestOut | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState({
    score: 0,
    lives: STARTING_LIVES,
    timeLeft: GAME_DURATION_S,
  });
  const [lastResult, setLastResult] = useState<{
    score: number;
    newTotal: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([me(), getGameStats()])
      .then(([g, s]) => {
        setGuest(g);
        setStats(s);
        if (s.is_closed) setPhase("closed");
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const handleGameEnd = useCallback(
    async (finalScore: number) => {
      try {
        const fresh = await submitGameAttempt(Math.max(0, Math.round(finalScore)));
        setStats(fresh);
        setLastResult({
          score: finalScore,
          newTotal: fresh.total_score,
        });
        setPhase("submitted");
      } catch (e) {
        setError((e as Error).message);
        setPhase("idle");
      }
    },
    [],
  );

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center text-blush-700">
        <p>{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-2xl bg-blush-500 px-5 py-2.5 text-sm text-white"
        >
          На главную
        </Link>
      </main>
    );
  }

  if (!guest || !stats) {
    return (
      <main className="flex min-h-screen items-center justify-center text-mocha-400">
        Загрузка…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
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

      <h1 className="text-center text-3xl font-light tracking-tight text-mocha-900">
        Игра{" "}
        <span className="font-medium text-blush-600">
          «Ангел&nbsp;Амалия»
        </span>
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-mocha-500">
        Лови полезное, избегай туч и тёмных ангелов.
        <br />
        60 секунд, 3 жизни, 3 попытки в день.
      </p>

      {phase === "idle" && (
        <IdleScreen
          stats={stats}
          onStart={() => {
            if (stats.attempts_left_today === 0) {
              setError("Сегодня попытки израсходованы. Возвращайся завтра!");
              return;
            }
            setHud({
              score: 0,
              lives: STARTING_LIVES,
              timeLeft: GAME_DURATION_S,
            });
            setPhase("playing");
          }}
        />
      )}

      {phase === "playing" && (
        <GameArea
          onTick={(s) => setHud(s)}
          onEnd={(finalScore) => handleGameEnd(finalScore)}
        />
      )}

      {phase === "submitted" && lastResult && (
        <SubmittedScreen
          stats={stats}
          lastResult={lastResult}
          onPlayAgain={() => {
            if (stats.attempts_left_today === 0) {
              setPhase("idle");
              return;
            }
            setHud({
              score: 0,
              lives: STARTING_LIVES,
              timeLeft: GAME_DURATION_S,
            });
            setPhase("playing");
          }}
          onClose={() => setPhase("idle")}
        />
      )}

      {phase === "closed" && (
        <div className="mt-8 rounded-3xl border border-cream-200 bg-white/70 p-6 text-center shadow-soft backdrop-blur-sm">
          <p className="text-sm text-mocha-500">Игра завершена.</p>
          {stats.total_score > 0 && (
            <p className="mt-2 text-mocha-700">
              Твой итоговый счёт: <b>{stats.total_score}</b>
              {stats.rank !== null && (
                <>
                  {" "}
                  · место в рейтинге: <b>#{stats.rank}</b>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {phase === "playing" && (
        <Hud score={hud.score} lives={hud.lives} timeLeft={hud.timeLeft} />
      )}
    </main>
  );
}

// ---------- Sub-screens ----------

function IdleScreen({
  stats,
  onStart,
}: {
  stats: GameStats;
  onStart: () => void;
}) {
  const canPlay = stats.attempts_left_today > 0;
  return (
    <div className="mt-6 rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Твой счёт" value={stats.total_score.toString()} />
        <Stat
          label="Место"
          value={stats.rank !== null ? `#${stats.rank}` : "—"}
        />
        <Stat
          label="Попыток сегодня"
          value={`${stats.attempts_today} / 3`}
        />
        <Stat
          label="Осталось сегодня"
          value={stats.attempts_left_today.toString()}
        />
      </dl>

      <button
        onClick={onStart}
        disabled={!canPlay}
        className="mt-5 w-full rounded-2xl bg-blush-500 py-3 text-sm font-medium text-white shadow-soft transition hover:bg-blush-600 disabled:opacity-50"
      >
        {canPlay ? "Сыграть" : "Все попытки израсходованы"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-mocha-400">
        Управление: кнопки ←/→ внизу или стрелки на клавиатуре.
      </p>
    </div>
  );
}

function SubmittedScreen({
  stats,
  lastResult,
  onPlayAgain,
  onClose,
}: {
  stats: GameStats;
  lastResult: { score: number; newTotal: number };
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-soft backdrop-blur-sm">
      <h2 className="text-center text-xl font-medium text-mocha-900">
        Финиш!
      </h2>
      <p className="mt-1 text-center text-sm text-mocha-500">
        Эта попытка: <b className="text-blush-600">{Math.round(lastResult.score)}</b>
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Общий счёт" value={lastResult.newTotal.toString()} />
        <Stat
          label="Место"
          value={stats.rank !== null ? `#${stats.rank}` : "—"}
        />
      </dl>
      <div className="mt-5 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-2xl border border-cream-300 bg-cream-50 py-2.5 text-sm font-medium text-mocha-700 transition hover:bg-cream-100"
        >
          К списку
        </button>
        <button
          onClick={onPlayAgain}
          disabled={stats.attempts_left_today === 0}
          className="flex-1 rounded-2xl bg-blush-500 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-blush-600 disabled:opacity-50"
        >
          {stats.attempts_left_today > 0
            ? `Ещё раз (${stats.attempts_left_today})`
            : "Завтра!"}
        </button>
      </div>
    </div>
  );
}

function SkyBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 360 540"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3d3f0" />
          <stop offset="55%" stopColor="#d7eaf6" />
          <stop offset="100%" stopColor="#fbe9d2" />
        </linearGradient>
        <radialGradient id="sunG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="60%" stopColor="#ffd96a" />
          <stop offset="100%" stopColor="#ffb84a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky gradient */}
      <rect width="360" height="540" fill="url(#skyG)" />

      {/* Sun with soft halo */}
      <circle cx="290" cy="70" r="55" fill="url(#sunG)" />
      <circle cx="290" cy="70" r="26" fill="#ffe27a" />

      {/* Stylized cumulus clouds, white with soft opacity */}
      <g fill="white" fillOpacity="0.92">
        <ellipse cx="55" cy="95" rx="42" ry="18" />
        <ellipse cx="85" cy="85" rx="32" ry="16" />
        <ellipse cx="35" cy="100" rx="25" ry="14" />

        <ellipse cx="180" cy="200" rx="48" ry="20" />
        <ellipse cx="210" cy="190" rx="36" ry="18" />
        <ellipse cx="150" cy="205" rx="28" ry="15" />

        <ellipse cx="310" cy="270" rx="40" ry="18" />
        <ellipse cx="340" cy="260" rx="22" ry="13" />

        <ellipse cx="80" cy="340" rx="55" ry="22" />
        <ellipse cx="115" cy="330" rx="30" ry="16" />
        <ellipse cx="45" cy="345" rx="24" ry="14" />

        <ellipse cx="240" cy="430" rx="44" ry="19" />
        <ellipse cx="270" cy="420" rx="28" ry="15" />
      </g>

      {/* Subtle highlights on clouds */}
      <g fill="white" fillOpacity="0.6">
        <ellipse cx="50" cy="86" rx="14" ry="6" />
        <ellipse cx="175" cy="190" rx="18" ry="7" />
        <ellipse cx="76" cy="328" rx="20" ry="8" />
      </g>
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-50/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-mocha-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-medium text-mocha-900">{value}</dd>
    </div>
  );
}

function Hud({
  score,
  lives,
  timeLeft,
}: {
  score: number;
  lives: number;
  timeLeft: number;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-mocha-700">
        ⏱ {Math.max(0, Math.ceil(timeLeft))}с
      </span>
      <span className="text-blush-600 font-medium">{Math.round(score)}</span>
      <span>
        {Array.from({ length: STARTING_LIVES }).map((_, i) => (
          <span
            key={i}
            className={i < lives ? "text-blush-500" : "text-cream-300"}
          >
            ♥
          </span>
        ))}
      </span>
    </div>
  );
}

// ---------- Game area (the actual playable thing) ----------

function GameArea({
  onTick,
  onEnd,
}: {
  onTick: (s: { score: number; lives: number; timeLeft: number }) => void;
  onEnd: (finalScore: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const playerXRef = useRef(GAME_W / 2);
  const itemsRef = useRef<Item[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(STARTING_LIVES);
  const timeLeftRef = useRef(GAME_DURATION_S);
  const lastSpawnRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const itemIdRef = useRef(0);
  const inputRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const rafRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  // Decorative birds — fly across the sky at scheduled moments.
  // speed > 0 → left→right; speed < 0 → right→left.
  const birdsRef = useRef<
    Array<{ id: number; x: number; y: number; emoji: string; speed: number }>
  >([]);
  const scheduledBirdsRef = useRef<
    Array<{ atElapsed: number; y: number; emoji: string; speed: number }>
  >([
    { atElapsed: 5, y: 80, emoji: "🐦", speed: -100 },
    { atElapsed: 12, y: 50, emoji: "🕊️", speed: 95 },
    { atElapsed: 18, y: 130, emoji: "🦢", speed: -85 },
    { atElapsed: 25, y: 100, emoji: "🐦", speed: 115 },
    { atElapsed: 30, y: 70, emoji: "🕊️", speed: 95 },
    { atElapsed: 36, y: 120, emoji: "🦅", speed: -90 },
    { atElapsed: 42, y: 60, emoji: "🕊️", speed: -110 },
    { atElapsed: 48, y: 110, emoji: "🐦", speed: 100 },
    { atElapsed: 50, y: 150, emoji: "🐦", speed: 110 },
    { atElapsed: 55, y: 90, emoji: "🦢", speed: -95 },
  ]);
  const birdIdRef = useRef(0);

  const [renderTick, setRenderTick] = useState(0);

  const end = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    onEnd(scoreRef.current);
  }, [onEnd]);

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") inputRef.current.left = true;
      if (e.key === "ArrowRight") inputRef.current.right = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") inputRef.current.left = false;
      if (e.key === "ArrowRight") inputRef.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const tick = (t: number) => {
      if (endedRef.current) return;
      if (lastTimeRef.current === null) lastTimeRef.current = t;
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      // Update timer
      timeLeftRef.current -= dt;
      if (timeLeftRef.current <= 0) {
        timeLeftRef.current = 0;
        end();
        return;
      }

      // Spawn scheduled birds when elapsed crosses each threshold
      const elapsed = GAME_DURATION_S - timeLeftRef.current;
      scheduledBirdsRef.current = scheduledBirdsRef.current.filter((sb) => {
        if (elapsed >= sb.atElapsed) {
          birdIdRef.current += 1;
          birdsRef.current.push({
            id: birdIdRef.current,
            x: sb.speed > 0 ? -60 : GAME_W + 60,
            y: sb.y,
            emoji: sb.emoji,
            speed: sb.speed,
          });
          return false;
        }
        return true;
      });

      // Move and prune birds (signed speed: positive = →, negative = ←)
      birdsRef.current = birdsRef.current.filter((b) => {
        b.x += b.speed * dt;
        return b.speed > 0 ? b.x < GAME_W + 80 : b.x > -80;
      });

      // Player move
      const inp = inputRef.current;
      let vx = 0;
      if (inp.left) vx -= 1;
      if (inp.right) vx += 1;
      playerXRef.current += vx * PLAYER_SPEED * dt;
      if (playerXRef.current < PLAYER_SIZE / 2)
        playerXRef.current = PLAYER_SIZE / 2;
      if (playerXRef.current > GAME_W - PLAYER_SIZE / 2)
        playerXRef.current = GAME_W - PLAYER_SIZE / 2;

      // Spawn
      lastSpawnRef.current += dt * 1000;
      if (lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
        lastSpawnRef.current = 0;
        const isBad = Math.random() < BAD_RATIO;
        const emoji = isBad
          ? BAD_KINDS[Math.floor(Math.random() * BAD_KINDS.length)]
          : GOOD_KINDS[Math.floor(Math.random() * GOOD_KINDS.length)];
        const speed =
          FALL_SPEED_MIN +
          Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN);
        itemIdRef.current += 1;
        itemsRef.current.push({
          id: itemIdRef.current,
          type: isBad ? "bad" : "good",
          emoji,
          x:
            ITEM_SIZE / 2 +
            Math.random() * (GAME_W - ITEM_SIZE),
          y: -ITEM_SIZE,
          speed,
        });
      }

      // Move items + collide
      const playerLeft = playerXRef.current - PLAYER_SIZE / 2;
      const playerRight = playerXRef.current + PLAYER_SIZE / 2;
      const playerTop = PLAYER_Y;
      const playerBottom = PLAYER_Y + PLAYER_SIZE;
      const nextItems: Item[] = [];
      for (const it of itemsRef.current) {
        it.y += it.speed * dt;
        const itemLeft = it.x - ITEM_SIZE / 2;
        const itemRight = it.x + ITEM_SIZE / 2;
        const itemTop = it.y - ITEM_SIZE / 2;
        const itemBottom = it.y + ITEM_SIZE / 2;
        const overlap =
          itemRight > playerLeft &&
          itemLeft < playerRight &&
          itemBottom > playerTop &&
          itemTop < playerBottom;
        if (overlap) {
          if (it.type === "good") {
            scoreRef.current += POINTS_PER_GOOD;
          } else {
            livesRef.current -= 1;
            if (livesRef.current <= 0) {
              end();
              return;
            }
          }
          continue; // remove
        }
        if (it.y - ITEM_SIZE / 2 > GAME_H) continue; // off-screen
        nextItems.push(it);
      }
      itemsRef.current = nextItems;

      // HUD update (throttled to ~10 fps to limit re-renders)
      onTick({
        score: scoreRef.current,
        lives: livesRef.current,
        timeLeft: timeLeftRef.current,
      });

      // Trigger re-render for items + player position
      setRenderTick((v) => (v + 1) & 0xffff);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [end, onTick]);

  return (
    <div
      ref={stageRef}
      className="relative mx-auto mt-5 overflow-hidden rounded-3xl border border-cream-200 shadow-soft select-none"
      style={{
        width: GAME_W,
        height: GAME_H,
        touchAction: "none",
        maxWidth: "100%",
      }}
    >
      <SkyBackground />

      {/* Decorative birds (behind game items) — flip horizontally so the
          bird faces its direction of travel (most platforms render the
          emoji facing left). */}
      {birdsRef.current.map((b) => (
        <div
          key={b.id}
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            transform: `translate(${b.x}px, ${b.y}px) scaleX(${
              b.speed > 0 ? -1 : 1
            })`,
            fontSize: 34,
          }}
        >
          {b.emoji}
        </div>
      ))}

      {/* Items */}
      {itemsRef.current.map((it) => (
        <div
          key={it.id}
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            transform: `translate(${it.x - ITEM_SIZE / 2}px, ${
              it.y - ITEM_SIZE / 2
            }px)`,
            fontSize: 42,
          }}
        >
          {it.emoji}
        </div>
      ))}

      {/* Player */}
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
          transform: `translate(${
            playerXRef.current - PLAYER_SIZE / 2
          }px, ${PLAYER_Y}px)`,
          fontSize: 60,
        }}
      >
        👼🏼
      </div>

      {/* Touch controls */}
      <div className="absolute inset-x-0 bottom-0 flex h-16 select-none">
        <button
          type="button"
          aria-label="Влево"
          className="flex flex-1 items-center justify-center bg-white/60 text-2xl text-mocha-700 active:bg-cream-200"
          onPointerDown={(e) => {
            e.preventDefault();
            inputRef.current.left = true;
          }}
          onPointerUp={() => (inputRef.current.left = false)}
          onPointerLeave={() => (inputRef.current.left = false)}
          onPointerCancel={() => (inputRef.current.left = false)}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Вправо"
          className="flex flex-1 items-center justify-center bg-white/60 text-2xl text-mocha-700 active:bg-cream-200"
          onPointerDown={(e) => {
            e.preventDefault();
            inputRef.current.right = true;
          }}
          onPointerUp={() => (inputRef.current.right = false)}
          onPointerLeave={() => (inputRef.current.right = false)}
          onPointerCancel={() => (inputRef.current.right = false)}
        >
          →
        </button>
      </div>

      <span aria-hidden className="hidden">
        {renderTick}
      </span>
    </div>
  );
}
