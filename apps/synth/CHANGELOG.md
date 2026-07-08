# Changelog — synth

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/), версии по [Semantic Versioning](https://semver.org/).

---

## [0.1.2] — 2026-07-08

### Добавлено

- Конвертер модели FM-патча ↔ стандартный Yamaha DX7 SysEx (`src/lib/patch/dx7-sysex.ts`): single-voice dump (155 параметров) и разбор 32-голосого bulk dump, с checksum
- Тесты на реальных заводских пресетах SMK-37 PRO (`__fixtures__/`)
- `tsconfig.spec.json` для vitest (первые тесты в synth)

### Известные ограничения

- Формат SysEx подтверждён как полностью стандартный DX7, но наш движок реализует 5 собственных алгоритмов вместо всех 32 настоящих топологий — звук патча на реальном железе может отличаться от браузера (см. PLAN.md, Фаза 1.5)

---

## [0.1.1] — 2026-07-07

### Исправлено

- Билд студии падал с `Module not found: Can't resolve '@letar/ui'` — библиотека не была подключена по всем трём обязательным точкам монорепо (tsconfig paths/references, package.json implicitDependencies, next.config.js transpilePackages)

### Проверено

- Первое живое подключение реального M-VAVE SMK-37 PRO: MIDI-вход и звук подтверждены end-to-end

---

## [0.1.0] — 2026-06-15

### Добавлено

- Скаффолд Next.js 16 (App Router, порт 3022)
- Тёмная тема: пустота Малевича (`void`) + золото Климта (`gold`) + тёплый уголь (`forge`)
- Провайдер Chakra UI v3 с принудительной тёмной темой
- Базовый layout с Umami-аналитикой
- Заглушка главной страницы (Фаза 0)
- Структура папок: `patches/` (публичные), `tracks/` (публичные), `private/` (gitignored)
- `project.json` с Nx-таргетами (dev/build/start/lint/format/typecheck/test)
- Документация: `PLAN.md`, `PLAN_TESTING.md`, `PLAN_COMPLETED.md`, `JOURNAL.md` (приватный)
- Скилл `/synth` с ролью ментора
- `LICENSE` (код MIT, патчи CC0)

---

_Следующий релиз: 0.2.0 — Фаза 1, первый звук (Reese-бас)_
