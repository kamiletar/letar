# API Документация: Платформа для автошкол

> REST API endpoints, Server Actions и Public API v1

---

## Содержание

1. [Public API v1](#public-api-v1)
2. [Server Actions](#server-actions)
3. [Internal API Routes](#internal-api-routes)
4. [Авторизация](#авторизация)
5. [Rate Limiting](#rate-limiting)

---

## Public API v1

Публичный REST API для интеграции автошкол с внешними CRM-системами.

### Базовый URL

```
https://your-domain.com/api/v1/
```

### Авторизация

API требует авторизации через API-ключ в заголовке:

```http
X-API-Key: your_api_key_here
```

### Эндпоинты (только чтение)

#### GET /api/v1/students

Получение списка учеников школы.

**Query параметры:**

| Параметр | Тип    | Описание                      |
| -------- | ------ | ----------------------------- |
| page     | number | Номер страницы (default: 1)   |
| limit    | number | Записей на страницу (max: 50) |
| search   | string | Поиск по имени, email         |
| category | string | Фильтр по категории прав      |

**Пример запроса:**

```bash
curl -H "X-API-Key: your_api_key" \
  "https://your-domain.com/api/v1/students?page=1&limit=10"
```

**Пример ответа:**

```json
{
  "data": [
    {
      "id": "student_123",
      "name": "Иван Петров",
      "email": "ivan@example.com",
      "phone": "+79991234567",
      "category": "B",
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

#### GET /api/v1/instructors

Получение списка инструкторов школы.

**Query параметры:**

| Параметр   | Тип    | Описание                      |
| ---------- | ------ | ----------------------------- |
| page       | number | Номер страницы (default: 1)   |
| limit      | number | Записей на страницу (max: 50) |
| search     | string | Поиск по имени                |
| categories | string | Фильтр по категориям (A,B,C)  |
| role       | string | Фильтр по роли (INSTRUCTOR)   |

**Пример ответа:**

```json
{
  "data": [
    {
      "id": "instructor_123",
      "name": "Сергей Иванов",
      "email": "sergey@example.com",
      "phone": "+79991234567",
      "categories": ["B", "C"],
      "experience": "2020-01-01",
      "rating": 4.8
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

---

#### GET /api/v1/lessons

Получение списка занятий.

**Query параметры:**

| Параметр     | Тип    | Описание                            |
| ------------ | ------ | ----------------------------------- |
| page         | number | Номер страницы                      |
| limit        | number | Записей на страницу                 |
| startDate    | string | Начало периода (ISO 8601)           |
| endDate      | string | Конец периода (ISO 8601)            |
| status       | string | PENDING, CONFIRMED, COMPLETED, etc. |
| instructorId | string | Фильтр по инструктору               |
| studentId    | string | Фильтр по ученику                   |
| category     | string | Фильтр по категории прав            |

**Пример ответа:**

```json
{
  "data": [
    {
      "id": "lesson_123",
      "studentId": "student_123",
      "studentName": "Иван Петров",
      "instructorId": "instructor_123",
      "instructorName": "Сергей Иванов",
      "startTime": "2025-12-15T10:00:00Z",
      "endTime": "2025-12-15T11:30:00Z",
      "status": "CONFIRMED",
      "category": "B",
      "lessonType": "Стандартное занятие"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

#### GET /api/v1/schedule

Получение расписания инструкторов.

**Query параметры:**

| Параметр     | Тип    | Описание                   |
| ------------ | ------ | -------------------------- |
| startDate    | string | Начало периода (ISO 8601)  |
| endDate      | string | Конец периода (ISO 8601)   |
| instructorId | string | Фильтр по инструктору      |
| status       | string | AVAILABLE, BOOKED, BLOCKED |

**Пример ответа:**

```json
{
  "data": [
    {
      "id": "slot_123",
      "instructorId": "instructor_123",
      "instructorName": "Сергей Иванов",
      "startTime": "2025-12-15T10:00:00Z",
      "endTime": "2025-12-15T11:30:00Z",
      "status": "AVAILABLE",
      "lessonId": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5
  }
}
```

---

#### GET /api/v1/stats

Получение статистики школы.

**Query параметры:**

| Параметр  | Тип    | Описание                  |
| --------- | ------ | ------------------------- |
| startDate | string | Начало периода (ISO 8601) |
| endDate   | string | Конец периода (ISO 8601)  |

**Пример ответа:**

```json
{
  "data": {
    "members": {
      "total": 156,
      "students": 142,
      "instructors": 12,
      "admins": 2
    },
    "lessons": {
      "total": 1240,
      "completed": 1102,
      "pending": 45,
      "cancelled": 93,
      "completionRate": 88.9
    },
    "efficiency": {
      "avgLessonsPerInstructor": 103.5,
      "avgLessonsPerStudent": 7.8
    }
  }
}
```

---

### Коды ошибок

| Код | Сообщение             | Описание                          |
| --- | --------------------- | --------------------------------- |
| 200 | OK                    | Успешный запрос                   |
| 400 | Bad Request           | Некорректные параметры            |
| 401 | Unauthorized          | Отсутствует или неверный API-ключ |
| 403 | Forbidden             | Доступ запрещён                   |
| 404 | Not Found             | Ресурс не найден                  |
| 429 | Too Many Requests     | Превышен лимит запросов           |
| 500 | Internal Server Error | Внутренняя ошибка сервера         |

---

## Server Actions

Server Actions используются для мутаций данных в Next.js App Router.

### Структура

```typescript
// _actions/example.action.ts
'use server'

import { ExampleSchema } from '@/schemas/example'
import { parseWithZod } from '@conform-to/zod/v4'

export async function exampleAction(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: ExampleSchema })

  if (submission.status !== 'success') {
    return submission.reply()
  }

  // Бизнес-логика
  await prisma.example.create({
    data: submission.value,
  })

  return submission.reply({ resetForm: true })
}
```

### Основные экшены

| Модуль         | Файл                              | Описание                 |
| -------------- | --------------------------------- | ------------------------ |
| Аутентификация | `_actions/auth.action.ts`         | Регистрация, вход, выход |
| Профиль        | `_actions/profile.action.ts`      | Обновление профиля       |
| Занятия        | `_actions/lesson.action.ts`       | CRUD занятий             |
| Расписание     | `_actions/schedule.action.ts`     | Настройки расписания     |
| Школы          | `_actions/school.action.ts`       | Управление школами       |
| Финансы        | `_actions/balance.action.ts`      | Баланс, штрафы           |
| Уведомления    | `_actions/notification.action.ts` | Настройки уведомлений    |
| API-ключи      | `_actions/api-key.action.ts`      | Управление API-ключами   |

---

## Internal API Routes

Внутренние API роуты для специфичной функциональности.

### Загрузка файлов

#### POST /api/upload/profile

Загрузка фото профиля.

**Content-Type:** `multipart/form-data`

**Ограничения:**

- Максимальный размер: 5 MB
- Форматы: JPG, PNG, WebP
- Автоматическое сжатие до 800x800

---

#### POST /api/upload/vehicles

Загрузка фото автомобилей.

**Ограничения:**

- Максимум 5 фото на автомобиль
- Максимальный размер: 5 MB на фото

---

### Telegram Webhook

#### POST /api/telegram/webhook

Webhook для Telegram-бота.

**Защита:** Telegram secret token

---

### Push-уведомления

#### POST /api/push/subscribe

Подписка на push-уведомления.

**Body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

---

#### POST /api/push/send

Отправка push-уведомления (внутренний).

---

### Импорт/Экспорт

#### POST /api/import/students

Импорт учеников из Excel/CSV.

**Content-Type:** `multipart/form-data`

**Форматы:** xlsx, ods, csv

---

#### POST /api/import/instructors

Импорт инструкторов из Excel/CSV.

---

#### GET /api/export/students

Экспорт учеников в Excel/CSV.

**Query параметры:**

| Параметр | Описание       |
| -------- | -------------- |
| format   | xlsx, ods, csv |
| schoolId | ID школы       |

---

### Cron-задачи

#### GET /api/cron/cleanup-api-logs

Ротация API логов (удаление старше 30 дней).

**Авторизация:** `Authorization: Bearer CRON_SECRET`

**Запуск:** Ежедневно в 3:00 (настраивается в crontab)

---

## Авторизация

### Для Public API

**Header:**

```http
X-API-Key: your_api_key_here
```

### Для Internal API

**Cookie-based session:**

```http
Cookie: next-auth.session-token=...
```

---

## Rate Limiting

### Лимиты Public API

| Параметр                | Значение              |
| ----------------------- | --------------------- |
| Запросов в минуту       | 100                   |
| Алгоритм                | Sliding Window        |
| Действие при превышении | 429 Too Many Requests |

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672531200
```

### Кастомные лимиты

Владелец платформы может настроить индивидуальные лимиты для школ через `/owner/rate-limits`.

---

## Версионирование

API использует версионирование через URL:

- `/api/v1/*` — текущая версия
- `/api/v2/*` — будущие версии

**Backward compatibility:** Минорные изменения не ломают существующий функционал.

---

## Документация Swagger

Интерактивная документация доступна по адресу:

```
https://your-domain.com/api-docs
```

OpenAPI спецификация: `/api/openapi`

> **Реализовано в Фазе 8** (v0.76.0+)

---

## Примеры использования

### cURL

```bash
# Получить список учеников
curl -H "X-API-Key: sk_test_..." \
  "https://your-domain.com/api/v1/students?limit=10"

# Получить занятия за период
curl -H "X-API-Key: sk_test_..." \
  "https://your-domain.com/api/v1/lessons?startDate=2025-12-01&endDate=2025-12-31"
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://your-domain.com/api/v1/students', {
  headers: {
    'X-API-Key': 'sk_test_...',
  },
})

const data = await response.json()
console.log(data)
```

### Python (requests)

```python
import requests

response = requests.get(
    'https://your-domain.com/api/v1/students',
    headers={'X-API-Key': 'sk_test_...'}
)

data = response.json()
print(data)
```

---

## Логирование API

Все запросы к Public API логируются в БД (модель `ApiLog`).

**Записываются:**

- API ключ
- Эндпоинт
- HTTP метод
- Статус код
- Время ответа (ms)
- IP адрес
- User Agent

**Доступ к логам:**

- ADMIN школы: `/school/[id]/settings` (вкладка API-ключи)
- OWNER: `/owner/api-logs`

**Ротация:** Логи старше 30 дней автоматически удаляются (настраивается через `API_LOG_RETENTION_DAYS`).

---

## Webhook (будущее)

Планируется добавить webhooks для событий:

- `lesson.created`
- `lesson.cancelled`
- `student.enrolled`
- `exam.completed`

> **Статус:** Не реализовано (Post-MVP)

---

## Связанные документы

- [SECURITY.md](./SECURITY.md) — безопасность и Rate Limiting
- [DATABASE.md](./DATABASE.md) — модели БД
- [../PLAN.md](../PLAN.md) — требования к API (Фаза 8)
