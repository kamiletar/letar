# KamiKeyThe

Системная утилита для ввода типографских символов через AltGr (ремейк TypeItEasy). Работает в фоновом режиме, живёт в трее. Node.js + TypeScript, без Electron.

> **Текущая версия:** 0.1.0
> **Технологический стек:** Node.js, TypeScript, keysender, systray2, esbuild

---

## Структура документации

| Файл                                         | Описание                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| **[PLAN.md](./PLAN.md)**                     | Техническое задание — фазы разработки, карта символов, roadmap                       |
| **[PLAN_COMPLETED.md](./PLAN_COMPLETED.md)** | Выполненные задачи — детали реализованных фич                                        |
| **[PLAN_TESTING.md](./PLAN_TESTING.md)**     | План тестирования — статистика тестов, покрытие                                      |
| **[CHANGELOG.md](./CHANGELOG.md)**           | История изменений в формате [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/) |

---

## Быстрый старт

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

---

## Прогресс разработки

| Фаза | Название   | Статус      |
| ---- | ---------- | ----------- |
| 1    | MVP        | ⏳ В работе |
| 2    | Расширение | 📋 Backlog  |
| 3    | Полировка  | 📋 Backlog  |

---

## Архитектура

- **keysender** — перехват AltGr+клавиша через `GlobalHotkey`, вставка Unicode через `Hardware.keyboard.printText()`
- **systray2** — иконка в системном трее с контекстным меню
- **Конфиг** — JSON в `%APPDATA%/KamiKeyThe/`
- **Сборка** — esbuild (CJS bundle), standalone .exe через pkg/nexe

---

## Полезные ссылки

- [Монорепо CLAUDE.md](../../CLAUDE.md) — общие правила разработки
- [keysender](https://github.com/Krombik/keysender) — нативный модуль для перехвата клавиш
- [systray2](https://github.com/Edgar-P-yan/node-systray-v2) — системный трей

---

**Последнее обновление:** 2026-03-02
