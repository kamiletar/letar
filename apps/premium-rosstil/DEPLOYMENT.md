# Развёртывание Premium Rosstil через Docker

Полное руководство по развёртыванию приложения на продакшен сервере с использованием Docker и Nx.

## 🎯 Концепция деплоя

Этот подход оптимизирован для **продакшен сервера с git-репозиторием**:

1. **Сборка на сервере** с Nx - использует кеш и собирает только affected проекты
2. **Упаковка в Docker** - минимальный runtime-образ из готового билда
3. **Быстрые инкрементальные деплои** - 30 сек вместо 15 минут

### Преимущества

- ⚡ **В 5-10x быстрее** чем полная сборка в Docker
- 🎯 **Nx affected** - собирает только изменённые приложения
- 💾 **Nx cache** - переиспользует предыдущие сборки
- 🔄 **Shared cache** - все приложения в монорепозитории используют общий кеш
- 📦 **Минимальный Docker образ** - только runtime (~100 MB)

### Производительность

| Сценарий               | Время   |
| ---------------------- | ------- |
| Первый деплой          | ~5 мин  |
| Изменение 1 компонента | ~2 мин  |
| Без изменений (кеш)    | ~15 сек |
| Изменение shared lib   | ~3 мин  |

---

## 📁 Структура Docker в монорепозитории

В Nx монорепозитории каждое приложение имеет свою Docker-конфигурацию:

```
apps/
  premium-rosstil/
    ├── Dockerfile.production          # Упаковка готового билда
    ├── docker-compose.production.yml  # Оркестрация для production
    ├── deploy.sh                      # Автоматический деплой
    ├── .dockerignore                  # Исключения для Docker
    ├── .env.docker.example            # Пример переменных окружения
    └── DEPLOYMENT.md                  # Эта документация
```

### Несколько приложений в монорепозитории

Если у вас появится второе приложение (например, `apps/admin-panel/`), создайте для него аналогичную структуру:

```
apps/
  premium-rosstil/
    ├── Dockerfile.production
    ├── docker-compose.production.yml
    ├── deploy.sh
    └── .env.docker
  admin-panel/
    ├── Dockerfile.production
    ├── docker-compose.production.yml
    ├── deploy.sh
    └── .env.docker
```

В `docker-compose.production.yml` второго приложения измените:

- Порты (например, `3001:3000`)
- Имена контейнеров (`admin-panel-app`, `admin-panel-postgres`)
- Имена volumes (`admin_panel_postgres_data`)
- Имя базы данных

Это позволит запускать оба приложения одновременно без конфликтов.

---

## 📋 Требования

### ПО на сервере

- **Node.js 24**
- **Bun** (package manager)
- **Nx** (глобально)
- **Docker & Docker Compose**

### Проверка установки

```bash
node --version  # должно быть v24.x
bun --version
nx --version
docker --version
docker compose version
```

---

## 🚀 Первоначальная настройка

### 1. Клонирование репозитория

```bash
git clone <your-repo-url> lena
cd lena
```

### 2. Установка зависимостей

```bash
bun install
```

### 3. Настройка переменных окружения

```bash
cd apps/premium-rosstil

# Скопировать пример файла
cp .env.docker.example .env.docker

# Отредактировать значения
nano .env.docker
```

**Примечание:** Скрипт `deploy.sh` уже имеет права на выполнение в git, дополнительные действия не требуются.

**Обязательные параметры в `.env.docker`:**

```env
# База данных
DB_PASSWORD=создайте_надёжный_пароль

# Секретный ключ для Auth.js (сгенерируйте новый!)
AUTH_SECRET=ваш_секретный_ключ_32_символа

# URL вашего приложения
NEXTAUTH_URL=https://yourdomain.com

# OAuth credentials
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_YANDEX_ID=...
AUTH_YANDEX_SECRET=...
```

**Генерация AUTH_SECRET:**

```bash
openssl rand -base64 32
```

---

## 🎬 Деплой

### Автоматический деплой всех affected приложений (рекомендуется)

Используйте универсальный скрипт из корня монорепозитория:

```bash
# Из корня монорепозитория
./deploy-affected.sh
```

**Скрипт автоматически:**

1. ✅ Подтянет изменения из git
2. ✅ Установит зависимости
3. ✅ Определит все affected приложения
4. ✅ Для каждого приложения:
   - Сгенерирует Prisma Client и ZenStack
   - Соберёт с Nx cache
   - Упакует в Docker образ
   - Задеплоит с миграциями
5. ✅ Покажет итоговую статистику

**Деплой только конкретного приложения:**

```bash
./deploy-affected.sh --app premium-rosstil
```

**Посмотреть что будет задеплоено (dry-run):**

```bash
./deploy-affected.sh --dry-run
```

**Все опции:**

```bash
./deploy-affected.sh --help
```

**Пример вывода:**

```bash
╔════════════════════════════════════════════════════════╗
║  🚀 Nx Monorepo Deployment with Docker & Cache        ║
╚════════════════════════════════════════════════════════╝

📥 Pulling latest changes from git...
📦 Installing dependencies...
🔍 Detecting affected applications...

Affected applications:
  • premium-rosstil

╔════════════════════════════════════════════════════════╗
║  Deploying: premium-rosstil                           ║
╚════════════════════════════════════════════════════════╝

🔧 Generating Prisma Client and ZenStack...
🔨 Building premium-rosstil with Nx cache...
✅ Build completed
🐳 Building Docker image...
✅ Docker image built: premium-rosstil:latest
🔄 Deploying containers...
✅ Deployment completed!

╔════════════════════════════════════════════════════════╗
║  📊 Deployment Summary                                ║
╚════════════════════════════════════════════════════════╝

✅ Successfully deployed (1):
  • premium-rosstil

🎉 All deployments completed successfully!
```

### Ручной деплой

```bash
# Из корня монорепозитория
cd /path/to/lena

# 1. Обновить код
git pull origin main

# 2. Установить зависимости
bun install

# 3. Генерация Prisma/ZenStack
nx zenstack:generate premium-rosstil
nx db:generate premium-rosstil

# 4. Сборка (только affected, с кешем)
nx build premium-rosstil

# 5. Собрать Docker образ из готового билда
cd apps/premium-rosstil
docker build -f Dockerfile.production -t premium-rosstil:latest .

# 6. Деплой
docker compose -f docker-compose.production.yml --env-file .env.docker up -d --force-recreate app

# 7. Просмотр логов
docker compose -f docker-compose.production.yml logs -f app
```

---

## 🔧 Управление

### Просмотр логов

```bash
cd apps/premium-rosstil

# Логи приложения
docker compose -f docker-compose.production.yml logs -f app

# Логи базы данных
docker compose -f docker-compose.production.yml logs -f db

# Все логи
docker compose -f docker-compose.production.yml logs -f
```

### Остановка приложения

```bash
docker compose -f docker-compose.production.yml stop
```

### Перезапуск приложения

```bash
docker compose -f docker-compose.production.yml restart app
```

### Остановка и удаление контейнеров

```bash
docker compose -f docker-compose.production.yml down
```

### Проверка статуса

```bash
# Статус контейнеров
docker compose -f docker-compose.production.yml ps

# Использование ресурсов
docker stats premium-rosstil-app

# Здоровье базы данных
docker compose -f docker-compose.production.yml exec db pg_isready -U lena_user
```

---

## 🗄️ База данных

### Миграции

Миграции применяются автоматически при старте контейнера. Если нужно применить миграции вручную:

```bash
docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

### Резервное копирование

```bash
cd apps/premium-rosstil

# Создать бэкап
docker compose -f docker-compose.production.yml exec db pg_dump -U lena_user lena_premium > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker compose -f docker-compose.production.yml exec -T db psql -U lena_user lena_premium < backup_20250121_120000.sql
```

### Доступ к БД через psql

```bash
docker compose -f docker-compose.production.yml exec db psql -U lena_user -d lena_premium
```

### Prisma Studio

```bash
# Запустить Prisma Studio на сервере (пробросить порт 5555)
# Затем открыть в браузере http://your-server:5555
DATABASE_URL="postgresql://lena_user:password@localhost:5432/lena_premium" npx prisma studio
```

---

## 🌐 Продакшен деплой с SSL

### Nginx с Let's Encrypt

#### 1. Установка Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

#### 2. Конфигурация Nginx

Создайте файл `/etc/nginx/sites-available/premium-rosstil`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 3. Активация конфигурации

```bash
sudo ln -s /etc/nginx/sites-available/premium-rosstil /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Получение SSL сертификата

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 5. Обновление переменных окружения

Обновите `NEXTAUTH_URL` в `.env.docker`:

```env
NEXTAUTH_URL=https://yourdomain.com
```

#### 6. Перезапуск приложения

```bash
cd apps/premium-rosstil
docker compose -f docker-compose.production.yml --env-file .env.docker up -d --force-recreate app
```

### Caddy (альтернатива, проще)

Caddy автоматически настраивает SSL. Создайте `Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

Запустите Caddy:

```bash
sudo caddy run --config Caddyfile
```

---

## 🔍 Устранение неполадок

### Контейнер не запускается

```bash
# Проверьте логи
docker compose -f docker-compose.production.yml logs app

# Проверьте переменные окружения
docker compose -f docker-compose.production.yml config
```

### База данных недоступна

```bash
# Проверьте статус
docker compose -f docker-compose.production.yml ps db

# Проверьте логи
docker compose -f docker-compose.production.yml logs db

# Пересоздайте контейнер БД
docker compose -f docker-compose.production.yml down db
docker compose -f docker-compose.production.yml up -d db
```

### Ошибки миграции

```bash
# Войдите в контейнер
docker compose -f docker-compose.production.yml exec app sh

# Запустите миграции вручную
npx prisma migrate deploy

# Проверьте статус
npx prisma migrate status
```

### Nx cache не работает

```bash
# Проверьте что в кеше
ls -lh ../../.nx/cache

# Очистите кеш если нужно
nx reset

# Проверьте affected проекты
nx show projects --affected --base=origin/main
```

### Out of Memory при сборке

```bash
# Увеличьте лимит памяти для Node.js
NODE_OPTIONS="--max-old-space-size=4096" nx build premium-rosstil
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Очистка кеша сборки
docker builder prune -a

# Полная очистка (осторожно!)
docker system prune -a --volumes
```

---

## 📊 Мониторинг

### Логирование

Контейнер уже настроен на ротацию логов (10MB, 3 файла). Конфигурация в `docker-compose.production.yml`:

```yaml
logging:
  driver: 'json-file'
  options:
    max-size: '10m'
    max-file: '3'
```

### Использование ресурсов

```bash
# Реалтайм статистика
docker stats premium-rosstil-app

# Использование диска
docker system df
```

### Автоматический перезапуск

Контейнеры уже настроены на автоматический перезапуск (`restart: always` в docker-compose.production.yml).

---

## 🔐 Безопасность

### Checklist

- [ ] Изменён пароль базы данных
- [ ] Сгенерирован новый AUTH_SECRET
- [ ] Настроен SSL/TLS (HTTPS)
- [ ] Firewall настроен (только 80, 443 порты открыты)
- [ ] Регулярные бэкапы базы данных
- [ ] Обновления безопасности применяются регулярно
- [ ] OAuth credentials в безопасности
- [ ] `.env.docker` не коммитится в git (добавлен в .gitignore)

### Рекомендации

1. Используйте сильные пароли (минимум 20 символов)
2. Ограничьте доступ к серверу по SSH ключам
3. Настройте fail2ban
4. Регулярно обновляйте Docker и образы
5. Мониторьте логи на подозрительную активность
6. Используйте managed database для продакшена (AWS RDS, DigitalOcean)

---

## 🚀 Продвинутые техники

### Деплой нескольких приложений

```bash
# Собрать все affected приложения за раз
nx affected:build --base=origin/main
! Эта секция устарела. Проанализируй и обнови

# Деплоить каждое
cd apps/premium-rosstil && ./deploy.sh
cd ../admin-panel && ./deploy.sh
```

### Nx Cloud (опционально)

Подключите Nx Cloud для remote cache - кеш будет работать между разными серверами:

```bash
nx connect-to-nx-cloud
```

Теперь деплой на staging может переиспользовать кеш с dev-сервера!

### Zero-downtime deployment

Docker Compose автоматически делает graceful restart при использовании `--wait`:

```bash
docker compose -f docker-compose.production.yml up -d --wait
```

### Внешняя база данных

Для продакшена рекомендуется использовать managed database:

```yaml
# docker-compose.production.yml
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:pass@external-db-host:5432/dbname
    # Удалите секцию db и depends_on
```

---

## 📚 Дополнительные материалы

- [Nx Caching](https://nx.dev/concepts/how-caching-works) - Как работает кеширование в Nx
- [Next.js Deployment](https://nextjs.org/docs/deployment) - Официальная документация Next.js
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose -f docker-compose.production.yml logs -f`
2. Проверьте документацию: [Next.js](https://nextjs.org/docs), [Prisma](https://www.prisma.io/docs), [Nx](https://nx.dev)
3. Создайте issue в репозитории проекта

---

**Версия документации:** 2.0
**Последнее обновление:** 2025-11-21
**Node.js версия:** 24
**Next.js версия:** 16
**Nx версия:** 22
