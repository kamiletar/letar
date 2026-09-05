# Email

Этот документ описывает систему отправки email в монорепозитории.

## Архитектура

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Приложения    │─────▶│   @letar/email    │─────▶│  Maddy Server   │
│ (Next.js apps)  │      │  (shared lib)    │      │ mail.letar.best │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

- **@letar/email** — shared библиотека с шаблонами и провайдером
- **Maddy** — self-hosted почтовый сервер на mail.letar.best
- **Nodemailer** — SMTP клиент под капотом

## Серверы

| Назначение      | Хост            | IP            | Порты             |
| --------------- | --------------- | ------------- | ----------------- |
| Почтовый сервер | mail.letar.best | 31.56.180.161 | 25, 465, 587, 993 |
| Production      | 194.164.245.97  | —             | —                 |

## Конфигурация

### Общие переменные (одинаковые для всех приложений)

```env
SMTP_HOST=mail.letar.best
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@letar.best
SMTP_PASSWORD=<пароль>
```

### Индивидуальные переменные (для каждого приложения)

```env
SMTP_FROM_EMAIL=noreply@<app>.letar.best
SMTP_FROM_NAME="Название приложения"
```

### Таблица конфигураций

| Приложение     | SMTP_FROM_EMAIL                | SMTP_FROM_NAME            |
| -------------- | ------------------------------ | ------------------------- |
| driving-school | noreply@_(коммерческий домен)_ | _(коммерческое название)_ |
| kami           | noreply@kami.letar.best        | Kami                      |
| mandala        | noreply@mandala.letar.best     | Mandala                   |
| dashboard      | noreply@dashboard.letar.best   | Dashboard                 |
| animatrona     | noreply@animatrona.letar.best  | Animatrona                |
| domwellbes     | noreply@domwellbes.letar.best  | DomWellbes                |

## Использование

### Базовый пример

```typescript
import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'

// Верификация email
await sendVerificationEmail({
  to: 'user@example.com',
  userName: 'Иван',
  verificationUrl: 'https://app.com/verify/token123',
})

// Сброс пароля
await sendPasswordResetEmail({
  to: 'user@example.com',
  userName: 'Иван',
  resetUrl: 'https://app.com/reset/token123',
})
```

### Интеграция с Better Auth

```typescript
// lib/auth.ts
import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'

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

  emailAndPassword: {
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
      })
    },
  },
})
```

### Доступные функции

| Функция                  | Описание                  |
| ------------------------ | ------------------------- |
| `sendVerificationEmail`  | Подтверждение email       |
| `sendPasswordResetEmail` | Сброс пароля              |
| `sendMagicLinkEmail`     | Magic Link вход           |
| `sendInvitationEmail`    | Приглашение в организацию |
| `sendGenericEmail`       | Произвольное письмо       |

## Разработка

### Локальный режим (Mailhog)

```bash
# Запустить Mailhog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

```env
EMAIL_USE_MAILHOG=true
```

Письма доступны на http://localhost:8025

### Проверка подключения

```typescript
import { verifyConnection } from '@letar/email'

const isConnected = await verifyConnection()
console.log(isConnected ? 'SMTP OK' : 'SMTP недоступен')
```

## Maddy сервер

### Подключение

```bash
ssh root@mail.letar.best
```

### Управление пользователями

```bash
# Список пользователей
docker exec maddy maddy creds list

# Создать пользователя
docker exec -it maddy maddy creds create user@letar.best

# Изменить пароль
docker exec -it maddy maddy creds password user@letar.best
```

⚠️ `creds create` не создаёт почтовый ящик, только SMTP/IMAP-логин — без второй команды
`docker exec maddy maddy imap-acct create user@letar.best` письмо НА этот адрес отклоняется
`501 5.1.1 User does not exist`. Разбор —
[maddy-creds-create-missing-imap-acct.md](/.claude/docs/maddy-creds-create-missing-imap-acct.md).

### Просмотр логов

```bash
docker logs -f maddy
```

### Конфигурация

Конфиг находится в `/opt/maddy/data/maddy.conf` (не `config/maddy.conf` — тот файл устарел и не
подключён к контейнеру, см. `.claude/skills/email-maddy/reference/maddy-config.md`)

```bash
# После изменений
docker restart maddy
```

## DNS записи

Для каждого домена отправки нужны записи:

| Тип | Имя                 | Значение                                              |
| --- | ------------------- | ----------------------------------------------------- |
| TXT | @ или поддомен      | `v=spf1 a:mail.letar.best ~all`                       |
| TXT | default.\_domainkey | `v=DKIM1; k=rsa; p=<КЛЮЧ>`                            |
| TXT | \_dmarc             | `v=DMARC1; p=quarantine; rua=mailto:admin@letar.best` |

### Получить DKIM ключ

```bash
ssh root@mail.letar.best "docker exec maddy cat /data/dkim/letar.best.key.pub"
```

## Добавление нового домена

1. **Maddy конфиг** — добавить домен в `$(local_domains)` и блок `sign dkim`
2. **DNS записи** — SPF, DKIM, DMARC
3. **.env.docker** — настроить `SMTP_FROM_EMAIL` и `SMTP_FROM_NAME`
4. **Перезапуск** — `docker restart maddy`

## Доставка SMTP-настроек на production

⛔ `./scripts/sync-env-docker.sh` **устарел** — не используй.

Меняешь `SMTP_*` в зашифрованном файле, коммитишь, дальше доставку делает деплой:

```bash
sops apps/<app>/.env.docker.enc     # правишь SMTP_FROM_EMAIL / SMTP_PASSWORD
git add apps/<app>/.env.docker.enc && git commit -m "chore(<app>): обновить SMTP"
```

Затем — deploy-request к deploy-agent-dev. Подробности: [secret-manager.md](/.claude/docs/secret-manager.md).

## Troubleshooting

### Письма не отправляются

```bash
# Проверить логи Maddy
ssh root@mail.letar.best "docker logs maddy --tail 50"

# Проверить подключение
telnet mail.letar.best 587
```

### Письма попадают в спам

1. Проверить SPF: `dig TXT <domain>`
2. Проверить DKIM: `dig TXT default._domainkey.<domain>`
3. Проверить через mail-tester.com

### Ошибка аутентификации

```bash
# Проверить пароль в .env.docker
# Обновить пароль на Maddy
ssh root@mail.letar.best "docker exec -it maddy maddy creds password noreply@letar.best"
```

### ⚠️ IDN/кириллический домен отправителя — `authorize_sender` сравнивает Unicode-форму, не punycode

**Симптомы:** приложение шлёт письма как `noreply@<кириллический-домен>` через общего
SMTP-пользователя `noreply@letar.best`, все письма отклоняются с `553 5.7.0 Unauthorized use of
sender address` (видно в `docker logs maddy` как `"check":"check.authorize_sender"`), хотя домен
уже есть в `$(local_domains)` конфига и DKIM-ключ существует.

**Причина:** доступ проверяет `check.authorize_sender` через таблицу `user_to_email` —
`/opt/maddy/data/sender_map.txt` (`ключ = SASL-логин, значение = список разрешённых адресов
отправителя через запятую`, см. [reference/authorize_sender](https://maddy.email/reference/checks/authorize_sender/)).
Домен из письма Maddy [внутренне нормализует в Unicode](https://maddy.email/internals/unicode/),
а не оставляет в ACE/punycode-форме (`xn--...`) — если строка в `sender_map.txt` записана как
punycode, сравнение с уже раскодированным Unicode-доменом не совпадает, и правило срабатывает как
для чужого адреса.

**Фикс:** прописывать в `sender_map.txt` домен в Unicode-форме (кириллицей), не punycode:

```
noreply@letar.best: noreply@letar.best, noreply@<кириллический-домен-без-punycode>
```

**Перезапуск не нужен** — `table.file` (в т.ч. `sender_map.txt`) перечитывается автоматически
каждые ~15 секунд при изменении mtime файла, невалидный синтаксис просто не применяется
([reference/table/file](https://maddy.email/reference/table/file/)). Перед правкой сделай копию:
`cp sender_map.txt sender_map.txt.bak-$(date +%Y%m%d%H%M%S)`.

Проверить формат значения в таблице: кроме точного адреса допустим просто домен (тогда разрешён
любой ящик на нём) или `*` (любой адрес) — см. ту же страницу reference.

## Полезные ссылки

- **Библиотека:** `libs/email/README.md`
- **Skill:** → Skill: `email-maddy`
- **Документация Maddy:** https://maddy.email/
