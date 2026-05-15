# Database Migrations Production

## Workflow миграций

```
Development → Staging → Production
    ↓           ↓          ↓
db:push     db:migrate  db:migrate
(быстро)    (тест)      (production)
```

## Создание миграции

```bash
# 1. Изменить schema.zmodel
# 2. Сгенерировать Prisma schema
nx zenstack:generate premium-rosstil

# 3. Создать миграцию
nx db:migrate premium-rosstil -- --name add_user_profile

# Миграция создаётся в:
# apps/premium-rosstil/prisma/migrations/20250115123456_add_user_profile/
#   └── migration.sql
```

## Применение на production

```bash
# Подключиться к серверу
ssh deploy@production-server

# Перейти в директорию
cd /var/www/lena

# Проверить статус миграций
docker compose -f apps/premium-rosstil/docker-compose.production.yml \
  exec app npx prisma migrate status

# Применить миграции
docker compose -f apps/premium-rosstil/docker-compose.production.yml \
  exec app npx prisma migrate deploy
```

## Безопасная миграция данных

```sql
-- migration.sql
-- Добавление колонки с дефолтным значением (безопасно)
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- Создание индекса CONCURRENTLY (не блокирует таблицу)
CREATE INDEX CONCURRENTLY "User_email_idx" ON "User"("email");

-- ⚠️ ОПАСНО: Удаление колонки
-- Делать в несколько этапов:
-- 1. Убрать использование в коде
-- 2. Задеплоить
-- 3. Удалить колонку
```

## Стратегии миграции

### Добавление обязательного поля

```sql
-- Шаг 1: Добавить nullable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

-- Шаг 2: Заполнить данные
UPDATE "Product" SET "sku" = 'SKU-' || id WHERE "sku" IS NULL;

-- Шаг 3: Сделать NOT NULL
ALTER TABLE "Product" ALTER COLUMN "sku" SET NOT NULL;

-- Шаг 4: Добавить уникальный индекс
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
```

### Переименование колонки (zero-downtime)

```sql
-- Шаг 1: Добавить новую колонку
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;

-- Шаг 2: Скопировать данные
UPDATE "User" SET "fullName" = "name";

-- Шаг 3: Обновить код для использования обоих полей
-- (записывать в оба, читать из нового)

-- Шаг 4: После деплоя — удалить старую колонку
ALTER TABLE "User" DROP COLUMN "name";
```

### Изменение типа данных

```sql
-- Int → BigInt (безопасно)
ALTER TABLE "Order" ALTER COLUMN "total" TYPE BIGINT;

-- String → Int (требует конвертации)
ALTER TABLE "Product" ADD COLUMN "price_new" INTEGER;
UPDATE "Product" SET "price_new" = CAST("price" AS INTEGER);
ALTER TABLE "Product" DROP COLUMN "price";
ALTER TABLE "Product" RENAME COLUMN "price_new" TO "price";
```

## Backup перед миграцией

```bash
# Создать backup
docker compose exec postgres pg_dump -U postgres \
  -d premium_rosstil \
  -F c \
  -f /backups/pre_migration_$(date +%Y%m%d_%H%M%S).dump

# Восстановить из backup
docker compose exec postgres pg_restore -U postgres \
  -d premium_rosstil \
  -c \
  /backups/pre_migration_20250115_123456.dump
```

## Автоматический backup в deploy-affected.sh

```bash
#!/bin/bash
# deploy-affected.sh (фрагмент)

backup_database() {
  local app=$1
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="/backups/${app}_${timestamp}.dump"

  echo "Creating backup: $backup_file"

  docker compose -f apps/$app/docker-compose.production.yml \
    exec -T postgres pg_dump -U postgres \
    -d ${app//-/_} \
    -F c > $backup_file

  # Удалить старые backups (оставить 7 последних)
  ls -t /backups/${app}_*.dump | tail -n +8 | xargs -r rm
}

# Перед миграцией
backup_database "$APP_NAME"

# Миграция
docker compose -f apps/$APP_NAME/docker-compose.production.yml \
  exec app npx prisma migrate deploy
```

## Rollback миграции

```bash
# 1. Откатить базу из backup
docker compose exec postgres pg_restore -U postgres \
  -d premium_rosstil \
  -c \
  /backups/pre_migration_20250115_123456.dump

# 2. Откатить код
git revert HEAD
./deploy-affected.sh --app premium-rosstil

# 3. Удалить проблемную миграцию
rm -rf prisma/migrations/20250115123456_broken_migration
```

## Миграция с данными

```typescript
// prisma/migrations/20250115123456_data_migration/migration.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function up() {
  // Миграция данных
  const users = await prisma.user.findMany()

  for (const user of users) {
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        displayName: user.name || user.email.split('@')[0],
      },
    })
  }
}

export async function down() {
  await prisma.userProfile.deleteMany()
}
```

## Health check после миграции

```bash
# Проверить что приложение работает
curl -f http://localhost:3000/api/health || exit 1

# Проверить критичные эндпоинты
curl -f http://localhost:3000/api/products || exit 1

# Если что-то не так — откатить
if [ $? -ne 0 ]; then
  echo "Health check failed, rolling back..."
  pg_restore -U postgres -d premium_rosstil -c /backups/latest.dump
  exit 1
fi
```

## Чеклист миграции production

- [ ] Создать backup базы данных
- [ ] Протестировать миграцию на staging
- [ ] Проверить что миграция обратно-совместима
- [ ] Подготовить rollback план
- [ ] Выбрать время с минимальной нагрузкой
- [ ] Уведомить команду о планируемом даунтайме (если есть)
- [ ] Применить миграцию
- [ ] Проверить health checks
- [ ] Мониторить логи на ошибки

## Правила

- **MUST** делать backup перед любой миграцией production
- **MUST** тестировать миграцию на staging
- **SHOULD** делать миграции обратно-совместимыми
- **SHOULD** разбивать сложные миграции на этапы
- **NEVER** удалять колонки/таблицы до удаления кода их использующего
