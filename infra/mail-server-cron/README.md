# mail.letar.best — хостовые задачи (systemd timers)

Три задачи, которые раньше жили в root `crontab` на почтовом сервере (`mail.letar.best`,
`31.56.180.161`) — третий слой из `PLAN-INFRA-4.md §75` (не приложение, не `dashboard-agent`,
голый системный crontab). Снято живым `crontab -l` 2026-09-04, конфиги версионированы здесь.

⚠️ **Не через `deploy_infra`.** MCP-инструмент `deploy_infra` умеет только `docker compose up -d`
для `infra/<service>` на `s2`/`s3` — эти три задачи не докер-сервисы и не на `s2`/`s3`, а голые
скрипты + systemd timer прямо на хосте `mail.letar.best`. Доставка — вручную по SSH (см. «Установка»
ниже), не автоматизированным конвейером.

## Задачи

| Юнит               | Было (crontab) | Скрипт (не в git — уже на сервере) | Секрет        |
| ------------------ | -------------- | ---------------------------------- | ------------- |
| `maddy-backup`     | `0 3 * * *`    | `/opt/maddy/backup.sh`             | нет           |
| `npm-backup`       | `30 3 * * *`   | `/opt/npm-backup.sh`               | нет           |
| `maddy-renew-cert` | `0 3 1,15 * *` | `/opt/maddy/renew-cert.sh`         | нет (certbot) |

Сами bash-скрипты остаются на сервере как есть (`/opt/maddy/backup.sh`, `/opt/npm-backup.sh`,
`/opt/maddy/renew-cert.sh`) — не версионированы здесь, их код не менялся, меняется только то, что
их вызывает (systemd timer вместо crontab). Если понадобится править сами скрипты — переносить их
в git отдельной задачей, не смешивать со сменой планировщика.

## Почему systemd, а не crontab

- Логи — в `journalctl`, а не в `/var/log/*.log` (который никто не ротирует и не проверяет).
- Статус виден командой (`systemctl status`, `systemctl list-timers`), а не «просто подписался, что
  сработает».
- `Persistent=true` — пропущенный из-за простоя сервера тик подхватывается при следующем старте
  systemd, а не молча теряется до следующего расписания (crontab так не умеет).
- Конфиг живёт в git, а не только в root-only `crontab -l`, которую никто не диффает.

## Установка на mail.letar.best

```bash
# С Windows-машины (или откуда угодно с доступом к репо):
scp infra/mail-server-cron/systemd/*.service infra/mail-server-cron/systemd/*.timer \
  root@31.56.180.161:/etc/systemd/system/

# На самом сервере:
ssh root@31.56.180.161
systemctl daemon-reload
systemctl enable --now maddy-backup.timer npm-backup.timer maddy-renew-cert.timer

# Проверка
systemctl list-timers --all | grep -E 'maddy-backup|npm-backup|maddy-renew-cert'
journalctl -u maddy-backup.service -n 20
```

⚠️ **IP, не домен** — `mail.letar.best` резолвится в Fake-IP под TUN VPN на рабочей машине.
Использовать `root@31.56.180.161`.

## Откат

Если что-то пошло не так — вернуть crontab-строку (снята 2026-09-04):

```
0 3 1,15 * * /opt/maddy/renew-cert.sh >> /var/log/maddy-cert-renew.log 2>&1
0 3 * * * /opt/maddy/backup.sh >> /var/log/maddy-backup.log 2>&1
30 3 * * * /opt/npm-backup.sh >> /var/log/npm-backup.log 2>&1
```

и остановить таймеры: `systemctl disable --now maddy-backup.timer npm-backup.timer maddy-renew-cert.timer`.
