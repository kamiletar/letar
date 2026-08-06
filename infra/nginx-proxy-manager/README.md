# Nginx Proxy Manager

Конфигурация обратного прокси для всех приложений монорепозитория.

## Серверная архитектура

**s1 выведен из эксплуатации** (2026-06-20) — все production-приложения теперь на s2. Актуальный
список приложений по серверам — [deploy-agent.md § Маппинг серверов](/.claude/commands/deploy-agent.md#маппинг-серверов).

| Сервер                              | Приложения                                      | NPM               | Примечания                                                                                 |
| ----------------------------------- | ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| **s2.letar.best**                   | все production-приложения (см. deploy-agent.md) | npm.s2.letar.best | Единственный prod-сервер                                                                   |
| **s3.letar.best**                   | staging-домены приложений + e2e-раннер          | (без поддомена)   | Не production, см. раздел ниже                                                             |
| **mail.letar.best (31.56.180.161)** | tg-proxy.letar.best, tg-in.letar.best           | localhost:81      | Отдельный NPM только для Telegram-прокси, не в git (см. раздел «Telegram API прокси» ниже) |

**Docker сеть:** `kami-network` (s2). На s3 у NPM собственная сеть `npm_default` —
staging-приложения форвардятся через **хост-гейтвей** (`172.17.0.1:<хостовый-порт>`), не через
`docker network connect` (NPM и staging-compose живут в разных Docker-сетях, разные жизненные
циклы — `docker network connect` пережил бы `compose down` staging-приложения расхождением).

## Быстрый старт

```bash
# Создать сети (если не существуют)
docker network create kami-network

# Запустить NPM
cd infra/nginx-proxy-manager
docker compose up -d

# Открыть админку
# http://localhost:81
# Email: admin@example.com
# Password: changeme (сменить сразу!)
```

## Proxy Hosts по серверам

⚠️ Таблица покрывает часть доменов, известную на момент последнего аудита — при добавлении
proxy host сюда его тоже нужно дописать вручную, автосинхронизации с NPM нет.

### NPM на s2 (npm.s2.letar.best) — единственный production

| Домен                            | Forward Host           | Port | SSL | Примечания                                   |
| -------------------------------- | ---------------------- | ---- | --- | -------------------------------------------- |
| mandala.letar.best               | mandala-app            | 3004 | LE  | PWA: sw.js без кэша                          |
| kami.letar.best                  | kami-app               | 3005 | LE  | CMS                                          |
| pravda.letar.best                | pravda-app             | 3007 | LE  | —                                            |
| animatrona.letar.best            | animatrona-landing-app | 3008 | LE  | Landing page                                 |
| stats.letar.best                 | umami-app              | 3000 | LE  | Аналитика Umami                              |
| sync.letar.best, sync.rosstil.ru | 172.17.0.1             | 8888 | LE  | Relisio sync                                 |
| направа.рф                       | driving-school-app     | 3003 | LE  | WebSocket (чат)                              |
| dash.letar.best                  | dashboard-app          | 3002 | LE  | SSE config                                   |
| animatrona-tracker.letar.best    | animatrona-tracker-app | 3010 | LE  | Аниме трекер                                 |
| anime.letar.best                 | animatrona-web-app     | 3011 | LE  | Аниме веб (IPFS)                             |
| svoichuzhie.letar.best           | svoichuzhie-app        | 3021 | LE  | Staging (noindex)                            |
| gateway.letar.best               | animatrona-gateway     | 8080 | LE  | IPFS Gateway + cache                         |
| domwellbes.ru, www.domwellbes.ru | domwellbes-app         | 3025 | LE  | М1, ещё не задеплоен (502 до первого деплоя) |
| npm.s2.letar.best                | localhost              | 81   | LE  | Админка NPM s2                               |

Остальные production-приложения (auth-hub, archetest, grandslamcup, time, form-docs,
form-example, aira-web, kami-key-the-landing, letar-landing, dsperevod, aboi и т.д.) тоже
проксируются через NPM на s2 — актуальный список приложений сервера см.
[deploy-agent.md § Маппинг серверов](/.claude/commands/deploy-agent.md#маппинг-серверов),
их конкретные proxy hosts сюда ещё не сведены.

### NPM на s3 (обнаружен и задокументирован 2026-07-11 — БД `admin@letar.best`, см. `reference_npm_s3.md` в памяти агента)

Поднят кем-то ранее без записи в этот файл — обнаружен по факту (`docker ps`) при первом живом
staging-пилоте (§18 Сессия D). Публичные порты 80/81/443, отдельная Docker-сеть `npm_default` (не
`kami-network` — s3 её вообще не использует).

| Домен                            | Forward Host | Port | SSL | Примечания                                                                   |
| -------------------------------- | ------------ | ---- | --- | ---------------------------------------------------------------------------- |
| grandslamcup-stage.s3.letar.best | `172.17.0.1` | 3018 | LE  | Staging grandslamcup, хост-гейтвей (не имя контейнера — другая Docker-сеть)  |
| aboi-stage.s3.letar.best         | `172.17.0.1` | 3022 | LE  | Staging aboi (PLAN.md §18.7 Тираж M1)                                        |
| time-stage.s3.letar.best         | `172.17.0.1` | 3023 | LE  | Staging time (PLAN.md §18.7 Тираж M1), OIDC redirect для клиента time-prod   |
| mandala-stage.s3.letar.best      | `172.17.0.1` | 3024 | LE  | Staging mandala (PLAN.md §18.7 Тираж M1)                                     |
| svoichuzhie-stage.s3.letar.best  | `172.17.0.1` | 3025 | LE  | Staging svoichuzhie (PLAN.md §18.7 Тираж M1)                                 |
| aprel8008-stage.s3.letar.best    | `172.17.0.1` | 3026 | LE  | Staging aprel8008 (PLAN.md §18.7 Тираж M1), OIDC redirect для aprel8008-prod |
| dsperevod-stage.s3.letar.best    | `172.17.0.1` | 3027 | LE  | Staging dsperevod (PLAN.md §18.7 Тираж M1)                                   |
| pravda-stage.s3.letar.best       | `172.17.0.1` | 3028 | LE  | Staging pravda (PLAN.md §18.7 Тираж M1), без БД/auth                         |
| aira-web-stage.s3.letar.best     | `172.17.0.1` | 3029 | LE  | Staging aira-web (PLAN.md §18.7 Тираж M1), без БД/auth                       |
| domwellbes-stage.s3.letar.best   | `172.17.0.1` | 3031 | LE  | Staging domwellbes, заведён 2026-08-06 (см. троблшутинг ниже)                |
| studio-stage.s3.letar.best       | `172.17.0.1` | 3032 | LE  | Staging studio, заведён 2026-08-06 при первом тираже e2e-гейта для studio    |

⚠️ **NPM на s3 обновлён до 2.15.1** (актуальную версию видно через `GET /api/` без авторизации).
`docker-compose.yml` для s2 также обновлён на тег `2.15.1` — применить на сервере ещё
предстоит через `docker compose pull && docker compose up -d` (см. раздел ниже). API создания
сертификата в 2.15 изменился:
поле `meta` в `POST /api/nginx/certificates` теперь принимает **пустой объект** `{}` —
`letsencrypt_email`/`letsencrypt_agree`/`dns_challenge` в payload вызывают
`data/meta must NOT have additional properties`. Email/agree теперь настраиваются на уровне
сервера, не за запрос.

**Домены на s3 — один лейбл, не два** (`app-stage.s3.letar.best`, не `app.stage.s3.letar.best`):
DNS покрыт существующим wildcard `*.s3 CNAME s3.letar.best`, который матчит только один лейбл
перед `.s3.letar.best`. Двухлейбловый вариант потребовал бы отдельной DNS-записи.

**SSL:** обычный Let's Encrypt HTTP-01 (не wildcard/DNS-01) — каждый staging-домен получает
собственный сертификат через API `certificate_id: "new"`. Порт 80 на s3 уже публичен, DNS-01 не
нужен и не настраивался.

⚠️ После создания Proxy Host через API `ssl_forced` возвращается `false`, даже если запросить
`true` — сертификат ещё не готов в момент создания хоста. Нужен отдельный `PUT` после того, как
`certificate_id` в ответе перестал быть `null`.

⚠️ **Живой инцидент 2026-08-06 (domwellbes-stage):** запрос `POST /api/nginx/proxy-hosts` с
`certificate_id: "new"` синхронно ждёт выпуска Let's Encrypt сертификата внутри того же HTTP-запроса
— при таймауте клиента (30с) host всё равно создаётся в БД (`certificate_id: 0`, без сертификата),
а зависший внутри контейнера `certbot`-процесс держит файловый лок ещё какое-то время, из-за чего
следующий `POST /api/nginx/certificates` для того же домена падает `500: Another instance of
Certbot is already running`. Лок в `/tmp/certbot-log-*/log` внутри контейнера `npm` — самоочищается
за секунды, повторный запрос обычно проходит. Рабочая последовательность при таком развале:

1. `POST /api/nginx/certificates` (провайдер `letsencrypt`, `meta: {}`) отдельно, дождаться `201`
   с непустым `letencrypt_certificate` в ответе.
2. `PUT /api/nginx/proxy-hosts/{id}` с `certificate_id` из шага 1 и `ssl_forced: true`.

Также: `domwellbes-stage.s3.letar.best` был запрошен ещё в инфра-запросе `#1022`
(deploy-request domwellbes staging, 2026-08-06) как шаг 3 «настроить NPM host», но фактически не
был заведён до живого репорта `ERR_SSL_UNRECOGNIZED_NAME_ALERT` от разработчика приложения —
инфра-шаги из тела deploy-request легко потерять, если они не единственный экшн в запросе.

⚠️ **Порядок важен для e2e:** NPM host для нового staging-приложения нужно завести **до** первого
`run_e2e`, не после `deploy_app(staging)`. Прецедент studio (тот же день): `run_e2e` запустился
раньше, чем host — `baseUrl` оказался недостижим, Playwright тихо поднял локальный fallback
`next dev --turbopack` (см. `webServer.reuseExistingServer` в `playwright.config.ts` и
предупреждение в описании инструмента `run_e2e` про этот механизм), который тут же упал
`EADDRINUSE` на порт, занятый staging-контейнером того же приложения. Симптом в логе e2e —
`[WebServer] Failed to start server` вместо реальных упавших тестов; чинится не правкой теста, а
просто повторным `run_e2e` после того, как домен стал живым (`curl -I https://<app>-stage...` → `200`).

## NPM на mail-сервере (tg-proxy) — отдельный, независимый инстанс

Провайдер ДЦ блокирует IP-диапазоны `api.telegram.org` на s1/s2, поэтому исходящие запросы к Bot
API и входящие webhook идут через reverse-proxy на mail-сервере (`31.56.180.161`) — отдельная
машина, отдельная NPM, отдельная от `kami-network`/s2/s3. Подробности использования в
приложениях — [deployment.md § Telegram API — прокси через mail сервер](/.claude/docs/deployment.md).

⚠️ **2026-07-30:** обнаружено, что до этой даты NPM на mail-сервере физически не существовала —
раздел был только планом, а `dashboard` после деплоя падал в цикл `ConnectTimeoutError`. Поднято
по факту в этот же день.

- Конфиг: `/root/nginx-proxy-manager/docker-compose.yml` на самом сервере (не в git — отдельная
  машина вне обычного деплоя letar).
- Админка: `http://31.56.180.161:81`, креды в KeePassXC.
- Firewall: `ufw allow 80,443,81/tcp` (у сервера уже были открыты 22/25/465/587/993 под Maddy +
  4001 под agent-mail — эти порты не трогать).
- Proxy Hosts заведены через API (`POST /api/nginx/proxy-hosts` + `/api/nginx/certificates`), не
  руками через UI — см. `.claude/docs/deployment.md` для точного тела запроса и списка Custom
  Locations под `tg-in.letar.best`.
- Бэкап: `/opt/npm-backup.sh` на mail-сервере (по образцу `/opt/maddy/backup.sh`), cron
  `30 3 * * *`, ротация 14 дней локально + rsync на s2 в
  `/home/deploy/letar/backups/nginx-proxy-manager-mail/` (подхватит Resilio Sync).

## Специальные конфигурации

### Dashboard (SSE/Real-time)

В Advanced tab добавить:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 86400s;
```

### Mandala (PWA)

В Advanced tab добавить:

```nginx
# Service Worker должен отдаваться без кэша
location = /sw.js {
    proxy_pass http://mandala-app:3004;
    proxy_set_header Host $host;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Service-Worker-Allowed "/";
}

# Manifest тоже без долгого кэша
location = /manifest.webmanifest {
    proxy_pass http://mandala-app:3004;
    proxy_set_header Host $host;
    add_header Cache-Control "no-cache";
}
```

### Driving School (WebSocket/чат)

В Advanced tab для `направа.рф` добавить:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400s;
```

### IPFS Gateway (proxy_cache)

Кэширует мелкие файлы (шрифты, JSON, субтитры ≤ 5MB), видео (200MB-2GB) только проксирует.

**http_top.conf** (в `/data/nginx/custom/`):

```nginx
proxy_cache_path /data/nginx/ipfs-cache levels=1:2 keys_zone=ipfs:10m max_size=2g inactive=30d use_temp_path=off;
```

**Advanced tab** для `gateway.letar.best`:

```nginx
proxy_cache ipfs;
proxy_cache_valid 200 206 365d;
proxy_cache_key $uri;
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 8 256k;
proxy_busy_buffers_size 512k;
proxy_max_temp_file_size 5m;
proxy_read_timeout 120s;
client_max_body_size 0;
add_header Cache-Control "public, max-age=31536000, immutable" always;
add_header X-Cache-Status $upstream_cache_status always;
```

### IMOT (IP Whitelist)

В Access List настроить:

- Allow: 45.90.236.27
- Deny: all
- Satisfy: all

## Dashboard Agent

Dashboard Agent — сервис для мониторинга и self-deploy на s2 (единственный production-сервер).
Плюс staging-инстанс на s3 (`docker-compose.s3.yml`, loopback `127.0.0.1:13103:3100`, отдельный
`AGENT_TOKEN_S3`) — для e2e-раннера, не публикуется в интернет. Подробности деплоя и токенов —
[deploy-agent.md § Маппинг серверов](/.claude/commands/deploy-agent.md#маппинг-серверов).

### Развёртывание (первичная настройка нового сервера)

```bash
cd /home/deploy/letar

# Собрать image
docker build -f apps/dashboard-agent/Dockerfile -t dashboard-agent:latest apps/dashboard-agent/

# Сгенерировать токен
TOKEN=$(openssl rand -hex 32)
echo "Сохрани токен: $TOKEN"

# Создать .env
cat > apps/dashboard-agent/.env.docker << EOF
PORT=3100
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
AGENT_TOKEN=$TOKEN
DOCKER_SOCKET_PATH=/var/run/docker.sock
CORS_ORIGIN=https://dash.letar.best
EOF

# Запустить
docker run -d \
  --name dashboard-agent \
  --restart always \
  -p 3100:3100 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --env-file apps/dashboard-agent/.env.docker \
  dashboard-agent:latest

# Проверить
curl http://localhost:3100/health
```

### Регистрация в Dashboard

В Dashboard (https://dash.letar.best) добавить сервер через UI `/servers`:

- Name: `s2`
- Display Name: `Production (s2)`
- Host: `s2.letar.best`
- Port: `3100`
- Agent Token: `<TOKEN_ИЗ_ШАГА_ВЫШЕ>`

## Миграция на новый сервер

### 1. Подготовка на старом сервере

```bash
# Сохранить данные NPM
cd /root/nginx-proxy-manager
tar -czf npm-backup-$(date +%Y%m%d).tar.gz data/ letsencrypt/

# Скопировать архив
scp npm-backup-*.tar.gz user@new-server:/tmp/
```

### 2. Настройка на новом сервере

```bash
# Клонировать репозиторий
git clone <repo-url> /home/deploy/letar
cd /home/deploy/letar

# Создать сети
docker network create kami-network

# Распаковать данные NPM
cd infra/nginx-proxy-manager
tar -xzf /tmp/npm-backup-*.tar.gz

# Запустить NPM
docker compose up -d
```

### 3. Обновить DNS

Перенаправить все домены на новый IP сервера:

- \*.letar.best

### 4. Обновить SSL сертификаты

После смены DNS, обновить сертификаты в NPM:

1. Зайти в админку
2. Для каждого хоста: Edit → SSL → Force Renew

## Docker сети

Все production-приложения на s2 (s1 выведен из эксплуатации) с 2026-07-13 в единой сети
`kami-network` (переименована из `premium-network` — Сессия №74). Отдельных сетей по приложениям
больше нет:

```yaml
networks:
  - kami-network
```

При добавлении нового приложения дополнительных действий с сетью NPM не требуется — новый
контейнер просто подключается к уже существующей `kami-network`.

## Бэкапы

### Ручной бэкап

```bash
cd /root/nginx-proxy-manager  # или infra/nginx-proxy-manager
tar -czf /backups/npm-$(date +%Y%m%d).tar.gz data/ letsencrypt/
```

### Что бэкапить

- `data/database.sqlite` — все настройки хостов, пользователи, access lists
- `data/nginx/` — сгенерированные конфиги nginx
- `letsencrypt/` — SSL сертификаты (Let's Encrypt)

## Troubleshooting

### Контейнер не запускается

```bash
# Проверить логи
docker compose logs -f

# Проверить порты
netstat -tlnp | grep -E ':(80|81|443)'
```

### Приложение недоступно через прокси

1. Проверить что сеть добавлена в NPM
2. Проверить что контейнер приложения в нужной сети:
   ```bash
   docker network inspect kami-network
   ```
3. Проверить что Forward Host совпадает с именем контейнера — **или** с network alias, если
   приложение на rollout-профиле (§18.6 Сессия J): такие app-сервисы больше не публикуют
   `container_name`, вместо него `networks.kami-network.aliases` задан равным прежнему имени
   контейнера (`docker network inspect kami-network` покажет alias у текущего активного контейнера
   `<app>-app-1`/`<app>-app-2`)

### SSL сертификат не выдаётся

1. Проверить DNS (должен указывать на сервер)
2. Порт 80 должен быть открыт
3. Домен должен быть доступен извне

## Версии

- NPM: 2.15.1 ([релиз](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.15.1))
- Конфигурация актуальна на: 2026-07-30
