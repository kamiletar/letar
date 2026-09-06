# Docker Registry (self-hosted) — s3

Пилот 1 из PLAN-INFRA-6.md §157: приёмник образов для будущего разреза конвейера
(build на s3 → `docker push` → `docker compose pull` на s2). Выбран вместо `docker save`/`scp`
из §80 — откат становится кросс-хостовым, слоевое переиспользование работает, ретеншн настраивается
один раз независимо от места на целевом хосте.

**Бэкап не нужен.** Образы воспроизводимы из git (`Dockerfile.production` + коммит) — registry
здесь кеш, а не источник истины. Нужен только GC/ретеншн по тегам (см. ниже), не резервное
копирование.

## Архитектура

- `registry:2`, хранение — именованный docker volume `registry-data` (физически на корневом
  разделе s3, `760G` свободно на 2026-09-06).
- За Traefik, TLS — переиспользует уже выпущенный wildcard `*.s3.letar.best` (тот же путь, что и
  staging-приложения, см. [infra/traefik/README.md § Как подключить приложение](/infra/traefik/README.md#как-подключить-приложение)).
  Отдельный `certresolver` НЕ нужен и был бы ошибкой — см. комментарий в `docker-compose.yml`.
- **Аутентификация — на уровне Traefik** (`basicAuth` middleware), не встроенная auth самого
  `registry:2` (`REGISTRY_AUTH=htpasswd`). Причина: реиспользует уже смонтированный `./auth` у
  Traefik (`infra/traefik/docker-compose.yml` монтирует его в `/etc/traefik/auth`) — файл
  `registry-users` появляется в этом каталоге при `deploy-infra.sh registry` и подхватывается
  Traefik'ом сразу, без рестарта самого Traefik (docker-провайдер Traefik следит за label'ами
  новых контейнеров сам).
- `REGISTRY_STORAGE_DELETE_ENABLED: 'true'` — без этого `DELETE /v2/<name>/manifests/<digest>`
  отвечает `405 Method Not Allowed`, и ретеншн (`scripts/registry-gc.sh`) не сможет ничего удалить.

## Первый запуск на s3

```bash
cd /home/deploy/letar
git pull
export SOPS_AGE_KEY_FILE=/home/deploy/.age/letar-key.txt
scripts/deploy-infra.sh registry
docker logs registry --tail 30
```

Проверка живьём:

```bash
# С машины с доступом к паролю (KeePassXC → "letar registry basic-auth" или где сохранён):
docker login registry.s3.letar.best -u admin
# пуш тестового образа
docker pull hello-world
docker tag hello-world registry.s3.letar.best/hello-world:smoke
docker push registry.s3.letar.best/hello-world:smoke
docker pull registry.s3.letar.best/hello-world:smoke
```

Без basic-auth ожидаемо `401 Unauthorized` на `docker login` без `-u`/пароля и на прямой
`curl https://registry.s3.letar.best/v2/_catalog` без `-u`.

## Ретеншн тегов

`scripts/registry-gc.sh` — хранит последние `KEEP_TAGS` (по умолчанию 3, как локальный ретеншн
в `deploy-affected.sh`) SHA-тегов на репозиторий, удаляет более старые через registry API, затем
`docker exec registry bin/registry garbage-collect` для реального освобождения диска. Плавающие
теги (`:latest`, `:staging`) не трогает.

```bash
REGISTRY_USER=admin REGISTRY_PASS=<пароль> scripts/registry-gc.sh
# или сначала посмотреть, что будет удалено:
DRY_RUN=true REGISTRY_USER=admin REGISTRY_PASS=<пароль> scripts/registry-gc.sh
```

**Автоматическое расписание заведено (2026-09-06).** `dashboard-agent` на s3 гоняет TS-порт
скрипта каждую ночь через `POST /api/cron/registry-gc` (job `registry-gc-s3`, `50 4 * * *` —
то же ночное окно, что у `next-cache-cleanup-s3`/`nx-cache-cleanup-s3`, до общей чистки Docker
build cache). Логика 1:1 повторяет bash-версию, но HTTP через `fetch` (в контейнере агента нет
`curl`/`jq`) и `garbage-collect` через уже используемый в приложении `dockerode`-клиент, а не
через `docker-cli` — см. `apps/dashboard-agent/src/lib/registry-gc.ts`.
`REGISTRY_USER`/`REGISTRY_PASS` — в `.env.docker.enc` dashboard-agent (тот же SOPS-конвейер, что
у прочих секретов приложения; `env_file:` секции `services.app` в `docker-compose.s3.yml`
прокидывает переменные в контейнер автоматически, отдельная правка `environment:` не нужна).
`KEEP_TAGS`/`DRY_RUN` из bash-версии стали `REGISTRY_GC_KEEP_TAGS`/`REGISTRY_GC_DRY_RUN`
(тот же смысл, дефолты те же: 3 и `false`).

`scripts/registry-gc.sh` остаётся — им по-прежнему удобно пользоваться руками (например
`DRY_RUN=true` перед первым прогоном нового окружения), плановый запуск его не вызывает.

## Секреты

`secrets/registry-users.enc` — пароль Traefik basicAuth для `docker login`, тот же
SOPS/age-конвейер, что у `infra/traefik/secrets/` ([secret-manager.md](/.claude/docs/secret-manager.md)).
Пароль сгенерирован `openssl rand -base64 24`, хеш — `openssl passwd -apr1` (формат `htpasswd`,
поддерживается Traefik `basicAuth`). Сохранён в KeePassXC как «letar registry basic-auth».

Смена пароля:

```bash
PASS=$(openssl rand -base64 24)
echo "Новый пароль (записать в KeePassXC): $PASS"
HASH=$(openssl passwd -apr1 "$PASS")
echo "admin:$HASH" > infra/registry/secrets/registry-users.enc
sops --encrypt --in-place infra/registry/secrets/registry-users.enc
```

⚠️ Как и в `infra/traefik/secrets/`, `sops --encrypt --output X источник` матчит правило
`.sops.yaml` по пути **источника**, не `--output` — писать плейнтекст сразу по финальному пути
и шифровать `--in-place`, не через промежуточный файл с другим именем (разбор —
[sops-env-encrypt-input-path-matching.md](/.claude/docs/sops-env-encrypt-input-path-matching.md),
там же для `.env.*`, механизм тот же).

## Дальнейшие шаги (не входят в этот пилот)

- Пилот 2/3 из §157 — remote build на s3, `docker push` в этот registry, `pull` на s2.
- Если объём образов вырастет заметно — пересмотреть `REGISTRY_GC_KEEP_TAGS` (сейчас 3, консервативно).
