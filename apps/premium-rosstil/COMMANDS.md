# Nx Commands Reference

Это справочник по всем доступным Nx командам для проекта `premium-rosstil`.

## 📋 Содержание

- [Разработка](#разработка)
- [База данных и Prisma](#база-данных-и-prisma)
- [ZenStack](#zenstack)
- [Тестирование](#тестирование)
- [Линтинг](#линтинг)
- [Продакшн](#продакшн)

---

## Разработка

### Запуск dev-сервера

```bash
nx dev premium-rosstil
```

Запускает Next.js development server на `http://localhost:3000`.

### Сборка проекта

```bash
nx build premium-rosstil
```

Создает оптимизированную production сборку.

### Запуск production сервера

```bash
nx start premium-rosstil
```

Запускает Next.js production server (требует предварительной сборки).

**Примечание:** На сервере используется PM2, а не этот скрипт.

---

## База данных и Prisma

### Генерация Prisma Client

```bash
nx db:generate premium-rosstil
```

Генерирует Prisma Client на основе схемы. Запускается автоматически после `bun install`.

**Когда использовать:**

- После `git pull` если `src/generated/schema.prisma` изменился (но `schema.zmodel` нет)
- После обновления зависимостей
- При проблемах с импортом `@/generated/prisma`
- В CI/CD для standalone генерации клиента

**💡 Обычно НЕ нужен:** При работе со схемой используйте `nx zenstack:generate premium-rosstil`, который автоматически включает `prisma generate`!

**⚠️ ВАЖНО:** НЕ редактируйте `src/generated/schema.prisma` напрямую! Редактируйте `schema.zmodel` и запускайте `nx zenstack:generate premium-rosstil`.

### Push схемы в базу данных (Development)

```bash
nx db:push premium-rosstil
```

Синхронизирует схему Prisma с базой данных без создания миграций.

**Когда использовать:**

- Во время разработки для быстрого прототипирования
- Для применения изменений схемы без истории миграций
- В локальной разработке

**⚠️ Внимание:** Может привести к потере данных! Не используйте в продакшне.

### Создание миграции (Development)

```bash
nx db:migrate premium-rosstil
```

Создает новую миграцию и применяет её к базе данных.

**Когда использовать:**

- Когда нужна история изменений схемы
- Перед деплоем в продакшн
- Для совместной работы в команде

**Что делает:**

1. Сравнивает текущую схему с базой данных
2. Создает SQL миграцию в `prisma/migrations/`
3. Применяет миграцию к базе данных
4. Обновляет Prisma Client

### Применение миграций (Production)

```bash
nx db:migrate:deploy premium-rosstil
```

Применяет все pending миграции к базе данных без создания новых.

**Когда использовать:**

- В CI/CD pipeline
- При деплое в продакшн
- В staging окружении

**Безопасность:** Не создает новые миграции, только применяет существующие.

### Prisma Studio (Database GUI)

```bash
nx db:studio premium-rosstil
```

Открывает Prisma Studio - графический интерфейс для работы с базой данных.

**URL:** `http://localhost:5555`

**Возможности:**

- Просмотр и редактирование данных
- Фильтрация и сортировка
- Создание и удаление записей
- Просмотр связей между таблицами

### Сброс базы данных

```bash
nx db:reset premium-rosstil
```

Сбрасывает базу данных и применяет все миграции заново.

**⚠️ ОПАСНО:** Удаляет все данные!

**Когда использовать:**

- При сбросе локальной dev базы
- Для тестирования миграций с чистого листа
- Когда база данных в несогласованном состоянии

**Что делает:**

1. Удаляет всю базу данных
2. Создает заново
3. Применяет все миграции
4. Запускает seed (если настроен)

### Seed базы данных

```bash
nx db:seed premium-rosstil
```

Заполняет базу данных тестовыми данными (требует настройки seed скрипта).

**Настройка:** Добавьте в `package.json`:

```json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

---

## ZenStack

**⚠️ КРИТИЧЕСКИ ВАЖНО:** В этом проекте используется ZenStack. Файл `src/generated/schema.prisma` генерируется автоматически из `schema.zmodel` и НЕ должен редактироваться вручную!

### Генерация Prisma схемы из ZenStack

```bash
nx zenstack:generate premium-rosstil
```

Генерирует `src/generated/schema.prisma` из `schema.zmodel`.

**Когда использовать:**

- После изменения `schema.zmodel`
- После добавления access control policies
- Перед запуском Prisma команд

**Рабочий процесс:**

1. ✅ Редактируйте `schema.zmodel` (это источник правды)
2. ✅ Запустите `nx zenstack:generate premium-rosstil` (генерирует Prisma схему + Prisma Client)
3. ✅ Запустите `nx db:push premium-rosstil` (dev) или `nx db:migrate premium-rosstil` (prod)

**💡 Важно:** `zenstack:generate` автоматически запускает `prisma generate`, поэтому отдельно `db:generate` не нужен!

**❌ НЕ ДЕЛАЙТЕ:**

- НЕ редактируйте `src/generated/schema.prisma` напрямую - изменения будут перезаписаны!
- НЕ запускайте Prisma команды без предварительного `zenstack:generate`

### Инициализация ZenStack

```bash
nx zenstack:init premium-rosstil
```

Инициализирует ZenStack в проекте (уже выполнено).

**Примечание:** Эта команда нужна только один раз при первой настройке.

---

## Тестирование

### Unit тесты (Jest)

```bash
nx test premium-rosstil
```

Запускает Jest unit тесты.

**Опции:**

```bash
# Watch mode
nx test premium-rosstil --watch

# Coverage
nx test premium-rosstil --coverage

# Specific file
nx test premium-rosstil --testFile=auth.spec.ts
```

### E2E тесты (Cypress)

```bash
nx e2e premium-rosstil-e2e
```

Запускает Cypress E2E тесты в headless режиме.

**Интерактивный режим:**

```bash
nx open-cypress premium-rosstil-e2e
```

---

## Линтинг

### ESLint

```bash
nx lint premium-rosstil
```

Запускает ESLint для проверки кода.

**Опции:**

```bash
# Auto-fix
nx lint premium-rosstil --fix

# Max warnings
nx lint premium-rosstil --max-warnings=0
```

---

## Продакшн

### Деплой (автоматизированный)

! Эта секция устарела. Проанализируй и обнови

```bash
./deploy.sh
```

Автоматически выполняет:

1. `git pull` - обновление кода
2. `bun install` - установка зависимостей
3. Генерация Prisma Client
4. Применение миграций базы данных
5. Сборка приложения
6. Перезапуск PM2

**Окружение:** Production сервер

**Требования:**

- Настроены environment variables
- PostgreSQL база данных доступна
- PM2 процесс настроен

---

## Полезные комбинации

### Полная пересборка с чистой базой

```bash
nx db:reset premium-rosstil && \
nx build premium-rosstil
```

### Обновление схемы ZenStack → База данных (Development)

```bash
nx zenstack:generate premium-rosstil && \
nx db:push premium-rosstil
```

**Примечание:** `zenstack:generate` уже включает `prisma generate`!

### Обновление схемы ZenStack → База данных (Production)

```bash
nx zenstack:generate premium-rosstil && \
nx db:migrate premium-rosstil
```

**Примечание:** `zenstack:generate` уже включает `prisma generate`!

### Проверка кода перед коммитом

```bash
nx lint premium-rosstil --fix && \
nx test premium-rosstil && \
nx build premium-rosstil
```

---

## Рабочий процесс для схемы базы данных

### Development (быстрое прототипирование)

1. Редактируй `schema.zmodel` (НЕ `src/generated/schema.prisma`!)
2. `nx zenstack:generate premium-rosstil` (генерирует `src/generated/schema.prisma` + Prisma Client)
3. `nx db:push premium-rosstil` (обновляет базу данных)

**💡 Подсказка:** `zenstack:generate` автоматически запускает `prisma generate`!

### Production (с миграциями)

1. Редактируй `schema.zmodel` (НЕ `src/generated/schema.prisma`!)
2. `nx zenstack:generate premium-rosstil` (генерирует `src/generated/schema.prisma` + Prisma Client)
3. `nx db:migrate premium-rosstil` (создаёт миграцию)
4. Закоммить миграцию в git
5. На сервере: `./deploy.sh` применит миграцию

**💡 Подсказка:** `zenstack:generate` автоматически запускает `prisma generate`!

---

## Troubleshooting

### "Cannot find module '@/../prisma/generated'"

```bash
nx db:generate premium-rosstil
```

### "Database schema is not in sync"

```bash
# Development
nx db:push premium-rosstil

# Production
nx db:migrate:deploy premium-rosstil
```

### "ZenStack schema changed but Prisma schema is old"

```bash
nx zenstack:generate premium-rosstil
```

### Полный сброс при проблемах

```bash
rm -rf node_modules/.bun/@prisma
nx db:generate premium-rosstil
nx db:push premium-rosstil
```

---

## Environment Variables

Убедитесь, что `.env.local` содержит:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

См. `.env.example` для полного списка.

---

## Дополнительная информация

- [CLAUDE.md](../../CLAUDE.md) - Общая информация о проекте
- [.claude/docs/auth.md](../../.claude/docs/auth.md) - Документация по аутентификации (Better Auth)
- [Nx Documentation](https://nx.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [ZenStack Documentation](https://zenstack.dev)
