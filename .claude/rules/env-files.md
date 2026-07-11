---
alwaysApply: true
---

# Правила для .env файлов

## .env (локальная разработка)

⛔ **В `.env` файлах пиши ТОЛЬКО порт** (`PORT=XXXX`). Ничего больше.

Все остальные переменные (секреты, OAuth, DB credentials) — в `.env.local` или `.env.docker`.

**Причина:** `.env` коммитится в git. Любые секреты, даже dev-only, не должны туда попадать.

## .env.docker (продакшен)

- НЕ коммитить — синхронизация через `/sync-env`
- Содержит реальные секреты для Docker production

## .env.docker.enc (зашифрованный, SOPS + age)

- **Коммитить** — зашифрованная копия `.env.docker`, безопасна в git
- Создаётся: `sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker`
- Редактируется: `sops apps/<app>/.env.docker.enc` (открывает в $EDITOR)
- После `/sync-env` обновить `.enc`: `sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker`
- Требует `SOPS_AGE_KEY_FILE=$HOME\.age\letar-key.txt` (ключ из KeePassXC)
- Подробнее: [secret-manager.md](/.claude/docs/secret-manager.md)

## .env.local (локальная разработка)

- НЕ коммитить
- Содержит секреты для локальной разработки
- Переопределяет `.env`

## ⚠️ Новая переменная окружения — ДВА места обязательно

При добавлении новой env-переменной для продакшена её нужно прописать **в двух местах**:

1. **`.env.docker` / `.env.docker.enc`** — само значение секрета.
2. **`apps/<app>/docker-compose.production.yml` → `services.app.environment`** — строка `MY_VAR: ${MY_VAR}`.

**Почему оба:** `deploy-affected.sh` запускает `docker compose ... --env-file .env.docker`. Флаг `--env-file` делает переменные доступными **только для интерполяции** `${VAR}` внутри compose-файла — он **НЕ** прокидывает их в контейнер автоматически. В контейнер попадает лишь то, что явно перечислено в `environment:`.

**Симптом пропущенного шага 2:** значение есть в `.env.docker` (расшифровано, `docker exec ... env` его не показывает), но контейнер падает/отдаёт 500 как будто переменной нет. Внутри контейнера: `docker exec <app>-app sh -c 'env | grep MY_VAR'` → пусто.

> Прецедент: Этап 8 auth-hub добавил `AUTH_ENCRYPTION_KEY` в `.env.docker.enc`, но не в `environment:` compose → `db.ts` бросал throw в production → 500 на всех страницах SSO (commit `225fb4f`).

## ⛔ `ALLOW_DEV_SESSION` / `DEV_SESSION_TOKEN` — ТОЛЬКО в `.env.staging`

Приложения со staging-e2e через `@letar/auth/server` `createDevSessionRoute` (см. grandslamcup) держат в `.env.staging` пару переменных, открывающую бэкдор-эндпоинт `/api/auth/dev-session` — создание сессии для **любого** email без пароля/OIDC.

**Причина отдельного правила:** проверка `NODE_ENV === 'production'` НЕ годится как защита — `next build`/`next start` (production-билд, которым собирается и staging-образ) всегда выставляет `NODE_ENV=production` независимо от реального окружения. Единственная защита — явный флаг + секретный токен, оба задаются вручную per-окружение.

- **`ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` НИКОГДА не попадают в `.env.docker`/`.env.docker.enc`** — даже случайно, даже временно. Если они окажутся в прод-конфиге вместе — эндпоинт открыт на реальном проде.
- Генерировать `DEV_SESSION_TOKEN` только через `openssl rand -base64 32` (см. [security.md](/.claude/rules/security.md)), не переиспользовать между приложениями/окружениями.
- При копировании `.env.staging` как шаблона для нового окружения (staging → prod бэкапа/восстановления) — вручную вычищать эту пару переменных перед сохранением как `.env.docker`.
