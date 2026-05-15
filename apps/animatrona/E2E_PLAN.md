# Animatrona — План E2E тестирования

## Исполнительное резюме

### Текущее состояние

| Метрика          | Значение                                                       |
| ---------------- | -------------------------------------------------------------- |
| **Unit тесты**   | 119 (parsers.spec.ts, parse-filename.spec.ts, helpers.spec.ts) |
| **E2E тесты**    | 19 spec файлов, большинство пропущены (skip)                   |
| **Покрытие**     | ~5% (только утилиты FFmpeg, парсинг имён)                      |
| **IPC handlers** | 36 файлов без тестов                                           |

### Цели

1. Достичь 70%+ покрытия критических user flows
2. Стабильные E2E тесты для CI/CD pipeline
3. Regression testing перед релизами

---

## Архитектура тестирования

### Два режима работы

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Test Modes                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DEV MODE (Chromium)              2. ELECTRON MODE       │
│  ────────────────────────            ─────────────────────  │
│  • Быстрый старт (~2s)               • Полный Electron      │
│  • Next.js dev server                • IPC handlers         │
│  • Mock main process                 • Real file system     │
│  • Для UI/UX тестов                  • Для integration      │
│                                                             │
│  nx e2e animatrona-e2e               nx e2e animatrona-e2e  │
│    -- --project=chromium               -- --project=electron│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Инфраструктура (уже настроена)

- **Playwright** + `electron-playwright-helpers`
- **SQLite seeding** через Prisma + sql.js
- **Video fixtures**: `sample-1s.mkv`, `sample-5s.mkv`
- **Helpers**: `launchElectronApp`, `stubDialog`, `waitForMainWindow`

---

## Стратегия мокирования

### Проблема

`page.route()` не перехватывает запросы из main process Electron — только renderer.

### Решение: ENV-based мocking

```typescript
// main/services/ffmpeg.service.ts
export class FFmpegService {
  async transcode(input: string, output: string) {
    if (process.env.E2E_MOCK_FFMPEG === 'true') {
      // Копируем pre-transcoded fixture вместо реального транскода
      await fs.copyFile(path.join(__dirname, '../fixtures/transcoded-sample.mp4'), output)
      return { success: true, duration: 1.5 }
    }
    // Real FFmpeg logic
  }
}
```

### Таблица моков

| Сервис       | ENV переменная            | Mock поведение                    |
| ------------ | ------------------------- | --------------------------------- |
| FFmpeg       | `E2E_MOCK_FFMPEG=true`    | Копирует fixture вместо транскода |
| Shikimori    | `E2E_MOCK_SHIKIMORI=true` | Возвращает static JSON            |
| IPFS/Helia   | `E2E_MOCK_IPFS=true`      | In-memory blockstore              |
| File dialogs | `E2E_MOCK_DIALOGS=true`   | Возвращает preset paths           |

### Fixture-based approach

```
apps/animatrona-e2e/fixtures/
├── video/
│   ├── sample-1s.mkv           # Минимальный для быстрых тестов
│   ├── sample-5s.mkv           # С несколькими keyframes
│   └── transcoded-sample.mp4   # Pre-transcoded для mock
├── db/
│   ├── empty.db                # Чистая БД
│   └── seeded.db               # С тестовыми данными
└── json/
    └── shikimori-search.json   # Mock API responses
```

---

## Тест-кейсы по приоритетам

### P1: Критические flows (MUST HAVE)

#### 1.1 Import Flow

```typescript
test.describe('Import Flow', () => {
  test('should import MKV file and create anime record', async ({ electronApp }) => {
    // 1. Open import dialog
    // 2. Select video file (mocked dialog)
    // 3. Verify anime created in library
    // 4. Verify episode linked to anime
  })

  test('should parse anime name from filename', async ({ electronApp }) => {
    // Test: "[SubGroup] Anime Name - 01 [1080p].mkv"
    // Expect: { name: "Anime Name", episode: 1 }
  })

  test('should handle duplicate import gracefully', async ({ electronApp }) => {
    // Import same file twice → should skip or merge
  })
})
```

#### 1.2 Transcode Flow

```typescript
test.describe('Transcode Flow', () => {
  test('should transcode episode to HLS', async ({ electronApp }) => {
    // 1. Select episode in library
    // 2. Start transcode
    // 3. Verify progress updates
    // 4. Verify HLS output created
  })

  test('should handle transcode cancellation', async ({ electronApp }) => {
    // Start transcode → cancel → verify cleanup
  })

  test('should show correct progress percentage', async ({ electronApp }) => {
    // Verify UI updates match actual progress
  })
})
```

#### 1.3 Player Flow

```typescript
test.describe('Player Flow', () => {
  test('should play transcoded episode', async ({ electronApp }) => {
    // 1. Navigate to anime
    // 2. Click play on episode
    // 3. Verify player window opens
    // 4. Verify video plays
  })

  test('should save watch progress', async ({ electronApp }) => {
    // Play → seek to 50% → close → reopen → verify position
  })

  test('should handle subtitle selection', async ({ electronApp }) => {
    // Open player → select subtitle track → verify displayed
  })
})
```

### P2: Важные функции (SHOULD HAVE)

#### 2.1 Settings

```typescript
test.describe('Settings', () => {
  test('should persist encoding profile changes', async ({ electronApp }) => {
    // Change profile → restart app → verify persisted
  })

  test('should validate storage path', async ({ electronApp }) => {
    // Enter invalid path → verify error shown
  })
})
```

#### 2.2 Library Management

```typescript
test.describe('Library', () => {
  test('should filter by watch status', async ({ electronApp }) => {
    // Filter "watching" → verify only matching shown
  })

  test('should search anime by name', async ({ electronApp }) => {
    // Type in search → verify filtered results
  })

  test('should group anime by franchise', async ({ electronApp }) => {
    // Enable franchise view → verify grouping
  })
})
```

### P3: P2P/Social (COULD HAVE)

#### 3.1 IPFS Integration

```typescript
test.describe('IPFS', () => {
  test('should start IPFS node', async ({ electronApp }) => {
    // Navigate to P2P settings
    // Enable IPFS
    // Verify node status shows "running"
  })

  test('should publish library to IPFS', async ({ electronApp }) => {
    // With mocked IPFS: verify CID generation
  })
})
```

#### 3.2 Social Features

```typescript
test.describe('Social', () => {
  test('should display friend activity', async ({ electronApp }) => {
    // With seeded friend data
  })
})
```

### P4: Error Handling (NICE TO HAVE)

```typescript
test.describe('Error Handling', () => {
  test('should show error toast on import failure', async ({ electronApp }) => {
    // Mock corrupted file → verify error displayed
  })

  test('should recover from transcode crash', async ({ electronApp }) => {
    // Kill FFmpeg process → verify app doesn't crash
  })
})
```

---

## Fixtures и Test Data

### Database Seeding

```typescript
// e2e/fixtures/seed-database.ts
import { PrismaClient } from '@prisma/client'

export async function seedTestDatabase(dbPath: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  })

  // Создаём тестовые данные
  await prisma.anime.createMany({
    data: [
      { id: 'anime-1', title: 'Test Anime 1', status: 'WATCHING' },
      { id: 'anime-2', title: 'Test Anime 2', status: 'COMPLETED' },
    ],
  })

  await prisma.$disconnect()
}
```

### Welcome Dialog

**Проблема:** Welcome dialog блокирует тесты при первом запуске.

**Решение:**

```typescript
// В beforeEach:
await electronApp.evaluate(async ({ app }) => {
  const { localStorage } = await app.mainWindow.webContents.executeJavaScript(`
    window.localStorage.setItem('welcome-completed', 'true')
  `)
})
```

---

## CI/CD интеграция

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-animatrona.yml
name: Animatrona E2E Tests

on:
  push:
    paths:
      - 'apps/animatrona/**'
      - 'apps/animatrona-e2e/**'
  pull_request:
    paths:
      - 'apps/animatrona/**'

jobs:
  e2e:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build Electron app
        run: nx build animatrona

      - name: Run E2E tests
        run: nx e2e animatrona-e2e
        env:
          E2E_MOCK_FFMPEG: 'true'
          E2E_MOCK_SHIKIMORI: 'true'
          E2E_MOCK_IPFS: 'true'

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.os }}
          path: apps/animatrona-e2e/playwright-report/
```

---

## План реализации по фазам

### Фаза 1: Инфраструктура

- [ ] Настроить ENV-based mocking в main process
- [ ] Создать FFmpeg mock (копирование fixtures)
- [ ] Настроить database seeding
- [ ] Решить проблему Welcome dialog

### Фаза 2: P1 тесты — Import Flow

- [ ] `import-basic.spec.ts` — базовый импорт MKV
- [ ] `import-parsing.spec.ts` — парсинг имён файлов
- [ ] `import-duplicate.spec.ts` — обработка дубликатов

### Фаза 3: P1 тесты — Transcode & Player

- [ ] `transcode-basic.spec.ts` — базовый транскод
- [ ] `transcode-cancel.spec.ts` — отмена транскода
- [ ] `player-basic.spec.ts` — воспроизведение
- [ ] `player-progress.spec.ts` — сохранение прогресса

### Фаза 4: P2 тесты — Settings & Library

- [ ] `settings-encoding.spec.ts` — профили кодирования
- [ ] `library-filter.spec.ts` — фильтрация
- [ ] `library-search.spec.ts` — поиск

### Фаза 5: P3/P4 тесты

- [ ] `ipfs-node.spec.ts` — IPFS нода
- [ ] `error-handling.spec.ts` — обработка ошибок

---

## Метрики успеха

| Метрика           | Текущее | Цель                   |
| ----------------- | ------- | ---------------------- |
| E2E test coverage | ~5%     | 70%+ критических flows |
| Test stability    | N/A     | >95% pass rate         |
| CI pipeline time  | N/A     | <10 min                |
| Flaky tests       | N/A     | <5%                    |

---

**Создано:** 2026-01-25
**Обновлено:** 2026-01-30
