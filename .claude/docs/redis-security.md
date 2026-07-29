# Redis — правила безопасности для shared-инфраструктуры

## ⚠️ Инцидент 2026-07-29: захват `letar-redis` через открытый порт

`letar-redis` (общий Redis для `auth-hub` rate-limit/cookieCache, `dashboard-agent`, `kami`,
`driving-school` Socket.IO-адаптера и др., см. [infra/redis/README.md](/infra/redis/README.md))
был опубликован на `0.0.0.0:6379` **без пароля** (`requirepass` пуст), при этом `ufw` на сервере
был выключен. Порт был доступен всему интернету.

Кто-то извне выполнил `REPLICAOF <ip> <port>` (указывая на подконтрольный себе хост) прямо на боевом инстансе — Redis перешёл в режим
`slave` с недоступным «мастером» и стал read-only. Все `setex`-запросы rate-limit в `auth-hub`
начали падать `READONLY You can't write against a read only replica`, что превратилось в 500 на
`/.well-known/openid-configuration` — сломался OIDC-вход **во все** приложения, идущие через
Ключницу (`auth-hub`).

Это классический сценарий массового сканирования незащищённых Redis-инстансов ботами (захват через
`REPLICAOF`/`SLAVEOF`, иногда с последующей записью вредоносного RDB через `CONFIG SET
dir`/`dbfilename` + `SAVE` для RCE). В данном случае синк с «мастером» атакующего не завершился
(`master_link_status:down`), поэтому по проверенным признакам (crontab, `authorized_keys`,
RDB save-path) дальше захвата роли дело не пошло — но сама экспозиция была реальной уязвимостью,
не гипотетической.

**Восстановление:** `docker exec letar-redis redis-cli replicaof no one` (вернуть роль master) +
временный `iptables -I DOCKER-USER -p tcp --dport 6379 -j DROP` как стоп-гэп, затем постоянный фикс
ниже.

## ✅ Обязательные правила для любого Redis-сервиса в монорепо

1. **НЕ публиковать порт на хост, если не жизненно необходимо.** Приложения-потребители сидят в
   той же docker-сети (`kami-network` и т.п.) и резолвят контейнер по имени — им host-level
   `ports:` не нужен вообще. Публикация порта — единственная причина, по которой `letar-redis`
   стал доступен снаружи; остальные Redis-инстансы монорепо (`svoichuzhie-redis`, `media-redis`,
   `animatrona-tracker-redis`) без `ports:` не были атакованы.
2. **Всегда `--requirepass`**, даже для инстансов без публикации порта (defense in depth — если
   сосед по docker-сети когда-нибудь скомпрометируют, боковое перемещение к Redis без пароля
   тривиально). Пароль — только через генератор (`openssl rand -base64 32`), см.
   [security.md](/.claude/rules/security.md) § «Генерация паролей». Хранить в
   `.env.docker.enc` (SOPS), пробрасывать в `command:` через `${REDIS_PASSWORD}` — не хардкодить
   в `docker-compose*.yml` в открытом виде.
3. **Если порт всё же нужно публиковать на хост** (пример: `e2e-redis` на s3 — driving-school
   staging достаёт его через `172.17.0.1:6380`, то есть через host-gateway, а не docker-сеть, из-за
   архитектуры staging-стека) — это ещё не повод оставлять без пароля. Requirepass обязателен
   независимо от того, публикуется порт или нет.
4. **Периодически сверяться:** `docker port <container>` должен быть пуст для любого Redis,
   у которого нет documented-причины торчать наружу. `docker exec <container> redis-cli config get
   requirepass` не должен возвращать пустую строку.

## Чеклист при заведении нового Redis-сервиса

- [ ] `ports:` отсутствует, если потребители в той же docker-сети
- [ ] `--requirepass ${REDIS_PASSWORD}` в `command:`
- [ ] `REDIS_PASSWORD` сгенерирован генератором, лежит в `.env.docker.enc`
- [ ] `REDIS_URL` во всех потребителях обновлён на `redis://:<password>@<container>:<port>`
- [ ] Если порт всё же публикуется — обоснование задокументировано рядом (как в
      `driving-school/docker-compose.staging.yml` про `172.17.0.1:6380`)

## Связанные доки

[secret-manager.md](/.claude/docs/secret-manager.md) (SOPS + age), [security.md](/.claude/rules/security.md)
(генерация паролей), [deploy-coordination.md](/.claude/rules/deploy-coordination.md).
