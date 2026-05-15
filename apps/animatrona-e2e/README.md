# Animatrona E2E Tests

E2E тесты для Electron приложения Animatrona с использованием Playwright.

## Требования

- **Production build** Animatrona (`apps/animatrona/dist/win-unpacked/`)
- **FFmpeg** для создания тестовых видео
- **Node.js 24+**

## Быстрый старт

```bash
# 1. Собрать production build (обязательно!)
nx build:win animatrona

# 2. Создать тестовые видео (один раз)
nx fixtures:create animatrona-e2e

# 3. Запустить все тесты
nx e2e animatrona-e2e
```

## Структура проекта

```
apps/animatrona-e2e/
├── fixtures/
│   ├── videos/                    # Тестовые видео (генерируются)
│   ├── anime-folder/              # Папка с тестовыми видео для импорта
│   └── create-test-videos.ts      # Скрипт генерации FFmpeg
├── helpers/
│   ├── electron.helpers.ts        # Запуск Electron, stubbing dialogs
│   └── db.helpers.ts              # SQLite через sql.js
└── src/
    ├── 01-smoke/                  # Smoke тесты (запуск app)
    ├── 02-library/                # Библиотека (dev режим, HTTP)
    ├── 03-import/                 # Импорт wizard (Electron)
    ├── 04-player/                 # Плеер (Electron)
    └── 05-integration/            # Интеграционные тесты
```

## Два режима тестирования

| Режим        | Суффикс файла       | Назначение                | Скорость |
| ------------ | ------------------- | ------------------------- | -------- |
| **Dev**      | `.dev.spec.ts`      | UI тесты через HTTP       | Быстро   |
| **Electron** | `.electron.spec.ts` | Полные E2E с IPC, dialogs | Медленно |

## Команды запуска

```bash
# Все тесты
nx e2e animatrona-e2e

# Только Electron тесты
nx e2e animatrona-e2e -- --project=electron

# Только Dev тесты (HTTP)
nx e2e animatrona-e2e -- --project=dev

# Только Smoke тесты
nx e2e animatrona-e2e -- --project=smoke

# Конкретный файл
nx e2e animatrona-e2e -- src/03-import/wizard-open.electron.spec.ts

# По grep паттерну
nx e2e animatrona-e2e -- --grep "Import"

# UI режим Playwright
nx e2e animatrona-e2e -- --ui

# Headed режим (видимый браузер)
nx e2e animatrona-e2e -- --headed
```

## Критичные особенности Electron тестов

### 1. `app://` протокол НЕ работает для навигации

```typescript
// ❌ НЕ РАБОТАЕТ — Windows показывает диалог "Get an app to open this link"
await page.goto('app://./player')

// ✅ РАБОТАЕТ — используй UI навигацию
const nav = page.getByRole('navigation')
await nav.getByRole('link', { name: /плеер/i }).click()
```

### 2. Изоляция user-data-dir

Каждый тест использует уникальную директорию для данных:

```typescript
const userDataDir = path.join(os.tmpdir(), `animatrona-test-${Date.now()}`)
```

### 3. Обработка splash → main window

Приложение показывает splash screen перед главным окном:

```typescript
// Хелпер ждёт закрытия splash и появления main window
await waitForMainWindow(ctx, 60000)
```

### 4. Stubbing native dialogs

```typescript
import { stubSelectFolderDialog } from '../../helpers/electron.helpers'

// Stub dialog с тестовой папкой
await stubSelectFolderDialog(ctx.app, getFixturesPath('anime-folder'))
```

### 5. Strict mode — точные селекторы

```typescript
// ❌ Ошибка: "resolved to 2 elements"
const heading = page.getByRole('heading', { name: /библиотека/i })

// ✅ Точный селектор
const heading = page.getByRole('heading', { name: 'Библиотека аниме' })

// ✅ Или .first() если допустимо
const heading = page.getByRole('heading', { name: /библиотека/i }).first()
```

## Создание тестовых fixtures

### Тестовые видео

```bash
# Генерация через FFmpeg
nx fixtures:create animatrona-e2e
```

Создаёт:

- `sample-1s.mkv` — 1 секунда для быстрых тестов
- `sample-5s.mkv` — 5 секунд стандартное
- `sample-audio.mkv` — 5 секунд с 3 аудиодорожками

### Тестовая папка аниме

```
fixtures/anime-folder/
├── [TestGroup] Test Anime - 01.mkv
├── [TestGroup] Test Anime - 02.mkv
└── [TestGroup] Test Anime - 03.mkv
```

## Отладка

### Просмотр trace

```bash
npx playwright show-trace <path-to-trace.zip>
```

### Просмотр видео

```bash
# Видео сохраняются в
apps/animatrona-e2e/test-output/playwright/output/*/video.webm
```

### Скриншоты при ошибках

Автоматически сохраняются в `test-results/` при падении тестов.

## Текущее покрытие

| Фаза        | Passed | Skipped | Описание          |
| ----------- | ------ | ------- | ----------------- |
| Smoke       | 5      | 0       | Запуск приложения |
| Dev         | 5      | 0       | UI через HTTP     |
| Import      | 4      | 4       | Wizard импорта    |
| Player      | 4      | 6       | Навигация плеера  |
| Integration | 9      | 4       | Полные flows      |
| **ИТОГО**   | **27** | **14**  |                   |

### Skipped тесты — причины

| Категория       | Причина                | Решение                      |
| --------------- | ---------------------- | ---------------------------- |
| Shikimori API   | Требует network mock   | Добавить MSW или mock server |
| Watch page      | Требует seed БД        | Добавить db.helpers seed     |
| Browser history | Нестабильно в Electron | Низкий приоритет             |
| UI варианты     | Разные реализации      | Адаптировать селекторы       |

## Архитектурные решения

### Зависимости

```bash
bun add -D @playwright/test electron-playwright-helpers sql.js
```

- **electron-playwright-helpers** — stubbing native dialogs, IPC helpers
- **sql.js** — работа с SQLite для seed/проверки БД (WASM)

### Конфигурация

```typescript
// playwright.config.ts
{
  timeout: 120000,        // 2 минуты на тест
  workers: 1,             // Один воркер для Electron
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
}
```

## CI/CD

```bash
# В CI pipeline
nx build:win animatrona
nx fixtures:create animatrona-e2e
nx e2e animatrona-e2e -- --project=electron
```

**Важно:** Production build должен быть свежим. Добавь проверку в `beforeAll`:

```typescript
test.beforeAll(() => {
  if (!checkProductionBuild()) {
    test.skip()
    console.log('Skipping: production build not found')
  }
})
```

## Полезные ссылки

- [Playwright Electron API](https://playwright.dev/docs/api/class-electron)
- [electron-playwright-helpers](https://www.npmjs.com/package/electron-playwright-helpers)
- [План тестирования](/.claude/plans/iterative-doodling-stallman.md)
