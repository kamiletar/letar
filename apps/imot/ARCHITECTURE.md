# Архитектура приложения ИМОТ

**Интегративная Матрица Осознанной Трансформации**
Авторская терапевтическая коучинговая методология Елены Рос

**Версия:** 1.0.0
**Дата:** 2025-11-25
**Статус:** MVP Complete + Post-MVP Features

---

## Содержание

1. [Обзор системы](#обзор-системы)
2. [Технологический стек](#технологический-стек)
3. [Архитектура данных](#архитектура-данных)
4. [Архитектура приложения](#архитектура-приложения)
5. [Ключевые компоненты](#ключевые-компоненты)
6. [Интеграции](#интеграции)
7. [Безопасность](#безопасность)
8. [Развертывание](#развертывание)

---

## Обзор системы

### Назначение

ИМОТ - веб-приложение для управления терапевтическим коучингом с использованием интегративной методологии, объединяющей 5 уровней диагностики:

1. **Нумерология** - Матрица судьбы, таланты, предназначение
2. **Нейропсихология** - Паттерны поведения, когнитивные особенности
3. **Энергетика** - 7 чакр, энергетические блоки
4. **Тело** - Карта зажимов, психосоматика
5. **Стиль** - Цветотип, архетип, самовыражение

### Ключевые возможности

- **Для специалистов:**
  - Управление клиентами и профилями
  - Проведение сессий с заметками
  - Создание планов трансформации
  - Назначение практик
  - Аналитика и отчеты
  - Экспорт в PDF

- **Для клиентов:**
  - Просмотр своих профилей (5 уровней)
  - Доступ к плану трансформации
  - Выполнение практик и ведение дневника
  - Отслеживание прогресса
  - Экспорт результатов в PDF

- **Система уведомлений:**
  - Email напоминания о сессиях
  - Уведомления о новых практиках
  - Напоминания о дневнике практик

- **Интеграции:**
  - Экспорт сессий в календарь (.ics)
  - Ссылки на видео-звонки
  - Поддержка платежных ссылок

---

## Технологический стек

### Frontend

- **Framework:** Next.js 16 (App Router)
- **React:** 19
- **UI Library:** Chakra UI v3
- **Forms:** Conform Future API + Zod v4
- **Animations:** Framer Motion
- **Icons:** React Icons (Lucide)

### Backend

- **Runtime:** Node.js 24
- **API:** Next.js Server Actions + API Routes
- **Email:** nodemailer + Yandex SMTP
- **PDF Generation:** @react-pdf/renderer

### Database

- **DBMS:** PostgreSQL
- **ORM:** Prisma 6
- **Access Control:** ZenStack (policy-based)
- **Validation:** Zod v4 (автогенерация из schema)

### Authentication

- **Framework:** Auth.js v5 (NextAuth)
- **Strategy:** JWT + Database Sessions
- **Providers:** Google OAuth, Yandex OAuth, Telegram Login Widget

### Development

- **Monorepo:** Nx 22
- **Package Manager:** Bun
- **Language:** TypeScript 5.9
- **Linting:** ESLint + TypeScript ESLint
- **Formatting:** Prettier

---

## Архитектура данных

### Модель данных (упрощенная схема)

```
User (пользователь)
├── роль: CLIENT | SPECIALIST | ADMIN
├── аутентификация (accounts, sessions)
├── настройки уведомлений
└── связи:
    ├── как CLIENT → Client (профиль клиента)
    └── как SPECIALIST → Client[] (клиенты специалиста)

Client (профиль клиента)
├── базовая информация (ФИО, дата рождения, и т.д.)
├── 5 профилей диагностики:
│   ├── NumerologyProfile (матрица судьбы)
│   ├── NeuroPsychProfile (паттерны поведения)
│   ├── EnergyProfile (7 чакр + энергии)
│   ├── BodyProfile (карта зажимов)
│   └── StyleProfile (цветотип + архетип)
├── TherapySession[] (сессии с специалистом)
├── TransformationPlan[] (планы трансформации)
├── Practice[] (практики)
└── Result[] (результаты прогресса)

TherapySession (сессия)
├── дата, время, длительность
├── статус (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
├── содержание (тема, заметки, домашка)
├── интеграции:
│   ├── meetingUrl (ссылка на видео-звонок)
│   ├── paymentUrl (ссылка на оплату)
│   └── paymentStatus (статус оплаты)
└── связи: Client, Specialist

TransformationPlan (план трансформации)
├── 5 этапов:
│   ├── DIAGNOSTICS (Диагностика)
│   ├── INTEGRATION (Интеграция)
│   ├── STRATEGY (Стратегия)
│   ├── PRACTICE (Практика)
│   └── RESULT (Результат)
├── текущий этап
├── приоритеты
└── Practice[] (список практик)

Practice (практика)
├── название, описание, инструкции
├── уровень ИМОТ (нумерология/энергетика/и т.д.)
├── частота, длительность
├── статус назначения (isAssigned)
├── выполнение (completedAt, notes)
└── материалы (videoUrl, audioUrl)

Result (результат/измерение)
├── тип результата (measurementType)
├── значения для каждого уровня (5 полей)
├── дата измерения
└── заметки
```

### Политики доступа (ZenStack)

```typescript
// Клиент: read-only для своих данных
@@allow('read', auth() == user)

// Специалист: full access к своим клиентам
@@allow('all', auth() == specialist)

// Админ: full access ко всему
@@allow('all', auth().role == ADMIN)
```

---

## Архитектура приложения

### Структура роутов (Next.js App Router)

```
/app
├── (auth)                    # Публичные страницы
│   ├── /sign-in              # Вход
│   └── /sign-up              # Регистрация с выбором роли
│
├── (dashboard)               # Общие авторизованные страницы
│   ├── /dashboard            # Главная панель (редирект по роли)
│   └── /profile              # Профиль пользователя + настройки уведомлений
│
├── (specialist)              # Для специалистов
│   ├── /clients              # Список клиентов
│   ├── /clients/[id]         # Карточка клиента (вкладки: инфо, профили, история, план, результаты, интеграция)
│   ├── /clients/new          # Добавление клиента
│   ├── /sessions             # Список сессий
│   ├── /sessions/new         # Создание сессии
│   ├── /sessions/[id]        # Детали сессии
│   ├── /sessions/[id]/edit   # Редактирование сессии
│   ├── /plans                # Список планов трансформации
│   ├── /plans/new            # Создание плана
│   ├── /plans/[id]           # Детали плана
│   ├── /plans/[id]/edit      # Редактирование плана
│   └── /analytics            # Аналитика (метрики, графики)
│
├── (client)                  # Для клиентов
│   ├── /my-profile           # Профиль клиента (редактирование)
│   ├── /diagnostics          # Моя диагностика (5 профилей + интеграция)
│   ├── /plan                 # План трансформации
│   ├── /practices            # Практики (активные/завершенные)
│   └── /progress             # Прогресс (графики, история)
│
├── /api                      # API Routes
│   ├── /auth/[...nextauth]   # Auth.js endpoints
│   ├── /files/[...path]      # Раздача загруженных файлов
│   ├── /uploads              # Загрузка файлов (аватары)
│   ├── /calendar/session/[id] # Экспорт сессии в .ics
│   ├── /pdf
│   │   ├── /client/[id]      # PDF профиля клиента
│   │   ├── /plan/[id]        # PDF плана трансформации
│   │   └── /client-results   # PDF результатов клиента
│   └── /cron                 # Cron jobs (protected by secret)
│       ├── /session-reminders
│       └── /practice-diary-reminders
│
└── /_components              # Общие компоненты
    ├── ui/                   # Базовые UI компоненты (Chakra wrappers)
    ├── integration-*         # Компоненты анализа интеграции
    ├── user-avatar           # Компонент аватара
    ├── imot-logo             # Логотип с анимацией
    └── ...
```

### Слои приложения

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Components + Chakra UI)         │
│  - Pages, Forms, Visualizations         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Application Layer               │
│  (Server Actions + API Routes)          │
│  - Business Logic, Validation           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Data Access Layer              │
│  (Prisma + ZenStack Enhanced Client)    │
│  - Database Queries, Access Control     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Database Layer                 │
│  (PostgreSQL)                           │
│  - Data Storage, Constraints            │
└─────────────────────────────────────────┘
```

---

## Ключевые компоненты

### 1. Система аутентификации

**Файлы:**

- `src/lib/auth.ts` - конфигурация Auth.js
- `src/lib/auth.config.ts` - провайдеры OAuth
- `src/lib/auth-utils.ts` - утилиты (requireAuth, hasRole)
- `src/lib/telegram-provider.ts` - кастомный Telegram провайдер
- `middleware.ts` - защита роутов

**Процесс:**

1. Пользователь выбирает провайдера (Google/Yandex/Telegram)
2. OAuth redirect → callback
3. Auth.js создает сессию с JWT
4. Роль определяется при регистрации
5. Middleware проверяет доступ к роутам

### 2. Профили диагностики (5 уровней)

**Процесс заполнения (specialist):**

1. Специалист открывает карточку клиента
2. Переходит на вкладку "Профили"
3. Выбирает уровень (нумерология/нейропсихология/энергетика/тело/стиль)
4. Заполняет форму профиля
5. Server Action валидирует (Zod) и сохраняет (Prisma)
6. Компонент обновляется, профиль отображается

**Визуализация (client):**

- Нумерология: карточки с числами матрицы
- Нейропсихология: списки паттернов
- Энергетика: чакровое колесо + прогресс-бары
- Тело: карта зажимов, психосоматика
- Стиль: цветотип, архетипы, уровень аутентичности

### 3. Анализ интеграции

**Алгоритм (`analyzeIntegration()`):**

1. Принимает 5 профилей клиента
2. Находит точки пересечения между уровнями
3. Определяет приоритеты (high/medium/low)
4. Выявляет паттерны и причины
5. Генерирует рекомендации
6. Рассчитывает общую целостность (0-100%)

**Компоненты визуализации:**

- `IntegrationGraph` - SVG граф связей
- `IntegrationHighlights` - ключевые находки
- `IntegrationReport` - полный отчет с вкладками

### 4. План трансформации

**5 этапов:**

1. **DIAGNOSTICS** - Диагностика (заполнение 5 профилей)
2. **INTEGRATION** - Интеграция (анализ связей)
3. **STRATEGY** - Стратегия (план работы)
4. **PRACTICE** - Практика (выполнение упражнений)
5. **RESULT** - Результат (фиксация прогресса)

**Генерация:**

- Функция `generatePlan()` анализирует профили
- Определяет приоритеты работы
- Подбирает практики для каждого уровня
- Создает описание для каждого этапа

### 5. Система уведомлений

**Архитектура:**

```
Email Service (nodemailer + Yandex SMTP)
├── Templates (HTML + брендовые цвета)
│   ├── Session Reminder (за 24ч до сессии)
│   ├── New Practice (при назначении)
│   └── Diary Reminder (каждые 3 дня)
├── Notification Functions (с проверкой preferences)
└── Cron Jobs (API Routes + external trigger)
```

**Настройки пользователя:**

- `emailNotifications` - глобальный переключатель
- `notifySessionReminders` - напоминания о сессиях
- `notifyNewPractices` - уведомления о практиках
- `notifyPracticeDiary` - напоминания о дневнике

### 6. PDF генерация

**Шаблоны (`@react-pdf/renderer`):**

- `ClientProfilePDF` - профиль клиента (все 5 уровней)
- `TransformationPlanPDF` - план трансформации
- `ClientResultsPDF` - результаты прогресса

**API Routes:**

- `GET /api/pdf/client/[id]` - профиль клиента
- `GET /api/pdf/plan/[id]` - план
- `GET /api/pdf/client-results` - результаты (только для CLIENT)

---

## Интеграции

### 1. Экспорт в календарь

**Технология:** iCalendar format (RFC 5545) - .ics файлы

**API:** `GET /api/calendar/session/[sessionId]`

**Поддерживаемые календари:**

- Google Calendar
- Apple Calendar
- Outlook
- Яндекс Календарь
- Любые приложения с поддержкой .ics

**Процесс:**

1. Пользователь кликает "Добавить в календарь" на странице сессии
2. API route генерирует .ics файл
3. Браузер скачивает файл
4. Пользователь открывает → автоматически импортируется в календарь

### 2. Видео-звонки

**Реализация:** Поле `meetingUrl` в модели TherapySession

**Поддерживаемые сервисы:**

- Google Meet
- Zoom
- Microsoft Teams
- Любые другие (произвольная ссылка)

**Интеграция:**

- Специалист добавляет ссылку при создании/редактировании сессии
- Ссылка отображается на карточке сессии
- Ссылка включается в email напоминание
- Ссылка добавляется в .ics файл календаря

### 3. Платежи

**Реализация:** Поля `paymentUrl` и `paymentStatus` в TherapySession

**Поддерживаемые системы:**

- Stripe
- ЮKassa
- Robokassa
- Любые другие (произвольная ссылка на форму оплаты)

**Статусы:**

- `pending` - ожидает оплаты
- `paid` - оплачено
- `failed` - ошибка оплаты

**Процесс:**

1. Специалист добавляет ссылку на оплату к сессии
2. Клиент видит ссылку и статус на странице сессии
3. Клиент переходит по ссылке → оплачивает
4. Специалист вручную обновляет статус после подтверждения

---

## Безопасность

### 1. Аутентификация

- JWT tokens (httpOnly cookies)
- OAuth 2.0 (Google, Yandex, Telegram)
- Session management (Auth.js)
- CSRF protection (built-in)

### 2. Авторизация

**ZenStack policy-based access control:**

```zmodel
model Client {
  // CLIENT: только read своих данных
  @@allow('read', auth() == user)

  // SPECIALIST: full access к своим клиентам
  @@allow('all', auth() == specialist)

  // ADMIN: full access
  @@allow('all', auth().role == ADMIN)
}
```

### 3. Валидация данных

- Zod v4 schemas (клиент + сервер)
- Conform Future API (форм валидация)
- Prisma constraints (база данных)

### 4. Защита API

- Auth.js session check
- Role-based middleware
- CRON_SECRET для cron jobs
- File upload restrictions

### 5. Безопасность файлов

- Загрузка только изображений (аватары)
- Ограничение размера файлов
- Раздача через защищенный API route
- Хранение вне public директории

---

## Развертывание

### Development

```bash
# Установка зависимостей
bun install

# База данных
nx zenstack:generate imot  # Генерация схем
nx db:push imot            # Push to DB

# Dev server
nx dev imot                # http://localhost:3001
```

### Production Build

```bash
# Build
nx build imot

# Database migration
nx db:migrate imot

# Start
nx start imot
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth.js
AUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
# ... (Yandex, Telegram)

# Yandex SMTP (Email)
SMTP_HOST="smtp.yandex.ru"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@yandex.ru"
SMTP_PASSWORD="your-app-password-from-yandex"
SMTP_FROM="ИМОТ <your-email@yandex.ru>"

# App
NEXT_PUBLIC_APP_URL="https://..."
CRON_SECRET="..."
```

### Cron Jobs Setup

**Vercel (recommended):**

```json
{
  "crons": [
    {
      "path": "/api/cron/session-reminders?secret=SECRET",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/practice-diary-reminders?secret=SECRET",
      "schedule": "0 9 * * 1,4"
    }
  ]
}
```

**External service (cron-job.org, EasyCron):**

- Session reminders: `0 10 * * *` (daily at 10:00)
- Diary reminders: `0 9 * * 1,4` (Mon & Thu at 9:00)

---

## Ключевые файлы и директории

```
apps/imot/
├── schema.zmodel                # Главная схема БД (ZenStack)
├── prisma/
│   ├── generated/               # Prisma Client (автоген)
│   └── schema.prisma            # Prisma схема (автоген из zmodel)
├── zod/                         # Zod schemas (автоген)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Публичные страницы
│   │   ├── (dashboard)/         # Общие авторизованные
│   │   ├── (specialist)/        # Специалист
│   │   ├── (client)/            # Клиент
│   │   ├── api/                 # API Routes
│   │   └── _components/         # Общие компоненты
│   ├── lib/
│   │   ├── auth.ts              # Auth.js config
│   │   ├── db.ts                # Prisma + ZenStack
│   │   ├── email/               # Email система
│   │   ├── pdf/                 # PDF шаблоны
│   │   ├── theme/               # Цветовая схема ИМОТ
│   │   └── utils/               # Утилиты
│   └── middleware.ts            # Route protection
├── ARCHITECTURE.md              # Этот файл
├── NOTIFICATIONS.md             # Документация по уведомлениям
└── package.json
```

---

## Метрики проекта

**Статистика (на 2025-11-25):**

- **Модели данных:** 16
- **API Routes:** 10
- **Server Actions:** 20+
- **Компоненты:** 50+
- **Страниц:** 25
- **Строк кода:** ~14,400

**Охват функциональности:**

- ✅ MVP (100%)
- ✅ Post-MVP Features:
  - ✅ Уведомления (email)
  - ✅ Интеграции (календарь, видео, платежи)
  - ⏳ PWA (будущее)

---

## Дополнительная документация

- **NOTIFICATIONS.md** - Полное руководство по системе уведомлений
- **CLAUDE.md** - Инструкции для разработки с Claude Code
- **.claude/docs/** - Детальная документация по темам:
  - environment.md - Стек и окружение
  - forms.md - Формы и валидация
  - ui-components.md - UI компоненты
  - database.md - База данных
  - auth.md - Аутентификация
  - architecture.md - Архитектура проекта
  - user-profile.md - Профиль пользователя
  - admin.md - Админ панель

---

**© ИМОТ, 2025**
**Разработано с использованием:** Next.js, Chakra UI, Prisma, ZenStack, Auth.js
