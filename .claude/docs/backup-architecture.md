# Архитектура бэкапов

> Последнее обновление: 2026-03-02

## Обзор

Бэкапы управляются через **dashboard-agent** (Fastify сервер на порту 3100).
Все данные сохраняются в `/home/deploy/letar/backups/` на соответствующем сервере.

Dashboard является чистым UI — прямого доступа к файловой системе, Docker или postgres **не имеет**.

---

## Бэкапы PostgreSQL

### Механизм

```
dashboard UI
  → dashboard (Next.js) /api/database/[db]/backup
  → dashboard-agent POST /api/database/backup
  → docker exec <pg-container> pg_dump -U <user> -d <db> | gzip
  → /home/deploy/letar/backups/<app>_<type>_<timestamp>.sql.gz
```

- Запускается через Docker API (dockerode в agent) — выполняет `pg_dump` внутри PG контейнера
- Сжимается gzip прямо в pipe
- Копируется на хост через `docker cp`

### Формат имени файла

```
<app>_<type>_<YYYY-MM-DDTHH-MM-SS>.sql.gz

driving-school_auto_2026-03-01T03-00-00.sql.gz
studio_manual_2026-03-01T10-45-00.sql.gz
```

### Приложения и серверы

| Приложение         | Сервер | Контейнер БД          | БД                  |
| ------------------ | ------ | --------------------- | ------------------- |
| mandala            | s2     | mandala-db            | mandala             |
| kami               | s2     | kami-db               | lena_kami           |
| umami              | s2     | umami-db              | umami               |
| animatrona-tracker | s2     | animatrona-tracker-db | animatrona_tracker  |
| driving-school     | s2     | driving-school-db     | lena_driving_school |
| dashboard          | s2     | dashboard-db          | dashboard           |
| archetest          | s2     | archetest-db          | archetest           |
| auth-hub           | s2     | auth-hub-db           | lena_auth           |
| time               | s2     | time-db               | time                |
| form-example       | s2     | form-example-db       | forms_example       |
| grandslamcup       | s2     | grandslamcup-db       | grandslamcup        |
| dsperevod          | s2     | dsperevod-db          | dsperevod           |
| studio             | s2     | studio-db             | studio              |
| domwellbes         | s2     | domwellbes-db         | domwellbes          |

### API (в dashboard-agent)

```
POST /api/database/backup?db=driving-school    — бэкап конкретной БД
GET  /api/database/backups                     — список всех бэкапов
GET  /api/database/backups?db=driving-school   — бэкапы конкретной БД
```

### Cron (автоматический)

Конфиг: `/home/deploy/letar/cron-jobs.json`
Расписание: настраивается через Dashboard UI → Cron

---

## Бэкапы Nginx Proxy Manager

### Механизм

```
dashboard-agent
  → tar -czf nginx_<type>_<timestamp>.tar.gz \
      /home/deploy/letar/infra/nginx-proxy-manager/data/ \
      /home/deploy/letar/infra/nginx-proxy-manager/letsencrypt/
  → /home/deploy/letar/backups/nginx_<type>_<timestamp>.tar.gz
```

### Содержимое архива

| Директория     | Содержимое                                          |
| -------------- | --------------------------------------------------- |
| `data/`        | SQLite база NPM (proxy hosts, users, SSL настройки) |
| `data/nginx/`  | Сгенерированные nginx конфиги                       |
| `letsencrypt/` | SSL сертификаты Let's Encrypt                       |

### Формат имени файла

```
nginx_<type>_<YYYY-MM-DDTHH-MM-SS>.tar.gz

nginx_auto_2026-03-01T03-00-00.tar.gz
nginx_manual_2026-03-01T10-45-00.tar.gz
```

### API (в dashboard-agent)

```
POST /api/nginx/backup    — создать бэкап NPM
GET  /api/nginx/backups   — список бэкапов NPM
```

### Cron (автоматический)

- **S1**: задача `nginx-backup` — 3:00 ежедневно
- **S2**: задача `nginx-backup-s2` — 3:00 ежедневно

Задача `nginx-backup-s2` имеет поле `server: 's2'` — запускается только на dashboard-agent с `SERVER_NAME=s2.letar.best`.

---

## Восстановление

### PostgreSQL

```bash
# Через Dashboard UI: Databases → выбрать бэкап → Restore (не реализовано пока)
# Вручную:
gunzip -c backup.sql.gz | docker exec -i <pg-container> psql -U <user> -d <db>
```

### Nginx Proxy Manager

```bash
# 1. Остановить NPM
cd /home/deploy/letar/infra/nginx-proxy-manager
docker compose down

# 2. Распаковать бэкап (перезапишет data/ и letsencrypt/)
tar -xzf /home/deploy/letar/backups/nginx_auto_TIMESTAMP.tar.gz -C /

# 3. Запустить NPM
docker compose up -d
```

---

## Хранение и ротация

- Все бэкапы: `/home/deploy/letar/backups/`
- Ротация nginx бэкапов: оставляются последние 7 (`nginx-backup.ts` в агенте)
- Ротация DB бэкапов: ручная (через Dashboard UI или скрипт)
- Смонтировано в docker-compose агента через `WORKSPACE_PATH`

---

## Pre-migrate дампы (deploy-affected.sh)

Отдельный слой защиты данных при деплое (добавлен 2026-07-09, PLAN.md §18 Сессия A):

- **Когда:** автоматически перед `prisma migrate deploy`, только если `prisma migrate status` показывает неприменённые миграции
- **Как:** `docker exec <db-container> pg_dump | gzip` (имя контейнера — из `container_name` compose-файла, fallback `<app>-db`)
- **Где:** `/home/deploy/pre-migrate-dumps/<app>-<short-sha>-<YYYYmmdd-HHMMSS>.sql.gz`
- **Ротация:** последние 3 дампа на приложение (автоматически)
- **Fail-closed:** дамп не удался → деплой приложения прерывается, миграция не применяется. Явный обход: `SKIP_PREMIGRATE_DUMP=1 ./deploy-affected.sh ...`
- **Назначение:** восстановление БД при неудачной миграции без отката к ночному бэкапу (окно потери сжимается с «до 24ч» до нуля на момент миграции). Ошибка самой миграции также прерывает деплой (старый контейнер не трогается) — см. [deployment.md](/.claude/docs/deployment.md#процесс-деплоя)

---

## Конфигурация dashboard-agent (secrets)

Credentials БД берутся из файлов секретов (read-only mount). Все прод-приложения на
**s2**, поднимаются из единственного `docker-compose.production.yml`; он монтирует
`.env.docker` каждого приложения в `/secrets/<app>.env:ro`:

```yaml
# apps/dashboard-agent/docker-compose.production.yml (s2 — прод)
volumes:
  - ${WORKSPACE_PATH}/apps/driving-school/.env.docker:/secrets/driving-school.env:ro
  - ${WORKSPACE_PATH}/apps/svoichuzhie/.env.docker:/secrets/svoichuzhie.env:ro
  # ... по одному на каждое прод-приложение
```

> **s1 выведен из эксплуатации (2026-06-20).** Прежний `docker-compose.s2.yml` удалён как
> устаревший дубль (сессия B deploy-mcp, 2026-07-10) — живым всегда был `production.yml`.
>
> **s3 (staging/e2e)** использует `docker-compose.s3.yml` — он **не монтирует** `/secrets/*.env`,
> потому что прод-БД на s3 нет.
>
> ⚠️ **Но «на s3 бэкапить нечего» — устарело с 2026-08-08.** Здесь раньше стояла именно такая
> формулировка, и она была верной ровно до переезда s3 с NPM на Traefik ([PLAN-INFRA-2.md §48 M2](/PLAN-INFRA-2.md)). Теперь на s3 лежит **невосстановимое**: три per-name аккаунта acme-dns
> (`media`/`ipfs`/`gateway`) в `/home/deploy/lego/acme-dns-accounts.json`. Регистрация в acme-dns
> закрыта, поэтому новый аккаунт выдал бы новые `fulldomain` — то есть потребовал бы **вручную
> переделать три `CNAME` у регистратора**. Восстановление упирается и в человека, и во внешний
> сервис одновременно.
>
> Отсюда `traefik-backup-s3` (03:45) + проверка свежести (`traefik-backup-freshness-check`) —
> см. «Бэкап секретов Traefik (s3)» ниже.
>
> **Урок шире одного сервера:** утверждение «здесь бэкапить нечего» верно не навсегда, а до
> ближайшего изменения состава системы. Пробел создался не забывчивостью — секунду назад его
> действительно не было. Такие фразы в доках стоит перечитывать при каждом переезде сервиса, а не
> считать однажды установленным фактом.

Переменные в `.env.docker` приложения:

- `DB_PASSWORD` — пароль PostgreSQL
- `POSTGRES_USER` — пользователь (опционально, есть дефолты)
- `POSTGRES_DB` — имя БД (опционально, есть дефолты)

---

## Resilio Sync — репозиторий на Windows

Resilio Sync синхронизирует uploads и бэкапы на локальный Windows-компьютер.

⚠️ **Раздел писался под s1, который выведен из эксплуатации 2026-06-20.** Живой процесс `rslsync`
сейчас на **s2** — подтверждено переписью хостовых слушателей 2026-08-07 (PLAN-INFRA §49).
Всё описанное ниже относится к s2; упоминания s1 в таблице оставлены как история, актуальными
их не считать.

⚠️ **`pinner2` (третий пир, отдельная машина) удалён.** Раздел раньше описывал репликацию в три
точки — сервер, Windows, `pinner2`. Сейчас offsite-копия ровно одна: `C:\BackupSync\letar\s2` на
Windows владельца (папка переименована из `lena` в `letar` — таблица ниже это отражает). Второй
offsite-получатель не заведён — трек на восстановление см.
[PLAN-INFRA-4.md §90](/PLAN-INFRA-4.md).
`s3` не подходит на замену «как есть»: там `resilio-sync` не установлен вовсе, а «пиннер», который
там есть, — это `infra/animatrona-pinner3` (IPFS/Kubo для контента Animatrona), не Resilio и не
имеет отношения к бэкапам этого раздела. Спутать легко из-за совпадения слова «пиннер» в двух
разных системах.

⚠️ **Известный баг, найденный и починенный 2026-08-19:** изменение `.sync/IgnoreList` на
уже проиндексированной шаре **не** ретроактивно применяется — Resilio раздаёт пирам файлы,
попавшие в индекс до правки списка, независимо от того, что там написано сейчас. `.git` (836 МБ)
и `.nx` годами утекали в оффсайт-копию, несмотря на то что оба давно значились в `IgnoreList`.
Починка — не редактирование конфига, а сброс локального состояния шары на сервере: остановить
`resilio-sync`, удалить `/var/lib/resilio-sync/<hash>.*` (hash = папка в логе вида `FC[XXXX:...]`,
сопоставляется с полным hash через `systemctl stop` → `shared_folders: []` → рестарт → смотреть,
какой `FC[...]` продолжает получать fs-события) и перезапустить с тем же секретом в конфиге —
это форсирует полный re-index против актуального `IgnoreList`. Секрет менять не нужно, пиры
переподключаются сами.

**Порты, которые он занимает на хосте** (важно для firewall — это не Docker, `DOCKER-USER` его
не касается):

| Порт            | Назначение                         | Нужен ли снаружи                                          |
| --------------- | ---------------------------------- | --------------------------------------------------------- |
| `55555` tcp+udp | соединения с пирами                | да — иначе клиенты не подключатся напрямую                |
| `3838` udp      | обнаружение пиров в локальной сети | **нет** — широковещательный поиск, в интернете бесполезен |

### Установка и конфигурация

```
Пакет: resilio-sync (apt-репозиторий linux-packages.resilio.com)
Версия: 3.1.2
Сервис: systemctl status resilio-sync
Конфиг: /etc/resilio-sync/config.json
Лог:    /var/lib/resilio-sync/sync.log
Пользователь: deploy (override в /etc/systemd/system/resilio-sync.service.d/deploy-user.conf)
```

### Синхронизируемые папки

| Сервер | Папка на сервере     | Папка на Windows         | Ключ (RO)                                |
| ------ | -------------------- | ------------------------ | ---------------------------------------- |
| s1     | `/home/deploy/letar` | `C:\BackupSync\letar\s1` | см. `.claude/OPS_JOURNAL.local.md §14.4` |
| s2     | `/home/deploy/letar` | `C:\BackupSync\letar\s2` | см. `.claude/OPS_JOURNAL.local.md §14.4` |

> R/W ключи хранятся в `/etc/resilio-sync/config.json` на каждом сервере. Столбец «Папка на
> pinner2» убран вместе с самим `pinner2` (см. предупреждение выше) — сейчас у каждой шары ровно
> один RO-получатель, Windows.

### Исключения из синхронизации (`.sync/IgnoreList`)

Стратегия: синхронизируются только **uploads** всех приложений и папка **backups**. Всё остальное восстанавливается из git (`git pull` + `bun install` + генерация). Секреты хранятся отдельно (см. §Локальные credentials ниже).

⚠️ **Список — deny-list, не allow-list.** Bare-имя (без ведущего `/`) матчится на **любой**
глубине каталога — `src` вычёркивает `src` и в корне приложения, и внутри submodule. Список ниже
актуализирован 2026-08-19 (найдена и закрыта утечка git-tracked файлов из корня репо и корней
приложений — `bun.lock`, `nx.json`, `package.json`, `tsconfig*.json`, `docker-compose*.yml` и т.п.
уезжали в оффсайт-копии, хотя полностью восстановимы из git).

```
# Build artifacts
node_modules
.next
dist

# Dev caches
.nx
.cache
.turbo

# Source code (re-pullable from git)
src
prisma
public
libs
scripts
.github
.claude

# Nginx (configs backed up via nginx_auto_*.tar.gz)
infra/nginx-proxy-manager/data
infra/nginx-proxy-manager/letsencrypt

# Git-tracked манифесты и конфиги — восстанавливаются из репо, синхронизировать нечего
package.json
package-lock.json
bun.lock
nx.json
tsconfig.json
tsconfig.base.json
tsconfig.next-app.json
dprint.json
eslint.config.mjs
.editorconfig
.gitignore
.gitmodules
.lsp.json
.mcp.json
.nxignore
.oxlintrc.json
.sops.yaml
.env.docker.enc
.env.docker.example
.env.staging.enc
.env.staging.example
.env.example
.prettierignore
.swcrc
deploy-affected.sh
deploy-wrapper.sh
docker-compose.yml
docker-compose.production.yml
docker-compose.s3.yml
docker-compose.staging.yml
Dockerfile.production
vitest.workspace.ts
*.md
LICENSE
cron-jobs.example.json

# Нестандартные раскладки приложений (Electron main/renderer, generated .d.ts,
# mdx-контент, целиком e2e-тестовые приложения) — найдено и закрыто 2026-08-19
main
shared
renderer
*.d.ts
content
*-e2e

# Вторая волна: Next static export, Nx/конфиг-файлы приложений, документация,
# encrypted-секреты уже в git — 2026-08-19 (2я итерация)
out
build
project.json
next.config.mjs
next.config.ts
docs
data
*.enc

# Secrets — НЕ должны синхронизироваться через Resilio
# Хранить в KeePassXC / OPS_JOURNAL.local.md (см. §Локальные credentials)
.env.docker
.env.local
.env

# Logs
*.log
```

> **Важно:** `*.sql.gz`, `*.tar.gz` и `uploads/` НЕ исключаются — бэкапы БД, NPM, Maddy и загруженные пользователями файлы синхронизируются на все точки хранения.

> ⚠️ **Известные пробелы (2026-08-19, после трёх итераций расширения списка):** переиндексация
> сократила число отслеживаемых записей с ~5292 до ~2815. Остаток — длинный хвост мелких
> git-tracked файлов в приложениях с уникальной структурой, не подпадающих под общие паттерны:
> одноразовые подпроекты (`apps/animatrona/web-player`, `mobile-ui`), инфра-скрипты
> (`infra/animatrona-pin-queue`, `infra/migrations`), Android-раскладка (`android/gradle`,
> `android/app` — мобильные React Native приложения), `messages/*.json` (i18n-переводы),
> `schema.zmodel`, `vitest.setup.tsx`/`vitest.config.ts`, `prisma.config.ts`. Каждый — единицы
> файлов, не гигабайты; дальше гоняться за каждым отдельным именем через deny-list уже
> неэкономично. Точечно расширять при обнаружении нового **объёмного** случая, не пытаться закрыть
> длинный хвост целиком — для полного решения нужен настоящий allow-list (см. предупреждение ниже

### ⚠️ Простого `rm .db файлы + restart` иногда недостаточно (найдено 2026-08-19, 3я итерация)

Третья волна паттернов (`.semgrep`, `.vscode`, `.last-deploy`, `*-state.json`, `*.bak-*`) НЕ
применилась после обычной переиндексации (стоп → удаление `<hash>.<instance>.{db,files.db,sf.db}`
→ старт), даже после честного ожидания полного пересканирования (подтверждено ростом WAL-файла).
Помогло только повторение полной процедуры из самого первого фикса этой сессии: **опустошить
`shared_folders` в `config.json` → перезапустить → удалить index-файлы → перезапустить → вернуть
`shared_folders` с той же папкой → перезапустить**. Почему одна и та же техника сработала для 1-й
и 2-й волны паттернов, но не для 3-й — не выяснено (не похоже на возраст файлов в индексе или тип
паттерна: `.claude`/`.env`/`.git` — тоже dotfiles — исключались первой волной без проблем). Если
новый паттерн в `IgnoreList` не подхватывается после обычной переиндексации — сразу пробовать
полную процедуру с очисткой `shared_folders`, не тратить время на повторные попытки простого
`rm`+`restart`.

> про новый секрет).

### ⛔ Смена `dir` под тем же RW-секретом — НЕБЕЗОПАСНО (найдено 2026-08-19)

При попытке перейти от deny-list к настоящему allow-list (синк только заранее собранной папки с
`uploads/`+`backups/`) естественная идея — переключить `dir` в `config.json` на новый, меньший
каталог, оставив тот же RW-секрет. **Это не сработало и рисковало необратимо**: Resilio считает
identity шары привязанной к секрету, а не к каталогу. Когда локальный каталог оказывается меньше
того, что видят другие пиры под тем же секретом (например, Windows RO-зеркало, где старые файлы
ещё лежат), Resilio трактует уменьшение не как «так и задумано», а как потерю данных — и начинает
**затягивать «пропавшие» файлы обратно с пиров**. На проде это означало риск того, что весь
изгнанный git-мусор (гигабайты `.git`/`node_modules`/старых артефактов) начнёт заново скачиваться
на сервер с Windows-машины.

Поймано и остановлено (`systemctl stop resilio-sync`) до того, как реально что-то докачалось;
конфиг возвращён на исходный `dir`. **Правило на будущее:** менять состав синхронизируемого под
существующим секретом — только через `IgnoreList` (deny-list, применяется через переиндексацию,
см. ниже), никогда через смену `dir`. Настоящий allow-list для этой пары серверов потребовал бы
**нового секрета** (полный ресинк с нуля, RO-ключ на Windows тоже поменяется) — не делать этого
без явного решения владельца, так как это одноразовая необратимая операция ре-провижининга.

### Применение IgnoreList на серверах

```bash
# На s1:
ssh root@s1.letar.best "cat > /home/deploy/letar/.sync/IgnoreList" << 'EOF'
# Build artifacts
node_modules
.next
dist

# Dev caches
.nx
.cache
.turbo

# Source code (re-pullable from git)
src
prisma
public
libs
scripts
.github

# Nginx (configs backed up via nginx_auto_*.tar.gz)
infra/nginx-proxy-manager/data
infra/nginx-proxy-manager/letsencrypt

# Secrets
.env.docker
.env.local
.env

# Logs
*.log
EOF

# Аналогично на s2
```

### Добавление на Windows

1. Установить [Resilio Sync для Windows](https://www.resilio.com/sync/download/)
2. **Add folder** → **Enter a key or link**
3. Ввести Read-only ключ: см. `.claude/OPS_JOURNAL.local.md §14.4`
4. Выбрать папку: `C:\BackupSync\letar\s1` (или `\s2` — под нужный сервер)
5. Тип папки: **Read only** (автоматически — RO-ключ)

### Управление сервисом

```bash
# На s1 или s2 через SSH:
systemctl status resilio-sync     # Статус
systemctl restart resilio-sync    # Перезапуск
journalctl -u resilio-sync -f     # Логи systemd
tail -f /var/lib/resilio-sync/sync.log  # Детальный лог
```

### Troubleshooting: синхронизация не запускается после сброса state

**Симптомы:** В логах только `Stop synchronization` каждую минуту, нет подключений к трекерам. Ошибка `error=105 "Destination folder is not empty"`.

**Причина:** `shared_folders` в config.json не обрабатывает диалог "Destination folder is not empty" в headless режиме.

**Решение:**

1. Включить webui в config.json (убрав `shared_folders`).

   ⛔ **Раньше здесь стояло `"listen": "0.0.0.0:8888"` с паролем `resilio2026` прямо в тексте.**
   Так делать нельзя: это админка синхронизации бэкапов, открытая всему интернету, по plain HTTP,
   с придуманным словарным паролем — то есть логин и пароль ещё и уходят по сети открытым текстом.
   Ровно тот класс, что дал инцидент §37 (`letar-redis` наружу без пароля). Придуманные пароли
   запрещены отдельным правилом — [security.md](/.claude/rules/security.md).

   Слушать **только loopback**, пароль — сгенерировать:

   ```bash
   openssl rand -base64 32     # положить в KeePassXC, в доку не вписывать
   ```

   ```json
   "webui": { "listen": "127.0.0.1:8888", "login": "admin", "password": "<сгенерированный>" }
   ```

2. Перезапустить: `sudo systemctl restart resilio-sync`
3. Пробросить порт к себе SSH-туннелем и открыть `http://localhost:8888` — принять EULA, добавить
   папку через UI:

   ```bash
   ssh -N -L 8888:127.0.0.1:8888 deploy@<сервер>
   ```

   ⚠️ `s2.letar.best` резолвится только в IPv6 (A-записи у зоны нет). Если туннель не поднимается —
   пробуй явный адрес, см. [firewall.md](/.claude/docs/firewall.md).
4. Вернуть config.json с `shared_folders` (без webui), перезапустить
5. На Windows — пересоздать папку (удалить + добавить с RO ключом)

**Важно:** НЕ удалять `.sync/ID`, `settings.dat`, `*.db` без необходимости — это сбрасывает identity папки и вынуждает переподключать всех клиентов.

---

## Бэкап Maddy (mail.letar.best)

> Добавлен 2026-06-04. Maddy живёт на отдельном сервере `mail.letar.best` — dashboard-agent его не видит.

### Критичные файлы

| Файл/папка                       | Описание                               |
| -------------------------------- | -------------------------------------- |
| `/opt/maddy/data/maddy.conf`     | Основной конфиг (реально используемый) |
| `/opt/maddy/docker-compose.yml`  | Docker Compose                         |
| `/opt/maddy/data/credentials.db` | Хэши паролей SMTP-аккаунтов            |
| `/opt/maddy/data/aliases`        | Алиасы и форварды                      |
| `/opt/maddy/data/dkim_keys/`     | **DKIM private keys** ⚠️ критично       |

> ⚠️ Потеря DKIM private keys = нужно регенерировать ключи и менять DNS TXT-записи для всех доменов.

### Механизм

Скрипт `/opt/maddy/backup.sh` — ежедневно в 03:00 (crontab root):

```bash
# Запуск вручную
ssh root@mail.letar.best "bash /opt/maddy/backup.sh"

# Просмотр бэкапов (на s2, уже в Resilio)
ssh root@s2.letar.best "ls -lh /home/deploy/letar/backups/maddy/"

# Лог
ssh root@mail.letar.best "tail -20 /var/log/maddy-backup.log"
```

Результат: `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz` (~16 KB), ротация 14 дней.

### Цепочка хранения

```
mail.letar.best          s2.letar.best                    Windows
/root/backups/maddy/ ──rsync──▶ /home/deploy/letar/backups/maddy/ ──Resilio──▶ C:\BackupSync\letar\s2\backups\maddy\
```

SSH-ключ для rsync: `root@mail` → `deploy@s2` (`/root/.ssh/id_ed25519`, добавлен в `~deploy/.ssh/authorized_keys` на s2).

---

## Бэкап секретов Traefik (s3)

> Добавлен 2026-08-08, сразу после переезда s3 с NPM на Traefik. Трек —
> [PLAN-INFRA-2.md §48 M2](/PLAN-INFRA-2.md).

⚠️ **Отдельный бэкап, а не расширение acme-dns-бэкапа ниже — потому что это другой сервер.** Там
s2 и база выданных поддоменов, здесь s3 и файл аккаунтов с тремя per-name аккаунтами. Одна проверка
свежести на две машины дала бы ложное «свежо»: архив на s2 закрывал бы отсутствие архива на s3.

### Что архивируется

| Путь                                       | Содержимое                                     | Восстановимо?                                                                               |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/home/deploy/lego/acme-dns-accounts.json` | 3 per-name аккаунта (`media`/`ipfs`/`gateway`) | ⛔ **нет, и хуже обычного:** нужен владелец — переделать три `CNAME` у регистратора вручную |
| `infra/traefik/acme/acme.json`             | приватные ключи всех сертификатов s3           | да, перевыпуском — но упирается в лимит LE на дубликаты (5/неделю на набор имён)            |
| `infra/traefik/auth/`                      | `basicAuth` дашборда                           | да, генерацией новой пары                                                                   |

Все три обязательны — тот же инвариант, что у acme-dns: отсутствие любого источника даёт **ошибку**,
а не неполный архив.

### Механизм

```
cron traefik-backup-s3 (03:45)
  → dashboard-agent POST /api/traefik/backup
  → tar -czf /home/deploy/lego/acme-dns-accounts.json + infra/traefik/acme/acme.json + infra/traefik/auth/
  → /home/deploy/letar/backups/traefik/traefik_<type>_<timestamp>.tar.gz  (chmod 600)

cron traefik-backup-freshness-check (30 */6 * * *)
  → алерт BACKUP_FAILED, если самый свежий traefik_*.tar.gz старше 30ч
```

⚠️ Требует монтирования `/home/deploy/lego:/home/deploy/lego:ro` в `docker-compose.s3.yml` —
файл лежит вне workspace. Забыть строку = «нечего бэкапить» на каждом прогоне (проверка свежести
это поймает, но лучше не доводить).

Общая механика упаковки у всех tar-бэкапов агента вынесена в `src/lib/tar-backup.ts` (покрыта
тестами; `acme-dns-backup.ts` и `nginx-backup.ts` пока живут своими копиями — миграция ждёт
тестов на их текущее поведение).

---

## Бэкап acme-dns (s2)

> Добавлен 2026-08-07, dashboard-agent 0.10.0. Трек — [PLAN-INFRA-2.md §48](/PLAN-INFRA-2.md).

От acme-dns зависит продление **всех** сертификатов зоны `letar.best` (wildcard через DNS-01).
Тихая смерть сервиса обнаружилась бы только через 90 дней, в момент неудачного продления.

### Что архивируется

| Путь                                       | Содержимое                        | Восстановимо?                                                                                                               |
| ------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `infra/acme-dns/data/`                     | база выданных поддоменов (SQLite) | частично — поддомен можно завести заново                                                                                    |
| `/home/deploy/lego/acme-dns-accounts.json` | учётные данные аккаунтов lego     | ⛔ **нет.** Регистрация закрыта (`disable_registration`), а новый аккаунт дал бы новый `fulldomain` → правка боевой `CNAME` |

Оба источника обязательны: если одного нет, бэкап **завершается ошибкой**, а не создаёт неполный
архив. Молчаливо неполный бэкап опаснее отсутствующего — он выглядит как защита.

### Механизм

```
cron acme-dns-backup-s2 (03:30)
  → dashboard-agent POST /api/acme-dns/backup
  → tar -czf infra/acme-dns/data/ + /home/deploy/lego/acme-dns-accounts.json
  → /home/deploy/letar/backups/acme-dns/acme-dns_<type>_<timestamp>.tar.gz  (chmod 600)
```

Ротация — последние 14 авто-бэкапов. Каталог отдельный (`backups/acme-dns/`), чтобы проверка
свежести смотрела ровно на свои файлы и не зеленела от соседнего `nginx_*.tar.gz`.

⚠️ Файл аккаунтов лежит **вне** workspace, поэтому в контейнер агента монтируется отдельной
строкой (`/home/deploy/lego:/home/deploy/lego:ro`). Забыть про монтирование — получить
«файл не найден» на каждом прогоне.

### API

```
POST /api/acme-dns/backup     — создать бэкап
GET  /api/acme-dns/backups    — список бэкапов
```

### Восстановление

```bash
# 1. Остановить acme-dns
cd /home/deploy/letar/infra/acme-dns && docker compose down

# 2. Распаковать (архив хранит абсолютные пути без ведущего /)
tar -xzf /home/deploy/letar/backups/acme-dns/acme-dns_auto_TIMESTAMP.tar.gz -C /

# 3. Проверить права и поднять
chmod 600 /home/deploy/lego/acme-dns-accounts.json
docker compose up -d
```

---

## Проверка свежести бэкапов (Maddy + acme-dns)

Бэкапы, которые создаются **вне** dashboard-agent или могут молча перестать создаваться, отдельно
проверяются на свежесть — `lib/backup-freshness.ts`:

| Цель     | Cron-задача                       | Каталог            | Порог |
| -------- | --------------------------------- | ------------------ | ----- |
| Maddy    | `maddy-backup-freshness-check`    | `backups/maddy`    | 30 ч  |
| acme-dns | `acme-dns-backup-freshness-check` | `backups/acme-dns` | 30 ч  |

При превышении порога — алерт `BACKUP_FAILED` в dashboard (и дальше в Telegram). Дебаунс: один
алерт на непрерывный эпизод, сбрасывается появлением свежего файла.

> Зачем это нужно, если бэкап acme-dns делает сам агент: отказать может tar, права на файл
> аккаунтов или выключенная cron-задача. Урок Maddy (§42, дважды за месяц) в том, что бэкап
> перестаёт идти молча — само по себе «задача настроена» ничего не гарантирует.

---

## Локальные credentials (стратегия)

> Добавлено 2026-06-04. Этап 0.3.

Локальные credentials (`.env.docker`, SSH-ключи, личные токены) **не синхронизируются через Resilio** — они исключены из `.sync/IgnoreList`. Вместо этого:

### Что куда хранить

| Тип                                       | Где хранить                           | Как восстановить                               |
| ----------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| Пароли сервисов, API-токены               | KeePassXC (`~/.keepass/*.kdbx`)       | Открыть KDBX-файл                              |
| Пароль БД, SMTP, OAuth secrets            | KeePassXC → раздел "Letar Production" | Заново создать `.env.docker` по шаблону из git |
| SSH-ключи (`~/.ssh/id_rsa`, `id_ed25519`) | KeePassXC Advanced (file attachment)  | Восстановить из KDBX                           |
| KDBX мастер-пароль                        | Бумага в сейфе / голове владельца     | —                                              |

> KeePassXC-файл (`~/.keepass/*.kdbx`) синхронизируется через системный iCloud/OneDrive/etc., отдельно от Resilio.

### Восстановление сервера с нуля

1. Установить Docker, git, Resilio Sync
2. Добавить Resilio R/O-ключ → папка `backups/` и `uploads/` появятся автоматически
3. `git clone git@github.com:kamiletar/letar.git --recurse-submodules`
4. Создать `.env.docker` по шаблону каждого приложения, взять значения из KeePassXC
5. `./deploy-affected.sh --app <app>` для каждого приложения

### Что НЕ нужно бэкапить отдельно

- Код — в git ✅
- Nginx proxy-конфиги — в `nginx_auto_*.tar.gz` ✅
- Maddy конфиги + DKIM — в `maddy_*.tar.gz` ✅
- БД — в `*.sql.gz` ✅
- Uploads — в Resilio ✅

---

## Архитектура Dashboard → Dashboard-Agent

Dashboard **никогда не обращается** к системе напрямую. Всё идёт через HTTP:

```
Dashboard (Next.js, s2:3002)
  → HTTP → Dashboard-Agent (Fastify, s2:3100)  ← "Local" сервер
  → HTTP → Dashboard-Agent (Fastify, s1:3100)  ← Remote сервер

Dashboard-Agent (на обоих серверах):
  → docker socket → Docker
  → /secrets/*.env → DB credentials
  → /home/deploy/letar/backups/ → файлы бэкапов
```

`getLocalClient()` в dashboard возвращает `RemoteServerClient` к `localhost:3100` с токеном `LOCAL_AGENT_TOKEN`.
