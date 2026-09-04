# form-example-cleanup — очистка демо-записей (systemd timer, s2)

Была голой root-`crontab`-записью на `s2` (`0 3 * * * curl ... localhost:3022/api/cleanup?secret=...`)
— третий слой из `PLAN-INFRA-4.md §75`, секрет лежал прямо в тексте crontab-команды. Снята
2026-09-04, вынесена в systemd timer с секретом в отдельном `EnvironmentFile` (не в git).

⚠️ **Не через `deploy_infra`** — та же причина, что у `infra/mail-server-cron/`: это не
docker-compose-сервис, а голый curl по локальному порту хоста.

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

## Откат

```
0 3 * * * curl -s "http://localhost:3022/api/cleanup?secret=<секрет>" > /dev/null 2>&1
```

`systemctl disable --now form-example-cleanup.timer`.
