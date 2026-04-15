# OYNO — Платформа для бронирования спортивных площадок

Мобильное приложение и REST/WebSocket-бэкенд для поиска, бронирования и оплаты спортивных площадок в Бишкеке (Кыргызстан). Игроки находят площадки и открытые игры, владельцы управляют расписанием и просматривают статистику.

---

## Содержание

- [Технологический стек](#технологический-стек)
- [Архитектура проекта](#архитектура-проекта)
- [Модули бэкенда](#модули-бэкенда)
- [API-эндпоинты](#api-эндпоинты)
- [Запуск бэкенда](#запуск-бэкенда)
- [Запуск мобильного приложения](#запуск-мобильного-приложения)
- [Переменные окружения](#переменные-окружения)
- [Структура проекта](#структура-проекта)

---

## Технологический стек

### Бэкенд (`oyno-backend`)
| Компонент | Технология |
|---|---|
| Фреймворк | Django 5.0 + Django REST Framework 3.15 |
| ASGI-сервер | Daphne 4 (HTTP + WebSocket) |
| WebSocket | Django Channels 4 + channels-redis |
| База данных | PostgreSQL 16 |
| Кэш / Брокер | Redis 7 |
| Фоновые задачи | Celery 5 |
| Аутентификация | JWT (SimpleJWT) + OTP по SMS |
| Push-уведомления | Firebase Admin SDK (FCM) |
| API-документация | drf-spectacular (Swagger UI) |
| Контейнеризация | Docker + Docker Compose |

### Мобильное приложение (`oyno-mobile`)
| Компонент | Технология |
|---|---|
| Фреймворк | React Native 0.81 + Expo ~54 |
| Навигация | Expo Router 6 (file-based routing) |
| Язык | TypeScript 5 |
| Состояние | Zustand + React Query 5 |
| HTTP-клиент | Axios (с автообновлением JWT) |
| WebSocket | Socket.io-client 4 |
| Push-уведомления | Firebase Messaging + expo-notifications |
| Карты | react-native-maps |
| Хранилище | expo-secure-store (токены) + react-native-mmkv |

---

## Архитектура проекта

```
Oyno 2.0/
├── oyno-backend/     # Django-бэкенд
└── oyno-mobile/      # React Native / Expo приложение
```

Мобильное приложение обращается к бэкенду через REST API (`/api/v1/`) и WebSocket (Django Channels). Фоновые задачи (push-уведомления, напоминания) выполняются через Celery + Redis.

```
[React Native App]
       │  REST (JWT)        │ WebSocket
       ▼                    ▼
   [Daphne ASGI Server]────────────────
       │                    │
  [Django REST]       [Django Channels]
       │                    │ Redis
  [PostgreSQL]          [Celery Worker]
                            │
                       [Firebase FCM]
```

---

## Модули бэкенда

### `apps/users` — Пользователи и аутентификация
- Кастомная модель `User` с аутентификацией по номеру телефона
- Роли: **Player** (игрок) и **Venue Owner** (владелец площадки)
- OTP-верификация через SMS (Eskiz или любой KG-провайдер)
- Ранговая система: Новичок → Любитель → Продвинутый → Профессионал (по кол-ву матчей)
- Рейтинг и надёжность игрока
- JWT access/refresh токены

### `apps/venues` — Площадки
- Типы: стадион, зал, бассейн, корт, поле
- Виды спорта: футбол, баскетбол, волейбол, теннис, плавание и др.
- Геолокация (широта/долгота), рабочие часы, удобства, фотогалерея
- Временные слоты (TimeSlot) для бронирования
- Owner CRM: статистика и управление через `/api/v1/owner/`

### `apps/bookings` — Бронирования
- Статусы: `pending` → `confirmed` → `completed` / `cancelled`
- Статус оплаты: `pending` → `paid` / `refunded`
- При создании брони автоматически блокирует временной слот

### `apps/payments` — Платежи
- Способы оплаты: Visa, MasterCard, Элкарт, Mbank, O!Деньги
- Сохранение платёжных методов (токенизация)
- История платежей с привязкой к бронированиям

### `apps/games` — Открытые игры
- Игроки создают игры и набирают команду
- Фильтр по уровню, виду спорта, площадке
- Автоматическое создание чат-комнаты для участников игры

### `apps/chats` — Чаты
- Real-time обмен сообщениями через WebSocket (Django Channels)
- Чат-комнаты привязаны к играм
- JWT-аутентификация в WebSocket через middleware

### `apps/notifications` — Push-уведомления
- Отправка уведомлений через Firebase Cloud Messaging
- Фоновые задачи через Celery (напоминания о бронированиях, новые сообщения)

---

## API-эндпоинты

| Префикс | Описание |
|---|---|
| `POST /api/v1/auth/register/` | Регистрация |
| `POST /api/v1/auth/login/` | Вход (OTP) |
| `GET/POST /api/v1/venues/` | Список / создание площадок |
| `GET /api/v1/venues/{id}/` | Детали площадки |
| `GET/POST /api/v1/bookings/` | Бронирования |
| `GET/POST /api/v1/games/` | Открытые игры |
| `GET/POST /api/v1/chats/` | Чат-комнаты |
| `GET/POST /api/v1/payments/` | Платежи |
| `GET /api/v1/owner/` | CRM владельца (статистика) |
| `GET /api/docs/` | Swagger UI (интерактивная документация) |
| `GET /api/schema/` | OpenAPI схема (JSON) |

WebSocket: `ws://<host>/ws/chat/<room_id>/`

---

## Запуск бэкенда

### Требования
- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/)

### 1. Клонирование и настройка окружения

```bash
cd oyno-backend
cp .env.example .env
```

Откройте `.env` и заполните переменные (подробнее в разделе [Переменные окружения](#переменные-окружения)).

### 2. (Опционально) Firebase-учётные данные

Если используются push-уведомления, положите файл `firebase-credentials.json` в папку `oyno-backend/` и убедитесь, что путь в `.env` совпадает:

```
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
```

### 3. Запуск контейнеров

```bash
docker-compose up --build
```

Сервисы, которые поднимаются:

| Сервис | Порт | Описание |
|---|---|---|
| `web` | `8000` | Django / Daphne (HTTP + WebSocket) |
| `db` | `5432` | PostgreSQL 16 |
| `redis` | `6379` | Redis 7 |
| `celery` | — | Celery worker |

### 4. Применение миграций и создание суперпользователя

```bash
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

### 5. Проверка

- API: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)
- Swagger: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- Django Admin: [http://localhost:8000/admin/](http://localhost:8000/admin/)

### Полезные команды

```bash
# Остановить контейнеры
docker-compose down

# Пересобрать после изменений
docker-compose up --build

# Логи конкретного сервиса
docker-compose logs -f web

# Создать новые миграции
docker-compose exec web python manage.py makemigrations
```

---

## Запуск мобильного приложения

### Требования
- [Node.js](https://nodejs.org/) >= 20
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- Для Android: Android Studio + эмулятор **или** физическое устройство с [Expo Go](https://expo.dev/client)
- Для iOS (только macOS): Xcode + симулятор

### 1. Установка зависимостей

```bash
cd oyno-mobile
npm install
```

### 2. Настройка URL бэкенда

Откройте `services/api.ts` и замените `BASE_URL` на адрес вашего бэкенда:

```ts
// services/api.ts
export const BASE_URL = 'http://192.168.X.X:8000/api/v1';  // локальный IP для устройства
// или
export const BASE_URL = 'http://localhost:8000/api/v1';     // для эмулятора
```

> **Важно:** если тестируете на физическом устройстве, используйте IP-адрес машины в локальной сети, а не `localhost`.

### 3. Запуск

```bash
# Открыть меню выбора платформы (Metro + QR-код)
npx expo start

# Сразу на Android
npx expo start --android

# Сразу на iOS
npx expo start --ios
```

### Структура экранов (Expo Router)

```
app/
├── (auth)/          # Авторизация: вход, OTP, регистрация
├── (player)/        # Главный поток игрока
│   ├── index        # Главная / ента
│   ├── venues/      # Список и детали площадок
│   ├── games/       # Открытые игры
│   ├── booking      # Создание бронирования
│   ├── chats/       # Чаты
│   └── profile      # Профиль игрока
└── (owner)/         # CRM владельца площадки
    ├── index        # Дашборд
    ├── venues       # Управление площадками
    ├── bookings     # Бронирования
    └── profile      # Профиль владельца
```

---

## Переменные окружения

Файл: `oyno-backend/.env` (создаётся из `.env.example`)

```env
# Django
SECRET_KEY=your-django-secret-key-here
DEBUG=True

# PostgreSQL
DB_NAME=oyno_db
DB_USER=oyno_user
DB_PASSWORD=oyno_pass
DB_HOST=db
DB_PORT=5432

# Redis (используется Channels + Celery)
REDIS_URL=redis://redis:6379/0

# JWT токены
JWT_ACCESS_LIFETIME_MINUTES=60
JWT_REFRESH_LIFETIME_DAYS=30

# SMS-провайдер для OTP (Eskiz.uz или аналог)
SMS_API_URL=https://notify.eskiz.uz/api/message/sms/send
SMS_EMAIL=your@email.com
SMS_PASSWORD=your-sms-password

# Firebase (push-уведомления)
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json

# Платёжный шлюз Mbank
MBANK_API_URL=https://api.mbank.kg/v1
MBANK_MERCHANT_ID=your-merchant-id
MBANK_SECRET_KEY=your-secret-key
```

---

## Структура проекта

```
Oyno 2.0/
├── oyno-backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── apps/
│   │   ├── users/          # Аутентификация, профиль, OTP
│   │   ├── venues/         # Площадки, слоты, изображения
│   │   ├── bookings/       # Бронирования
│   │   ├── payments/       # Платежи, способы оплаты
│   │   ├── games/          # Открытые игровые сессии
│   │   ├── chats/          # Real-time чаты (WebSocket)
│   │   └── notifications/  # Push-уведомления (Celery + FCM)
│   └── config/
│       ├── settings/
│       │   ├── base.py
│       │   ├── development.py
│       │   └── production.py
│       ├── urls.py
│       └── asgi.py
└── oyno-mobile/
    ├── app/                # Экраны (Expo Router)
    ├── components/         # UI-компоненты
    ├── services/           # api.ts (Axios), socket.ts
    ├── stores/             # Zustand: authStore, uiStore
    ├── hooks/              # useWebSocket и др.
    ├── types/              # TypeScript типы
    └── constants/          # Темы, i18n
```
