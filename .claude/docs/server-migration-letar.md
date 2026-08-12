# Миграция server-папок: /home/deploy/lena → /home/deploy/letar

После ренейма репозитория `lena` → `letar` нужно физически переименовать рабочие папки на серверах.

## Серверы и пути

| Сервер                | Текущий путь        | Новый путь           |
| --------------------- | ------------------- | -------------------- |
| s1 (`194.164.245.97`) | `/home/deploy/lena` | `/home/deploy/letar` |
| s2 (`s2.letar.best`)  | `/home/deploy/lena` | `/home/deploy/letar` |
| mail (`193.37.68.73`) | `/home/deploy/lena` | `/home/deploy/letar` |

## Подход 1 (рекомендуемый): rename + symlink на grace period

```bash
# На каждом сервере (s1, s2, mail) — выполнять последовательно
ssh root@<server>

# 0. Остановить активные деплои
pgrep -f deploy-affected.sh && echo "ABORT: deploy running" && exit 1

# 1. Переименовать
cd /home/deploy
mv lena letar

# 2. Создать симлинк lena → letar на grace период
ln -s letar lena

# 3. Обновить remote URL в репо
cd /home/deploy/letar
git remote set-url origin git@github.com:kamiletar/letar.git
git fetch origin
# В летаре main теперь = новый репо. Сбрось локальную ветку:
git checkout main
git reset --hard origin/main

# 4. Подтянуть submodules (нужен SSH-ключ с доступом к приватным)
git submodule update --init --recursive

# 5. Установить зависимости заново (новая структура)
bun install
```

После grace периода (1-2 недели) убрать симлинк:

```bash
rm /home/deploy/lena
```

## Подход 2: чистое переименование без симлинка

Если уверен что нигде не осталось ссылок на старый путь:

```bash
ssh root@<server>
cd /home/deploy
pkill -f deploy-affected.sh
mv lena letar
cd letar
git remote set-url origin git@github.com:kamiletar/letar.git
git fetch && git reset --hard origin/main
git submodule update --init --recursive
bun install
```

## Dashboard Agent

Контейнер `dashboard-agent` (на s2) использует bind mount: `${WORKSPACE_PATH:-/home/deploy/lena}:/workspace:ro`. После переименования папки:

```bash
# На s2
cd /home/deploy/letar
# WORKSPACE_PATH в .env.docker уже обновлён через коммит — просто пересобрать контейнер
docker compose -f apps/dashboard-agent/docker-compose.production.yml up -d --build
```

## Что коммит-сообщения уже починили

Замены `/home/deploy/lena` → `/home/deploy/letar` в коммите `2717fe4` покрыли:

- `deploy-wrapper.sh`, `scripts/sync-env-docker.sh`, `scripts/pull-env-docker.sh`
- Dashboard Agent (`apps/dashboard-agent/**` — bind mounts, cron, git utils, env routes)
- Dashboard (`apps/dashboard/src/app/api/**` — analytics, git pull)
- Dockerfiles (`aboi`, `aira-web`)
- `.env.docker` (dashboard)
- Все docs в `.claude/docs/`, `.claude/rules/`, `.claude/skills/`

## Что НЕ меняется на серверах

- **PostgreSQL DB/user `lena_*`** (`lena_user`, `lena_premium`, `lena_auth`, `lena_password`) — production identity, оставлены как исторические имена. Видны только в `docker-compose.production.yml` и `.env.docker`, никаких операционных проблем не вызывают.
- **Resilio Sync** (`/etc/systemd/system/resilio-sync.service.d/deploy-user.conf`) — переопределяет user на `deploy`, путь к workspace не указан, миграции не требует.
- **Container names** в docker-compose — оставлены как есть (`driving-school-postgres`, `auth-hub-postgres` и т.д., без `lena` префикса).

## Crontab на серверах

Если на сервере есть cron-задачи, ссылающиеся на `/home/deploy/lena`, обнови их:

```bash
# Посмотреть текущий crontab
crontab -l

# Если есть строки с /home/deploy/lena — отредактировать
crontab -e
# Заменить /home/deploy/lena → /home/deploy/letar

# Или массово:
crontab -l > /tmp/crontab.old
sed 's|/home/deploy/lena|/home/deploy/letar|g' /tmp/crontab.old > /tmp/crontab.new
crontab /tmp/crontab.new
crontab -l   # проверить
```

Аналогично проверить `/etc/cron.d/`, `/etc/cron.daily/`, `/etc/cron.hourly/` если deploy-юзер настраивал системный cron.

## Откат (если что-то сломается)

```bash
# На сервере
cd /home/deploy
mv letar lena            # переименовать обратно
cd lena
git remote set-url origin git@github.com:kamiletar/lena.git
git fetch && git reset --hard origin/main
```

Старый репо `kamiletar/lena` остаётся целым как бэкап.

## Проверочный чеклист

После миграции на каждом сервере:

- [ ] `ls /home/deploy/letar` — папка существует
- [ ] `cd /home/deploy/letar && git remote -v` — указывает на `kamiletar/letar.git`
- [ ] `git submodule status` — все submodules инициализированы
- [ ] `docker ps` — все контейнеры запущены и healthy
- [ ] `curl https://<app>.letar.best/api/health` — приложения отвечают
- [ ] Dashboard-agent: `docker logs dashboard-agent` — нет ошибок про `/home/deploy/lena`
