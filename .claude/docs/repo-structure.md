# Структура репозитория

## Публичный letar + приватные submodules

Основной репо `kamiletar/letar` — **публичный**. Несколько приложений и их зависимости вынесены в **приватные submodules**.

```
letar/ (public)
├── apps/
│   ├── aboi/                  → submodule (private: letar-private-aboi)
│   ├── aboi-e2e/              → submodule (private: letar-private-aboi-e2e)
│   ├── driving-school/        → submodule (private: letar-private-driving-school)
│   ├── driving-school-e2e/    → submodule (private)
│   ├── premium-rosstil/       → submodule (private)
│   ├── premium-rosstil-e2e/   → submodule (private)
│   ├── imot/                  → submodule (private)
│   ├── imot-e2e/              → submodule (private)
│   └── (остальные публичные: animatrona, dashboard, kami, и т.д.)
└── libs/
    ├── driving-school-db/     → submodule (private: letar-private-driving-school-db)
    └── (остальные публичные: forms, ui, auth, и т.д.)
```

**Приватных submodule всего 9** — по одному на каждый Nx-проект (Вариант A: 1 submodule = 1 Nx project).

## Клонирование

**С приватными submodules** (если есть доступ):

```bash
git clone --recurse-submodules git@github.com:kamiletar/letar.git
```

**Только публичная часть:**

```bash
git clone git@github.com:kamiletar/letar.git
# submodule папки будут пустыми
```

**Обновить submodule после клонирования:**

```bash
git submodule update --init --recursive
```

## Работа с submodule

### Изменение кода в submodule

```bash
cd apps/driving-school          # внутри submodule
git checkout main               # submodule по умолчанию в detached HEAD
git pull origin main            # получить последние изменения
# ... меняешь код ...
git add . && git commit -m "..."
git push origin main            # пуш в приватный репо

cd ../..                        # назад в letar root
git add apps/driving-school     # фиксируем новый SHA submodule
git commit -m "chore: bump driving-school submodule"
git push                        # пуш в публичный letar
```

### У каждого submodule свой `.gitignore`

Корневой `.gitignore` монорепо на вложенный независимый репозиторий **не действует** — submodule
видит только собственный. Заводишь новый — клади `.gitignore` до первого `git add .`, иначе в
initial commit уедут `node_modules/`, `.next/`, `dist/`. Генератор `new-app --private` кладёт его
сам. Образец и список того, что должно быть в файле, — [git.md § Работа с приватными submodule](/.claude/rules/git.md); разбор инцидента, из-за которого это записано, — в
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).

### Обновить все submodules до последних версий

```bash
git submodule update --remote --recursive
git add .
git commit -m "chore: bump all submodules"
```

## infra/ — инфраструктурные каталоги и ручные скрипты

Вне `apps/`/`libs/` — каталоги с деплой-конфигами и ручными скриптами, не входящими в Nx-граф.
Каждый каталог с нетривиальной ручной операцией документирован собственным `README.md`:

- [`infra/migrations/README.md`](/infra/migrations/README.md) — конвенции ручных скриптов
  переноса данных (owner-миграции, merge аккаунтов): клиент БД, `DATABASE_URL`/`DRY_RUN`,
  идемпотентность, транзакционность, аудит
- [`infra/animatrona-relay/README.md`](/infra/animatrona-relay/README.md),
  [`infra/animatrona-gateway/README.md`](/infra/animatrona-gateway/README.md),
  [`infra/animatrona-pinner/README.md`](/infra/animatrona-pinner/README.md),
  [`infra/animatrona-pinner3/README.md`](/infra/animatrona-pinner3/README.md),
  [`infra/animatrona-pin-queue/README.md`](/infra/animatrona-pin-queue/README.md) — топология
  приватной IPFS-сети (relay/gateway/пиннеры/pin-queue), деплой на конкретные серверы, PeerId
- [`infra/agent-mail/README.md`](/infra/agent-mail/README.md) — установка сервера координации
  агентов (MCP Agent Mail)
- [`infra/staging/README.md`](/infra/staging/README.md) — синхронизация production БД на
  staging (`sync-db-staging.sh`)
- [`infra/redis/README.md`](/infra/redis/README.md) — общий Redis-инстанс для нескольких
  приложений
- [`infra/nginx-proxy-manager/README.md`](/infra/nginx-proxy-manager/README.md) — reverse-proxy
  конфигурация

`infra/media-server/` — полноценный сервис (не разовый скрипт), задокументирован отдельно в
[media-server.md](/.claude/docs/media-server.md).

## Особенности

### .gitignore и Nx

⚠️ **НЕ добавляй пути submodule в `letar/.gitignore`** — Nx уважает .gitignore при сканировании проектов, и приватные проекты исчезнут из `nx show projects` / `nx affected`.

Submodule в Git — это **gitlink** (SHA-указатель), не директория с файлами. Git физически не закоммитит working tree submodule в родительский репо, даже если ты `git add` всю папку. Поэтому safety net в .gitignore не нужна.

### Generated файлы

Файлы в `src/generated/` некоторых приватных libs (например, `libs/driving-school-db/src/generated/prisma/`) **ДОЛЖНЫ быть закоммичены** в приватный репо (это типы Prisma). Не добавляй `src/generated/` в .gitignore приватных submodule'ов.

### .env.local / .env.docker

Эти файлы:

- НЕ tracked в letar (через корневой .gitignore)
- НЕ tracked в приватных submodule (через их .gitignore-шаблон)
- Лежат локально на диске в working tree
- На сервер попадают не копированием, а расшифровкой закоммиченного `.env.docker.enc` при
  деплое — см. [secret-manager.md](/.claude/docs/secret-manager.md). Команда `/sync-env`
  устарела и не используется

### CI/CD

GitHub Actions workflow'ы в публичном letar:

- Для публичных libs (`@letar/forms`, `@letar/form-mcp`, `@letar/zenstack-form-plugin`) — `publish-npm.yml` (триггер на тег) **не подтягивает приватные submodules** (им они не нужны).
- Для приложений, использующих приватные submodules — `actions/checkout@v4` с `submodules: recursive` и `token: ${{ secrets.PRIVATE_SUBMODULES_PAT }}`.

## Релиз-флоу (nx release)

**Локально:**

```bash
nx release          # bump, changelog, commit, tag, GitHub release
git push --follow-tags
```

CI триггерится на тег и публикует на npm. Подробности в `.claude/docs/deployment.md`.

## Миграция со старой структуры

Раньше монорепо называлось `lena`, scope `@lena/*`, релизы делались копированием исходников в отдельные публичные репо-зеркала (`kamiletar/letar-forms` и т.д.). Это устарело — теперь letar сам публичный, релизы напрямую из него.

Старые публичные зеркала (`kamiletar/letar-forms`, `kamiletar/letar-form-mcp`, `kamiletar/zenstack-form-plugin`, `kamiletar/animatrona`) можно удалить.

### Миграция server-папок

Server рабочие папки переименованы с `/home/deploy/lena` на `/home/deploy/letar`. Инструкция по физическому переносу на серверах (s1, s2, mail): [server-migration-letar](/.claude/docs/server-migration-letar.md).

### Android applicationId

Android-приложения (`animatrona-mobile`, `animatrona-tv`) и нативные модули (`exoplayer-ass`, `exoplayer-sync`) переименованы с `com.lena.*` на `com.letar.*`. После переноса:

- Старые установки на устройствах будут видны как «другое приложение» (по applicationId).
- Пользователи должны переустановить приложение; локальное состояние (Settings, IndexedDB, скачанное видео) **не мигрирует автоматически**.
- В Google Play (если выкладывались) — нужен новый листинг под новый applicationId.
