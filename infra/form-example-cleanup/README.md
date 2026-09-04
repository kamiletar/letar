# form-example-cleanup — очистка демо-записей (systemd timer, s2)

Была голой root-`crontab`-записью на `s2` (`0 3 * * * curl ... localhost:3022/api/cleanup?secret=...`)
— третий слой из `PLAN-INFRA-4.md §75`, секрет лежал прямо в тексте crontab-команды. Снята
2026-09-04, вынесена в systemd timer с секретом в отдельном `EnvironmentFile` (не в git).

⚠️ **Не через `deploy_infra`** — та же причина, что у `infra/mail-server-cron/`: это не
docker-compose-сервис, а голый вызов по докер-сети хоста.

⚠️ **Порт 3022 не опубликован на хост — `localhost:3022` недостижим.** Rollout-профиль
`app`-сервиса (`apps/form-example/docker-compose.production.yml`, zero-downtime scale=2,
`letar.rollout: 'true'`, 2026-07-15) намеренно не задаёт `ports:` — два реплика не могут
одновременно слушать один хост-порт. Старый crontab и первая версия этого таймера этого не
учитывали и падали `connection refused` (crontab — молча, в `/dev/null`; таймер —
`exit 7`, замечено 2026-09-04). Фикс — обращаться не с хоста, а через docker-сеть:
одноразовый `alpine` внутри `kami-network` бьёт по алиасу `form-example-app:3022`
(`networks.kami-network.aliases` в compose) — он резолвится независимо от того, как реплика
называется динамически.

## Установка на s2

```bash
ssh root@185.28.85.195

# Секрет — отдельным файлом, НЕ в git (взять значение из старой crontab-строки или KeePassXC)
cat > /etc/letar-form-example-cleanup.env <<'EOF'
CLEANUP_SECRET=<значение секрета>
EOF
chmod 600 /etc/letar-form-example-cleanup.env

# Юниты
scp infra/form-example-cleanup/systemd/*.service infra/form-example-cleanup/systemd/*.timer \
  root@185.28.85.195:/etc/systemd/system/

systemctl daemon-reload
systemctl enable --now form-example-cleanup.timer

systemctl list-timers --all | grep form-example-cleanup
journalctl -u form-example-cleanup.service -n 20
```

## Обновление существующей установки (после фикса порта, 2026-09-04)

```bash
scp infra/form-example-cleanup/systemd/form-example-cleanup.service \
  root@185.28.85.195:/etc/systemd/system/
ssh root@185.28.85.195 "systemctl daemon-reload && systemctl start form-example-cleanup.service && journalctl -u form-example-cleanup.service -n 20"
```

## Откат

Старая (нерабочая с 2026-07-15) crontab-форма — только как история, не восстанавливать:

```
0 3 * * * curl -s "http://localhost:3022/api/cleanup?secret=<секрет>" > /dev/null 2>&1
```

`systemctl disable --now form-example-cleanup.timer`.
