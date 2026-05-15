# Email Troubleshooting

## Диагностика

### Проверка статуса Maddy

```bash
# Контейнер запущен?
ssh root@mail.letar.best "docker ps | grep maddy"

# Логи
ssh root@mail.letar.best "docker logs maddy --tail 100"

# Только ошибки
ssh root@mail.letar.best "docker logs maddy 2>&1 | grep -iE 'error|fail|reject'"
```

### Проверка подключения

```bash
# Telnet на порт 587
telnet mail.letar.best 587

# OpenSSL на порт 465
openssl s_client -connect mail.letar.best:465

# Из приложения
import { verifyConnection } from '@letar/email'
const ok = await verifyConnection()
```

### Проверка DNS

```bash
dig TXT letar.best           # SPF
dig TXT _dmarc.letar.best    # DMARC
dig TXT default._domainkey.letar.best  # DKIM
dig MX letar.best            # MX
dig -x 193.37.68.73          # PTR
```

## Типичные проблемы

### Письма не отправляются

**Симптомы:** `sendEmail()` возвращает ошибку или зависает

**Проверить:**

1. Доступен ли Maddy:

   ```bash
   ssh root@mail.letar.best "docker ps | grep maddy"
   ```

2. Правильный ли пароль в .env.docker:

   ```bash
   # Локально
   cat apps/<app>/.env.docker | grep SMTP_PASSWORD

   # Сравнить с production
   ssh root@194.164.245.97 "cat /home/deploy/lena/apps/<app>/.env.docker | grep SMTP_PASSWORD"
   ```

3. Логи Maddy:
   ```bash
   ssh root@mail.letar.best "docker logs maddy --tail 50 | grep -i auth"
   ```

**Решение:**

- Синхронизировать пароль: `./scripts/sync-env-docker.sh`
- Или обновить пароль на Maddy

### Письма попадают в спам

**Симптомы:** Письма доставляются, но в папку спам

**Проверить через mail-tester.com:**

1. Отправить письмо на адрес от mail-tester.com
2. Проверить оценку (цель: 9-10/10)

**Типичные причины:**

1. **Нет SPF записи:**

   ```bash
   dig TXT <domain>
   # Должен быть: v=spf1 a:mail.letar.best ~all
   ```

2. **Нет DKIM записи:**

   ```bash
   dig TXT default._domainkey.<domain>
   # Должен быть публичный ключ
   ```

3. **PTR не настроен:**

   ```bash
   dig -x 193.37.68.73
   # Должен резолвить в mail.letar.best
   ```

4. **IP в чёрном списке:**
   - Проверить на mxtoolbox.com/blacklists

### Ошибка аутентификации

**Симптомы:** `535 Authentication failed`

```bash
# Проверить пользователя существует
ssh root@mail.letar.best "docker exec maddy maddy creds list"

# Сбросить пароль
ssh root@mail.letar.best "docker exec -it maddy maddy creds password noreply@letar.best"

# Обновить .env.docker и синхронизировать
./scripts/sync-env-docker.sh
```

### DKIM подпись не работает

**Симптомы:** В заголовках нет DKIM-Signature

**Проверить:**

1. Домен в конфиге Maddy:

   ```bash
   ssh root@mail.letar.best "grep -A3 'sign dkim' /opt/maddy/config/maddy.conf"
   ```

2. Ключ существует:

   ```bash
   ssh root@mail.letar.best "docker exec maddy ls -la /data/dkim/"
   ```

3. DNS запись совпадает с ключом:

   ```bash
   # Публичный ключ на сервере
   ssh root@mail.letar.best "docker exec maddy cat /data/dkim/<domain>.key.pub"

   # DNS запись
   dig TXT default._domainkey.<domain>
   ```

### TLS ошибки

**Симптомы:** `first record does not look like a TLS handshake`

Это происходит когда клиент пытается STARTTLS на порт 465 (который уже TLS).

**Решение:**

- Порт 587 — используй STARTTLS
- Порт 465 — уже TLS (SMTPS)

```env
# Для порта 587
SMTP_PORT=587
SMTP_SECURE=false  # STARTTLS

# Для порта 465
SMTP_PORT=465
SMTP_SECURE=true   # Implicit TLS
```

### Письма не доходят до конкретного получателя

**Проверить:**

1. Логи доставки:

   ```bash
   ssh root@mail.letar.best "docker logs maddy | grep '<email@domain.com>'"
   ```

2. Возможные причины:
   - Получатель в blacklist
   - Домен получателя отклоняет по SPF/DKIM
   - Rate limiting на стороне получателя

### Timeout при отправке

**Симптомы:** Зависает на несколько минут

**Возможные причины:**

1. Порты заблокированы файрволом
2. DNS проблемы на сервере Maddy
3. Проблемы с исходящим подключением

**Проверить:**

```bash
# С mail сервера
ssh root@mail.letar.best "docker exec maddy ping -c 3 gmail.com"
ssh root@mail.letar.best "docker exec maddy dig MX gmail.com"
```

## Полезные команды

### Тестовое письмо через CLI

```bash
# Установить swaks
apt install swaks

# Отправить тестовое письмо
swaks --to test@gmail.com \
      --from noreply@letar.best \
      --server mail.letar.best:587 \
      --auth LOGIN \
      --auth-user noreply@letar.best \
      --auth-password '<password>' \
      --tls
```

### Проверка заголовков письма

В Gmail: откройте письмо → ... → Show original

Искать:

- `Received-SPF: pass`
- `DKIM-Signature: ...`
- `Authentication-Results: ... dkim=pass ... spf=pass`

### Мониторинг очереди

```bash
ssh root@mail.letar.best "docker exec maddy ls -la /data/state/queue/"
```

## Контакты для эскалации

- **Maddy документация:** https://maddy.email/
- **Проблемы с IP:** Обратиться к хостинг-провайдеру
- **Blacklist removal:** Зависит от конкретного списка
