# infra/traefik/secrets/

Конвейер `.enc` для infra-сервисов — [PLAN-INFRA.md §18.8.1](/PLAN-INFRA.md). Отдельно от
`.env.docker.enc` (`apps/*`): здесь секрет — файл целиком, а не `KEY=value`, поэтому расшифровка
кладёт его по пути из `deploy.conf`, а не в переменные окружения.

## Файлы

- `deploy.conf` — манифест (трекается git): `<файл>.enc:<целевой_путь>:<права>`. Путь и права
  живут рядом с секретом, не в голове исполнителя.
- `*.enc` — зашифрованные секреты (трекаются git, расшифровываются `scripts/deploy-infra.sh`).
- Расшифрованный плейнтекст (`acme-dns-accounts.json`, `dashboard-users` — без `.enc`) **в git не
  попадает** (см. `.gitignore`) и в этом каталоге не хранится: скрипт пишет его сразу в целевой
  путь на сервере, минуя рабочее дерево.

## Статус (2026-08-12): манифест готов, `*.enc` ещё нет

Оба секрета сейчас существуют только на серверах, заведены вручную до этого трека:

- `acme-dns-accounts.json` — на s3, `/home/deploy/lego/acme-dns-accounts.json` (см.
  [infra/traefik/README.md](/infra/traefik/README.md), раздел «Учётные данные acme-dns»).
- `dashboard-users` (htpasswd) — на s3, `/home/deploy/letar/infra/traefik/auth/dashboard-users`
  (раздел «Дашборд» там же).

**Разовая миграция, которую ещё нужно сделать** (на сервере, с `SOPS_AGE_KEY_FILE` в окружении):

```bash
# на s3, из существующих файлов
sops --encrypt /home/deploy/lego/acme-dns-accounts.json > infra/traefik/secrets/acme-dns-accounts.json.enc
sops --encrypt /home/deploy/letar/infra/traefik/auth/dashboard-users > infra/traefik/secrets/dashboard-users.enc
git add infra/traefik/secrets/*.enc
git commit -m "chore(traefik): секреты в SOPS-конвейер (§18.8.1)" -- infra/traefik/secrets/
git push
```

После этого `scripts/deploy-infra.sh traefik` расшифрует их автоматически при следующем деплое —
ручной `scp` из README можно убирать. До миграции ручной путь остаётся рабочим и является
единственным источником истины для уже поднятых серверов.
