# Deploy guide

Backend → Railway · Frontend → Vercel · DB → Supabase (уже работает)

Все шаги выполняются в указанном порядке. Не торопись с CORS — фронт должен задеплоиться раньше, чем мы пропишем его URL в бэк.

## 1. Подготовка аккаунтов

Заведи (если ещё нет):

- **Railway** — https://railway.app/login → Sign up with GitHub
- **Vercel** — https://vercel.com/signup → Continue with GitHub

Оба бесплатных. Каждый предложит установить GitHub App «Railway» / «Vercel» — поставь только на репозиторий `Milentochka/Amaliya` (не на все репозитории).

После регистрации скажи «готово» — пойдём дальше.

## 2. Деплой бэкенда (Railway)

### 2.1. Создать сервис

1. Railway Dashboard → **New Project** → **Deploy from GitHub repo** → выбрать `Milentochka/Amaliya`.
2. После создания — нажми на сервис → **Settings**:
   - **Root Directory:** `backend`
   - **Builder:** оставь Nixpacks (по умолчанию)
   - **Start Command:** автоопределится из `Procfile` (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`)

### 2.2. Variables (вкладка Variables, добавь по одной)

```
APP_ENV=production
APP_HOST=0.0.0.0
JWT_SECRET=<тот же, что в .env, или новый через `openssl rand -hex 32`>
JWT_ALGORITHM=HS256
JWT_GUEST_TTL_DAYS=30
JWT_ADMIN_TTL_DAYS=30

SUPABASE_URL=https://jphqvdtykesbjfnttvdd.supabase.co
SUPABASE_ANON_KEY=<eyJ... из .env>
SUPABASE_SERVICE_ROLE_KEY=<eyJ... из .env>
DATABASE_URL=postgresql+asyncpg://postgres.jphqvdtykesbjfnttvdd:<пароль>@aws-1-us-west-2.pooler.supabase.com:5432/postgres

TELEGRAM_BOT_TOKEN=<8630486557:AAEm... из .env>
TELEGRAM_BOT_USERNAME=amalia_dr_bot

SEED_ADMINS=true

APP_FRONTEND_URL=<пока поставь https://example.com — обновим после Vercel>
```

`APP_PORT` ставить не нужно — Railway сам подставит через `$PORT`.

### 2.3. Получить публичный URL

Settings → Networking → **Generate Domain**. Получится что-то вроде `amalia-backend-production.up.railway.app`. Скопируй — пригодится для Vercel.

### 2.4. Проверить

В браузере открой `https://<твой-railway-домен>/api/health`. Должно ответить `{"status":"ok"}`.

Логи живые: вкладка **Deployments** → последний → **View Logs**.

Скажи мне Railway-URL, и я подскажу что дальше.

## 3. Деплой фронтенда (Vercel)

### 3.1. Создать проект

1. Vercel Dashboard → **Add New** → **Project** → выбрать `Milentochka/Amaliya`.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Next.js (определится сам)
4. **Environment Variables** добавь:
   - `NEXT_PUBLIC_API_URL` = `https://<railway-url>` (без `/api` в конце)
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = `amalia_dr_bot`
5. **Deploy** — займёт ~2 минуты.

После сборки получишь URL вида `amaliya.vercel.app`.

### 3.2. Привязать обратно к Railway

Возвращаешься в Railway → Variables → правишь `APP_FRONTEND_URL` на свой Vercel-URL → Railway перезапустит бэк сам.

## 4. Тест-чеклист на проде

1. Открой Vercel-URL — должна показать форму входа.
2. Войди под Имя + ДР (как в локальной версии).
3. Профиль показывает аватара, зодиак.
4. Раздел Telegram → «Получить код» → код приходит.
5. Открой бота → `/start <код>` → бот отвечает.
6. Виш-лист открывается, кнопка «Забронировать» работает.
7. Игра «Ангел Амалия» открывается, движение работает, счёт записывается.
8. Страница мероприятия открывается, обратный отсчёт идёт.

## 5. (Опционально) Кастомный домен

Хочешь `amaliya.example.ru` вместо vercel-поддомена?

1. Купить домен (любой регистратор).
2. Vercel → Project → Settings → Domains → добавить.
3. Прописать NS / CNAME записи в личке у регистратора.
4. То же для Railway, если хочется поддомен `api.amaliya.example.ru`.

## 6. Стоимость

- **Railway** — $5/мес если выйдешь за free tier (500 часов работы). Для бэка 24/7 на месяц уйдёт ~$5.
- **Vercel** — Hobby plan бесплатный, под наш масштаб с запасом.
- **Supabase** — бесплатный (Free tier).

Итого: **~$5/мес** за месяц мероприятия. Можно после праздника удалить, чтобы не тратиться.
