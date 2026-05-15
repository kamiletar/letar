# Troubleshooting

## Проблемы с деплоем

### Ошибка: "bun: command not found"

```bash
# На production сервере
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Ошибка: "nx: command not found"

```bash
# Проверь PATH
echo $PATH

# Или запусти через npx
npx nx build <app>
```

### Ошибка при git pull

```bash
# Merge conflicts
git status
git stash  # Спрятать локальные изменения
git pull
git stash pop  # Вернуть изменения

# Uncommitted changes
git commit -am "WIP"
git pull
```

### Ошибка: "Cannot find module"

```bash
# Чистая установка
./deploy-affected.sh --app <app> --clean

# Или вручную
rm -rf node_modules bun.lock
bun install
```

## Проблемы с Docker

### Контейнер не запускается

```bash
# Проверь логи
docker compose -f docker-compose.production.yml logs app

# Проверь статус
docker compose -f docker-compose.production.yml ps

# Пересобрать с нуля
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build --force-recreate
```

### "port is already allocated"

```bash
# Найти процесс
sudo netstat -tlnp | grep 3000

# Или с lsof
sudo lsof -i :3000

# Убить процесс
sudo kill -9 <PID>

# Или остановить старый контейнер
docker stop <container_id>
```

### "network not found"

```bash
# Создать сеть
docker network create premium-network

# Проверить существующие
docker network ls
```

### Образ не собирается

```bash
# Очистить кэш Docker
docker builder prune

# Пересобрать без кэша
docker build --no-cache -f Dockerfile.production -t app:latest .
```

## Проблемы с базой данных

### Не подключается к PostgreSQL

```bash
# Проверь что контейнер БД запущен
docker compose -f docker-compose.production.yml ps db

# Проверь логи БД
docker compose -f docker-compose.production.yml logs db

# Проверь DATABASE_URL
docker compose -f docker-compose.production.yml exec app env | grep DATABASE_URL
```

### Ошибка миграций

```bash
# Статус миграций
docker compose -f docker-compose.production.yml exec app npx prisma migrate status

# Применить миграции вручную
docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy

# Сбросить БД (⚠️ ПОТЕРЯ ДАННЫХ!)
docker compose -f docker-compose.production.yml exec app npx prisma migrate reset --force
```

### Подключиться к БД напрямую

```bash
# Через docker compose
docker compose -f docker-compose.production.yml exec db psql -U lena_user -d <db_name>

# Через docker
docker exec -it <container_id> psql -U lena_user -d <db_name>
```

### Бэкап и восстановление

```bash
# Бэкап
docker compose -f docker-compose.production.yml exec db \
  pg_dump -U lena_user <db_name> > backup.sql

# Восстановление
docker compose -f docker-compose.production.yml exec -T db \
  psql -U lena_user -d <db_name> < backup.sql
```

## Проблемы с Nginx Proxy Manager

### 502 Bad Gateway

1. **Контейнер не запущен**

   ```bash
   docker ps | grep <app-name>
   ```

2. **NPM не в сети приложения**

   ```bash
   docker network connect <app>-network nginx-proxy-manager
   ```

3. **Неправильный Forward Hostname**
   - Должен быть имя контейнера: `premium-rosstil-app`
   - НЕ `localhost`, НЕ IP адрес

4. **Приложение ещё запускается**
   ```bash
   docker compose -f docker-compose.production.yml logs -f app
   ```

### SSL сертификат не выдаётся

1. Проверь что порт 80 открыт в firewall
2. Проверь DNS записи (A record → IP сервера)
3. Попробуй Force Renew в NPM

## Проблемы с Dashboard

### Не видит контейнеры

```bash
# Проверь монтирование docker.sock
docker inspect dashboard-app | grep -A 5 Mounts

# Проверь права
ls -la /var/run/docker.sock
```

### Не может деплоить

```bash
# Проверь privileged mode
docker inspect dashboard-app | grep Privileged

# Проверь pid mode
docker inspect dashboard-app | grep PidMode
```

## Общие команды диагностики

```bash
# Все контейнеры
docker ps -a

# Использование ресурсов
docker stats

# Логи systemd (если Docker как сервис)
journalctl -u docker.service -f

# Проверить место на диске
df -h
docker system df

# Очистка неиспользуемого
docker system prune -a --volumes
```

## Чеклист перед деплоем

- [ ] `.env.docker` настроен для приложения
- [ ] `Dockerfile.production` существует
- [ ] `docker-compose.production.yml` корректен
- [ ] Сеть Docker создана
- [ ] NPM подключён к сети приложения
- [ ] DNS настроен на сервер
- [ ] SSL сертификат выдан
