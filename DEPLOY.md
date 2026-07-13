# 🚀 Deployment Guide

Универсальный скрипт деплоя для Nx монорепозитория с Docker.

## Быстрый старт

```bash
# Деплой всех affected приложений
./deploy-affected.sh

# Деплой конкретного приложения
./deploy-affected.sh --app premium-rosstil
./deploy-affected.sh --app imot

# Посмотреть что будет задеплоено (dry-run)
./deploy-affected.sh --dry-run
```

## Особенности

- ✅ **Автоматическое определение affected** - деплоятся только измененные приложения
- ✅ **Nx cache** - переиспользование предыдущих сборок
- ✅ **Параллельная сборка** - максимальная производительность
- ✅ **Docker optimization** - минимальные образы (~100MB)
- ✅ **Zero-downtime** - graceful restart контейнеров
- ✅ **Универсальность** - работает для любого количества приложений

## Опции

```bash
./deploy-affected.sh [OPTIONS]

Options:
  --app APP_NAME    Deploy only specific app (e.g., premium-rosstil)
  --skip-git        Skip git pull
  --dry-run         Show what would be deployed without actually deploying
  --help            Show help message
```

## Примеры использования

### Деплой после git push

```bash
# На сервере автоматически деплоятся только измененные приложения
./deploy-affected.sh
```

### Деплой конкретного приложения

```bash
# Если нужно задеплоить конкретное приложение независимо от affected
./deploy-affected.sh --app premium-rosstil
./deploy-affected.sh --app imot
```

### Проверка перед деплоем

```bash
# Посмотреть какие приложения будут задеплоены
./deploy-affected.sh --dry-run

# Вывод:
# 🔍 DRY RUN MODE - No actual deployment will happen
#
# Would deploy: premium-rosstil
#   ✓ Has docker-compose.production.yml
#   ✓ Has Dockerfile.production
#   ✓ Has .env.docker configuration
```

### Деплой без git pull

```bash
# Если код уже актуальный
./deploy-affected.sh --skip-git
```

## Как это работает

1. **Git Pull** - обновляет код из репозитория
2. **Dependencies** - устанавливает зависимости через Bun
3. **Affected Detection** - определяет измененные приложения через Nx
4. **For Each App:**
   - Генерирует Prisma Client и ZenStack
   - Собирает с Nx cache (только affected targets)
   - Создает Docker образ из готового билда
   - Деплоит через docker-compose с миграциями
5. **Summary** - показывает статистику успешных/неудачных деплоев

## Требования

### На сервере должно быть установлено:

- Node.js 24
- Bun
- Nx (глобально)
- Docker & Docker Compose
- Git

### Для каждого приложения:

Структура в `apps/your-app/`:

```
apps/your-app/
  ├── Dockerfile.production          # Упаковка готового билда
  ├── docker-compose.production.yml  # Оркестрация
  ├── .env.docker # Переменные окружения
  └── ... исходники
```

## Производительность

| Сценарий                     | Время                   |
| ---------------------------- | ----------------------- |
| Первый деплой 1 приложения   | ~5 мин                  |
| Повторный деплой (с кешем)   | ~15-30 сек              |
| Деплой 3 affected приложений | ~8-10 мин (параллельно) |
| Без изменений (Nx cache)     | ~15 сек                 |

## Мониторинг деплоя

### Просмотр логов

После деплоя одного приложения автоматически показываются логи. Для нескольких приложений:

```bash
# Логи конкретного приложения
cd apps/premium-rosstil
docker compose -f docker-compose.production.yml logs -f app

# Статус всех контейнеров
docker ps

# Использование ресурсов
docker stats
```

### Проверка здоровья

```bash
cd apps/premium-rosstil

# Проверка статуса
docker compose -f docker-compose.production.yml ps

# Проверка БД
docker compose -f docker-compose.production.yml exec db pg_isready
```

## Добавление нового приложения

1. Создайте приложение в `apps/your-new-app/`

2. Добавьте Docker файлы:

   ```bash
   # Скопируйте из существующего приложения
   cp apps/premium-rosstil/Dockerfile.production apps/your-new-app/
   cp apps/premium-rosstil/docker-compose.production.yml apps/your-new-app/
   cp apps/premium-rosstil/.env.docker.example apps/your-new-app/
   ```

3. Отредактируйте `docker-compose.production.yml`:
   - Измените порты (например, 3001:3000)
   - Измените имена контейнеров
   - Измените имена volumes

4. Создайте `.env.docker`

5. Деплой:
   ```bash
   ./deploy-affected.sh --app your-new-app
   ```

Готово! Теперь приложение будет автоматически деплоиться при изменениях.

## Устранение неполадок

### Приложение не определяется как affected

```bash
# Проверьте вручную
nx show projects --affected --base=origin/main

# Принудительно задеплойте конкретное приложение
./deploy-affected.sh --app your-app
```

### Сборка падает с ошибкой

```bash
# Проверьте логи сборки
nx build your-app --verbose

# Очистите кеш Nx
nx reset

# Попробуйте снова
./deploy-affected.sh --app your-app
```

### Docker образ не создается

```bash
cd apps/your-app

# Проверьте что билд есть
ls -la .next/standalone

# Пересоберите вручную
nx build your-app
docker build -f Dockerfile.production -t your-app:latest .
```

### Контейнер не запускается

```bash
cd apps/your-app

# Проверьте логи
docker compose -f docker-compose.production.yml logs app

# Проверьте переменные окружения
docker compose -f docker-compose.production.yml config
```

## Архитектура

```
┌─────────────────────────────────────────────────┐
│  deploy-affected.sh (корень монорепозитория)   │
│  Универсальный скрипт для всех приложений      │
└────────────────┬────────────────────────────────┘
                 │
                 ├─► 1. Git pull
                 ├─► 2. Bun install
                 ├─► 3. Nx affected detection
                 │
                 ├─► For each affected app:
                 │   ├─► Prisma/ZenStack generate
                 │   ├─► Nx build (with cache)
                 │   ├─► Docker build (from standalone)
                 │   └─► Docker Compose deploy
                 │
                 └─► 4. Summary & logs
```

## Конфигурация приложений

| Приложение      | Порт App | Порт DB | Название БД  | Network         |
| --------------- | -------- | ------- | ------------ | --------------- |
| premium-rosstil | 3000     | 5432    | lena_premium | kami-network |
| imot            | 3001     | 5433    | lena_imot    | imot-network    |

### Создание Docker Networks

Перед первым деплоем создайте network для каждого приложения:

```bash
docker network create kami-network
```

## См. также

- [apps/premium-rosstil/DEPLOYMENT.md](apps/premium-rosstil/DEPLOYMENT.md) - Детальная документация по деплою premium-rosstil
- [apps/imot/DEPLOYMENT.md](apps/imot/DEPLOYMENT.md) - Детальная документация по деплою imot
- [Nx Affected Documentation](https://nx.dev/concepts/affected)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Версия:** 1.1
**Обновлено:** 2025-11-24
