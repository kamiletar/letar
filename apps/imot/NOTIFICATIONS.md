# Система уведомлений ИМОТ

Система email уведомлений для приложения ИМОТ использует Yandex SMTP и nodemailer.

## 📋 Содержание

- [Типы уведомлений](#типы-уведомлений)
- [Настройка](#настройка)
- [Cron Jobs](#cron-jobs)
- [Настройки пользователя](#настройки-пользователя)
- [Архитектура](#архитектура)

---

## 🔔 Типы уведомлений

### 1. Напоминание о сессии

- **Когда:** За 24 часа до запланированной сессии
- **Кому:** Клиентам
- **Содержание:** Дата, время, тип сессии, заметки специалиста
- **Триггер:** Cron job (автоматически)

### 2. Новая практика

- **Когда:** Когда специалист назначает новую практику
- **Кому:** Клиентам
- **Содержание:** Название, описание, уровень, частота, длительность
- **Триггер:** Server action `createPractice` (мгновенно)

### 3. Напоминание о дневнике практик

- **Когда:** Если клиент не заполнял дневник 3+ дня
- **Кому:** Клиентам с активными практиками
- **Содержание:** Количество незаполненных практик, советы
- **Триггер:** Cron job (автоматически)

---

## ⚙️ Настройка

### 1. Переменные окружения

Добавьте в `apps/imot/.env.local`:

```env
# Yandex SMTP Configuration
SMTP_HOST="smtp.yandex.ru"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@yandex.ru"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="ИМОТ <your-email@yandex.ru>"

# Application URL (для ссылок в email)
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# Cron Secret (для защиты API endpoints)
CRON_SECRET="your-secret-key-change-in-production"
```

### 2. Получение App Password от Yandex

1. Перейдите в настройки Яндекс: https://id.yandex.ru/security
2. Включите двухфакторную аутентификацию (если еще не включена)
3. Создайте "Пароль для приложения"
4. Выберите категорию "Почта"
5. Скопируйте пароль и используйте как `SMTP_PASSWORD`

### 3. Проверка подключения

```typescript
import { verifyEmailConnection } from '@/lib/email'

const isConnected = await verifyEmailConnection()
console.log('SMTP connection:', isConnected ? 'OK' : 'Failed')
```

---

## 🕐 Cron Jobs

### API Endpoints для cron jobs

#### 1. Напоминания о сессиях

**Endpoint:** `GET /api/cron/session-reminders?secret=YOUR_SECRET`

**Частота:** 1 раз в день (рекомендуется в 10:00)

**Логика:**

- Проверяет сессии через 20-28 часов от текущего момента
- Отправляет email клиентам с предстоящими сессиями
- Учитывает настройки уведомлений пользователя

#### 2. Напоминания о дневнике практик

**Endpoint:** `GET /api/cron/practice-diary-reminders?secret=YOUR_SECRET`

**Частота:** 2 раза в неделю (например, понедельник и четверг)

**Логика:**

- Проверяет клиентов с активными практиками
- Находит практики без заметок или с давними заметками (>3 дней)
- Отправляет напоминание о заполнении дневника

### Настройка cron jobs

#### Вариант 1: Vercel Cron (если деплой на Vercel)

Создайте `vercel.json` в корне проекта:

```json
{
  "crons": [
    {
      "path": "/api/cron/session-reminders?secret=YOUR_SECRET",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/practice-diary-reminders?secret=YOUR_SECRET",
      "schedule": "0 9 * * 1,4"
    }
  ]
}
```

#### Вариант 2: Внешний сервис (cron-job.org, EasyCron, и т.д.)

1. Зарегистрируйтесь на https://cron-job.org
2. Создайте новый cron job
3. URL: `https://your-domain.com/api/cron/session-reminders?secret=YOUR_SECRET`
4. Расписание:
   - Session reminders: `0 10 * * *` (каждый день в 10:00)
   - Diary reminders: `0 9 * * 1,4` (понедельник и четверг в 9:00)

#### Вариант 3: Ручной запуск (для тестирования)

```bash
# Session reminders
curl "http://localhost:3001/api/cron/session-reminders?secret=your-secret-key"

# Practice diary reminders
curl "http://localhost:3001/api/cron/practice-diary-reminders?secret=your-secret-key"
```

---

## 👤 Настройки пользователя

Пользователи могут управлять своими предпочтениями на странице `/profile`.

### Доступные настройки:

1. **Включить email уведомления** (глобальный переключатель)
2. **Напоминания о сессиях** - за 24 часа до сессии
3. **Новые практики** - при назначении новой практики
4. **Напоминания о дневнике практик** - периодические напоминания

### Значения по умолчанию:

Все уведомления включены по умолчанию (`true`) для новых пользователей.

---

## 🏗️ Архитектура

### Структура файлов

```
src/lib/email/
├── email.service.ts              # SMTP transporter и sendEmail()
├── email.templates.ts             # HTML шаблоны для email
├── index.ts                       # Экспорты модуля
└── notifications/
    ├── session-reminder.ts        # Отправка напоминаний о сессиях
    ├── new-practice.ts            # Уведомления о новых практиках
    └── practice-diary-reminder.ts # Напоминания о дневнике

src/app/api/cron/
├── session-reminders/route.ts
└── practice-diary-reminders/route.ts

src/app/(dashboard)/profile/
├── _actions/
│   └── update-notification-settings.ts
└── _components/
    └── notification-settings-form.tsx
```

### Основные функции

#### 1. `sendEmail(options)`

Базовая функция для отправки email через Yandex SMTP.

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Тема письма',
  html: '<p>HTML содержимое</p>',
  text: 'Текстовая версия',
})
```

#### 2. `sendSessionReminderEmail(email, data, preferences?)`

Отправка напоминания о сессии.

```typescript
await sendSessionReminderEmail(
  clientEmail,
  {
    clientName: 'Иван Иванов',
    specialistName: 'Елена Рос',
    sessionDate: new Date('2025-11-25T10:00:00'),
    sessionType: 'Диагностика',
    notes: 'Подготовьтесь к разговору о целях',
    dashboardUrl: 'https://app.com/dashboard',
  },
  {
    emailNotifications: true,
    notifySessionReminders: true,
  }
)
```

#### 3. `sendNewPracticeEmail(email, data, preferences?)`

Уведомление о новой практике.

```typescript
await sendNewPracticeEmail(
  clientEmail,
  {
    clientName: 'Иван Иванов',
    practiceName: 'Медитация осознанности',
    practiceDescription: 'Практика для развития присутствия в моменте',
    practiceLevel: 'Нейропсихология',
    duration: '15 минут',
    frequency: 'Ежедневно',
    practicesUrl: 'https://app.com/practices',
  },
  {
    emailNotifications: true,
    notifyNewPractices: true,
  }
)
```

#### 4. `sendPracticeDiaryReminderEmail(email, data, preferences?)`

Напоминание о дневнике практик.

```typescript
await sendPracticeDiaryReminderEmail(
  clientEmail,
  {
    clientName: 'Иван Иванов',
    incompletePracticesCount: 5,
    lastEntryDate: new Date('2025-11-20'),
    practicesUrl: 'https://app.com/practices',
  },
  {
    emailNotifications: true,
    notifyPracticeDiary: true,
  }
)
```

---

## 🔒 Безопасность

1. **CRON_SECRET** - защищает API endpoints от несанкционированного доступа
2. **App Password** - Yandex рекомендует использовать отдельный пароль для приложений
3. **User Preferences** - проверка настроек перед отправкой email
4. **Error Handling** - ошибки email не прерывают основные операции

---

## 🧪 Тестирование

### Локальное тестирование

1. Настройте SMTP credentials в `.env.local`
2. Запустите dev server: `nx dev imot`
3. Вызовите API endpoints с `?secret=your-secret-key`
4. Проверьте логи в консоли и входящие письма

### Проверка подключения

```bash
# В консоли разработчика
const { verifyEmailConnection } = require('./src/lib/email');
await verifyEmailConnection(); // должно вернуть true
```

---

## 📝 TODO (Future Enhancements)

- [ ] Push notifications (Web Push API)
- [ ] SMS notifications (Twilio/SMS.ru)
- [ ] In-app notifications (уведомления внутри приложения)
- [ ] Email templates preview page (для дизайна)
- [ ] Email analytics (открытия, клики)
- [ ] Unsubscribe link (отписка от всех уведомлений)
- [ ] Email queue system (для больших объемов)

---

## 🐛 Troubleshooting

### Email не отправляются

1. Проверьте SMTP credentials в `.env.local`
2. Убедитесь, что используется App Password от Yandex
3. Проверьте подключение: `await verifyEmailConnection()`
4. Проверьте логи: `console.log` в server actions и cron jobs

### Cron jobs не запускаются

1. Убедитесь, что `CRON_SECRET` совпадает в `.env` и URL
2. Проверьте расписание cron jobs
3. Для Vercel: убедитесь, что `vercel.json` настроен правильно
4. Проверьте логи на платформе деплоя

### Уведомления приходят, но не по расписанию

- Проверьте временную зону сервера
- Убедитесь, что логика проверки времени корректна (20-28 часов для сессий)
- Проверьте частоту запуска cron jobs

---

**Дата создания:** 2025-11-24
**Версия:** 1.0.0
**Автор:** Claude Code
