# Архитектура проекта

## Структура воркспейса

Это Nx монорепозиторий, содержащий восемь приложений и общие библиотеки.

### Приложения

**`apps/premium-rosstil/`** - Next.js 16 интернет-магазин одежды

- Сайт на русском языке (`lang="ru"`)
- Chakra UI v3 + Next.js Google Fonts (Cormorant_Garamond, Tenor_Sans)
- Интеграция аналитики Яндекс Метрика
- Полный e-commerce: каталог, корзина, оформление заказа, профили пользователей, админ-панель
- Авторизация: Better Auth с OAuth провайдерами
- База данных: PostgreSQL + Prisma + ZenStack
- См. раздел Роуты ниже для полной структуры маршрутов

**`apps/imot/`** - Next.js 16 психотерапевтическая платформа

- "Интегративная Матрица Осознанной Трансформации" (ИМОТ)
- Мультиролевая система: Клиенты, Специалисты, Админы
- Функции: диагностика, планы терапии, практики, отслеживание прогресса, аналитика
- Chakra UI v3 + Conform формы + Zod валидация
- База данных: PostgreSQL + Prisma + ZenStack
- См. раздел Роуты IMOT ниже

**`apps/dashboard/`** - Next.js 16 дашборд мониторинга сервера

- Интерфейс мониторинга и управления сервером
- Метрики в реальном времени: CPU, память, диск, сеть
- Управление Docker контейнерами (старт/стоп/рестарт)
- Функция деплоя через кнопку UI (поддерживается self-deploy)
- Запускает команды на хосте через `nsenter` (требует `pid: host`, `privileged: true`)
- Better Auth с credentials (без базы данных)
- Две роли: ADMIN (полный доступ), VIEWER (только чтение)
- Использует `systemd-run` для надёжного перезапуска контейнера при self-deploy

**`apps/driving-school/`** - Next.js 16 платформа автошколы (порт 3003)

- PWA с оффлайн-режимом
- Связывает учеников и инструкторов
- Расписание занятий, финансы, уведомления
- База данных: PostgreSQL + Prisma + ZenStack
- @letar/forms для форм с оффлайн-поддержкой

**`apps/mandala/`** - Next.js 16 галерея мандал (порт 3004)

- Галерея и магазин товаров ручной работы
- База данных: PostgreSQL + Prisma + ZenStack

**`apps/kami/`** - Next.js 16 платформа контента (порт 3005)

- Платформа для работы с контентом и знаниями

**`apps/auth-hub/`** - Next.js 16 централизованный сервис авторизации — "Ключница" (порт 3010, s2)

- Единый центр авторизации для всех приложений `*.letar.best`
- Better Auth + OIDC Provider — выдаёт токены клиентским приложениям
- OAuth провайдеры: Google, GitHub, Facebook, VK, Yandex (настроены один раз)
- Email/password, Magic Link, верификация email
- Экран согласия для сторонних клиентов, `skipConsent` для своих (`trustedClients`)
- Админ-панель: управление OAuth-клиентами и пользователями
- Профиль: привязка аккаунтов, смена пароля
- База данных: PostgreSQL + Prisma + ZenStack
- Домен: `auth.letar.best`

**`apps/archetest/`** - Next.js 16 тест типа личности (порт 3012, s2)

- "Архетест" — определение архетипа личности
- Авторизация через Ключницу (OIDC, `letar-auth` провайдер)
- База данных: PostgreSQL + Prisma + ZenStack
- Домен: `archetest.letar.best`

**`apps/time/`** - Next.js 16 таймер обратного отсчёта (порт 3013, s1)

- Персональный таймер с вехами и подписками
- i18n: русский и английский
- База данных: PostgreSQL + Prisma + ZenStack
- Домен: `time.letar.best`

**`apps/form-develop-app/`** - Next.js 16 песочница форм (порт 3006)

- Среда разработки @letar/forms
- Тестирование новых field компонентов

### Общие библиотеки

**`libs/shared/chakra-provider/`**

- Переиспользуемая обёртка Chakra UI провайдера
- Публикуемая библиотека (npm:public)
- Экспортирует компонент `RootChakraProvider`

**`libs/yandex-metrika/`**

- Интеграция аналитики Яндекс Метрика
- Публикуемая библиотека (npm:public)

**`libs/forms/`**

- UI-библиотека форм на базе TanStack Form
- 37+ field компонентов (TextField, SelectField, DateField, etc.)
- Оффлайн-поддержка через `/offline` export
- Экспорты: `@letar/forms`, `@letar/forms/offline`

**`libs/format-utils/`**

- Утилиты форматирования (дата, телефоны)

**`libs/ui/`**

- Shared UI компоненты (TopLoader, и др.)

**`libs/validation-utils/`**

- Централизованные схемы валидации (Zod v4)

### E2E тесты

**`apps/premium-rosstil-e2e/`**

- Cypress тесты для приложения premium-rosstil

**`apps/imot-e2e/`**

- Cypress тесты для приложения imot

### Граф зависимостей

```
premium-rosstil (Next.js app)
├── @letar/chakra-provider (lib)
├── @letar/yandex-metrika (lib)
└── @letar/forms (lib)

imot (Next.js app)
├── @letar/chakra-provider (lib)
└── @letar/forms (lib)

driving-school (Next.js app)
├── @letar/chakra-provider (lib)
└── @letar/forms (lib) + offline

mandala (Next.js app)
├── @letar/chakra-provider (lib)
└── @letar/forms (lib)

label-printer-desktop (Electron app)
└── @letar/label-printer-core (lib)
```

**Соглашение об именовании:**

- Приложения — без префикса: `premium-rosstil`, `imot`, `dashboard`, `kami`, `label-printer-desktop`
- Библиотеки — с префиксом `@letar/`: `@letar/chakra-provider`, `@letar/yandex-metrika`

## Тестирование и E2E-пайплайн

E2E-тесты (Playwright) не гоняются локально при разработке — прогон вынесен на выделенный
инфраструктурный сервер s3 (`188.127.235.141`), работает по ночному cron, изолирован от production
серверов (s2) и от деплоя: `deploy-affected.sh` статус e2e не проверяет.

- Инфраструктура, порты, настройка нового приложения для e2e — [e2e-testing.md](/.claude/docs/e2e-testing.md#e2e-ранер-на-s3-188127235141)
- Как e2e соотносится с процессом деплоя (сейчас — никак) и что запланировано (pre-deploy gate) — [deployment.md](/.claude/docs/deployment.md#e2e-ранер-и-деплой--разделены)

## Роуты

### Публичные роуты

- `/` - Главная страница
- `/about` - О дизайнере
- `/catalog` - Каталог товаров
- `/catalog/[id]` - Страница товара
- `/contacts` - Контактная информация
- `/how-to-buy` - Инструкции по покупке
- `/delivery` - Информация о доставке
- `/requisites` - Реквизиты компании
- `/auth/signin` - Страница входа

### Защищённые роуты (Авторизованные пользователи)

- `/profile` - Обзор профиля с индикатором заполненности
- `/profile/edit` - Редактирование профиля (имя, email, телефон, пол, дата рождения, аватар)
- `/profile/change-password` - Смена пароля
- `/profile/connected-accounts` - Просмотр OAuth привязок
- `/profile/measurements` - Просмотр мерок пользователя
- `/profile/measurements/edit` - Редактирование мерок с живыми рекомендациями размеров
- `/profile/wishlist` - Просмотр списка желаний
- `/profile/orders` - Просмотр истории заказов
- `/profile/orders/[orderNumber]` - Просмотр деталей заказа
- `/profile/addresses` - Управление адресами доставки
- `/profile/addresses/new` - Добавление нового адреса с автодополнением DaData
- `/profile/addresses/[id]/edit` - Редактирование существующего адреса
- `/profile/settings` - Настройки профиля
- `/profile/settings/notifications` - Настройки уведомлений
- `/cart` - Корзина (полный CRUD)
- `/checkout` - Страница оформления заказа с выбором сохранённого адреса
- `/checkout/success` - Страница подтверждения заказа

### Админские роуты (Только роль ADMIN)

- `/admin` - Дашборд админа
- `/admin/products` - Управление товарами (полный CRUD)
- `/admin/users` - Управление пользователями (полный CRUD)
- `/admin/sizes` - Управление размерами товаров (полный CRUD с drag-and-drop сортировкой)
- `/admin/sizes/new` - Создание нового размера
- `/admin/sizes/[id]/edit` - Редактирование существующего размера
- `/admin/test-models` - Управление тестовыми моделями (полный CRUD - эталонная реализация)
- `/admin/test-models/new` - Создание новой тестовой модели
- `/admin/test-models/[id]/edit` - Редактирование существующей тестовой модели

### API роуты

- `/api/auth/[...all]` - Эндпоинты аутентификации Better Auth
- `/api/upload` - Эндпоинт загрузки файлов (только ADMIN, макс. 32MB для товаров)
- `/api/upload/avatar` - Эндпоинт загрузки аватара (авторизованные пользователи, макс. 2MB)
- `/api/files/[...path]` - Отдача статических файлов (товары, аватары)
- `/api/og-image` - Генерация Open Graph изображений
- `/api/test-auth` - Эндпоинт тестирования авторизации

## Роуты IMOT

"Интегративная Матрица Осознанной Трансформации" - психотерапевтическая платформа с системой ролей.

### Публичные роуты

- `/` - Главная страница
- `/sign-in` - Страница входа
- `/sign-up` - Страница регистрации

### Роуты клиента (Роль CLIENT)

- `/dashboard` - Дашборд клиента
- `/my-profile` - Профиль клиента
- `/diagnostics` - Психологическая диагностика
- `/plan` - План терапии
- `/practices` - Практики терапии
- `/progress` - Отслеживание прогресса

### Роуты специалиста (Роль SPECIALIST)

- `/dashboard` - Дашборд специалиста
- `/profile` - Профиль специалиста
- `/clients` - Управление клиентами
- `/sessions` - Управление сессиями
- `/plans` - Планы терапии
- `/analytics` - Аналитика и отчёты

### Админские роуты (Роль ADMIN)

- `/users` - Управление пользователями (полный CRUD)
- `/specialists` - Управление специалистами
- `/settings` - Настройки платформы

**Примечание:** IMOT использует группы роутов для ролевого доступа:

- `(auth)` - Публичные страницы аутентификации
- `(client)` - Роуты клиентского портала
- `(specialist)` - Роуты портала специалиста
- `(admin)` - Роуты админ-панели
- `(dashboard)` - Общие layout-ы дашбордов

## Соглашения по файлам

Компоненты следуют соглашениям Next.js App Router:

- `page.tsx` - Эндпоинты роутов
- `layout.tsx` - Общие layout-ы
- `loading.tsx` - UI загрузки
- `error.tsx` - Error boundaries
- `not-found.tsx` - Страницы 404
- `_components/` - Приватные компоненты (не роуты)
- `_icons/` - Компоненты иконок
- `_images/` - Ресурсы изображений
- `_schemas/` - Zod схемы валидации
- `_actions/` - Серверные экшены

## Конфигурация Next.js

Из `apps/premium-rosstil/next.config.js`:

- **Nx интеграция:** Использует плагин `@nx/next` с `withNx`
- **Trailing Slash:** `trailingSlash: true` — **обязательно во всех проектах** (добавляет `/` в конец URL: `/about` → `/about/`)
- **SVG обработка:** SVGR отключен (`nx.svgr: false`) - используй обычные импорты или react-icons
- **Оптимизация изображений:** Кастомные качества изображений: [25, 50, 75, 90]
- **TypeScript:** Ошибки сборки игнорируются (`ignoreBuildErrors: true`) для ускорения билдов
- **Импорты пакетов:** Экспериментальная оптимизация для `@chakra-ui/react` и `react-icons`
- **Транспиляция:** Явно транспилирует библиотеки воркспейса: `@letar/chakra-provider`, `@letar/yandex-metrika`

## Конфигурация TypeScript

- **Базовая конфигурация:** `tsconfig.base.json` использует строгий режим с composite builds для библиотек
- **Конфигурация приложения:** `apps/premium-rosstil/tsconfig.json` отключает composite режим для работы с исходными файлами напрямую
- **Custom Conditions:** `customConditions: ["@letar/source"]` для разрешения пакетов
- **Модульная система:** ESNext с bundler module resolution
- **Target:** ES2022
- **Path Mapping:** Использует `paths` для разрешения библиотек воркспейса из исходников (`libs/.../src/index.ts`)

### Алиасы путей

```json
{
  "@/*": ["apps/premium-rosstil/src/*"],
  "@/../*": ["apps/premium-rosstil/*"]
}
```

**Использование:**

- `@/*` - Файлы внутри директории `src/` (включая `@/generated/`)
- `@/../*` - Файлы выше `src/` (напр., `prisma/migrations/` для файлов миграций)

**Примечание:** Все генерируемые файлы теперь в `src/generated/`, поэтому используй `@/generated/` для импортов.

## Конфигурация ESLint

Использует **ESLint 9 Flat Config** формат:

- **Конфигурация воркспейса:** `eslint.config.mjs` в корне - Базовые правила для всего монорепозитория
- **Конфигурация приложения:** `apps/premium-rosstil/eslint.config.mjs` - Расширяет базовую с Next.js специфичными правилами
  - Правила Next.js Core Web Vitals
  - Конфигурация Nx React TypeScript (`nx.configs['flat/react-typescript']`)
  - Игнорирует директории `.next/**/*` и `out-tsc`

**Ключевые плагины:**

- `@nx/eslint-plugin` - Контроль границ монорепозитория
- `eslint-plugin-react` и `eslint-plugin-react-hooks` - Лучшие практики React
- `@typescript-eslint` - TypeScript-специфичные правила
- `eslint-plugin-jsx-a11y` - Проверки доступности
- `eslint-plugin-import` - Валидация импортов/экспортов

## Конфигурация Nx плагинов

Настроено в `nx.json`:

- `@nx/js/typescript` - TypeScript билды с targets typecheck, build, build-deps, watch-deps
- `@nx/next/plugin` - Интеграция Next.js с targets start, build, dev, serve-static
- `@nx/cypress/plugin` - E2E тестирование с targets e2e, open-cypress, component-test
- `@nx/eslint/plugin` - Линтинг с target lint
- `@nx/jest/plugin` - Юнит-тестирование с target test
- `@nx/docker` - Docker поддержка (настроена, но не используется активно)

## Кастомные Nx таргеты

### Next.js приложения (premium-rosstil, imot)

Оба Next.js приложения имеют похожие воркфлоу базы данных и разработки.

#### Команды базы данных (Prisma + ZenStack)

```bash
# Premium RosStil
nx zenstack:generate premium-rosstil  # Генерация Prisma схемы + Zod типов
nx db:push premium-rosstil            # Отправить в БД (dev)
nx db:migrate premium-rosstil         # Создать миграцию (prod)
nx db:studio premium-rosstil          # Открыть Prisma Studio

# IMOT
nx zenstack:generate imot
nx db:push imot
nx db:migrate imot
nx db:studio imot
```

**Доступные database таргеты:**

- `zenstack:generate` - Генерация Prisma схемы и Zod схем из ZenStack
- `zenstack:init` - Инициализация ZenStack в проекте
- `db:generate` - Генерация Prisma Client (кэшируется, отслеживает изменения схемы)
- `db:push` - Отправка схемы в базу данных (разработка)
- `db:push:data-loss` - Отправка схемы с принудительным сбросом (⚠️ деструктивно!)
- `db:migrate` - Создание и применение миграции
- `db:migrate:deploy` - Применение миграций (продакшн)
- `db:studio` - Открыть Prisma Studio GUI
- `db:seed` - Наполнить базу данных тестовыми данными
- `db:reset` - Сброс базы данных и применение всех миграций

#### Команды разработки

```bash
# Dev сервер
nx dev premium-rosstil    # или: nx dev imot
nx build premium-rosstil  # или: nx build imot

# Линтинг и тестирование
nx lint premium-rosstil   # или: nx lint imot
nx test premium-rosstil   # или: nx test imot
nx e2e premium-rosstil-e2e # или: nx e2e imot-e2e
```

### CLI приложение (label-printer)

Node.js CLI утилита с кастомными командами для печати этикеток.

```bash
# Сборка и разработка
nx build label-printer              # Сборка с esbuild
nx serve label-printer              # Watch режим с hot-reload

# Операции Label Printer
nx start label-printer              # Запуск цикла сканера
nx check-printer label-printer      # Проверка подключения принтера
nx history label-printer            # Просмотр истории печати
nx stats label-printer              # Показать статистику за сегодня
nx clear-db label-printer           # Очистка базы данных (с подтверждением)
nx list-ports label-printer         # Список доступных serial портов
nx list-printers label-printer      # Список доступных принтеров
nx test-print label-printer         # Тестовая печать
nx test-print-image label-printer   # Тестовая печать с изображением

# Качество кода
nx lint label-printer               # Запуск ESLint
nx typecheck label-printer          # Проверка типов TypeScript
nx validate label-printer           # Запуск всех проверок
```

Все команды имеют правильные метаданные, конфигурацию кэширования и отслеживание зависимостей.

## Деплой

### Production сервер

**Путь:** `/home/deploy/letar` — репозиторий на production сервере

> **Примечание:** Путь изменён с `/root/lena` для совместимости с backup-инструментами.

Все приложения деплоятся на один сервер с Docker.

### Docker-based деплой (Premium RosStil, IMOT, Dashboard)

Оба Next.js приложения используют **Docker Compose** для production деплоя через скрипт `deploy-affected.sh`.

#### Быстрый деплой

```bash
# Деплой всех затронутых приложений (сравнение с последним деплоем)
./deploy-affected.sh

# Деплой конкретного приложения
./deploy-affected.sh --app premium-rosstil
./deploy-affected.sh --app imot
./deploy-affected.sh --app dashboard

# Dry run (показать что будет задеплоено)
./deploy-affected.sh --dry-run

# Пропустить git pull
./deploy-affected.sh --skip-git

# Принудительная пересборка (пропустить Nx кэш)
./deploy-affected.sh --app dashboard --skip-cache

# Чистая установка (удалить node_modules, переустановить)
./deploy-affected.sh --app dashboard --clean
```

#### Процесс деплоя

Скрипт `deploy-affected.sh` автоматически:

1. **Определяет изменения** - Использует Nx affected для поиска изменённых приложений с последнего деплоя
2. **Устанавливает зависимости** - Запускает `bun install --frozen-lockfile`
3. **Генерирует схемы** - Запускает `nx zenstack:generate <app>` и `nx db:generate <app>`
4. **Запускает базу данных** - Поднимает PostgreSQL контейнер если не запущен
5. **Применяет миграции** - Запускает `prisma migrate deploy` перед сборкой
6. **Собирает приложение** - Использует Nx кэш: `nx build <app>`
7. **Собирает Docker образ** - Создаёт production образ из `Dockerfile.production`
8. **Деплоит контейнеры** - Запускает `docker compose up -d --force-recreate app`
9. **Показывает логи** - Выводит логи контейнера для задеплоенного приложения

#### Необходимые файлы для каждого приложения

Каждое деплоируемое приложение требует:

- `Dockerfile.production` - Multi-stage Docker сборка
- `docker-compose.production.yml` - PostgreSQL + Next.js app сервисы
- `.env.docker` - Переменные окружения (не в git)

#### Сервисы Docker Compose

```yaml
services:
  db:
    image: postgres:17-alpine
    ports: ['<port>:5432'] # Разный порт для каждого приложения
    volumes: ['postgres_data:/var/lib/postgresql/data']

  app:
    image: <app-name>:latest
    depends_on: [db]
    ports: ['<port>:3000'] # Разный порт для каждого приложения
    environment:
      - DATABASE_URL=postgresql://lena_user:${DB_PASSWORD}@db:5432/${DB_NAME}
```

#### Переменные окружения

Создай `.env.docker` в директории каждого приложения:

```bash
# База данных
DB_PASSWORD=<secure-password>

# Auth (Better Auth)
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=https://your-domain.com

# OAuth провайдеры (если используются)
VK_CLIENT_ID=<vk-id>
VK_CLIENT_SECRET=<vk-secret>
# ... и т.д.
```

#### Состояния деплоя

Скрипт отслеживает деплои в `.last-deploy-commit` для определения затронутых приложений при последующих запусках.

#### Ручные команды

```bash
# Просмотр логов
cd apps/premium-rosstil  # или apps/imot
docker compose -f docker-compose.production.yml logs -f app

# Перезапуск конкретного сервиса
docker compose -f docker-compose.production.yml restart app

# Остановка всех сервисов
docker compose -f docker-compose.production.yml down

# Пересборка и редеплой
docker compose -f docker-compose.production.yml up -d --build --force-recreate
```

## Загрузка файлов

- **Изображения (только ADMIN):** `/api/upload` — сохраняются в `uploads/<category>/`, лимит по типу.
- **Аватары пользователей (авторизованные):** `/api/upload/avatar` — Макс. 2MB, сохраняются в `uploads/avatars/`
- **Статическая отдача:** `/api/files/[...path]` - Отдаёт загруженные файлы
- Файлы хранятся в структуре директорий приложения
- Используй компонент Next.js Image для оптимизированной доставки

## Типы компонентов

### Серверные компоненты (по умолчанию)

```tsx
// Без директивы 'use client'
export default function ServerComponent() {
  // Можно использовать async/await, читать файлы, обращаться к базе данных
  return <div>...</div>
}
```

### Клиентские компоненты

```tsx
'use client'

// Требуется для хуков, обработчиков событий, браузерных API
export default function ClientComponent() {
  const [state, setState] = useState()
  return <button onClick={...}>...</button>
}
```

## Оптимизация изображений

Используй компонент Next.js Image для всех изображений:

```tsx
import Image from 'next/image'
;<Image
  src="/path/to/image.jpg"
  alt="Описание"
  width={800}
  height={600}
  priority // Для изображений выше fold
/>
```

## Частые ошибки

1. **Не используй 'use client' без необходимости** - Оставляй компоненты серверными по умолчанию
2. **Не забывай await auth.api.getSession()** - Вызовы Better Auth в серверных компонентах асинхронны
3. **Не используй window/document в серверных компонентах** - Перенеси в клиентский компонент с 'use client'
4. **Не предполагай что proxy работает на Node.js** - Это Edge Runtime, Node.js API недоступны
5. **Не импортируй серверные компоненты в клиентские** - Разрешено только Client → Server

## Ресурсы

- Next.js Docs: https://nextjs.org/docs
- App Router Guide: https://nextjs.org/docs/app
- Nx Docs: https://nx.dev/getting-started/intro
- Better Auth Docs: https://www.better-auth.com/docs
