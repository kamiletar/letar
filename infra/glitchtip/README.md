# GlitchTip

Self-hosted трекинг ошибок (PLAN-INFRA.md §70). Sentry-совместимый DSN/протокол — переезд на
настоящий Sentry в будущем, если понадобится, это смена одной строки в SDK-конфиге приложений, без
правок кода.

Развёрнут на **s3** (188.127.235.141), рядом со staging-инстансами приложений. Причина того же
класса, что у `animatrona-pin-queue` ([§63](/PLAN-INFRA.md)) — держать сервис в git и на диске
одинаковым, а не разводить их: каталог клонируется из `letar` прямо на сервере
(`/home/deploy/letar/infra/glitchtip`), не копируется вручную и не заводится отдельным
`git init`.

## Домен и маршрут

`https://errors.s3.letar.best` — через Traefik (labels на контейнере `web`, сеть
`traefik-network`, тот же паттерн, что у `studio-staging-app`). Сертификат — существующий
wildcard `*.s3.letar.best` (DNS-01, собственный acme-dns), отдельно ничего выпускать не нужно.

NPM на s3 **не используется** — контейнера нет вообще, Traefik сам держит `80`/`443` с
2026-08-08 (проверено `ss -tlnp`/`docker ps` 2026-08-10). См. также обновлённые
[infra/traefik/README.md](/infra/traefik/README.md) и
[infra/nginx-proxy-manager/README.md](/infra/nginx-proxy-manager/README.md).

## Секреты — `.env` (не в git)

```bash
DB_PASSWORD=$(openssl rand -base64 24)
SECRET_KEY=$(openssl rand -hex 32)
cat > .env <<EOF
DB_PASSWORD=${DB_PASSWORD}
SECRET_KEY=${SECRET_KEY}
EOF
chmod 600 .env
```

`infra/*/.env` уже в `.gitignore` (см. `.claude/rules/env-files.md`).

## Первый запуск

```bash
docker compose up -d
docker compose logs -f web   # ждать "Application startup complete"
```

Первый пользователь регистрируется через `https://errors.s3.letar.best/register` — становится
суперюзером автоматически (только для самой первой регистрации, `ENABLE_ORGANIZATION_CREATION`
по умолчанию `False`, дальше organizations заводит только он).

## Подключённые приложения

| Приложение  | Проект (slug) | Окружения                                                                                     |
| ----------- | ------------- | --------------------------------------------------------------------------------------------- |
| `studio`    | `studio`      | staging + production                                                                          |
| `dashboard` | `dashboard`   | production (staging-инстанса нет) — DSN в `.env.docker.enc` (2026-08-12), не задеплоено       |
| `time`      | `time`        | staging + production — DSN в `.env.docker.enc`/`.env.staging.enc` (2026-08-12), не задеплоено |

DSN приложения выдаёт `ProjectKey` при создании проекта в организации — не секрет (тот же принцип,
что у настоящего Sentry: ключ предназначен для клиентского бандла), но с 2026-08-11 хранится в
`.env.docker`/`.env.staging` через `${VAR}` (см. PLAN-INFRA.md §70 п.5), не литералом в
`docker-compose.*.yml`.

Новое приложение подключается генератором — `nx g @letar/generators:glitchtip-integrate <app>`,
см. `libs/glitchtip/README.md` § «Подключение к приложению».

## Что не сделано (см. PLAN-INFRA.md §70)

- SMTP не настроен — `EMAIL_URL=consolemail://`, письма только в лог контейнера. Подключение к
  Maddy на mail-сервере — отдельная задача, не блокирует основной функционал (события и алерты
  видны в самом UI).
- Загрузка sourcemaps в CI — не начата.
- Прод (s2) частично тронут: `studio-app` на s2 получил `GLITCHTIP_DSN`/`GLITCHTIP_ENVIRONMENT` в
  `docker-compose.production.yml`, но сам GlitchTip-сервис живёт только на s3 — прод-контейнер
  studio шлёт события через интернет на s3, не в изолированный контур. Для одного
  некоммерческого приложения-пилота это приемлемо; для следующих приложений с ПДн в проде — решить
  отдельно (варианты: GlitchTip на s2 рядом с прод-приложениями, либо VPN/private-сеть между
  серверами).
