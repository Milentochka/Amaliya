# Amaliya

Веб-приложение к Крестинам и дню рождения Амалии (24 мая 2026).

Состоит из 5 модулей; ТЗ и обзор — в [`docs/`](docs/).

## Структура репозитория

```
amalia_dr/
├── docs/             # Документация и ТЗ
│   ├── project-overview.md           Обзор проекта
│   ├── module1-spec.md               Регистрация и личный кабинет
│   ├── module2-spec.md               Страница мероприятия
│   ├── module4-spec.md               Развлекательные конкурсы
│   ├── wishlist-spec.md              Виш-лист подарков
│   ├── avatars-final.md              Финальные URL аватаров (51)
│   ├── avatars-catalog.md            История поиска аватаров
│   └── zodiac-traits-catalog.md      Списки черт по 12 знакам
├── backend/          # FastAPI + aiogram (Python 3.11+)
├── frontend/         # Next.js 14 + Tailwind (TypeScript)
├── .env.example      # Шаблон переменных среды
└── .gitignore
```

## Технический стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 14 + Tailwind CSS, TypeScript |
| Backend | FastAPI (Python), SQLAlchemy 2.x async |
| БД | PostgreSQL на Supabase |
| Хранилище медиа | Supabase Storage |
| Telegram-бот | aiogram 3 (внутри FastAPI-процесса) |
| Real-time | WebSocket (FastAPI) |
| Хостинг | фронт на Vercel, бэк на Railway / Fly.io |

## Локальная разработка

### 1. Подготовка переменных среды
```bash
cp .env.example .env
# Заполни: SUPABASE_URL, SUPABASE_*_KEY, DATABASE_URL,
#          TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, JWT_SECRET
```

### 2. Backend
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
```
API доступен на `http://localhost:8000`, документация Swagger — на `/docs`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Открыть `http://localhost:3000`.

## Статус разработки

| Модуль | ТЗ | Реализация |
|--------|-----|-----------|
| 1. Регистрация и ЛК | ✅ | 🚧 |
| 2. Страница мероприятия | ✅ | — |
| 3. Виш-лист | ✅ | — |
| 4. Конкурсы | ✅ | — |
| 5. Командный квиз | — | (после деплоя основной платформы) |

## Деплой

(будет добавлен по ходу разработки)
