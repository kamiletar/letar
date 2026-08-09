# gateway-cache — кеширующий прокси перед IPFS-шлюзом

Реализация решения владельца из [PLAN-INFRA.md §57](/PLAN-INFRA.md#§57--раздача-ipfs-у-traefik-нет-кеширования-а-дока-пиннеров-описывает-несуществующую-схему-🆕-2026-08-07):
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
  `docker-compose.yml` (`ports:`), NPM Forward Port (шаг 3), `TCP_PORTS` в
  `infra/firewall/ports.mail.env`.
- `8098` добавлен в `TCP_PORTS` `infra/firewall/ports.mail.env` и применён на сервере
  (`docker-user-firewall.sh`, см. [firewall.md](/.claude/docs/firewall.md)) — без этого
  хост-гейтвей от NPM до контейнера режется независимо от того, что говорит `ufw status`.

## Мониторинг диска — открытый риск, не закрыт этим README

Некешируемые ответы (видео) всё равно могут лечь во временный файл на диск (`proxy_temp_path`,
ограничен `proxy_max_temp_file_size 1024m` в `nginx.conf`, но не исключён). Диск общий с Maddy —
переполнение здесь может уронить не раздачу, а почту, то есть канал доставки алертов о самой же
проблеме. Отдельная задача — не заведена, см. §57.
