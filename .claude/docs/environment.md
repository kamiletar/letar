# Окружение и стек

## ⚠️ Claude Code CLI (Текущее окружение)

**КРИТИЧНО: Вы работаете в Claude Code CLI на нативном Windows (без WSL).**

- **Рабочая директория:** `C:\web\lena` (Windows путь)
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
nx lint premium-rosstil
nx build premium-rosstil
git add . && git commit -m "message"

# ❌ Неправильно - не нужны абсолютные пути
cd C:\web\lena && nx lint premium-rosstil
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
nx test premium-rosstil       # Запустить тесты проекта
nx run-many -t test           # Запустить все тесты
```

### Аналитика

- **Яндекс Метрика** - интеграция аналитики (через библиотеку `yandex-metrika`)

## MCP серверы

**ВАЖНО:** Всегда используй MCP серверы для актуальной документации вместо предположений о знаниях.

Доступные MCP серверы:

- **`nx-mcp`** - для операций с Nx воркспейсом и документации
- **`next-devtools`** - для документации Next.js 16 и информации о рантайме
- **`chakra-ui`** - для документации компонентов Chakra UI v3
- **`inkeepMcp`** - для документации Zod v4
- **`form-mcp`** - для документации @letar/forms: 40+ полей, паттерны форм, @form.\* директивы
- **`context7`** - для документации любых сторонних библиотек (React, Conform, Framer Motion и т.д.)

**Воркфлоу:**

1. Используй `resolve-library-id` чтобы найти правильный ID библиотеки
2. Используй `get-library-docs` с полученным ID для получения актуальной документации
3. Используй документацию для правильной реализации функций

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
/c/Android/Sdk/platform-tools/adb.exe shell am start -n com.lena.animatrona.mobile/.MainActivity

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
/c/Android/Sdk/platform-tools/adb.exe shell am start -n com.lena.animatrona.mobile/.MainActivity
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
nx dev premium-rosstil        # Запустить dev сервер
nx build premium-rosstil      # Собрать продакшн бандл
nx start premium-rosstil      # Запустить продакшн сервер
```

### База данных и Prisma

```bash
nx zenstack:generate premium-rosstil  # Генерация Prisma + Zod схем
nx db:push premium-rosstil            # Отправить схему в БД (dev)
nx db:migrate premium-rosstil         # Создать миграцию (prod)
nx db:studio premium-rosstil          # Открыть Prisma Studio
```

### Форматирование, линтинг и тесты

```bash
nx format premium-rosstil         # Форматирование кода (dprint)
nx lint premium-rosstil           # Запустить линтинг
nx typecheck:tsgo premium-rosstil # Проверка типов (быстро!)
nx test premium-rosstil           # Запустить тесты
nx e2e premium-rosstil-e2e        # Запустить E2E тесты
```

### Nx Sync - Автоматическая синхронизация TypeScript references

```bash
nx sync --check               # Проверить актуальность TypeScript project references
nx sync                       # Автоматически обновить references во всех tsconfig.json
```

**Что делает Nx Sync:**

- Автоматически поддерживает `references` в `tsconfig.json` актуальными на основе project graph
- Добавляет/удаляет references при изменении зависимостей между проектами
- Работает с генератором `@nx/js:typescript-sync`

**Когда использовать:**

- После добавления новой shared библиотеки в `/libs/`
- После изменения dependencies между проектами
- Если видишь ошибки типа "Cannot find module '@letar/...'"
- Nx автоматически запускает sync при необходимости (после генераторов, при build и т.д.)

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

**ВАЖНО:** Для корректной работы TypeScript нужно настроить ТРИ вещи:

1. **paths в tsconfig.json приложения:**

   ```json
   "paths": {
     "@letar/my-lib": ["../../libs/my-lib/src/index.ts"]
   }
   ```

2. **references в tsconfig.json приложения:**

   ```json
   "references": [
     { "path": "../../libs/my-lib" }
   ]
   ```

3. **implicitDependencies в package.json приложения:**
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

### Существующие shared библиотеки

| Библиотека               | Описание                                          |
| ------------------------ | ------------------------------------------------- |
| `@letar/forms`  | UI-библиотека форм (TanStack Form) + оффлайн      |
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
