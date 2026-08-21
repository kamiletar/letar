# Окружение и стек

## ⚠️ Claude Code CLI (Текущее окружение)

**КРИТИЧНО: Вы работаете в Claude Code CLI на нативном Windows (без WSL).**

- **Рабочая директория:** `C:\web\letar` (Windows путь)
- **IDE:** WebStorm (нативный Windows)
- **Bash команды:** Запускай напрямую без `cd` - ты уже в директории проекта
- **Nx глобальный:** Используй `nx` напрямую, не `npx nx`
- **SSH:** Только Windows SSH! См. секцию ниже

### SSH на Windows (КРИТИЧНО)

⚠️ **Git Bash SSH (`/usr/bin/ssh`) плодит зомби `ssh-agent.exe`!**

Каждый вызов `ssh` из Git Bash создаёт новый `ssh-agent.exe`, который **никогда не завершается**. За N команд → N зомби-агентов → исчерпание системных ресурсов → **"No buffer space available"** на всю систему (SSH, curl, git push — всё ломается).

**Правила:**

- **SSH команды:** Только `/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa`
- **git push/pull:** Используют Git Bash SSH, но `~/.bashrc` управляет ОДНИМ ssh-agent (через PID-check)
- **Хук `validate-bash.js`:** Блокирует bare `ssh` команды и подсказывает правильную
- **Мониторинг:** Если в Task Manager >5 `ssh-agent.exe` — `taskkill /F /IM ssh-agent.exe`

```bash
# ✅ Правильно — Windows SSH
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@s2.letar.best "command"

# ❌ Заблокировано — Git Bash SSH (плодит зомби)
ssh deploy@s2.letar.best "command"
```

### Правильное использование команд:

```bash
# ✅ Правильно - запуск напрямую в директории проекта
nx lint driving-school
nx build driving-school
git add . && git commit -m "message"

# ❌ Неправильно - не нужны абсолютные пути
cd C:\web\letar && nx lint driving-school
```

## Технологический стек

### Основной фреймворк

- **Монорепо:** Nx 22.3.3
- **Фреймворк:** Next.js 16.1.1 (App Router)
- **React:** 19.2.3
- **TypeScript:** 6.0.2
- **Пакетный менеджер:** Bun

### UI и стилизация

- **UI библиотека:** Chakra UI v3.30.0
- **Стилизация:** Emotion (используется Chakra UI)
- **Анимации:** Framer Motion 12.23.26
- **Иконки:** react-icons 5.5.0
- **Шрифты:** Next.js Google Fonts (Cormorant_Garamond, Tenor_Sans)

### Бэкенд и база данных

- **База данных:** PostgreSQL
- **ORM:** Prisma 7.6.0
- **Авторизация:** ZenStack v3.5.3 (ORM с политиками доступа)
- **Аутентификация:** Better Auth с Google, Yandex, VK, Telegram

### Формы и валидация

- **Формы:** @letar/forms 0.51.0 (TanStack Form)
- **Legacy формы:** Conform 1.15.0 (для устаревших форм)
- **Валидация:** Zod v4.2.1 (`zod/v4`)
- **Zod схемы:** Автогенерируются из ZenStack в `src/generated/zod/`
- **Оффлайн-формы:** `@letar/forms/offline` (useOfflineForm, FormOfflineIndicator)

### Дополнительные библиотеки

- **Drag & Drop:** dnd-kit (core, sortable, utilities)
- **Лайтбокс:** yet-another-react-lightbox 3.28.0
- **Обрезка изображений:** react-easy-crop (для загрузки аватаров)
- **DaData:** Автодополнение адресов для российских адресов
- **Виртуализация:** @tanstack/react-virtual 3.13.18 (эффективный рендеринг больших списков)

### Тестирование и качество

- **Unit/Integration тесты:** Vitest 4.1.2 (заменил Jest)
- **E2E тесты:** Playwright 1.59.1
- **Линтинг:** ESLint 9.39.4 с TypeScript ESLint 8.50.1
- **Проверка типов:** `nx typecheck:tsgo` (tsgo — в 9-38x быстрее tsc)

**Конфигурация Vitest:**

- Каждый проект с тестами имеет `vitest.config.ts` и `vitest.setup.ts`
- Используем `@testing-library/jest-dom/vitest` для матчеров
- Для React компонентов: `environment: 'jsdom'`, `@vitejs/plugin-react`
- Для Node.js утилит: `environment: 'node'`

**Пример запуска тестов:**

```bash
nx test driving-school       # Запустить тесты проекта
nx run-many -t test           # Запустить все тесты
```

### Аналитика

- **Яндекс Метрика** - интеграция аналитики (через библиотеку `yandex-metrika`)

## MCP серверы

**ВАЖНО:** Всегда используй MCP серверы для актуальной документации вместо предположений о знаниях.

Полный и актуальный список — [mcp-servers.md](/.claude/docs/mcp-servers.md). Здесь список не
дублируется намеренно: прошлая версия (короткий список из 6 серверов) успела устареть и указывать
на `inkeepMcp`, снятый с ротации 2026-08-10 (см. ревизию в CLAUDE.md) — дубли одного и того же
факта в двух файлах расходятся молча.

**Воркфлоу Context7 (`resolve-library-id` → `get-library-docs`)** — см.
[mcp-servers.md § Воркфлоу работы с Context7](/.claude/docs/mcp-servers.md).

## Окружение пользователя

- **ОС:** Windows (нативный, без WSL)
- **IDE:** WebStorm (нативный Windows)
- **Nx:** Установлен глобально (используй `nx` напрямую, не `npx nx`)
- **Dev сервер:** Скорее всего запущен (попроси пользователя остановить перед билдами)

## Android SDK, JDK и ADB

**Путь к Android SDK:** `/c/Android/Sdk` (в Bash) или `C:\Android\Sdk` (в Windows)

**Путь к JDK:** `/c/Android/jdk-17.0.13+11` (в Bash) или `C:\Android\jdk-17.0.13+11` (в Windows)

**Для сборки Android-приложений** нужно установить JAVA_HOME:

```bash
# В Bash (Git Bash / MSYS2)
export JAVA_HOME="/c/Android/jdk-17.0.13+11"
export PATH="$JAVA_HOME/bin:$PATH"

# В PowerShell
$env:JAVA_HOME = "C:\Android\jdk-17.0.13+11"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

**ADB команды:**

```bash
# Проверка устройств
/c/Android/Sdk/platform-tools/adb.exe devices

# Установка APK
/c/Android/Sdk/platform-tools/adb.exe install -r "path/to/app.apk"

# Запуск приложения
/c/Android/Sdk/platform-tools/adb.exe shell am start -n com.letar.animatrona.mobile/.MainActivity

# Логи приложения
/c/Android/Sdk/platform-tools/adb.exe logcat -s ReactNativeJS:V SyncVideoView:V

# Если несколько устройств — указать серийный номер
/c/Android/Sdk/platform-tools/adb.exe -s SERIAL_NUMBER install -r app.apk
```

**React Native Mobile сборка:**

```bash
# ⚠️ ВАЖНО: Для сборки нужны JAVA_HOME и node в PATH
export JAVA_HOME="/c/Android/jdk-17.0.13+11"
export PATH="$JAVA_HOME/bin:/c/Users/Kami/AppData/Local/fnm_multishells/10600_1769868342880:$PATH"

# Сборка debug APK
cd apps/animatrona-mobile/android && ./gradlew assembleDebug

# APK: apps/animatrona-mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Установка на устройство
/c/Android/Sdk/platform-tools/adb.exe install -r apps/animatrona-mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Запуск приложения
/c/Android/Sdk/platform-tools/adb.exe shell am start -n com.letar.animatrona.mobile/.MainActivity
```

### Завершение процессов на Windows

**⚠️ ВАЖНО:** `taskkill` в Bash ломается из-за парсинга слэшей. Используй PowerShell:

```bash
# ✅ Правильно - через PowerShell
powershell "Stop-Process -Id 48656 -Force"

# ❌ Неправильно - taskkill с /F ломается
taskkill /F /PID 48656  # Ошибка: неправильный параметр 'F:/'
```

Чтобы найти PID процесса по порту:

```bash
netstat -ano | findstr :3003 | findstr LISTENING
# TCP    0.0.0.0:3003    0.0.0.0:0    LISTENING    48656
```

## Основные команды

### Разработка

```bash
nx dev driving-school        # Запустить dev сервер
nx build driving-school      # Собрать продакшн бандл
nx start driving-school      # Запустить продакшн сервер
```

### База данных и Prisma

```bash
nx zenstack:generate driving-school  # Генерация Prisma + Zod схем
nx db:push driving-school            # Отправить схему в БД (dev)
nx db:migrate driving-school         # Создать миграцию (prod)
nx db:studio driving-school          # Открыть Prisma Studio
```

### Форматирование, линтинг и тесты

```bash
nx dprint driving-school         # Форматирование кода (dprint)
nx lint driving-school           # Запустить линтинг
nx typecheck:tsgo driving-school # Проверка типов (быстро!)
nx test driving-school           # Запустить тесты
nx e2e driving-school-e2e        # Запустить E2E тесты
```

### Nx Sync — в letar отключён, синхронизировать references нечем

⛔ **Генератор `@nx/js:typescript-sync` намеренно выключен** в [nx.json](/nx.json)
(`sync.disabledTaskSyncGenerators`), а `nx sync` / `nx sync:check` не вызываются ни в CI, ни в
git-хуках. Автозапуска «после генераторов, при build и т.д.» тоже нет — его делал бы ровно этот
отключённый генератор.

Практически это значит: **совет «после добавления библиотеки запусти `nx sync`» в этом репо не
работает** — `references` в `tsconfig.json` правятся руками либо не правятся вовсе. И правок этих
обычно не требуется: почему рассинхрон `paths` ↔ `references` ничего не ломает — ниже, в разделе
«⚠️ Всё вышесказанное относится к `tsc --build` — а приложения его не используют».

Дальше — справка о том, что делает Nx **вообще** (в репозиториях, где генератор включён), а не
руководство к действию здесь:

```bash
nx sync --check               # Проверить актуальность TypeScript project references
nx sync                       # Обновить references во всех tsconfig.json
```

- Поддерживает `references` в `tsconfig.json` актуальными на основе project graph
- Добавляет/удаляет references при изменении зависимостей между проектами
- Работает через генератор `@nx/js:typescript-sync`

## Dev-порты приложений

Ручной таблицы портов в монорепо **нет и заводить её не нужно** — она протухает при каждом новом
приложении. Источник истины — сами файлы приложений, а порт для нового приложения подбирает
генератор (`nx g @letar/generators:new-app <name>` без `--port`).

**Порт живёт в одном из трёх мест** (исторически, см. [env-files](/.claude/rules/env-files.md)):

| Где                       | Как выглядит                    | Кто так делает                                 |
| ------------------------- | ------------------------------- | ---------------------------------------------- |
| `apps/<app>/.env`         | `PORT=3012`                     | большинство приложений — предпочтительный путь |
| `apps/<app>/project.json` | `"command": "next dev -p 3008"` | лендинги                                       |
| `apps/<app>/.env.local`   | `PORT=3002`                     | приложения, чей порт не коммитится             |

Занятые порты одной командой:

```bash
{ grep -hoE '^PORT=[0-9]+' apps/*/.env apps/*/.env.local 2>/dev/null; grep -hoE '\-p [0-9]{4}' apps/*/project.json 2>/dev/null; } | grep -oE '[0-9]{4}' | sort -un
```

**3000 не занимаем** — это дефолт `next dev` без `-p`, на нём поднимется любое приложение,
запущенное мимо конвенции. Новые приложения продолжают ряд от максимального занятого порта.

Список приложений с портами также отдаёт MCP `nx_workspace`.

### Порт знает не только приложение — сверка автоматическая

Кроме самого приложения, порт продублирован ещё в двух местах, и ни одно из них не читает
`.env`:

| Где                            | Как выглядит                                 | Кто это читает                          |
| ------------------------------ | -------------------------------------------- | --------------------------------------- |
| `.claude/commands/<app>.md`    | `**Порт:** 3024`                             | агент, когда открывает приложение       |
| `apps/auth-hub/prisma/seed.ts` | `http://localhost:3024/...` в `redirectUrls` | Better Auth при локальном входе по OIDC |

**Расхождение молчаливое и живёт долго.** Приложение поднимается как ни в чём не бывало,
командный файл просто врёт, а вход по OIDC падает с `invalid redirect_uri` — далеко от места
правки и только локально, так что на прод это не выходит. Прецедент: `studio` переехал
3020 → 3024 (3020 занял `form-docs`), а seed Ключницы и командный файл остались на 3020 —
локальный вход в студию был сломан, пока не наткнулись руками.

Дрейф ловит guard-тест `libs/infra-config/src/app-ports.guard.spec.ts` — он читает реальный
монорепо и падает с именем виноватого файла:

```bash
nx test infra-config
```

⚠️ **Правка seed Ключницы не действует сама по себе.** Локальные приложения ходят в **прод**-
Ключницу (`OIDC_DISCOVERY_URL=https://auth.letar.best/...`), поэтому `localhost`-адрес должен
лежать в боевой БД: после изменения `seed.ts` нужен re-seed прод-инстанса `auth-hub`
(`deploy_app` с `seed: true` — задача deploy-agent-dev, см.
[deploy-coordination](/.claude/rules/deploy-coordination.md)).

## Переменные окружения

**Аутентификация (Better Auth):**

- `DATABASE_URL` - строка подключения к PostgreSQL
- `BETTER_AUTH_SECRET` - секрет для шифрования сессий (минимум 32 символа)
- `BETTER_AUTH_URL` - базовый URL приложения (для auth callbacks)
- `NEXT_PUBLIC_APP_URL` - публичный URL для клиента (опционально)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` - Yandex OAuth
- `VK_CLIENT_ID`, `VK_CLIENT_SECRET` - VK OAuth
- `TELEGRAM_BOT_TOKEN` - Telegram Login

**Аналитика:**

- `NEXT_PUBLIC_YM_COUNTER_ID` - ID счётчика Яндекс Метрики

### ⚠️ `nx build <app>` для приложений с БД требует настроенного локального окружения

`next build` собирает production-бандл — в том числе прогоняет `generateStaticParams`/collect
page data для серверных роутов, которым нужен реальный `PrismaClient`/секреты. На свежем чекауте
без локальной настройки это падает по двум разным причинам, которые легко спутать с багом
в коде:

1. **Нет `DATABASE_URL` вовсе** — `zenstack:generate` падает `PrismaConfigEnvError`, типы
   `PrismaClient` не генерируются, и `nx build`/`nx typecheck:tsgo` сыплют `TS2339: Property 'x'
   does not exist on type 'PrismaClient'` в местах, никак не связанных с правкой. Чинится:
   `.env.local` с `DATABASE_URL` для этого приложения (см. `mcp-postgres-setup` skill) → `nx
   zenstack:generate <app>`.
2. **`DATABASE_URL` есть, но не хватает секрета, требуемого в production-режиме** — `next build`
   всегда выставляет `NODE_ENV=production` (см. [env-files.md § NODE_ENV ловушка](/.claude/rules/env-files.md)), поэтому любая серверная проверка вида `if
   (NODE_ENV === 'production' && !process.env.MY_SECRET) throw` сработает и на локальной сборке.
   Симптом — `Failed to collect page data for /api/...` с причиной в `[cause]`. Чинится: добавить
   недостающий секрет в `.env.local` (генерировать через `openssl rand`, не придумывать вручную —
   см. `security.md`), а не править саму проверку.

Ни то, ни другое не значит, что сборка сломана в коде — это состояние конкретной рабочей копии,
где не выполнен полный локальный сетап приложения. Перед тем как чинить «падающий build»,
сначала проверь `.env.local` этого приложения на оба случая.

## Разработка shared библиотек

### Создание новой библиотеки

При создании shared библиотеки в `libs/` необходимо:

1. **Создать структуру папок:**

   ```
   libs/my-lib/
   ├── src/
   │   ├── index.ts          # Главный экспорт
   │   └── lib/
   │       ├── feature.ts    # Реализация
   │       └── feature.spec.ts
   ├── package.json
   ├── project.json
   ├── tsconfig.json
   ├── tsconfig.lib.json
   └── tsconfig.spec.json
   ```

2. **package.json библиотеки:**

   ```json
   {
     "name": "@letar/my-lib",
     "version": "0.1.0",
     "main": "./src/index.ts",
     "types": "./src/index.ts"
   }
   ```

3. **tsconfig.json библиотеки** — должен иметь `composite: true`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "composite": true,
       "declaration": true,
       "declarationMap": true,
       "outDir": "./dist"
     }
   }
   ```

### Подключение библиотеки к приложению

⚠️ **Читай вместе с разделом-поправкой ниже** — «⚠️ Всё вышесказанное относится к `tsc --build` —
а приложения его не используют». Ниже перечислена полная обвязка, но **обязательна из неё только
одна вещь — ребро графа Nx** (п. 3). Сам резолв импорта `@letar/*` не держится ни на `paths`, ни
на `references`: его обеспечивают `customConditions: ["@letar/source"]` в `tsconfig.base.json` +
`exports` в `libs/<name>/package.json`.

1. **paths в tsconfig.json приложения** — вспомогательные (помогают редактору), но становятся
   **единственным** механизмом резолва, когда линка библиотеки в `apps/<app>/node_modules/@letar/`
   нет. Bun линкует только то, что объявлено в `dependencies` самого приложения — значит при
   подключении через один лишь `implicitDependencies` (п. 3) `exports`-условию резолвить нечего и
   `paths` нужны обязательно, причём **отдельной строкой на каждый подпуть** (`./server`,
   `./client`). Детали — [lib-entry-points.md](/.claude/docs/lib-entry-points.md).

   ```json
   "paths": {
     "@letar/my-lib": ["../../libs/my-lib/src/index.ts"]
   }
   ```

2. **references в tsconfig.json приложения** — не обязательны: их читает только `tsc --build`,
   которого нет ни у одного приложения в `apps/`. Безвредны и помогают редактору; отсутствие
   парного `references` при заполненных `paths` — не дефект.

   ```json
   "references": [
     { "path": "../../libs/my-lib" }
   ]
   ```

3. **implicitDependencies в package.json приложения — обязательно**, если библиотеки нет в
   `dependencies`. Только так Nx узнаёт о ребре графа:
   ```json
   "nx": {
     "implicitDependencies": [
       "@letar/my-lib"
     ]
   }
   ```

### Зачем нужны implicitDependencies

`implicitDependencies` в Nx говорит билд-системе о зависимостях, которые не выражены через package.json:

- **Кэширование:** Nx перестроит приложение если изменится код библиотеки
- **Affected команды:** `nx affected:build` правильно определит затронутые проекты
- **Порядок сборки:** Библиотека будет собрана раньше зависящих от неё приложений

**Без `implicitDependencies`:**

- Изменения в библиотеке не триггерят пересборку приложения
- `nx affected` не обнаружит, что приложение затронуто
- Возможны проблемы с устаревшим кэшем

### Зачем нужны references

TypeScript Project References (`references` в tsconfig.json):

- **Изоляция сборки:** Каждый проект компилируется отдельно
- **Инкрементальная сборка:** Быстрее пересборка при изменениях
- **Корректные типы:** TypeScript понимает границы проектов
- **Исправляет ошибку `TS6059`:** "File is not under 'rootDir'"

**Без `references`:**

```
error TS6059: File 'libs/my-lib/src/index.ts' is not under 'rootDir'
error TS6307: File not listed within file list of project
```

### ⚠️ Всё вышесказанное относится к `tsc --build` — а приложения его не используют

Список выше описывает режим сборки по project references (`tsc --build`). **Ни одно приложение
в `apps/` его не запускает.** Все taргеты типизации приложений — однопроектный режим
(`tsgo --noEmit`, `tsc --noEmit`, `tsgo --project <файл> --noEmit`), где `references` в резолве
не участвуют вовсе. `tsc --build` живёт только в `build`-таргетах библиотек
(`tsc --build tsconfig.lib.json --emitDeclarationOnly`) — вот там references обязательны.

Почему так вышло: штатный Nx-таргет `typecheck` от `@nx/js/typescript` (единственный, кто звал
бы `tsc --build` для приложения) **Nx сам отключает**, когда приложение ставит `noEmit: true` —
подменяет команду на `echo "The 'typecheck' target is disabled because one or more project
references set 'noEmit: true' in their tsconfig."`. Проверить: `nx show project <app> --json`.
Из-за этого и завели собственный `typecheck:tsgo`.

Следствия, проверенные на замере 2026-08-04 (§29 в [PLAN.md](/PLAN.md)):

- **Рассинхрон `paths` ↔ `references` в `apps/*/tsconfig.json` ничего не ломает** и выравнивания
  не требует. На тот момент у девяти приложений `paths` ссылались на либы без парного
  `references`, у `dashboard` — наоборот; ни typecheck, ни билд, ни `nx affected` не страдали.
- **Граф Nx строится по импортам, а не по `references`.** Проверка:
  `nx show projects --affected --files=libs/forms/src/index.ts` включает `animatrona`, у которого
  `reference` на `forms` нет. Значит `nx affected`, порядок задач и `dependsOn: ["^…"]` целы.
- **Резолв `@letar/*` вообще не зависит ни от `references`, ни от `paths`**: `tsconfig.base.json`
  задаёт `customConditions: ["@letar/source"]`, а каждый `libs/*/package.json` объявляет
  `exports` с этим условием, ведущим на `src/index.ts`. Поэтому `dashboard` импортирует
  `@letar/forms` и `@letar/chakra-provider`, не имея для них ни одной записи в `paths`.
- **`@nx/js:typescript-sync` намеренно отключён** в `nx.json` (`sync.disabledTaskSyncGenerators`),
  а `nx sync` / `nx sync:check` не вызываются ни в CI, ни в git-хуках. Так что совет «после
  изменений запусти `nx sync`» в этом репо не работает — references правятся руками либо
  не правятся вовсе.
- Часть приложений (десктопные и мобильные) вместо `references` **инлайнит исходники либ прямо в
  программу** через `include: ["../../libs/X/src/**/*.ts"]`. При такой модели `reference`
  избыточен по определению — файлы уже в программе.

**Практический вывод:** новую либу подключаешь — достаточно, чтобы импорт резолвился
(`exports` в её `package.json`) и чтобы Nx видел ребро графа. `paths` и `references` в
приложении — вспомогательные, их рассинхрон не является дефектом и чинить его «ради симметрии»
не нужно.

### ⚠️ TS6059 может вернуться даже с корректными `references` — в `next build`

`references` исправляет `TS6059` для `nx typecheck:tsgo` (и вообще для `tsc --build`), но **не
гарантированно** для собственного internal TS-чекера `next build` — он не полностью
поддерживает project references. В логе билда это видно как предупреждение:

```
TypeScript project references are not fully supported. Attempting to build in incremental mode.
```

...после чего Next.js деградирует до плоского incremental-режима без изоляции по project
boundaries — и тот же `TS6059` (`File ... is not under 'rootDir'`) снова всплывает на любом
импорте `libs/*` через `paths`, несмотря на правильно настроенные `references`. Найдено
2026-07-16 на `aboi` при импорте `@letar/forms` в `aboi-form.tsx`/`checkout-form.tsx` — деплой
падал на этапе компиляции, хотя `nx typecheck:tsgo aboi` был чист (и остаётся чист после фикса).

**Фикс:** `typescript.ignoreBuildErrors: true` в `next.config.mjs` — typecheck переносится на
отдельный обязательный гейт `nx typecheck:tsgo <app>` (уже часть workflow перед коммитом), `next
build` собственный TS-чекер не гоняет. Не маскирует реальные ошибки типов — они всё равно ловятся
на `nx typecheck:tsgo`, просто не блокируют именно билд-стадию. Уже применяется в dsperevod,
svoichuzhie, archetest, grandslamcup, studio, form-docs, aprel8008, aboi — заодно экономит RAM
при билде на серверах (не гоняется второй, более тяжёлый TS-чекер поверх Turbopack-компиляции).

### Существующие shared библиотеки

| Библиотека                | Описание                                          |
| ------------------------- | ------------------------------------------------- |
| `@letar/forms`            | UI-библиотека форм (TanStack Form) + оффлайн      |
| `@letar/chakra-provider`  | Провайдер Chakra UI с темой                       |
| `@letar/yandex-metrika`   | Интеграция Яндекс Метрики                         |
| `@letar/format-utils`     | Утилиты форматирования (дата, телефоны)           |
| `@letar/ui`               | Shared UI компоненты (TopLoader)                  |
| `@letar/validation-utils` | Централизованные схемы валидации (Zod v4)         |
| `@letar/hooks`            | Shared хуки (useDebounce, useOnlineStatus и др.)  |
| `@letar/query-provider`   | TanStack Query провайдеры с пресетами + IndexedDB |

## Браузерная автоматизация (Claude in Chrome)

Помимо Playwright, есть доступ к браузеру через расширение `claude-in-chrome`. Это удобнее для интерактивной работы:

- ✅ Навигация по сайтам, чтение страниц, клики, ввод текста
- ✅ Работает в реальном браузере пользователя (Chrome/Brave)
- ✅ Видит то же, что видит пользователь (авторизация, куки)
- ✅ Не требует запуска headless браузера

```typescript
// Проверить доступные вкладки
mcp__claude-in-chrome__tabs_context_mcp

// Перейти на сайт
mcp__claude-in-chrome__navigate({ url: "https://habr.com", tabId: 123 })

// Прочитать страницу
mcp__claude-in-chrome__read_page({ tabId: 123, depth: 3 })

// Кликнуть по элементу
mcp__claude-in-chrome__computer({ action: "left_click", ref: "ref_42", tabId: 123 })
```

> **Используй `claude-in-chrome` для интерактивной работы** — это быстрее и удобнее, чем Playwright. Playwright оставь для E2E тестов.
