---
name: email-maddy
description: |
  Управление email системой и Maddy сервером. Используй при:
  - Настройке отправки email в приложениях
  - Добавлении нового домена для отправки
  - Управлении пользователями Maddy
  - Диагностике проблем с доставкой писем
  - Обновлении SMTP паролей
  - Работе с @letar/email библиотекой
---

# Email & Maddy Assistant

Помощник по управлению email системой в монорепозитории.

## Когда использовать

- Настройка отправки email в приложениях
- Добавление нового домена для отправки
- Управление пользователями Maddy
- Диагностика проблем с доставкой писем
- Обновление SMTP паролей
- Работа с `@letar/email` библиотекой

## Инфраструктура

| Компонент  | Хост                            | Назначение  |
| ---------- | ------------------------------- | ----------- |
| Maddy      | mail.letar.best (31.56.180.161) | SMTP сервер |
| Production | 194.164.245.97                  | Приложения  |

### Порты Maddy

⚠️ Сервер не send-only relay — он полноценно принимает и хранит почту (архитектура "forwarding
with reroute", подробности в `reference/maddy-config.md`).

| Порт | Протокол   | Назначение                                                                                               |
| ---- | ---------- | -------------------------------------------------------------------------------------------------------- |
| 25   | SMTP       | Приём входящей почты извне + DMARC/DKIM/SPF-проверка + доставка в mailbox или форвард по `/data/aliases` |
| 465  | SMTPS      | Отправка авторизованными пользователями (implicit TLS) + проверка `authorize_sender`                     |
| 587  | Submission | Отправка авторизованными пользователями (STARTTLS) + проверка `authorize_sender`                         |
| 993  | IMAPS      | Чтение почты из `storage.imapsql` (реальные почтовые ящики, не только очередь исходящих)                 |

## Быстрые команды

### Проверка статуса

```bash
# Статус контейнера
ssh root@mail.letar.best "docker ps | grep maddy"

# Логи
ssh root@mail.letar.best "docker logs maddy --tail 50"

# Список пользователей
ssh root@mail.letar.best "docker exec maddy maddy creds list"
```

### Управление паролями

```bash
# Изменить пароль пользователя
ssh root@mail.letar.best "docker exec -it maddy maddy creds password noreply@letar.best"

# Создать нового пользователя
ssh root@mail.letar.best "docker exec -it maddy maddy creds create user@letar.best"
```

### Доставка изменённых SMTP-настроек

⛔ `./scripts/sync-env-docker.sh` устарел. Правь зашифрованный файл и коммить — на сервер он
попадёт расшифровкой при деплое:

```bash
sops apps/<app>/.env.docker.enc
git add apps/<app>/.env.docker.enc && git commit -m "chore(<app>): обновить SMTP"
```

## Workflow: Добавить email в приложение

1. **Проверить tsconfig.json приложения**

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@letar/email": ["../../libs/email/src/index.ts"]
       }
     },
     "references": [{ "path": "../../libs/email" }]
   }
   ```

2. **Настроить .env.docker**

   ```env
   SMTP_HOST=mail.letar.best
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=noreply@letar.best
   SMTP_PASSWORD=<пароль>
   SMTP_FROM_EMAIL=noreply@<app>.letar.best
   SMTP_FROM_NAME="App Name"
   ```

3. **Интегрировать с Better Auth**

   ```typescript
   import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'

   export const auth = betterAuth({
     emailVerification: {
       sendVerificationEmail: async ({ user, url }) => {
         await sendVerificationEmail({
           to: user.email,
           userName: user.name,
           verificationUrl: url,
         })
       },
     },
   })
   ```

4. **Доставить на production** — зашифровать, закоммитить, запросить деплой:
   ```bash
   sops apps/<app>/.env.docker.enc
   git add apps/<app>/.env.docker.enc && git commit -m "chore(<app>): SMTP"
   ```

## Workflow: Добавить новый домен

1. **Обновить конфиг Maddy** — реальный файл в `data/`, не `config/` (тот устарел, см.
   `reference/maddy-config.md`):

   ```bash
   ssh root@mail.letar.best "nano /opt/maddy/data/maddy.conf"
   ```

   Добавить домен в `$(local_domains)` — отдельный DKIM-ключ заводить не нужно, единая директива
   `modify { dkim $(primary_domain) $(local_domains) default }` подпишет письма автоматически.
   Если приложению нужны алиасы/ролевые адреса — сразу добавить записи в `/data/aliases` и
   `/data/sender_map.txt` (паттерн описан в `reference/maddy-config.md`).

2. **Перезапустить Maddy**

   ```bash
   ssh root@mail.letar.best "docker restart maddy"
   ```

3. **Добавить DNS записи**
   - SPF: `v=spf1 a:mail.letar.best ~all`
   - DKIM: `default._domainkey` → публичный ключ
   - DMARC: `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best`

4. **Получить DKIM ключ** (генерируется лениво при первой отправке с нового домена):

   ```bash
   ssh root@mail.letar.best "docker exec maddy cat /data/dkim_keys/<domain>_default.dns"
   ```

5. **Проверить через mail-tester.com**

## Workflow: Изменить SMTP пароль

1. **Обновить на Maddy**

   ```bash
   ssh root@mail.letar.best "docker exec -it maddy maddy creds password noreply@letar.best"
   ```

2. **Обновить локальные .env.docker**
   - `apps/premium-rosstil/.env.docker`
   - `apps/imot/.env.docker`
   - `apps/mandala/.env.docker`
   - `apps/dashboard/.env.docker`
   - `apps/kami/.env.docker`
   - и другие...

3. **Доставить на production** — перешифровать каждый затронутый файл и закоммитить:

   ```bash
   sops apps/<app>/.env.docker.enc
   git add apps/*/.env.docker.enc && git commit -m "chore: обновить SMTP-пароль"
   ```

4. **Запросить деплой затронутых приложений** — deploy-request к BlackCove
   (см. [deploy-coordination](/.claude/rules/deploy-coordination.md)).

   ⛔ Не деплой сам по SSH: `deploy-affected.sh` руками запрещён, а расшифровка `.enc`
   и перезапуск контейнеров происходят внутри штатного прогона.

## Reference

- `reference/maddy-config.md` — Полный конфиг Maddy
- `reference/dns-records.md` — DNS записи всех доменов
- `reference/troubleshooting.md` — Решение типичных проблем

## Ключевые файлы

- `libs/email/` — Shared библиотека @letar/email
- `apps/*/.env.docker` — SMTP настройки приложений
- `/opt/maddy/data/maddy.conf` — Конфиг Maddy на сервере (реально используемый; `config/maddy.conf`
  рядом — устаревший, не подключён к контейнеру)
- `apps/*/.env.docker.enc` — они же в зашифрованном виде (источник истины, коммитится)

## Документация

- См. `.claude/docs/email.md`
- См. `libs/email/README.md`
