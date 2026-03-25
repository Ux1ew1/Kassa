# Kassa React

Веб-приложение кассы на React с админ‑панелью, API сервером и авторизацией через Supabase.

## Возможности

- Просмотр меню и добавление товаров в чек
- Несколько чеков, подсчет суммы и сдачи
- Поиск по меню и фильтрация по категориям
- Админ‑панель для управления позициями
- Сохранение чеков в localStorage
- Меню хранится в `data/menu.json`
- Регистрация/вход пользователей через Supabase

## Стек

- React 18
- React Router
- Vite
- Node.js сервер (`server.js`)

## Быстрый старт (разработка)

1. Установите зависимости:
```bash
npm install
```

2. Запустите API сервер:
```bash
npm run server
```

3. Запустите frontend dev‑сервер:
```bash
npm run dev
```

Frontend доступен на `http://localhost:5173`, API — на `http://localhost:3000`.
Vite автоматически проксирует `/api` запросы на backend.

## Продакшен

1. Соберите проект:
```bash
npm run build
```

2. Запустите сервер (он обслуживает и API, и статику):
```bash
npm start
```

Приложение будет доступно по адресу `http://localhost:3000`.

### Вариант: frontend и API на разных хостах

Если фронтенд размещён отдельно (например, static hosting), API должен быть доступен по внешнему URL.

Для фронтенда задайте переменную окружения при сборке:
```bash
VITE_API_BASE_URL=https://api.example.com/api
```

Если `VITE_API_BASE_URL` не задан, используется относительный путь `/api` (подходит только когда frontend и backend обслуживаются одним хостом).

## Deploy на Vercel

На Vercel backend работает через Functions, а не через постоянный `npm start`.

1. Backend:
   - `api-core.js` содержит общую API-логику;
   - `api/[...route].js` проксирует все `/api/*` в `requestHandler`.
2. Frontend:
   - Vercel собирает Vite и отдаёт `dist`.
3. Переменные окружения в Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_USERS_TABLE`
   - `VITE_API_BASE_URL=/api`
   - `VITE_SITE_URL=https://quickcashier.ru` (опционально)
4. SPA роутинг:
   - `vercel.json` содержит rewrite для маршрутов frontend.

## API

- `GET /api/menu` — получить меню
- `PUT /api/menu` — сохранить меню
- `POST /api/register` — регистрация пользователя
- `POST /api/login` — вход пользователя
- `POST /api/rooms/create` — создать комнату (creator получает роль `owner`)
- `GET /api/rooms/my?userId=...` — список комнат пользователя с ролями
- `POST /api/rooms/invite` — добавить пользователя в комнату по логину (role: `user`/`admin`)
- `POST /api/rooms/join-by-code` — войти в комнату по короткому ID
- `POST /api/rooms/rename` — изменить название комнаты (`owner/admin`)
- `POST /api/rooms/leave` — выйти из комнаты (кроме `owner`)
- `GET /api/rooms/members?roomId=...&userId=...` — список участников комнаты (с ролями)
- `POST /api/rooms/member-role` — сменить роль участника (`owner/admin` only; owner не меняется)
- `POST /api/rooms/kick` — исключить участника (`owner/admin` only; owner не кикается)
- `GET /api/menu?roomId=...&userId=...` — меню выбранной комнаты
- `PUT /api/menu?roomId=...&userId=...` — обновление меню комнаты (только `owner`/`admin`)

Ожидаемый формат:
```json
{
  "items": [{"id": 1, "name": "...", "price": 0, "show": true, "category": "напитки"}],
  "activeOrder": [1, 2, 3]
}
```

## Переменные окружения сервера

- `HOST` — хост сервера (по умолчанию `0.0.0.0`)
- `PORT` — порт сервера (по умолчанию `3000`)
- `PUBLIC_URL` — внешний URL, который выводится в логах
- `VITE_SITE_URL` — публичный URL фронтенда для canonical/OG meta (например `https://kassa.example.com`)
- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service role key для server-side запросов
- `SUPABASE_USERS_TABLE` — имя таблицы пользователей (по умолчанию `users`)

Пример размещения переменных: `.env`

Для сборки frontend также можно задать:
- `VITE_API_BASE_URL` — базовый URL API (например `https://api.example.com/api`)

SQL для таблицы пользователей: `supabase/users.sql`

## Структура проекта

```
Kassa/
├── api/             # Vercel Functions entrypoints
├── api-core.js      # общая API/SSR логика для Vercel и local server
├── data/            # данные меню
├── dist/            # production сборка
├── public/          # статические файлы
├── src/             # исходники React
├── server.js        # локальный Node bootstrap (dev/self-host)
├── vercel.json      # Vercel routing config
├── vite.config.js   # конфигурация Vite
└── package.json
```
