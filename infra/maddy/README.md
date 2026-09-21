# maddy — почтовый сервер (mail-сервер, 31.56.180.161)

Основной SMTP/IMAP-сервер letar (`mail.letar.best`) — Maddy, DKIM-ключи и вся почта в `./data`.

## Перенесено из `/opt/maddy` (2026-09-02, PLAN-INFRA §60)

Жил вне git с момента создания. `./data` — **относительный bind-mount** (не именованный том) —
при cutover физически перенесён вместе с compose-файлом (`rsync`/`mv`), не воссоздан заново.
DKIM-ключи и вся почтовая база — в этом каталоге, потеря = потеря доставки и подписей.

⚠️ **Живой входящий SMTP.** Cutover делать с минимальным окном простоя (`docker compose down` →
перенос `data` → `docker compose up -d` из нового пути, без промежуточных шагов). SMTP-отправители
ретраят при недоступности часами, секунды простоя не критичны — но не растягивать операцию.

## Бэкапы

Отдельный конвейер, не полагается на git — см. `.claude/docs/mail-server.md` /
`project_mail_server` в памяти (cron `maddy-backup.sh` → rsync на s2 → Resilio → Windows).
Перенос директории **не отменяет и не заменяет** этот механизм — путь на сервере после переноса
проверить в самом `backup.sh` (могли захардкодить старый `/opt/maddy`).

## Проверка после переноса

```bash
docker exec maddy maddy --config /data/maddy.conf hash bcrypt -p unused  # процесс жив, конфиг читается
# входящее письмо доходит, DKIM-подпись валидна (проверить через mail-tester.com или аналог)
```

## TLS-сертификат `mail.letar.best` (Let's Encrypt, certbot standalone)

Продлением занимается системный `certbot.timer` (дважды в сутки, реально продлевает за 30 дней до
конца срока). Три хука в `/etc/letsencrypt/renewal-hooks/` (исходники — `certbot-hooks/`):

| Хук                       | Что делает                                                         |
| ------------------------- | ------------------------------------------------------------------ |
| `pre/00-stop-npm.sh`      | останавливает `nginx-proxy-manager` — он держит порт 80            |
| `deploy/00-maddy-cert.sh` | копирует сертификат в `/opt/maddy/data/certs` и рестартует `maddy` |
| `post/00-start-npm.sh`    | возвращает NPM (после любой попытки, и неудачной тоже)             |

Установка на сервере (хуки — копии, автоматически из git не доезжают):

```bash
H=/etc/letsencrypt/renewal-hooks
cp infra/maddy/certbot-hooks/pre-stop-npm.sh       $H/pre/00-stop-npm.sh
cp infra/maddy/certbot-hooks/deploy-maddy-cert.sh  $H/deploy/00-maddy-cert.sh
cp infra/maddy/certbot-hooks/post-start-npm.sh     $H/post/00-start-npm.sh
chmod +x $H/pre/00-stop-npm.sh $H/deploy/00-maddy-cert.sh $H/post/00-start-npm.sh
```

⚠️ **Инцидент 2026-09-20.** Сертификат истёк, потому что автопродление молча не работало с
~2026-08-21. Две причины сразу: (1) с 2026-07-30 порт 80 занят `nginx-proxy-manager` (tg-proxy),
а certbot использует `standalone` — `Could not bind TCP port 80`; (2) хуков не было вовсе, а
копирование в Maddy делал `renew-cert.sh` из root-cron, которого на сервере уже нет — то есть даже
успешное продление не попало бы в Maddy. Заметили только по ошибке `certificate has expired` в
логе IMAP-крона domwellbes. Починено 2026-09-21 хуками выше; `/opt/maddy/renew-cert.sh` больше не
используется. Простой NPM при продлении — секунды раз в ~60 дней.

Проверка срока снаружи:

```bash
echo | openssl s_client -connect mail.letar.best:993 -servername mail.letar.best 2>/dev/null | openssl x509 -noout -enddate
```
