# Changelog — synth

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/), версии по [Semantic Versioning](https://semver.org/).

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
