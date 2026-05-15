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

| Компонент  | Хост                           | Назначение  |
| ---------- | ------------------------------ | ----------- |
| Maddy      | mail.letar.best (193.37.68.73) | SMTP сервер |
| Production | 194.164.245.97                 | Приложения  |

### Порты Maddy

| Порт | Протокол   | Назначение          |
| ---- | ---------- | ------------------- |
| 25   | SMTP       | Входящая почта      |
| 465  | SMTPS      | Отправка (TLS)      |
| 587  | Submission | Отправка (STARTTLS) |
| 993  | IMAPS      | Чтение почты        |

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

### Синхронизация .env.docker

```bash
./scripts/sync-env-docker.sh
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

4. **Синхронизировать на production**
   ```bash
   ./scripts/sync-env-docker.sh
   ```

## Workflow: Добавить новый домен

1. **Обновить конфиг Maddy**

   ```bash
   ssh root@mail.letar.best "nano /opt/maddy/config/maddy.conf"
   ```

   Добавить:
   - Домен в `$(local_domains)`
   - Блок `sign dkim` для домена

2. **Создать DKIM ключ (если отдельный домен)**

   ```bash
   ssh root@mail.letar.best "docker exec maddy maddy certs --algorithm rsa2048 /data/dkim/<domain>.key"
   ```

3. **Перезапустить Maddy**

   ```bash
   ssh root@mail.letar.best "docker restart maddy"
   ```

4. **Добавить DNS записи**
   - SPF: `v=spf1 a:mail.letar.best ~all`
   - DKIM: `default._domainkey` → публичный ключ
   - DMARC: `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best`

5. **Получить DKIM ключ**

   ```bash
   ssh root@mail.letar.best "docker exec maddy cat /data/dkim/<domain>.key.pub"
   ```

6. **Проверить через mail-tester.com**

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

3. **Синхронизировать на production**

   ```bash
   ./scripts/sync-env-docker.sh
   ```

4. **Перезапустить приложения**
   ```bash
   ssh root@194.164.245.97 "cd /home/deploy/letar && ./deploy-affected.sh"
   ```

## Reference

- `reference/maddy-config.md` — Полный конфиг Maddy
- `reference/dns-records.md` — DNS записи всех доменов
- `reference/troubleshooting.md` — Решение типичных проблем

## Ключевые файлы

- `libs/email/` — Shared библиотека @letar/email
- `apps/*/.env.docker` — SMTP настройки приложений
- `/opt/maddy/config/maddy.conf` — Конфиг Maddy на сервере
- `scripts/sync-env-docker.sh` — Скрипт синхронизации

## Документация

- См. `.claude/docs/email.md`
- См. `libs/email/README.md`
