# Redis — общий инстанс

Один Redis-контейнер (`letar-redis`) на s2, общий для нескольких приложений монорепо (`auth-hub`
rate-limit/cookieCache secondaryStorage, `kami`, `driving-school` Socket.IO Redis-адаптер и
другие — см. `REDIS_URL` в соответствующих `docker-compose.production.yml`). Не привязан к
конкретному приложению — общая инфраструктура, поэтому живёт отдельно в `infra/`, а не внутри
`apps/<name>/`.

## Конфигурация

- **Персистентность:** `--save 60 1` (снапшот раз в минуту при ≥1 изменении)
- **Память:** `maxmemory 256mb`, `maxmemory-policy allkeys-lru` — при нехватке памяти вытесняет
  наименее используемые ключи, а не падает/OOM-килл. Приложения, использующие Redis как
  единственный источник правды (не только кэш), должны это учитывать
- **Логирование:** json-file, ротация `max-size: 10m`, `max-file: 3`
- **Сеть:** `kami-network` (общая docker-сеть монорепо, `external: true`)

## Деплой

```bash
cd infra/redis
docker compose -f docker-compose.production.yml up -d
```

Не входит в `deploy-affected.sh` per-приложение — это shared-инфраструктура, поднимается
отдельно и один раз, приложения лишь подключаются к уже работающему инстансу через `REDIS_URL`.

## Мониторинг

```bash
docker exec letar-redis redis-cli ping
docker exec letar-redis redis-cli info memory
docker stats letar-redis
```

## ⚠️ При добавлении нового потребителя

Если новое приложение начинает использовать этот Redis для чего-то отличного от кэша/rate-limit
(например, как единственный source of truth для очереди) — свериться с `maxmemory-policy
allkeys-lru`: LRU-вытеснение молча потеряет данные под нагрузкой. Для такого случая нужен либо
отдельный инстанс с `noeviction`, либо явный `maxmemory` бюджет per-приложение.
