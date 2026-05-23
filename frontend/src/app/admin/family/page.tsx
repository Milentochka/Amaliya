"use client";

import { useEffect, useRef, useState } from "react";

import {
  FamilyMedia,
  hostFamilyMediaDelete,
  hostFamilyMediaList,
  hostFamilyMediaReorder,
  hostFamilyMediaUpload,
} from "@/lib/api";

export default function AdminFamilyPage() {
  const [items, setItems] = useState<FamilyMedia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragId = useRef<number | null>(null);

  async function refresh() {
    try {
      setItems(await hostFamilyMediaList());
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
    await moveTo(fromId, items.findIndex((i) => i.id === targetId));
  }

  async function moveTo(id: number, newIndex: number) {
    if (!items) return;
    const fromIdx = items.findIndex((i) => i.id === id);
    if (fromIdx < 0) return;
    if (newIndex < 0 || newIndex >= items.length) return;
    if (fromIdx === newIndex) return;
    const newOrder = items.map((i) => i.id);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(newIndex, 0, id);
    // Optimistic UI: reorder locally first, then sync.
    setItems(
      newOrder.map(
        (mid) => items.find((i) => i.id === mid)!,
      ),
    );
    try {
      const next = await hostFamilyMediaReorder(newOrder);
      setItems(next);
    } catch (e) {
      setError((e as Error).message);
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-light text-mocha-900">
          Слайд-шоу{" "}
          <span className="font-medium text-blush-600">семьи на проекторе</span>
        </h1>
        <p className="mt-2 text-sm text-mocha-500">
          Фото и видео без звука, которые крутятся на проекторе до начала
          конкурсов. Каждое фото — 7 секунд, видео — до конца. Видео должно
          быть mp4/mov/webm (звук всё равно отключается). Порядок меняй
          стрелками ↑↓ на карточках (с компьютера ещё можно перетаскивать).
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-blush-200 bg-blush-100/60 px-4 py-3 text-sm text-blush-700">
          {error}
        </p>
      )}

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
          jpg / png / heic / webp / gif / mp4 / mov / webm — до 100 МБ за файл
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
          }}
        />
        {uploading && (
          <p className="mt-3 text-sm text-blush-600">Загружаю…</p>
        )}
      </section>

      <section>
        {items === null ? (
          <p className="text-mocha-400">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-mocha-400">
            Пока ничего не загружено. На проекторе будет «Минуточку…».
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((m, i) => (
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
                    #{i + 1} · {m.kind === "photo" ? "фото" : "видео"}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveTo(m.id, i - 1)}
                      disabled={i === 0}
                      title="Выше"
                      className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveTo(m.id, i + 1)}
                      disabled={i === items!.length - 1}
                      title="Ниже"
                      className="rounded-full px-2 py-0.5 text-mocha-500 hover:bg-cream-100 hover:text-mocha-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      ↓
                    </button>
                  </div>
                  <span
                    className="flex-1 truncate text-right text-mocha-400"
                    title={m.filename}
                  >
                    {m.filename}
                  </span>
                  <button
                    onClick={() => onDelete(m.id)}
                    title="Удалить"
                    className="rounded-full px-2 py-0.5 text-mocha-400 hover:bg-blush-100 hover:text-blush-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
