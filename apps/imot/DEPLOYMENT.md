# Инструкции по деплою IMOT

## Подготовка к первому деплою

### 1. Создание Docker network

Перед первым деплоем необходимо создать Docker network:

```bash
docker network create imot-network
```

### 2. Настройка переменных окружения

Скопируйте файл `.env.docker.example` в `.env.docker`:

```bash
cd apps/imot
cp .env.docker.example .env.docker
```

Заполните все необходимые переменные окружения в созданном файле.

### 3. Применение миграций базы данных

После настройки переменных окружения, перед первым деплоем нужно применить миграции:

```bash
# Из корня monorepo
./deploy-affected.sh --app imot
```

Скрипт автоматически:

- Запустит контейнер БД
- Применит миграции
- Соберёт приложение
- Создаст Docker образ
- Запустит приложение

## Деплой изменений

### Автоматический деплой всех affected приложений

```bash
./deploy-affected.sh
```

Скрипт определит, какие приложения изменились с последнего деплоя и задеплоит только их.

### Деплой конкретного приложения

```bash
./deploy-affected.sh --app imot
```

### Предварительный просмотр (dry-run)

Посмотреть, что будет задеплоено без фактического деплоя:

```bash
./deploy-affected.sh --dry-run
```

## Управление контейнерами

### Просмотр логов

```bash
cd apps/imot
docker compose -f docker-compose.production.yml logs -f app
```

### Остановка контейнеров

```bash
cd apps/imot
docker compose -f docker-compose.production.yml down
```

### Перезапуск контейнеров

```bash
cd apps/imot
docker compose -f docker-compose.production.yml restart app
```

### Проверка состояния

```bash
cd apps/imot
docker compose -f docker-compose.production.yml ps
```

## Порты

- **Приложение**: 3001 (http://localhost:3001)
- **База данных**: 5433 (доступен локально для подключения через Prisma Studio)

## Важные замечания

1. **Порт БД**: База данных imot использует порт **5433** (не 5432), чтобы не конфликтовать с premium-rosstil
2. **Название БД**: lena_imot
3. **Docker network**: imot-network (создаётся один раз перед первым деплоем)
4. **Volumes**: Данные БД хранятся в `imot_postgres_data`, загруженные файлы в `./uploads`

## Troubleshooting

### Ошибка "network imot-network not found"

Создайте network:

```bash
docker network create imot-network
```

### Порт уже занят

Убедитесь, что нет других процессов на портах 3001 и 5433:

```bash
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5433

# Linux/Mac
lsof -i :3001
lsof -i :5433
```

### Проблемы с БД

Проверьте логи контейнера БД:

```bash
cd apps/imot
docker compose -f docker-compose.production.yml logs db
```

### Пересоздание контейнеров с нуля

```bash
cd apps/imot
docker compose -f docker-compose.production.yml down -v
docker network create imot-network  # если была удалена
# Затем запустите деплой снова
```
