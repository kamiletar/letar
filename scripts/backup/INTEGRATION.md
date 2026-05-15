# Интеграция системы бэкапов с premium-rosstil

Объяснение, как система бэкапов интегрируется с основным приложением.

## Архитектура

```
/opt/premium-rosstil/
├── app/                          # Next.js приложение
│   └── .env.docker              # Конфигурация приложения (содержит DB_PASSWORD)
│
└── backup/                       # Система бэкапов
    ├── .env                     # Конфигурация бэкапов (НЕ содержит DB_PASSWORD)
    ├── db-backup.sh
    ├── db-restore.sh
    └── list-backups.sh

/backups/premium-rosstil/
└── db/                          # Хранилище бэкапов
    ├── premium_rosstil_*.sql.gz
    ├── latest.sql.gz → (symlink)
    └── backup.log
```

## Почему два .env файла?

### `.env.docker` (в приложении)

**Расположение:** `apps/premium-rosstil/.env.docker`

**Содержит:**

- `DB_PASSWORD` - нужен приложению для подключения к PostgreSQL
- `AUTH_SECRET`, OAuth ключи - для аутентификации
- API ключи (DaData, Yandex Metrika)
- Email настройки

**Используется:**

- Docker Compose для настройки контейнеров
- Next.js приложением для подключения к БД

### `.env` (для бэкапов)

**Расположение:** `scripts/backup/.env`

**Содержит:**

- `DB_NAME` - имя базы данных
- `DB_USER` - пользователь PostgreSQL
- `DOCKER_CONTAINER` - имя Docker контейнера
- `BACKUP_DIR` - путь для хранения бэкапов
- `RETENTION_DAYS` - срок хранения

**НЕ содержит:**

- `DB_PASSWORD` - не нужен, т.к. используется `docker exec`

**Используется:**

- Скриптами бэкапов (`db-backup.sh`, `db-restore.sh`)
- Cron задачами

## Как работают бэкапы без пароля?

### Обычное подключение (требует пароль):

```bash
pg_dump -h localhost -U premium_rosstil -d premium_rosstil
# Требует DB_PASSWORD
```

### С Docker exec (без пароля):

```bash
docker exec premium-rosstil-postgres pg_dump -U premium_rosstil -d premium_rosstil
# Docker контейнер уже аутентифицирован, пароль не нужен
```

**Преимущества:**

- ✅ Безопаснее - не нужно хранить пароль в скриптах
- ✅ Проще - один файл меньше с секретами
- ✅ Надежнее - нет проблем с сетевым подключением

## Workflow на продакшене

### 1. Запуск приложения

```bash
cd /opt/premium-rosstil/app
docker compose up -d
```

Docker Compose загружает переменные из `.env.docker`:

- Создает PostgreSQL контейнер с `POSTGRES_PASSWORD=$DB_PASSWORD`
- Next.js подключается к БД используя `DATABASE_URL`

### 2. Автоматические бэкапы (cron)

```bash
# Каждый день в 2:00
0 2 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh
```

Скрипт:

1. Загружает конфигурацию из `scripts/backup/.env`
2. Выполняет `docker exec premium-rosstil-postgres pg_dump`
3. Сохраняет бэкап в `/backups/premium-rosstil/db/`

### 3. Восстановление (вручную)

```bash
cd /opt/premium-rosstil/backup
source .env
./db-restore.sh
```

Скрипт:

1. Загружает конфигурацию из `.env`
2. Выполняет `gunzip -c backup.sql.gz | docker exec -i ... psql`
3. Восстанавливает данные в контейнер

## Проверка настройки

### Убедиться, что Docker контейнер запущен:

```bash
docker ps | grep postgres
```

Должен показать что-то вроде:

```
a1b2c3d4  postgres:16-alpine  ...  premium-rosstil-postgres
```

### Проверить имя контейнера в .env:

```bash
cd /opt/premium-rosstil/backup
grep DOCKER_CONTAINER .env
```

Должно быть: `DOCKER_CONTAINER=premium-rosstil-postgres`

### Проверить доступ к БД через Docker:

```bash
docker exec premium-rosstil-postgres psql -U lena_user -d lena_premium -c '\l'
```

Должен показать список баз данных, включая `lena_premium`.

## FAQ

### Нужно ли синхронизировать .env и .env.docker?

**Нет.** Они независимы:

- `.env.docker` управляется приложением
- `.env` управляется системой бэкапов

Только `DOCKER_CONTAINER` должен соответствовать реальному имени контейнера.

### Что если изменится пароль БД?

**Ничего делать не нужно** для скриптов бэкапов:

1. Обновите `DB_PASSWORD` в `.env.docker`
2. Перезапустите приложение: `docker compose restart`
3. Скрипты бэкапов продолжат работать (они не используют пароль)

### Можно ли использовать скрипты на другом проекте?

**Да!** Просто измените в `.env`:

- `DB_NAME` - имя вашей базы
- `DOCKER_CONTAINER` - имя вашего PostgreSQL контейнера
- `BACKUP_DIR` - путь для бэкапов

### Как добавить удаленное копирование бэкапов?

Добавьте в конец `db-backup.sh`:

```bash
# Копирование на удаленный сервер
if [ -n "${REMOTE_BACKUP_HOST:-}" ]; then
    rsync -avz --delete \
        "$BACKUP_DIR/" \
        "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/"
fi
```

И в `.env`:

```bash
REMOTE_BACKUP_HOST=backup.example.com
REMOTE_BACKUP_USER=backup
REMOTE_BACKUP_PATH=/backups/premium-rosstil
```

## Безопасность

### Файлы с секретами:

1. **`.env.docker`** (приложение)

   ```bash
   chmod 600 /opt/premium-rosstil/app/.env.docker
   ```

2. **`.env`** (бэкапы)

   ```bash
   chmod 600 /opt/premium-rosstil/backup/.env
   ```

3. **Бэкапы**
   ```bash
   chmod 700 /backups/premium-rosstil
   ```

### Доступ к Docker:

Убедитесь, что пользователь, от которого запускаются скрипты, имеет доступ к Docker:

```bash
sudo usermod -aG docker $USER
```

## Мониторинг

### Проверить последний бэкап:

```bash
cd /opt/premium-rosstil/backup
./list-backups.sh | head -5
```

### Логи бэкапов:

```bash
tail -f /backups/premium-rosstil/db/backup.log
```

### Уведомления по email:

Добавьте в crontab:

```bash
MAILTO=admin@example.com
0 2 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh
```

Cron отправит email при ошибках.

---

**Последнее обновление:** 2025-11-21
