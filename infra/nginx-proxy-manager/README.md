# Nginx Proxy Manager

Конфигурация обратного прокси для всех приложений монорепозитория.

## Серверная архитектура

⚠️ **Таблица ниже устарела** (s1 выведен из эксплуатации, актуальный список приложений по
серверам — [deploy-agent.md § Маппинг серверов](/.claude/commands/deploy-agent.md#маппинг-серверов)).
Оставлена как есть до отдельного аудита всех proxy hosts; секция **NPM на s3** ниже — актуальна
(добавлена 2026-07-11).

| Сервер            | Приложения                                       | NPM               | Примечания        |
| ----------------- | ------------------------------------------------ | ----------------- | ----------------- |
| **s1.letar.best** | mandala, kami, pravda, animatrona-landing, umami | npm.s1.letar.best | + dashboard-agent |
| **s2.letar.best** | driving-school, dashboard                        | npm.s2.letar.best | Dashboard здесь   |
| **s3.letar.best** | staging-домены приложений + e2e-раннер           | (без поддомена)   | См. раздел ниже   |

**Docker сеть:** `kami-network` (s1/s2). На s3 у NPM собственная сеть `npm_default` —
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

### NPM на s1 (npm.s1.letar.best)

| Домен                            | Forward Host           | Port | SSL | Примечания          |
| -------------------------------- | ---------------------- | ---- | --- | ------------------- |
| mandala.letar.best               | mandala-app            | 3004 | LE  | PWA: sw.js без кэша |
| kami.letar.best                  | kami-app               | 3005 | LE  | CMS                 |
| pravda.letar.best                | pravda-app             | 3007 | LE  | —                   |
| animatrona.letar.best            | animatrona-landing-app | 3008 | LE  | Landing page        |
| stats.letar.best                 | umami-app              | 3000 | LE  | Аналитика Umami     |
| npm.s1.letar.best                | localhost              | 81   | LE  | Админка NPM s1      |
| sync.letar.best, sync.rosstil.ru | 172.17.0.1             | 8888 | LE  | Relisio sync        |

### NPM на s2 (npm.s2.letar.best)

| Домен                         | Forward Host           | Port | SSL | Примечания           |
| ----------------------------- | ---------------------- | ---- | --- | -------------------- |
| направа.рф                    | driving-school-app     | 3003 | LE  | WebSocket (чат)      |
| dash.letar.best               | dashboard-app          | 3002 | LE  | SSE config           |
| animatrona-tracker.letar.best | animatrona-tracker-app | 3010 | LE  | Аниме трекер         |
| anime.letar.best              | animatrona-web-app     | 3011 | LE  | Аниме веб (IPFS)     |
| svoichuzhie.letar.best        | svoichuzhie-app        | 3021 | LE  | Staging (noindex)    |
| gateway.letar.best            | animatrona-gateway     | 8080 | LE  | IPFS Gateway + cache |
| npm.s2.letar.best             | localhost              | 81   | LE  | Админка NPM s2       |

### NPM на s3 (обнаружен и задокументирован 2026-07-11 — БД `admin@letar.best`, см. `reference_npm_s3.md` в памяти агента)

Поднят кем-то ранее без записи в этот файл — обнаружен по факту (`docker ps`) при первом живом
staging-пилоте (§18 Сессия D). Публичные порты 80/81/443, отдельная Docker-сеть `npm_default` (не
`kami-network` — s3 её вообще не использует).

| Домен                            | Forward Host | Port | SSL | Примечания                                                                  |
| -------------------------------- | ------------ | ---- | --- | --------------------------------------------------------------------------- |
| grandslamcup-stage.s3.letar.best | `172.17.0.1` | 3018 | LE  | Staging grandslamcup, хост-гейтвей (не имя контейнера — другая Docker-сеть) |

**Домены на s3 — один лейбл, не два** (`app-stage.s3.letar.best`, не `app.stage.s3.letar.best`):
DNS покрыт существующим wildcard `*.s3 CNAME s3.letar.best`, который матчит только один лейбл
перед `.s3.letar.best`. Двухлейбловый вариант потребовал бы отдельной DNS-записи.

**SSL:** обычный Let's Encrypt HTTP-01 (не wildcard/DNS-01) — каждый staging-домен получает
собственный сертификат через API `certificate_id: "new"`. Порт 80 на s3 уже публичен, DNS-01 не
нужен и не настраивался.

⚠️ После создания Proxy Host через API `ssl_forced` возвращается `false`, даже если запросить
`true` — сертификат ещё не готов в момент создания хоста. Нужен отдельный `PUT` после того, как
`certificate_id` в ответе перестал быть `null`.

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

Dashboard Agent — сервис для мониторинга удалённых серверов. Устанавливается на s1.letar.best для сбора метрик.

### Развёртывание

```bash
# На s1.letar.best
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

В Dashboard на s2 (https://dash.letar.best) добавить сервер через UI `/servers`:

- Name: `s1`
- Display Name: `Основной сервер (s1)`
- Host: `s1.letar.best`
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

NPM должен быть подключён к сетям всех приложений:

```yaml
networks:
  - kami-network # dashboard
  # Добавить по необходимости:
  # - mandala-network
  # - driving-school-network
  # - kami-network
```

При добавлении нового приложения:

1. Добавить сеть в docker-compose.yml NPM
2. `docker compose up -d` для перезапуска

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
3. Проверить что Forward Host совпадает с именем контейнера

### SSL сертификат не выдаётся

1. Проверить DNS (должен указывать на сервер)
2. Порт 80 должен быть открыт
3. Домен должен быть доступен извне

## Версии

- NPM: 2.13.6
- Конфигурация актуальна на: 2026-01-23
