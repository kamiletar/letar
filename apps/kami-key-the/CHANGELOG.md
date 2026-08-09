# Changelog

Все изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [1.2.3] - 2026-08-09

### Changed

- Electron 40.6.1 → 43.3.0

## [1.2.2] - 2026-07-28

### Fixed

- Чекбокс автозагрузки теперь показывает реальное состояние из Windows (`setAutostart` возвращает
  фактический `openAtLogin` после записи), а не оптимистично доверяет клику — расхождение UI и
  реестра больше не проходит незамеченным
- Ошибки IPC-вызова автозагрузки показываются тостом, а не проглатываются молча

### Removed

- Удалён мёртвый legacy-модуль `src/autostart.ts` (ручная работа с реестром через `reg.exe`,
  не импортировался нигде — рабочий путь автозагрузки идёт через Electron `app.setLoginItemSettings`
  в `main/ipc/system.handlers.ts`)

## [1.2.0] - 2026-03-17

### Added

- Drag-and-drop символов из поиска на клавиши клавиатуры (Drop → AltGr, Shift+Drop → +Shift)
- Визуальный drag-preview и подсветка drop target (синий glow)
- Фильтрация символов по категориям Unicode-блоков (11 категорий)
- Категории: Пунктуация, Валюты, Стрелки, Математика, Буквенные, Технические, Рамки, Геометрия, Разные, Latin-1
- Счётчик символов в каждой категории
- При выборе категории без поиска — показываются все символы блока

## [1.1.0] - 2026-03-17

### Added

- Chakra Dialog вместо browser prompt()/confirm() для управления раскладками
- Toast-уведомления при сохранении, экспорте, импорте и ошибках (Toaster)
- Валидация структуры JSON при импорте раскладок (проверка name, mappings, vk, char, label)
- Проверка дубликатов имён раскладок при создании и переименовании
- Клавиатурная навигация в поиске символов (стрелки вверх/вниз, Enter, Shift+Enter)
- Недавно использованные символы вверху поиска (до 8, localStorage)
- Flash-анимация клавиши при назначении символа (зелёная подсветка 400мс)
- Индикатор позиции undo/redo в тулбаре (3/12)
- Плавные CSS transitions для клавиш клавиатуры
- Подсказка по навигации под результатами поиска

## [1.0.0] - 2026-03-05

### Added

- Миграция на Electron (main process: webpack, renderer: Vite + React + Chakra UI v3)
- IPC handlers для config, symbols, system
- Preload скрипт с contextBridge (полная изоляция)
- Редактор маппингов — полноценный React SPA
- Окно настроек — React компонент
- Electron Tray API вместо systray2

### Removed

- HTTP-сервер (editor-server.ts) — заменён Electron BrowserWindow
- Нативное Win32 окно настроек — заменено React компонентом
- systray2 зависимость — заменена Electron Tray
- scripts/build-exe.ts — заменён electron-builder

## [0.10.0] - 2026-03-03

### Added

- Режим исключений: пропуск SendInput для указанных приложений
- Определение процесса через GetForegroundWindow → GetWindowThreadProcessId → OpenProcess → K32GetProcessImageFileNameW
- Кеширование результата — повторный поиск только при смене foreground окна
- API: `setExcludedProcesses()`, `getExcludedProcesses()`, `isCurrentWindowExcluded()`

## [0.9.0] - 2026-03-03

### Added

- Окно настроек: нативное Win32 окно с картой символов и чекбоксом автозагрузки
- Пункт «Настройки» в меню трея (systray2)
- Segoe UI / Consolas шрифты для UI элементов (WM_SETFONT)
- Стандартные Win32 контролы (STATIC, BUTTON) через Koffi

## [0.8.0] - 2026-03-03

### Added

- Визуальная карта символов: полупрозрачный overlay при удержании AltGr > 500мс
- Нативное Win32 окно через Koffi (WS_EX_TOPMOST + WS_EX_LAYERED + click-through)
- GetAsyncKeyState(VK_RMENU) для детекции удержания AltGr
- Расширенный message pump: обработка всех Win32 сообщений (WM_PAINT для overlay)
- DispatchMessageW для маршрутизации сообщений к overlay окну

## [0.7.0] - 2026-03-02

### Added

- Новые символы: № (AltGr+N), ° (AltGr+D), € (AltGr+E), × (AltGr+X), ≠ (AltGr+=), ≈ (AltGr+Shift+=)
- Диагностика ошибок регистрации хоткеев через GetLastError (kernel32.dll)
- Человеко-читаемые причины ошибок (ERROR_HOTKEY_ALREADY_REGISTERED и др.)

## [0.6.0] - 2026-03-02

### Added

- Ударение: AltGr+Enter → U+0301 (combining acute accent)
- Детекция раскладки (`layout.ts`): GetKeyboardLayout через Koffi
- Предупреждение о конфликтах AltGr для немецкой/французской/венгерской/польской/чешской раскладок
- Логирование активной раскладки при старте

## [0.5.0] - 2026-03-02

### Added

- Режим «Камикадзе»: AltGr+Shift+Backspace → очистка текущей строки (Home → Shift+End → Delete)
- Архитектура спец. действий (`SpecialAction`) для не-Unicode хоткеев
- Отправка виртуальных клавиш через SendInput (VK_HOME, VK_END, VK_DELETE)

## [0.4.0] - 2026-03-02

### Added

- Второй слой AltGr+Shift: – короткое тире, „ " кавычки, ™ торговая марка
- Узкий пробел AltGr+Space → U+2009 (thin space)
- Поле `shiftChar`/`shiftLabel` в KeyMapping для двухслойной карты

## [0.3.0] - 2026-03-02

### Added

- Автозагрузка Windows через реестр (`autostart.ts`): HKCU\...\Run
- Пункт «Автозагрузка» в трее с чекбоксом

## [0.2.0] - 2026-03-02

### Added

- Карта символов (`keymap.ts`): 7 маппингов AltGr → Unicode (тире, кавычки, многоточие, ©, ®, §)
- Win32 hotkeys через Koffi (`hotkeys.ts`): RegisterHotKey с MOD_CONTROL|MOD_ALT для перехвата AltGr
- Unicode вывод через SendInput + KEYEVENTF_UNICODE (не зависит от раскладки)
- Message pump через PeekMessageW в setTimeout loop (~5мс polling)
- Системный трей (`tray.ts`): systray2 с меню «Включено/Выключено» и «Выход»
- Graceful shutdown: UnregisterHotKey + destroyTray при SIGINT/SIGTERM
- ESLint конфиг для CLI-утилиты (no-console off)

### Changed

- Заменён keysender на Koffi — прямой доступ к Win32 API без node-gyp
- esbuild externals: keysender → koffi + systray2

## [0.1.0] - 2026-03-02

### Added

- Проект в Nx монорепо (esbuild bundler, Node.js + TypeScript)
- Конфигурация: build, dev, serve, lint, typecheck:tsgo
- Зависимости: keysender, systray2
- Документация: PLAN.md, README.md, CHANGELOG.md, PLAN_COMPLETED.md, PLAN_TESTING.md
