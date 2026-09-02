# mail-nginx-proxy-manager — NPM на mail-сервере (31.56.180.161)

**Не путать с** [`infra/nginx-proxy-manager/`](/infra/nginx-proxy-manager/README.md) — тот описывает
NPM на s2/s3, снятый с обоих (см. его README). Этот — отдельный инстанс на mail-сервере,
живёт своей жизнью и не участвует в переезде на Traefik (§48).

## Назначение

Обратный прокси для `gateway.letar.best`, `tg-in.letar.best`, `tg-proxy.letar.best` — обход
блокировки `api.telegram.org` на s1/s2. Подробности механизма — `.claude/docs/*tg-proxy*` и
[project_tg_proxy_host_header_fix](память сессий).

## Перенесено из `/root/nginx-proxy-manager` (2026-09-02, PLAN-INFRA §60)

Жил вне git с момента создания. `./data`/`./letsencrypt` — **относительные bind-mount'ы**
(не именованные тома) — при cutover физически перенесены вместе с compose-файлом на сервере
(`rsync`/`mv` папок в новое расположение), не воссозданы заново. Секреты не содержит (NPM хранит
всё в `data/database.sqlite`, включая admin-пароль — сам файл в бэкапах сервера, в git не едет).

## Проверка после переноса

```bash
docker exec nginx-proxy-manager ls /data  # база и nginx-конфиги на месте
# домены отвечают: gateway.letar.best, tg-in.letar.best, tg-proxy.letar.best
```
