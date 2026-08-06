# Traefik (пилот на s3)

Обратный прокси, который должен заменить Nginx Proxy Manager. Главная причина замены — не HTTP/3,
а то, что конфигурация маршрутов переезжает из SQLite внутри контейнера NPM в `docker-compose`
приложения, то есть в git рядом с кодом.

Трек, обоснование и милестоны — [PLAN-INFRA.md §48](/PLAN-INFRA.md).

⚠️ **Пилотная фаза.** NPM на s3 продолжает держать 80/443 и остаётся путём отката. Traefik слушает
`8080`/`8443`. Переключение портов — отдельный шаг, после того как маршруты подтверждены.

## Что нужно до первого запуска

### 1. Сеть

```bash
docker network create traefik-network
```

Приложение попадает в маршрутизацию, только если оно **в этой же сети** и несёт label'ы. Форвард
через хост-гейтвей (`172.17.0.1:<порт>`), как это делает NPM на s3 сейчас, для Traefik не подходит:
docker-провайдер читает label'ы контейнеров, а не адреса.

### 2. Доступ к acme-dns

acme-dns живёт на s2 и его HTTP API наружу не смотрит (`127.0.0.1:8053`). Traefik на s3 обязан до
него дотянуться, иначе не сможет ни выпустить, ни продлить сертификат.

Заводится **на NPM s2** обычным proxy host:

| Домен                 | Forward    | Порт | Access List                            |
| --------------------- | ---------- | ---- | -------------------------------------- |
| `acme-api.letar.best` | `acme-dns` | `80` | allow `188.127.235.141` (s3), deny all |

TLS обычным Let's Encrypt через NPM (HTTP-01 — курицы и яйца тут нет, этот сертификат к нашему
wildcard отношения не имеет). Голый порт наружу не открывать: через этот API выставляются
ACME-челленджи всей зоны.

### 3. Учётные данные acme-dns

Файл аккаунтов lego нужен на s3. Копируется с s2 **напрямую**, минуя репозиторий.

⚠️ **На s3 кладём только ключ `s3.letar.best`, не весь файл.** На s2 их два: `letar.best` (для
`*.letar.best`) и `s3.letar.best` (для `*.s3.letar.best`) — wildcard покрывает ровно один уровень
имени, поэтому staging-домены вида `<app>-stage.s3.letar.best` первым сертификатом не покрываются.
Traefik на s3 выпускает только второй, первый ему не нужен никогда. Положить туда оба означало бы,
что компрометация **staging**-сервера даёт валидный сертификат на весь продакшен-домен.

```bash
# на s2 — вырезать только нужный ключ
python3 -c "import json;d=json.load(open('/home/deploy/lego/acme-dns-accounts.json'));json.dump({'s3.letar.best':d['s3.letar.best']},open('/tmp/s3-accounts.json','w'))"
scp /tmp/s3-accounts.json deploy@s3.letar.best:/tmp/ && shred -u /tmp/s3-accounts.json

# на s3
mkdir -p /home/deploy/lego && chown root:root /home/deploy/lego && chmod 700 /home/deploy/lego
mv /tmp/s3-accounts.json /home/deploy/lego/acme-dns-accounts.json
chmod 600 /home/deploy/lego/acme-dns-accounts.json
```

⚠️ В git этот файл не кладём даже зашифрованным — пока. Конвейер `.enc` для инфра-сервисов ещё не
заведён, см. [§18.8.1](/PLAN-INFRA.md). Как заведётся — перевести сюда, а ручной `scp` убрать:
сейчас восстановление s3 с нуля требует помнить про этот шаг, а помнить его будет некому.

### 4. Дашборд

Пароль генерировать инструментом, не придумывать ([security.md](/.claude/rules/security.md)):

```bash
mkdir -p auth
PASS=$(openssl rand -base64 24)
echo "Пароль (записать в KeePassXC): $PASS"
htpasswd -nbB admin "$PASS" > auth/dashboard-users   # или docker run --rm httpd:alpine htpasswd -nbB ...
chmod 600 auth/dashboard-users
```

`auth/` в `.gitignore`. Дашборд после запуска — `https://traefik.s3.letar.best:8443`.

## Запуск

```bash
cd /home/deploy/letar/infra/traefik
docker compose up -d
docker logs traefik | grep -iE 'error|certificate'
```

⚠️ Правка `traefik.yml` (статическая конфигурация) требует **перезапуска контейнера**: `up -d` не
пересоздаёт контейнер из-за изменившегося содержимого смонтированного файла. Динамическая часть в
`dynamic/` перечитывается на лету и рестарта не требует.

⚠️ Перед добавлением нового `-v` **проверять, что путь назначения свободен внутри образа** —
монтирование каталога поверх файла даёт невнятное `not a directory`:

```bash
docker run --rm --entrypoint sh traefik:v3.6.25 -c 'ls -la /'
```

## Как подключить приложение

В `docker-compose.staging.yml` приложения:

```yaml
services:
  app:
    networks:
      - default
      - traefik-network
    labels:
      traefik.enable: 'true'
      traefik.docker.network: 'traefik-network'
      traefik.http.routers.<app>-stage.rule: 'Host(`<app>-stage.s3.letar.best`)'
      traefik.http.routers.<app>-stage.entrypoints: 'websecure'
      traefik.http.routers.<app>-stage.tls.certresolver: 'dns'
      traefik.http.services.<app>-stage.loadbalancer.server.port: '3000'

networks:
  traefik-network:
    external: true
```

Сертификат при этом **не выпускается** — домен уже покрыт wildcard `*.s3.letar.best`. Именно
поэтому исчезает вся возня, которая была с NPM: гонка certbot-лока, `ssl_forced` отдельным `PUT`,
синхронное ожидание Let's Encrypt внутри HTTP-запроса.

### WebSocket, SSE и прочее из «Специальных конфигураций» NPM

Traefik проксирует WebSocket без настройки — отдельного аналога `proxy_set_header Upgrade` не
нужно. А вот для SSE (`proxy_buffering off` в NPM) понадобится проверить поведение вживую при
переносе `dashboard`: у Traefik буферизации ответа по умолчанию нет, но это надо подтвердить, а не
предположить.

⚠️ **HTTP-кэша у Traefik нет.** `gateway.letar.best` (IPFS, `proxy_cache` на 2 ГБ) на него не
переносится — остаётся на nginx отдельным upstream. Это касается s2 и всплывёт в M3.

## HTTP/3

Включён на entrypoint `websecure`. Слушает **UDP** на том же номере порта, что и TCP — в compose
проброшен явно.

```bash
curl -sI --http3 https://traefik.s3.letar.best:8443 | head -3
curl -sI https://traefik.s3.letar.best:8443 | grep -i alt-svc
```

Если UDP закрыт или режется по дороге, браузер молча откатится на TCP через `Alt-Svc` — то есть
«не работает» будет выглядеть как «работает». Проверять обеими командами.
