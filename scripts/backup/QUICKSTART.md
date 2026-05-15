# Быстрый старт - Database Backup

Краткая инструкция для развертывания бэкапов на продакшен сервере.

## Предварительные требования

- Ubuntu сервер с Docker
- PostgreSQL работает в Docker контейнере
- SSH доступ к серверу

## Установка за 5 минут

### 1. На сервере: Создать директории

```bash
sudo mkdir -p /backups/premium-rosstil/db
sudo mkdir -p /opt/premium-rosstil/backup
sudo chown -R $USER:$USER /backups/premium-rosstil
sudo chown -R $USER:$USER /opt/premium-rosstil
```

### 2. На вашем компьютере: Скопировать скрипты

```bash
# Из директории репозитория
scp scripts/backup/*.sh user@your-server:/opt/premium-rosstil/backup/
scp scripts/backup/.env.example user@your-server:/opt/premium-rosstil/backup/
```

### 3. На сервере: Настроить скрипты

```bash
cd /opt/premium-rosstil/backup

# Сделать скрипты исполняемыми
chmod +x *.sh

# Создать конфигурацию
cp .env.example .env
nano .env
```

### 4. Проверить файл `.env`

Файл уже настроен с правильными значениями из docker-compose:

```bash
DB_NAME=lena_premium
DB_USER=lena_user
DOCKER_CONTAINER=premium-rosstil-postgres
BACKUP_DIR=/backups/premium-rosstil/db
RETENTION_DAYS=30
```

**Примечание:** DB_PASSWORD не нужен - скрипты используют `docker exec` для доступа к БД.

Сохранить и защитить файл:

```bash
chmod 600 .env
```

### 5. Проверить работу

```bash
cd /opt/premium-rosstil/backup
source .env

# Создать первый бэкап
./db-backup.sh

# Посмотреть список бэкапов
./list-backups.sh
```

### 6. Настроить автоматические бэкапы (cron)

```bash
crontab -e
```

Добавить строку (бэкап каждый день в 2:00 ночи):

```
0 2 * * * cd /opt/premium-rosstil/backup && source .env && ./db-backup.sh >> /backups/premium-rosstil/db/backup.log 2>&1
```

Сохранить и выйти.

## Проверка cron

```bash
# Посмотреть текущие задачи cron
crontab -l

# Проверить логи cron (через несколько минут после добавления)
tail -f /backups/premium-rosstil/db/backup.log
```

## Использование

### Список бэкапов

```bash
cd /opt/premium-rosstil/backup
./list-backups.sh
```

### Восстановление из последнего бэкапа

```bash
source .env
./db-restore.sh
```

### Восстановление из конкретного файла

```bash
source .env
./db-restore.sh /backups/premium-rosstil/db/premium_rosstil_2025-11-21_02-00-00.sql.gz
```

## Мониторинг

```bash
# Логи бэкапов
tail -f /backups/premium-rosstil/db/backup.log

# Размер всех бэкапов
du -sh /backups/premium-rosstil/db/

# Количество файлов
ls -1 /backups/premium-rosstil/db/*.sql.gz | wc -l
```

## Важные команды

### Узнать имя Docker контейнера

```bash
docker ps --format "{{.Names}}" | grep postgres
```

### Проверить доступ к базе данных

```bash
docker exec premium-rosstil-postgres psql -U postgres -c '\l'
```

### Ручной бэкап прямо сейчас

```bash
cd /opt/premium-rosstil/backup
source .env
./db-backup.sh
```

## Troubleshooting

### Ошибка: "Docker container is not running"

```bash
docker ps | grep postgres
docker start premium-rosstil-postgres
```

### Ошибка: "Permission denied"

```bash
sudo chown -R $USER:$USER /backups/premium-rosstil
sudo chown -R $USER:$USER /opt/premium-rosstil
chmod 600 /opt/premium-rosstil/backup/.env
```

### Проверить, что cron работает

```bash
# Посмотреть логи cron
sudo grep CRON /var/log/syslog | tail -20

# Или напрямую логи нашего скрипта
tail -20 /backups/premium-rosstil/db/backup.log
```

## Полная документация

Подробная документация: [README.md](./README.md)

---

**Время установки:** ~5 минут
**Сложность:** Легко
