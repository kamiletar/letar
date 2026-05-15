# Database Backup System for premium-rosstil

Автоматическая система резервного копирования базы данных PostgreSQL (Docker).

## 📚 Документация

- **[QUICKSTART.md](./QUICKSTART.md)** - Установка за 5 минут ⚡
- **[INTEGRATION.md](./INTEGRATION.md)** - Интеграция с .env.docker и архитектура 🔧
- **[README.md](./README.md)** - Полная документация (этот файл) 📖

## Возможности

- ✅ Автоматическое создание бэкапов с сжатием (gzip)
- ✅ Ротация старых бэкапов (по умолчанию 30 дней)
- ✅ Логирование всех операций
- ✅ Простое восстановление из бэкапа
- ✅ Работа с PostgreSQL в Docker контейнерах
- ✅ Безопасность - не требует паролей в скриптах

## Структура файлов

```
scripts/backup/
├── db-backup.sh         # Скрипт создания бэкапа
├── db-restore.sh        # Скрипт восстановления
├── list-backups.sh      # Список бэкапов
├── .env.example         # Пример конфигурации
├── QUICKSTART.md        # Быстрый старт
├── INTEGRATION.md       # Интеграция с приложением
└── README.md            # Эта документация
```

## Установка на продакшен сервере Ubuntu

### 1. Проверка наличия Docker

```bash
docker --version
docker ps  # Должен показать запущенные контейнеры
```

**Важно:** Убедитесь, что PostgreSQL запущен в Docker контейнере с именем `premium-rosstil-postgres` (или измените имя в `.env`).

Проверить имя контейнера:

```bash
docker ps --filter "ancestor=postgres" --format "{{.Names}}"
```

### 2. Создание директорий

```bash
# Создать директорию для бэкапов
sudo mkdir -p /backups/premium-rosstil/db

# Создать директорию для скриптов
sudo mkdir -p /opt/premium-rosstil/backup

# Установить права
sudo chown -R $USER:$USER /backups/premium-rosstil
sudo chown -R $USER:$USER /opt/premium-rosstil
```

### 3. Копирование скриптов на сервер

С вашего Windows компьютера (через PowerShell или Git Bash):

```bash
# Через SCP
scp scripts/backup/*.sh user@your-server:/opt/premium-rosstil/backup/

# Или через rsync
rsync -av scripts/backup/ user@your-server:/opt/premium-rosstil/backup/
```

На сервере:

```bash
cd /opt/premium-rosstil/backup
chmod +x *.sh
```

### 4. Настройка конфигурации

```bash
cd /opt/premium-rosstil/backup
cp .env.example .env
nano .env
```

Проверьте данные для подключения к БД (уже настроены из docker-compose):

```bash
DB_NAME=lena_premium                    # Из POSTGRES_DB в docker-compose
DB_USER=lena_user                       # Из POSTGRES_USER в docker-compose
DOCKER_CONTAINER=premium-rosstil-postgres  # Из container_name в docker-compose
BACKUP_DIR=/backups/premium-rosstil/db
RETENTION_DAYS=30
```

**Важно:**

- Значения уже соответствуют `docker-compose.production.yml`
- Имя контейнера: `premium-rosstil-postgres` (проверить: `docker ps`)
- **DB_PASSWORD не требуется** - бэкапы создаются через `docker exec`, что не требует пароля от хост-системы
- Защитите файл конфигурации:

```bash
chmod 600 .env
```

**Связь с .env.docker:**

- Файл `.env.docker` содержит `DB_PASSWORD` для приложения
- Скрипты бэкапов используют Docker exec, поэтому пароль не нужен
- Оба файла независимы друг от друга

### 5. Настройка автоматических бэкапов (cron)

Создайте cron job для автоматических бэкапов:

```bash
crontab -e
```

Добавьте одну из следующих строк:

```bash
# Ежедневный бэкап в 2:00 ночи
0 2 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh >> /backups/premium-rosstil/db/backup.log 2>&1

# Бэкап каждые 6 часов
0 */6 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh >> /backups/premium-rosstil/db/backup.log 2>&1

# Бэкап каждый час
0 * * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh >> /backups/premium-rosstil/db/backup.log 2>&1
```

**Примечание:** Скрипт автоматически использует `docker exec` для доступа к PostgreSQL внутри контейнера, поэтому не требуется установка `postgresql-client` на хост-систему.

### 6. Проверка работы

Запустите первый бэкап вручную:

```bash
cd /opt/premium-rosstil/backup
source .env
./db-backup.sh
```

Проверьте созданные файлы:

```bash
./list-backups.sh
```

## Использование

### Создание бэкапа вручную

```bash
cd /opt/premium-rosstil/backup
source .env
./db-backup.sh
```

### Просмотр доступных бэкапов

```bash
./list-backups.sh
```

### Восстановление из последнего бэкапа

```bash
source .env
./db-restore.sh
```

### Восстановление из конкретного бэкапа

```bash
source .env
./db-restore.sh /backups/premium-rosstil/db/premium_rosstil_2025-11-21_02-00-00.sql.gz
```

### Проверка имени Docker контейнера

Если не уверены в имени контейнера:

```bash
docker ps --filter "ancestor=postgres"
```

Или посмотрите все запущенные контейнеры:

```bash
docker ps
```

## Формат бэкапов

- **Имя файла:** `premium_rosstil_YYYY-MM-DD_HH-MM-SS.sql.gz`
- **Формат:** SQL дамп, сжатый gzip
- **Содержимое:** Полная база данных с `--clean --if-exists` (безопасное восстановление)
- **Симлинк `latest.sql.gz`:** Всегда указывает на последний бэкап

## Ротация бэкапов

По умолчанию хранятся бэкапы за последние 30 дней. Изменить можно через переменную `RETENTION_DAYS` в `.env`.

## Мониторинг

Проверить логи бэкапов:

```bash
tail -f /backups/premium-rosstil/db/backup.log
```

Проверить размер всех бэкапов:

```bash
du -sh /backups/premium-rosstil/db/
```

Посмотреть логи Docker контейнера (если нужно):

```bash
docker logs premium-rosstil-postgres --tail 50
```

## Безопасность

### Рекомендации:

1. **Защита файлов конфигурации:**

   ```bash
   chmod 600 /opt/premium-rosstil/backup/.env
   ```

2. **Защита директории с бэкапами:**

   ```bash
   chmod 700 /backups/premium-rosstil
   ```

3. **Не коммитьте файл `.env` в Git!** (уже добавлен в `.gitignore`)

4. **Docker контейнер:** Бэкапы создаются через `docker exec`, что безопаснее прямого сетевого подключения

## Расширенные возможности

### Уведомления об ошибках

Добавьте в cron для отправки email при ошибках:

```bash
MAILTO=admin@example.com
0 2 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh
```

### Удаленное копирование бэкапов

Добавьте в конец скрипта `db-backup.sh`:

```bash
# Копирование на удаленный сервер
rsync -avz --delete \
    /backups/premium-rosstil/db/ \
    backup@backup-server:/backups/premium-rosstil/
```

### Загрузка в S3 (AWS/DigitalOcean Spaces)

Установите AWS CLI и добавьте в скрипт:

```bash
aws s3 sync /backups/premium-rosstil/db/ \
    s3://your-bucket/backups/premium-rosstil/ \
    --delete
```

## Восстановление в emergency-ситуации

### Если потеряли доступ к серверу, но есть бэкапы:

1. **Скачайте последний бэкап:**

   ```bash
   scp user@server:/backups/premium-rosstil/db/latest.sql.gz ./
   ```

2. **Восстановите локально:**

   ```bash
   gunzip -c latest.sql.gz | psql -U postgres -d premium_rosstil
   ```

3. **Или восстановите на новом сервере:**
   ```bash
   # На новом сервере
   createdb -U postgres premium_rosstil
   gunzip -c latest.sql.gz | psql -U postgres -d premium_rosstil
   ```

## Проверка целостности бэкапов

Рекомендуется периодически проверять, что бэкапы восстанавливаются:

```bash
# С Docker контейнером
DOCKER_CONTAINER=premium-rosstil-postgres

# Создать тестовую базу
docker exec "$DOCKER_CONTAINER" createdb -U postgres premium_rosstil_test

# Восстановить в тест
gunzip -c /backups/premium-rosstil/db/latest.sql.gz | \
    docker exec -i "$DOCKER_CONTAINER" psql -U postgres -d premium_rosstil_test

# Проверить количество таблиц
docker exec "$DOCKER_CONTAINER" psql -U postgres -d premium_rosstil_test -c "\dt"

# Удалить тестовую базу
docker exec "$DOCKER_CONTAINER" dropdb -U postgres premium_rosstil_test
```

## Troubleshooting

### Ошибка: "Permission denied"

```bash
sudo chown -R $USER:$USER /backups/premium-rosstil
sudo chown -R $USER:$USER /opt/premium-rosstil
```

### Ошибка: "Docker container is not running"

Проверьте, что контейнер запущен:

```bash
docker ps | grep postgres
```

Если не запущен, запустите его:

```bash
docker start premium-rosstil-postgres
```

Проверьте правильность имени контейнера в `.env`.

### Ошибка: "Database does not exist"

Создайте базу данных в Docker контейнере:

```bash
docker exec premium-rosstil-postgres createdb -U postgres premium_rosstil
```

### Бэкапы занимают много места

Проверьте размер и уменьшите `RETENTION_DAYS`:

```bash
du -sh /backups/premium-rosstil/db/
```

### Проверка доступа к Docker

Если получаете ошибки доступа к Docker:

```bash
# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Выйти и войти заново, или:
newgrp docker
```

## Контакты и поддержка

- **Документация Prisma:** https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Документация PostgreSQL:** https://www.postgresql.org/docs/current/backup-dump.html
- **Документация ZenStack:** https://zenstack.dev/docs

---

**Версия:** 1.0.0
**Дата создания:** 2025-11-21
