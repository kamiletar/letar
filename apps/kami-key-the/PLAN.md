# KamiKeyThe — План развития

## Текущая версия: 1.2.0

Системная утилита для ввода типографских символов через AltGr (ремейк TypeItEasy).
Electron + React + Chakra UI v3 (main process: koffi Win32, renderer: Vite SPA).

_Название созвучно с «Камикадзе», что подчеркивает молниеносную скорость ввода._

---

## Реализовано ✅

- [x] Проект в Nx монорепо (esbuild bundler)
- [x] Базовая структура (build, dev, lint, typecheck)
- [x] Исследование архитектуры: keysender vs Koffi (см. «Архитектурные решения»)
- [x] Карта символов (keymap.ts) — 14 маппингов AltGr → Unicode
- [x] Win32 hotkeys через Koffi (RegisterHotKey + PeekMessage)
- [x] Unicode вывод через SendInput (KEYEVENTF_UNICODE)
- [x] Системный трей (systray2) с меню вкл/выкл + выход
- [x] Вкл/выкл из трея (toggle hotkeys + message pump)
- [x] Автозагрузка Windows (реестр HKCU\...\Run + чекбокс в трее)
- [x] AltGr+Shift второй слой (– короткое тире, „ " кавычки, ™)
- [x] Узкий пробел AltGr+Space → U+2009
- [x] Режим «Камикадзе» — AltGr+Shift+Backspace → очистка строки
- [x] Ударение AltGr+Enter → U+0301 (combining acute accent)
- [x] Детекция раскладки (GetKeyboardLayout) — логирование + предупреждения о конфликтах
- [x] Расширенная карта: №, °, €, ×, ≠, ≈
- [x] Диагностика ошибок регистрации хоткеев (GetLastError)
- [x] Визуальная карта символов — overlay при удержании AltGr > 500мс
- [x] Окно настроек — карта символов + чекбокс автозагрузки
- [x] Режим исключений — пропуск SendInput для указанных процессов

---

## Фаза 1 — MVP ✅

| Задача                        | Статус  | Приоритет |
| ----------------------------- | ------- | --------- |
| Карта символов (keymap.ts)    | ✅ DONE | P0        |
| Win32 hotkeys через Koffi     | ✅ DONE | P0        |
| Unicode вывод через SendInput | ✅ DONE | P0        |
| Системный трей (systray2)     | ✅ DONE | P0        |
| Вкл/выкл из трея              | ✅ DONE | P1        |
| Автозагрузка Windows          | ✅ DONE | P1        |

### Структура файлов (src/ — koffi модули)

```
src/
├── keymap.ts         # Карта символов AltGr → Unicode
├── hotkeys.ts        # Win32 RegisterHotKey + SendInput + message pump
├── overlay.ts        # Визуальная карта (Win32 overlay окно)
├── notification.ts   # Уведомление о смене раскладки (GDI overlay)
├── monitor.ts        # Мульти-мониторное позиционирование
├── stats.ts          # Статистика использования символов
├── exclusions.ts     # Режим исключений + per-app профили
├── config.ts         # JSON-конфиг (%APPDATA%/KamiKeyThe/keymap.json)
├── autostart.ts      # Автозагрузка (Windows реестр, legacy)
├── layout.ts         # Детекция раскладки клавиатуры
└── types.ts          # Общие типы
```

### Базовая механика

1. `RegisterHotKey(NULL, id, MOD_CONTROL | MOD_ALT, vk)` для каждого AltGr+клавиша
2. AltGr на Windows = `Ctrl+Alt` → RegisterHotKey с этими модификаторами ловит именно AltGr
3. RegisterHotKey **поглощает** нажатие — оригинальный символ не доходит до приложения
4. `PeekMessageW` в цикле `setTimeout(fn, 5)` получает `WM_HOTKEY`
5. `SendInput` с `KEYEVENTF_UNICODE` вставляет спецсимвол — не зависит от раскладки

### Зависимости

| Пакет         | Зачем                                              | Размер  | node-gyp? |
| ------------- | -------------------------------------------------- | ------- | --------- |
| **electron**  | Десктопное приложение (tray, BrowserWindow)        | ~150 MB | Нет       |
| **koffi**     | Win32 API (RegisterHotKey, SendInput, PeekMessage) | ~5 MB   | Нет       |
| **react**     | UI фреймворк (renderer)                            | ~2 MB   | Нет       |
| **chakra-ui** | Компоненты (v3, тёмная тема)                       | ~5 MB   | Нет       |
| **vite**      | Bundler для renderer                               | ~10 MB  | Нет       |

> ~~systray2~~ — удалён в v1.0.0, заменён Electron Tray API.
> ~~keysender~~ — удалён. См. «Архитектурные решения» ниже.

---

## Фаза 2 — Расширение 🚧

| Задача                         | Статус  | Приоритет |
| ------------------------------ | ------- | --------- |
| AltGr + Shift (второй слой)    | ✅ DONE | P1        |
| Узкий пробел (`AltGr + Space`) | ✅ DONE | P1        |
| Визуальная карта (long press)  | ✅ DONE | P2        |
| Режим «Камикадзе»              | ✅ DONE | P3        |

### AltGr + Shift

- Второй слой символов: `AltGr + [` → `«`, `AltGr + Shift + [` → `„`
- RegisterHotKey поддерживает `MOD_CONTROL | MOD_ALT | MOD_SHIFT`

### Узкий пробел

- `AltGr + Space` → U+2009 (thin space)
- Полезно для типографики: `100 000`, `т. д.`

### Визуальная карта ✅

- Удержание AltGr > 500мс → полупрозрачный overlay с подсказкой клавиатуры
- Скрывается при отпускании AltGr
- Реализация: нативное Win32 окно через Koffi (WS_EX_TOPMOST + WS_EX_LAYERED + WS_EX_NOACTIVATE)
- Click-through (WS_EX_TRANSPARENT) — мышь проходит насквозь
- GetAsyncKeyState(VK_RMENU) для детекции удержания AltGr

### Режим «Камикадзе»

- `AltGr + Shift + Backspace` — быстрая очистка строки

---

## Фаза 3 — Полировка ✅

| Задача                      | Статус  | Приоритет |
| --------------------------- | ------- | --------- |
| Окно настроек (Settings UI) | ✅ DONE | P2        |
| Ударение (`AltGr + Enter`)  | ✅ DONE | P2        |
| Детекция раскладки          | ✅ DONE | P2        |
| Режим исключений            | ✅ DONE | P3        |

### Окно настроек ✅

- Нативное Win32 окно через Koffi (WNDCLASSEX + child controls)
- Карта символов (Consolas, моноширинный)
- Чекбокс «Автозагрузка» (BS_AUTOCHECKBOX, синхронизация с реестром)
- Пункт «Настройки» в меню трея
- Segoe UI шрифт для UI элементов

### Ударение

- `AltGr + Enter` — комбинируемый символ U+0301 на предыдущей букве
- Требует чтение текста (Accessibility API / clipboard hack)

### Детекция раскладки

- `GetKeyboardLayout()` через Koffi — определение активной раскладки
- Пропуск клавиш, уже занятых AltGr-маппингами в текущей раскладке
- На немецкой/французской раскладках AltGr+Q = `@`, AltGr+E = `€` — нельзя перехватывать

---

## Фаза 4 — Редактор маппингов + Unicode Picker 📋

| Задача                                           | Статус  | Приоритет |
| ------------------------------------------------ | ------- | --------- |
| JSON-конфиг (`%APPDATA%/KamiKeyThe/keymap.json`) | ✅ DONE | P0        |
| Несколько раскладок (именованные профили)        | ✅ DONE | P0        |
| Динамическая перерегистрация хоткеев             | ✅ DONE | P0        |
| Системные хоткеи (AltGr+Ё, AltGr+Shift+Ё)        | ✅ DONE | P1        |
| Уведомление о смене раскладки (GDI overlay)      | ✅ DONE | P1        |
| Пункт «Редактор маппингов» в трее                | ✅ DONE | P2        |
| Рефакторинг overlay/settings → getKeymap()       | ✅ DONE | P0        |
| Препроцессинг symbl-data → `data/symbols.json`   | ✅ DONE | P1        |
| HTTP-сервер редактора (`node:http`, порт 24680)  | ✅ DONE | P1        |
| SPA редактор (inline HTML/CSS/JS)                | ✅ DONE | P1        |
| Unicode Picker (поиск по русским названиям)      | ✅ DONE | P2        |

### 4.1 JSON-конфиг (`src/config.ts`)

**Путь:** `%APPDATA%/KamiKeyThe/keymap.json` (через `process.env.APPDATA`)

**Формат:**

```json
{
  "version": 2,
  "editorPort": 0,
  "activeLayout": "Типографика",
  "layouts": [
    {
      "name": "Типографика",
      "mappings": [
        {
          "vk": 189,
          "char": "\u2014",
          "shiftChar": "\u2013",
          "label": "— длинное тире",
          "shiftLabel": "– короткое тире"
        }
      ]
    },
    {
      "name": "Математика",
      "mappings": [...]
    }
  ],
  "specialActions": [
    {
      "vk": 8,
      "modifiers": 7,
      "label": "⌫ Камикадзе (очистка строки)",
      "action": "clear-line"
    }
  ]
}
```

**Поля:**

- `editorPort` — порт HTTP-сервера: `0` = автопоиск (предпочтительно 24680), `1024–65535` = фиксированный
- `activeLayout` — имя активной раскладки
- `layouts[]` — массив именованных раскладок
- `specialActions` — общие для всех раскладок (Камикадзе и т.д.)

**Дефолтный конфиг:** одна раскладка «Типографика» с текущими 14 маппингами.

**API:**

```typescript
export interface LayoutProfile {
  name: string
  mappings: KeyMapping[]
}
export interface KeymapConfig {
  version: number
  editorPort: number // 0 = автопоиск, 1024-65535 = фиксированный
  activeLayout: string
  layouts: LayoutProfile[]
  specialActions: SpecialAction[]
}

export function getConfigPath(): string
export function loadConfig(): KeymapConfig // При ошибке/отсутствии → дефолт
export function saveConfig(config: KeymapConfig): void // Атомарно: tmp + rename
export function getDefaultConfig(): KeymapConfig
export function getActiveLayout(config: KeymapConfig): LayoutProfile
export function cycleLayout(config: KeymapConfig): KeymapConfig // → следующая раскладка
```

**Атомарная запись:** `writeFileSync(path + '.tmp', ...)` → `renameSync(path + '.tmp', path)`

### 4.2 Динамическая перерегистрация + переключение раскладок

**keymap.ts — мутабельные данные:**

`KEYMAP` / `SHIFT_KEYMAP` / `SPECIAL_ACTIONS` → приватные `_keymap` / `_shiftKeymap` / `_specialActions` + геттеры:

```typescript
export function getKeymap(): readonly KeyMapping[]
export function getShiftKeymap(): readonly KeyMapping[]
export function getSpecialActions(): readonly SpecialAction[]
export function getActiveLayoutName(): string
export function updateKeymap(config: KeymapConfig): void // Обновить из активной раскладки
```

**hotkeys.ts — перезагрузка:**

```typescript
export function reloadHotkeys(config: KeymapConfig): boolean {
  unregisterHotkeys() → updateKeymap(config) → registerHotkeys()
}
```

**Системные хоткеи** (не зависят от раскладки):

| Хоткей        | VK              | Действие                     |
| ------------- | --------------- | ---------------------------- |
| AltGr+Ё       | VK_OEM_3 (0xC0) | Переключить раскладку (цикл) |
| AltGr+Shift+Ё | VK_OEM_3 (0xC0) | Открыть редактор в браузере  |

**Переключение:** `cycleLayout()` → `saveConfig()` → `reloadHotkeys()` → `showLayoutNotification()`

**Уведомление:** маленькое GDI-окно по центру экрана (300×60px), WS_EX_TOPMOST + WS_EX_NOACTIVATE, автоскрытие через 1000мс.

### 4.3 Препроцессинг symbl-data

**Источник:** `c:/web/symbl-data/loc/ru/symbols/*.txt` (260 файлов, ~55K названий)

**Формат строки:** `HEX: Название: синоним1, синоним2`

**Скрипт:** `scripts/build-symbl-data.ts`

**Стратегия отбора:** Курированные блоки (~8-12K символов, ~1-1.5 MB):

- U+0080–00FF Latin-1 Supplement, U+2000–206F General Punctuation
- U+20A0–20CF Currency, U+2100–214F Letterlike, U+2150–218F Number Forms
- U+2190–21FF Arrows, U+2200–22FF Math Operators, U+2300–23FF Technical
- U+2500–257F Box Drawing, U+25A0–25FF Geometric, U+2600–26FF Misc Symbols
- U+2700–27BF Dingbats + все символы с синонимами (728 шт.)

**Выход:** `data/symbols.json`

```json
[{"c":"00A9","n":"Знак авторского права","s":"копирайт, (с)"}, ...]
```

Запуск вручную, результат коммитится в репо.

### 4.4 HTTP-сервер (`src/editor-server.ts`)

**Архитектура:** `node:http` на `127.0.0.1`. Вся SPA — один HTML с инлайн CSS/JS (template literal).

**Порт:** предпочтительно 24680, при `EADDRINUSE` → `server.listen(0)` (ОС выдаст свободный).

**Endpoints:**

| Метод | URL            | Описание                      |
| ----- | -------------- | ----------------------------- |
| GET   | `/`            | Inline SPA                    |
| GET   | `/api/keymap`  | Текущий конфиг                |
| POST  | `/api/keymap`  | Сохранить → `reloadHotkeys()` |
| GET   | `/api/symbols` | База `symbols.json`           |

**Жизненный цикл:** Трей/хоткей → `startEditorServer()` → `spawn('cmd', ['/c', 'start', URL])` → браузер. При выходе → `server.close()`.

### 4.5 SPA — Интерфейс редактора

**Макет:**

```
┌──────────────────────────────────────────────────────────┐
│  KamiKeyThe — Редактор маппингов                          │
├──────────────────────────────────────────────────────────┤
│  Раскладка: [Типографика ▼] [Математика] [+Новая] [🗑]   │
├──────────────────────────────────────────────────────────┤
│  Интерактивная клавиатура (5 рядов, как overlay)          │
│  Клавиши с маппингами — голубой фон                       │
│  4 угла: EN (↖), AltGr+Shift (↗), AltGr (↙), RU (↘)    │
├──────────────────────────────────────────────────────────┤
│  Клавиша: [=]  VK: 0xBB                                  │
│  AltGr: ≠ (U+2260)          [Убрать]                     │
│  AltGr+Shift: ≈ (U+2248)   [Убрать]                     │
│                                                           │
│  Поиск: [стрелка_____________]                            │
│  → U+2192 Стрелка вправо    [AltGr] [+Shift]             │
│  ← U+2190 Стрелка влево     [AltGr] [+Shift]             │
│  (макс 50 результатов)                                    │
│                                                           │
│  Unicode: [U+______] [Превью: _] [Назначить ▼]           │
│                                                           │
│  [💾 Сохранить]  [↩ Сбросить]  Статус: сохранено ✓       │
└──────────────────────────────────────────────────────────┘
```

**Технологии:** Чистый HTML/CSS/JS, CSS Grid для клавиатуры, fetch API, debounce 300мс.

**Взаимодействие:**

1. Клик по клавише → рамка + панель редактирования
2. Поиск символов — фильтрация по `n` (название) и `s` (синонимы), case-insensitive
3. Результат: символ 32px + U+XXXX + название + кнопки [AltGr] / [+Shift]
4. Прямой ввод Unicode: поле U+XXXX с live-превью
5. Сохранить → POST `/api/keymap` → хоткеи обновляются мгновенно

**Раскладки:**

- Табы наверху (клик = переключить редактируемую)
- [+ Новая] — создать (промпт имени)
- [🗑] — удалить (нельзя последнюю)
- Двойной клик по табу → переименование

### 4.6 Интеграция с треем

Новый пункт меню «⌨ Редактор маппингов» (MENU_EDITOR = 1), сдвиг остальных ID на 1.

### 4.7 Рефакторинг overlay и settings

- `overlay.ts`: `KEYMAP` → `getKeymap()`, `SHIFT_KEYMAP` → `getShiftKeymap()`
- `settings.ts`: `generateMapText()` из `getKeymap()`
- Если раскладок > 1 — имя активной в overlay

### Новые файлы

| Файл                          | Назначение                              |
| ----------------------------- | --------------------------------------- |
| `src/config.ts`               | Чтение/запись JSON-конфига из %APPDATA% |
| `src/editor-server.ts`        | HTTP-сервер (порт 24680) + inline SPA   |
| `scripts/build-symbl-data.ts` | Препроцессор symbl-data → JSON          |
| `data/symbols.json`           | Предсобранная база символов             |

### Порядок коммитов

1. **v0.12.0** — JSON-конфиг + мульти-раскладки + системные хоткеи + рефакторинг
2. **v0.12.1** — Препроцессинг symbl-data → `data/symbols.json`
3. **v0.13.0** — Редактор SPA + HTTP-сервер + пункт в трее

---

## Фаза 5 — Полировка, мульти-монитор, расширение, .exe ✅

| Задача                                    | Статус  | Приоритет |
| ----------------------------------------- | ------- | --------- |
| Мульти-мониторное позиционирование        | ✅ DONE | P1        |
| Overlay на активном мониторе              | ✅ DONE | P1        |
| Notification на активном мониторе         | ✅ DONE | P1        |
| Undo/Redo в SPA-редакторе (Ctrl+Z/Y)      | ✅ DONE | P1        |
| Горячие клавиши (Ctrl+S, Escape)          | ✅ DONE | P1        |
| beforeunload при несохранённых изменениях | ✅ DONE | P2        |
| Экспорт/импорт раскладок (JSON)           | ✅ DONE | P2        |
| Статистика использования символов         | ✅ DONE | P2        |
| Топ-10 символов в SPA-редакторе           | ✅ DONE | P3        |
| Per-app профили (appProfiles)             | ✅ DONE | P2        |
| Скрипт сборки standalone (build-exe.ts)   | ✅ DONE | P3        |

### 5.1 Мульти-мониторное позиционирование (`src/monitor.ts`)

- `getCenterOnActiveMonitor(width, height)` → `{x, y}`
- Win32 API: `GetForegroundWindow` → `MonitorFromWindow` → `GetMonitorInfoW`
- Fallback на primary монитор через `GetSystemMetrics`
- Уникальные koffi struct имена: `RECT_M`, `MONITORINFO_M`

### 5.2 Динамическое позиционирование overlay/notification

- `repositionOverlay()` перед `ShowWindow` — окно появляется на мониторе с активным окном
- `SetWindowPos(hwnd, null, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER)`
- Аналогично для notification

### 5.3 Undo/Redo + горячие клавиши в SPA

- `undoStack[]` / `redoStack[]` — JSON-снапшоты конфига (макс 50)
- `pushUndo()` перед каждой мутацией
- `Ctrl+Z` → undo, `Ctrl+Y` / `Ctrl+Shift+Z` → redo
- `Ctrl+S` → save, `Escape` → снять выделение
- `beforeunload` → предупреждение при несохранённых изменениях

### 5.4 Экспорт/импорт раскладок

- Экспорт: `{name, mappings}` → JSON-файл (blob download)
- Импорт: `FileReader` → добавить как новую раскладку (автосуффикс при дублировании имён)

### 5.5 Статистика использования

- `src/stats.ts`: `incrementStat(char)`, `getTopStats(n)`, `shutdownStats()`
- Персистенция: `%APPDATA%/KamiKeyThe/stats.json`
- Lazy write: каждые 60 секунд (не при каждом символе)
- API: `GET /api/stats` → топ-10 символов
- Подвал SPA: «Маппингов: 14 | Shift: 5 | Раскладок: 1» + топ-10

### 5.6 Per-app профили

- `AppProfile { process, layout? }` в `types.ts`
- `appProfiles?: AppProfile[]` в `KeymapConfig` (обратно совместимо)
- `exclusions.ts`: `setAppProfiles()`, `getAppProfileLayout()`
- `hotkeys.ts`: при обработке хоткея — проверить AppProfile → использовать маппинги указанной раскладки

### 5.7 Standalone сборка

- `scripts/build-exe.ts`: nx build → копирование native deps → .bat launcher
- Portable zip: Node.js + index.cjs + koffi.node + systray2 + symbols.json

### Новые файлы

| Файл                   | Назначение                         |
| ---------------------- | ---------------------------------- |
| `src/monitor.ts`       | Мульти-мониторное позиционирование |
| `src/stats.ts`         | Статистика использования символов  |
| `scripts/build-exe.ts` | Сборка standalone дистрибутива     |

---

## Фаза 6 — Миграция на Electron (v1.0.0) ✅

| Задача                                           | Статус  | Приоритет |
| ------------------------------------------------ | ------- | --------- |
| Инфраструктура Electron (webpack, vite, scripts) | ✅ DONE | P0        |
| Main process (background.ts, tray, windows)      | ✅ DONE | P0        |
| Preload + IPC handlers (config, symbols, system) | ✅ DONE | P0        |
| Renderer — Редактор (клавиатура, символы, undo)  | ✅ DONE | P0        |
| Renderer — Настройки (карта символов, autostart) | ✅ DONE | P1        |
| Cleanup: удаление старых файлов                  | ✅ DONE | P0        |
| `nx build` (webpack + vite) проходит             | ✅ DONE | P0        |
| `nx lint` + `nx typecheck:tsgo` — 0 ошибок       | ✅ DONE | P0        |

### Удалённые файлы

| Файл                   | Замена                                      |
| ---------------------- | ------------------------------------------- |
| `src/index.ts`         | `main/background.ts` (Electron lifecycle)   |
| `src/editor-server.ts` | `renderer/` (Vite + React + Chakra UI)      |
| `src/settings.ts`      | `renderer/src/settings/` (React компоненты) |
| `src/tray.ts`          | Electron Tray API в `main/background.ts`    |
| `scripts/build-exe.ts` | `electron-builder.yml`                      |

### Новая структура файлов

```
apps/kami-key-the/
├── main/                    # Electron main process
│   ├── background.ts        # app lifecycle, tray, windows
│   ├── preload.ts           # contextBridge IPC API
│   ├── webpack.config.js    # main process bundler
│   └── ipc/                 # IPC handlers
│       ├── index.ts
│       ├── config.handlers.ts
│       ├── symbols.handlers.ts
│       └── system.handlers.ts
├── renderer/                # Vite + React + Chakra UI v3
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx, App.tsx, theme.ts
│       ├── editor/          # 8 компонентов
│       └── settings/        # 4 компонента
├── shared/ipc-types.ts      # Типы IPC каналов
├── src/                     # Koffi модули (БЕЗ ИЗМЕНЕНИЙ)
├── data/symbols.json
├── electron-builder.yml
└── scripts/dev.js
```

---

## Фаза 7 — UX улучшения редактора (v1.1.0 – v1.2.0) ✅

| Задача                                        | Статус  | Приоритет |
| --------------------------------------------- | ------- | --------- |
| Chakra Dialog вместо browser prompt/confirm   | ✅ DONE | P0        |
| Toast-уведомления (Toaster)                   | ✅ DONE | P0        |
| Валидация JSON при импорте раскладок          | ✅ DONE | P0        |
| Проверка дубликатов имён раскладок            | ✅ DONE | P1        |
| Клавиатурная навигация в поиске символов      | ✅ DONE | P1        |
| Недавно использованные символы (localStorage) | ✅ DONE | P1        |
| Drag-and-drop символов на клавиши             | ✅ DONE | P1        |
| Категории символов (Unicode-блоки)            | ✅ DONE | P1        |
| Flash-анимация клавиши при назначении         | ✅ DONE | P2        |
| Индикатор undo/redo позиции в тулбаре         | ✅ DONE | P2        |
| Плавные CSS transitions для клавиш            | ✅ DONE | P3        |

### 7.1 Диалоги (Dialog)

Заменены `window.prompt()` и `window.confirm()` на Chakra Dialog:

- Переименование раскладки — с валидацией дубликатов, Enter для подтверждения
- Создание новой раскладки — с проверкой уникальности имени
- Удаление раскладки — alertdialog с предупреждением

### 7.2 Toast-уведомления

`createToaster()` из Chakra UI, глобальный `toaster` instance:

- Сохранение (success), ошибка сохранения (error)
- Экспорт/импорт с описанием (кол-во маппингов)
- Невалидный JSON при импорте (error с описанием)
- Сброс к сохранённой версии (info)
- Создание/удаление раскладки (success/info)

### 7.3 Клавиатурная навигация

SymbolSearch:

- `↑↓` — перемещение по результатам
- `Enter` — назначить AltGr, `Shift+Enter` — +Shift
- Подсвеченный элемент следует за мышью и клавиатурой
- Автоскролл к выделенному элементу

### 7.4 Недавно использованные символы

- `localStorage` ключ `kami-key-the-recent-symbols`
- До 8 символов, показываются когда поле поиска пустое
- Обновляются при каждом назначении

### 7.5 Flash-анимация

- При назначении символа клавиша мигает зелёным (400мс)
- CSS transition для плавного затухания
- `bg: #2a5a3a`, `border: #4a8a4a`, `box-shadow: green glow`

### 7.6 Drag-and-drop символов

- Символы из поиска перетаскиваются на клавиши клавиатуры
- HTML5 Drag and Drop API (без внешних зависимостей)
- `dataTransfer.setData('application/json', {char, name})`
- Drop → AltGr слот, Shift+Drop → AltGr+Shift слот
- Визуальный drag-preview: символ 32px с фоном
- Drop target подсветка: синий border + glow
- Работает независимо от выбранной клавиши (не нужно сначала кликать)

### 7.7 Категории символов (Unicode-блоки)

- `symbol-categories.ts`: маппинг codepoint → категория по диапазонам
- 11 категорий: Все, Пунктуация, Валюты, Стрелки, Математика, Буквенные, Технические, Рамки, Геометрия, Разные, Latin-1
- Табы-фильтры над полем поиска
- Счётчик символов в каждой категории
- При выборе категории без поиска — показываются все символы блока (до 50)
- Комбинируется с текстовым поиском (пересечение)
- Скрытие пустых категорий

### Новые файлы

| Файл                                       | Назначение               |
| ------------------------------------------ | ------------------------ |
| `renderer/src/lib/toaster.tsx`             | Глобальный Toaster       |
| `renderer/src/editor/symbol-categories.ts` | Категории Unicode-блоков |

---

## Карта символов

| Клавиша | AltGr + клавиша | AltGr + Shift | Описание                  |
| ------- | --------------- | ------------- | ------------------------- |
| `-`     | —               | –             | Тире (длинное / короткое) |
| `[`     | «               | „             | Кавычки откр.             |
| `]`     | »               | "             | Кавычки закр.             |
| `.`     | …               |               | Многоточие                |
| `Space` | (тонкий пробел) |               | U+2009                    |
| `C`     | ©               |               | Копирайт                  |
| `R`     | ®               | ™             | Товарный знак             |
| `S`     | §               |               | Параграф                  |
| `N`     | №               |               | Номер                     |
| `D`     | °               |               | Градус                    |
| `E`     | €               |               | Евро                      |
| `X`     | ×               |               | Умножение                 |
| `=`     | ≠               | ≈             | Не равно / приблизительно |
| `Enter` | (ударение)      |               | U+0301 (combining accent) |

---

## Архитектурные решения

### Почему Koffi, а не keysender?

Исследование показало критическую проблему: **keysender `GlobalHotkey` не поддерживает модификаторы**. В C++ коде `RegisterHotKey(NULL, 0, NULL, keyCode)` — третий параметр (модификаторы) всегда `NULL`. Это значит:

- ❌ Нельзя зарегистрировать `AltGr+A` (т.е. `Ctrl+Alt+A`)
- ❌ Можно только одиночные клавиши → блокирует ВСЮ обычную печать
- ❌ `LowLevelHook` мониторит, но **не блокирует** оригинальное нажатие

Альтернативы (все хуже Koffi):

| Подход                                  | Проблема                          |
| --------------------------------------- | --------------------------------- |
| keysender GlobalHotkey на каждую букву  | Блокирует обычную печать          |
| keysender LowLevelHook + Backspace hack | Мерцание, ненадёжно               |
| Форк keysender                          | Требует node-gyp, мёртвый проект  |
| node-lowlevel-keyboard-hook-win         | Только мониторинг, без блокировки |

**Koffi** решает все проблемы:

- ✅ `RegisterHotKey(NULL, id, MOD_CONTROL | MOD_ALT, vk)` — именно AltGr+клавиша
- ✅ Блокировка оригинального нажатия (поведение RegisterHotKey API)
- ✅ `SendInput` + `KEYEVENTF_UNICODE` — прямой Unicode вывод
- ✅ Без node-gyp — предкомпилированные бинарники
- ✅ Активно развивается (2025+)
- ✅ Единая зависимость для всей клавиатурной логики

### Механизм работы (message pump)

```
┌─────────────────────────────────────────┐
│  Node.js event loop                      │
│                                          │
│  setTimeout(pumpMessages, 5)             │
│    └── PeekMessageW() ──► WM_HOTKEY?    │
│          ├── Да → keymap.get(id)         │
│          │        └── SendInput(unicode)  │
│          └── Нет → continue              │
│                                          │
│  RegisterHotKey × N (при старте)         │
│  UnregisterHotKey × N (при выходе)       │
└─────────────────────────────────────────┘
```

Задержка ~5мс polling + <1мс SendInput = **суммарно <10мс** — незаметно при печати.

### Переход на Electron (v1.0.0)

> В v0.14.0 редактор открывался в браузере (localhost:24680), настройки — нативное Win32 окно, трей через systray2 (Go). В v1.0.0 всё заменено на Electron: настоящее десктопное приложение с React + Chakra UI. GDI overlay и notification остаются — они лучше Electron для always-on-top transparent click-through окон.

---

## Безопасность

- Антивирусы могут реагировать на RegisterHotKey + SendInput → в будущем подписать .exe
- Минимальная задержка (нативный SendInput через Koffi)
- Автозагрузка через реестр (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`)
- systray2 Go-бинарник может блокироваться антивирусом → исключение в Defender

---

## Команды разработки

```bash
# Разработка (watch mode)
nx dev kami-key-the

# Сборка
nx build kami-key-the

# Линтинг
nx lint kami-key-the

# Проверка типов
nx typecheck:tsgo kami-key-the
```
