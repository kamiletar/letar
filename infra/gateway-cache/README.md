# gateway-cache — кеширующий прокси перед IPFS-шлюзом

Реализация решения владельца из [PLAN-INFRA-3.md §57](/PLAN-INFRA-3.md):
кешируем только мелочь (`application/json`, `image/*`, `text/vtt`), видео/аудио — мимо кеша.
Развёртывание — **только через BlackCove**, см. [deploy-coordination.md](/.claude/rules/deploy-coordination.md).
Этот README — не история решения (та живёт в §57), а чеклист «что сделать по порядку».

## Куда это едет

`mail.letar.best` (`31.56.180.161`), рядом с Maddy и `animatrona-relay`. Origin (Kubo) остаётся
на **s3**, за Traefik, публично как `ipfs.letar.best` — прокси и origin на разных серверах,
это заложено в конфиг явно (`proxy_pass https://ipfs.letar.best`, не `127.0.0.1`).

## ⛔ Порядок обязателен — DNS переставляется последним

Тот же класс ошибки уже случился один раз («Инцидент 2026-08-07» в §57): переставили DNS раньше,
чем прокси на mail заработал, — `animatrona-tracker` в проде получил TLS `unrecognized name` на
каждый постер. Откатить это можно только обратно DNS'ом, правка `NEXT_PUBLIC_IPFS_GATEWAY` не
спасает (домен зашит в `next/image` `remotePatterns` и ещё семи местах кода).

1. **Поднять контейнер на mail**, не трогая ничего публичного:
   ```bash
   cd /home/deploy/letar/infra/gateway-cache   # или актуальный путь клона на mail
   docker compose up -d
   curl -s http://127.0.0.1:8098/nginx-health   # → ok
   ```
2. **Проверить, что кеш реально работает** — запросить существующий CID дважды, второй ответ
   должен быть из кеша:
   ```bash
   curl -sI -H 'Host: gateway.letar.best' http://127.0.0.1:8098/ipfs/<CID_мелкого_файла> | grep -i x-cache-status
   # первый раз: MISS, второй: HIT
   ```
3. **Завести Proxy Host в NPM на mail** (`http://31.56.180.161:81`) — Forward Host `172.17.0.1`,
   Forward Port `8098` (сверить с портом в `docker-compose.yml`, если менялся). Пока без SSL —
   сертификат следующим шагом, чтобы не блокировать проверку HTTP.
4. **Проверить снаружи** (не с рабочей машины — под TUN-VPN резолвер подсовывает Fake-IP из
   `198.18.0.0/15`, см. [electron-net-fetch-tun-vpn.md](/.claude/docs/electron-net-fetch-tun-vpn.md)):
   ```bash
   curl -sI -H 'Host: gateway.letar.best' http://31.56.180.161/ipfs/<CID>
   ```
5. **Выпустить сертификат** для `gateway.letar.best` через NPM (Let's Encrypt HTTP-01 — порт 80
   на mail уже публичен для tg-proxy, отдельного DNS-01 не нужно), `ssl_forced: true`.
6. **Проверить HTTPS снаружи** тем же способом, что и шаг 4, но на 443 и без `Host`-подмены.
7. **Только теперь — DNS.** Переставить `gateway.letar.best` с s3 на `31.56.180.161`. Дать TTL
   отработать, затем ещё раз проверить снаружи, что резолвится на mail и отдаёт `200`.
8. **Убрать хвост на s3** — роутер и per-name аккаунт acme-dns `gateway` там становятся мёртвыми
   после шага 7 (см. §57, «Хвост, который легко забыть»).

## Перед шагом 1 — на самом сервере

- Порт 8098 свободен (`ss -tlnp | grep 8098`) — если занят, поменять в трёх местах разом:
  `docker-compose.yml` (`ports:`), NPM Forward Port (шаг 3), плюс сверить с этим README, если
  порт меняли задним числом.
- `.env` создан из шаблона (файл не в git, см. `.gitignore` → `infra/*/.env`):
  ```bash
  cp infra/gateway-cache/.env.example infra/gateway-cache/.env
  ```
  Дописывать в него коммерческие клиентские домены (если появится ещё один потребитель кроме
  animatrona-tracker) можно только здесь, на сервере — никогда в `.example`-файл или в git
  (public-repo-hygiene.md).

## Обновление конфига на уже поднятом контейнере (nginx.conf/.env)

`nginx.conf` — теперь шаблон для envsubst (`/etc/nginx/templates/default.conf.template`,
официальный механизм образа `nginx:alpine`), а не статический `conf.d/default.conf` — список
доменов `valid_referers` (`GATEWAY_VALID_REFERERS`) подставляется docker-entrypoint'ом ИЗ
переменной окружения при каждом старте контейнера, поэтому правка `.env` требует пересоздания
контейнера (`up -d`), а не только `restart` — переменные окружения читаются при создании
контейнера, не при restart существующего:

```bash
cd /home/deploy/letar/infra/gateway-cache   # или актуальный путь клона на mail
git pull   # если правка пришла из git
docker compose up -d   # НЕ restart — новые env/volumes подхватываются только при recreate
curl -s http://127.0.0.1:8098/nginx-health   # → ok
```

⚠️ **Найдено вживую 2026-09-08:** `valid_referers` через `include` отдельного файла ломает
парсер nginx `:alpine` 1.31 (`"valid_referers" directive is not allowed here` на include'нутом
файле) — воспроизведено дважды на минимальном примере, при этом тот же `include` с `add_header`
и прямое объявление `valid_referers` в том же файле оба работают без ошибок. Похоже на квирк
модуля `ngx_http_referer_module` при парсинге через `include`, не связан с содержимым файла.
Отсюда — шаблон envsubst, а не `include` статического файла со значением: значение остаётся вне
git (переменная окружения), а сама директива `valid_referers` — литеральная строка в `nginx.conf`.

### Живая проверка access-control (valid_referers) после обновления

```bash
# Без Referer — сейчас разрешено (valid_referers none ...), НЕ путать с «доступ закрыт кому угодно»
curl -sI -H 'Host: gateway.letar.best' http://127.0.0.1:8098/ipfs/<CID_мелкого_файла> | head -1

# С посторонним Referer — должно быть 403
curl -sI -H 'Host: gateway.letar.best' -e 'https://example.com/' http://127.0.0.1:8098/ipfs/<CID> | head -1

# ⚠️ Ключевая проверка — 403 не должен закешироваться под тем же ключом ($uri, без Referer):
# запрос с валидным Referer СРАЗУ ПОСЛЕ 403-запроса выше должен отдать файл, а не закешированный 403
curl -sI -H 'Host: gateway.letar.best' -e 'https://animatrona-tracker.letar.best/' http://127.0.0.1:8098/ipfs/<CID> | grep -iE 'x-cache-status|^HTTP'
```

### Живая проверка `proxy_max_temp_file_size 0` (не пишет на диск)

```bash
# До запроса — снимок диска
df -h / | tail -1

# Прогнать через прокси заведомо крупный файл (видео/аудио — некешируемый Content-Type,
# проходит через proxy_pass целиком, но не должен лечь во временный файл)
curl -s -o /dev/null -H 'Host: gateway.letar.best' http://127.0.0.1:8098/ipfs/<CID_крупного_видео>

# Во время запроса (в отдельном терминале) и сразу после — второй снимок
df -h / | tail -1
ls -la /var/lib/docker/... # или найти реальный proxy_temp_path внутри контейнера:
docker exec gateway-cache-nginx sh -c 'ls -la /var/cache/nginx/ 2>/dev/null; find / -xdev -name "*.tmp" -newer /etc/nginx/nginx.conf 2>/dev/null'
```

## ⚠️ Порт 8098 публичен напрямую, мимо NPM — осознанный риск, не баг

Проверено вживую 2026-08-09 (BlackCove, с s2): `31.56.180.161:8098/nginx-health` отвечает
**без** прохождения через NPM. Первоначальное предположение этого README («порт закрыт
DOCKER-USER») было неверным — `docker-user-firewall.sh` на mail фильтрует FORWARD-трафик по
порту **контейнера** (после DNAT), а не по порту хоста, и порт 80 уже разрешён (для самого NPM).
Добавление 8098 в `TCP_PORTS` `infra/firewall/ports.mail.env` ничего не меняет — правило и так
пропускает по контейнерному порту.

Альтернатива `127.0.0.1:8098:80` проверена и **не работает**: Docker создаёт DNAT только под
конкретный destination IP из `ports:`, а трафик от NPM идёт на `172.17.0.1:8098` (другой IP) —
под loopback-биндинг не попадает, путь NPM отваливается целиком (`ConnectionRefused`, проверено).

**Решение: оставить `0.0.0.0` (как есть).** Риск принят как низкий — порт раздаёт тот же
публичный IPFS-контент, что и так публичен через `ipfs.letar.best`, разница только в обходе
кеша/будущего SSL-терминирования NPM для тех, кто узнает адрес напрямую.

## Мониторинг диска — открытый риск, не закрыт этим README

Некешируемые ответы (видео) всё равно могут лечь во временный файл на диск (`proxy_temp_path`,
ограничен `proxy_max_temp_file_size 1024m` в `nginx.conf`, но не исключён). Диск общий с Maddy —
переполнение здесь может уронить не раздачу, а почту, то есть канал доставки алертов о самой же
проблеме. Отдельная задача — не заведена, см. §57.
