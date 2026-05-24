"use client";

import { useEffect, useRef, useState } from "react";

import {
  FamilyMedia,
  ProjectorMode,
  hostFamilyMediaDelete,
  hostFamilyMediaList,
  hostFamilyMediaReorder,
  hostFamilyMediaUpload,
  hostGetProjectorMode,
  hostSetProjectorMode,
} from "@/lib/api";

const KIND_LABEL: Record<FamilyMedia["kind"], string> = {
  photo: "фото",
  video: "видео",
  music: "трек",
};

export default function AdminFamilyPage() {
  const [items, setItems] = useState<FamilyMedia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<ProjectorMode | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragId = useRef<number | null>(null);

  async function refresh() {
    try {
      const [list, m] = await Promise.all([
        hostFamilyMediaList(),
        hostGetProjectorMode(),
      ]);
      setItems(list);
      setMode(m);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await hostFamilyMediaUpload(f);
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Удалить?")) return;
    setError(null);
    try {
      await hostFamilyMediaDelete(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function onDragStart(id: number) {
    dragId.current = id;
  }

  async function onDrop(targetId: number) {
    if (!items || dragId.current === null || dragId.current === targetId) return;
    const fromId = dragId.current;
    dragId.current = null;
    const allIds = items.map((i) => i.id);
    const toIndex = allIds.indexOf(targetId);
    await moveTo(fromId, toIndex);
  }

  async function moveTo(id: number, targetGlobalIndex: number) {
    if (!items) return;
    const fromIdx = items.findIndex((i) => i.id === id);
    if (fromIdx < 0) return;
    if (targetGlobalIndex < 0 || targetGlobalIndex >= items.length) return;
    if (fromIdx === targetGlobalIndex) return;
    const newOrder = items.map((i) => i.id);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(targetGlobalIndex, 0, id);
    setItems(newOrder.map((mid) => items.find((i) => i.id === mid)!));
    try {
      const next = await hostFamilyMediaReorder(newOrder);
      setItems(next);
    } catch (e) {
      setError((e as Error).message);
      refresh();
    }
  }

  // Move within a single kind (used by ↑/↓ buttons inside each section).
  async function moveWithinKind(id: number, dir: -1 | 1) {
    if (!items) return;
    const kind = items.find((i) => i.id === id)?.kind;
    if (!kind) return;
    const sameKind = items.filter((i) => i.kind === kind);
    const within = sameKind.findIndex((i) => i.id === id);
    const targetWithin = within + dir;
    if (targetWithin < 0 || targetWithin >= sameKind.length) return;
    const neighborId = sameKind[targetWithin].id;
    const neighborGlobalIdx = items.findIndex((i) => i.id === neighborId);
    await moveTo(id, neighborGlobalIdx);
  }

  async function patchMode(patch: Partial<ProjectorMode>) {
    setError(null);
    try {
      const next = await hostSetProjectorMode(patch);
      setMode(next);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const slides = items?.filter((i) => i.kind !== "music") ?? [];
  const tracks = items?.filter((i) => i.kind === "music") ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">
          Слайд-шоу{" "}
          <span className="font-medium text-blush-600">семьи на проекторе</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          Фото и видео без звука + фоновая музыка для проектора в режиме
          слайд-шоу. Каждое фото 7 сек, видео — до конца. Треки играют
          плейлистом в бесконечном цикле. Порядок меняй стрелками ↑↓ (с
          компьютера ещё можно перетаскивать).
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

      {/* Music controls */}
      {mode && (
        <section className="rounded-3xl border border-cream-200 bg-white/70 p-5 shadow-gentle">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-mocha-400">
                Фоновая музыка
              </p>
              <p className="mt-1 text-sm text-mocha-700">
                {mode.music_enabled
                  ? "Включена — играет в режиме слайд-шоу"
                  : "Выключена"}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-mocha-700">
              <input
                type="checkbox"
                checked={mode.music_enabled}
                onChange={(e) =>
                  patchMode({ music_enabled: e.target.checked })
                }
                className="h-4 w-4 accent-blush-500"
              />
              Воспроизводить
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-mocha-400 w-20">Громкость</span>
            <input
              type="range"
              min={0}
              max={100}
              value={mode.music_volume}
              onChange={(e) =>
                setMode({ ...mode, music_volume: Number(e.target.value) })
              }
              onMouseUp={() => patchMode({ music_volume: mode.music_volume })}
              onTouchEnd={() => patchMode({ music_volume: mode.music_volume })}
              className="flex-1 accent-blush-500"
            />
            <span className="w-10 text-right text-sm font-medium text-mocha-900">
              {mode.music_volume}
            </span>
          </div>
        </section>
      )}

      {/* Upload zone */}
      <section
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        className="rounded-3xl border-2 border-dashed border-cream-300 bg-cream-50/40 p-8 text-center"
      >
        <p className="text-mocha-700">
          Перетащи сюда файлы или{" "}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-blush-600 underline underline-offset-2 hover:text-blush-700"
          >
            выбери на компьютере
          </button>
        </p>
        <p className="mt-2 text-xs text-mocha-400">
          jpg / png / heic / webp / gif (фото) · mp4 / mov / webm (видео) ·
          mp3 / m4a / wav / ogg (музыка) — до 100 МБ за файл
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
          }}
        />
        {uploading && <p className="mt-3 text-sm text-blush-600">Загружаю…</p>}
      </section>

      {/* Slides (photo/video) */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-mocha-400">
          Слайды · {slides.length}
        </h2>
        {items === null ? (
          <p className="mt-3 text-mocha-400">Загрузка…</p>
        ) : slides.length === 0 ? (
          <p className="mt-3 text-sm text-mocha-400">
            Фото/видео пока нет — проектор покажет «Минуточку…».
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {slides.map((m, i) => (
              <div
                key={m.id}
                draggable
                onDragStart={() => onDragStart(m.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(m.id)}
                className="group relative overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-gentle"
              >
                <div className="relative aspect-square w-full bg-cream-100">
                  {m.kind === "photo" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.url}
                      alt={m.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={m.url}
                      muted
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute left-2 top-2 rounded-full bg-mocha-900/60 px-2 py-0.5 text-xs text-white">
                    #{i + 1} · {KIND_LABEL[m.kind]}
                  </div>
                </div>
                <CardControls
                  filename={m.filename}
                  canUp={i > 0}
                  canDown={i < slides.length - 1}
                  onUp={() => moveWithinKind(m.id, -1)}
                  onDown={() => moveWithinKind(m.id, 1)}
                  onDelete={() => onDelete(m.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Music tracks */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-mocha-400">
          Музыкальные треки · {tracks.length}
        </h2>
        {items === null ? (
          <p className="mt-3 text-mocha-400">Загрузка…</p>
        ) : tracks.length === 0 ? (
          <p className="mt-3 text-sm text-mocha-400">
            Треков пока нет — слайд-шоу будет без музыки.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {tracks.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-gentle"
              >
                <span className="w-8 text-center text-xs text-mocha-400">
                  #{i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-mocha-900">
                  🎵 {m.filename}
                </span>
                <audio src={m.url} controls className="h-8 max-w-[200px]" />
                <button
                  onClick={() => moveWithinKind(m.id, -1)}
                  disabled={i === 0}
                  className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveWithinKind(m.id, 1)}
                  disabled={i === tracks.length - 1}
                  className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  className="rounded-full px-2 py-0.5 text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CardControls({
  filename,
  canUp,
  canDown,
  onUp,
  onDown,
  onDelete,
}: {
  filename: string;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUp}
          disabled={!canUp}
          title="Выше"
          className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ↑
        </button>
        <button
          onClick={onDown}
          disabled={!canDown}
          title="Ниже"
          className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ↓
        </button>
      </div>
      <span
        className="flex-1 truncate text-right text-mocha-400"
        title={filename}
      >
        {filename}
      </span>
      <button
        onClick={onDelete}
        title="Удалить"
        className="rounded-full px-2 py-0.5 text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
      >
        ✕
      </button>
    </div>
  );
}
