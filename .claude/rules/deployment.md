---
paths: 'deploy-affected.sh, **/Dockerfile, **/docker-compose*, **/prisma/migrations/**'
---

# Правила деплоя

## ⛔ ЗАПРЕЩЕНО на локальной dev машине

**НИКОГДА не запускай эти команды локально:**

```bash
# ❌ ЗАПРЕЩЕНО локально
./deploy-affected.sh
./deploy-affected.sh --app <любое-приложение>
prisma migrate deploy  # Применение миграций на production
```

## ✅ Правильный workflow

1. **Закоммить и запушить** изменения в git
2. **Подключиться к серверу** по SSH
3. **Запустить деплой на сервере**

```bash
# Определи правильный сервер
# s1.letar.best: premium-rosstil, imot, dashboard-agent
# s2.letar.best: dashboard, driving-school, auth-hub, archetest, grandslamcup, time, form-docs, form-example, aira-web, mandala, kami, pravda, umami, animatrona-landing, animatrona-tracker, kami-key-the-landing, letar-landing, dsperevod, aboi

# ⚠️ ВАЖНО: на Windows ОБЯЗАТЕЛЬНО использовать Windows SSH, не bash ssh!
# Причина: Git Bash SSH (/usr/bin/ssh) при каждом вызове создаёт ssh-agent.exe,
# который никогда не завершается. 42+ зомби-агентов → "No buffer space available".
# Хук validate-bash.js блокирует bare ssh автоматически.
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s1.letar.best "cd /home/deploy/letar && ./deploy-affected.sh --app <app>"
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s2.letar.best "cd /home/deploy/letar && ./deploy-affected.sh --app <app>"
```

> Если git pull падает с "insufficient permission" — починить права:
>
> ```bash
> /c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa root@s1.letar.best "chown -R deploy:deploy /home/deploy/letar/.git"
> ```

## ⛔ ЗАПРЕЩЕНО на production серверах

**НИКОГДА не делай git commit на серверах!** Это создаёт divergent branches и ломает `deploy-affected.sh --skip-git`.

```bash
# ❌ ЗАПРЕЩЕНО на сервере
git commit    # Создаёт коммит, которого нет в origin — ветки разойдутся
git add       # Подготовка к коммиту — не нужно на сервере
bun install   # Без --frozen-lockfile может изменить lockfile
```

Если `bun install --frozen-lockfile` падает — обнови `bun.lock` **локально**, закоммить и запушь.

## Локальные команды (можно)

```bash
# ✅ Разработка
nx dev <app>
nx build <app>
nx test <app>

# ✅ База данных (dev)
nx db:push <app>           # Применить schema.zmodel к локальной БД
nx db:studio <app>         # Открыть Prisma Studio

# ✅ Миграции (создание)
nx db:migrate <app>        # Создать миграцию (НЕ применять на prod!)
```

## Миграции

### ⛔ НИКОГДА не создавай миграции вручную!

**Запрещено:**

- `prisma migrate diff --script` → ручное создание SQL файлов
- Копирование SQL в `prisma/migrations/` вручную
- Любые обходные пути для drift detection

### ✅ Правильный workflow миграций

1. **Если `nx db:migrate` падает с drift** — сделай `prisma migrate reset` на локальной dev БД (это безопасно, данные dev не важны)
2. После reset — повторить `nx db:migrate <app> -- --name <migration_name>`
3. Закоммить сгенерированные файлы миграции
4. Применяй на сервере через `deploy-affected.sh` (автоматически)

```bash
# ✅ Создание миграции
nx db:migrate <app> -- --name <имя_миграции>

# Если drift → reset dev БД и повторить
cd apps/<app> && npx prisma migrate reset --schema src/generated/schema.prisma --force
nx db:migrate <app> -- --name <имя_миграции>
```

- **Локальная dev БД** — можно безнаказанно делать reset, данные не важны
- **Production** — миграции применяются только через `deploy-affected.sh`
