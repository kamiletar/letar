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

`https://errors.s3.letar.best` — NPM proxy host на s3 (host-gateway `172.17.0.1:3033`, тот же
паттерн, что у всех `*-stage.s3.letar.best`, см.
[nginx-proxy-manager/README.md](/infra/nginx-proxy-manager/README.md)). **Не через Traefik**:
пилот §48 сейчас слушает нестандартные `8090`/`8443`, реальный внешний трафик 443 держит NPM —
маршрут через Traefik ничего не покажет снаружи, пока порты не переключены.

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

## Что не сделано (см. PLAN-INFRA.md §70)

- SMTP не настроен — `EMAIL_URL=consolemail://`, письма только в лог контейнера. Подключение к
  Maddy на mail-сервере — отдельная задача, не блокирует основной функционал (события и алерты
  видны в самом UI).
- `libs/`-обёртка SDK для приложений монорепо — заводится по мере подключения каждого приложения,
  не заранее.
- Загрузка sourcemaps в CI — не начата.
- Прод (s2) не тронут — только dev/staging инстансы подключаются первыми, см. §70.
