# PLAN — Animatrona Player

## ⚠️ Задача от координатора (animatrona-coordinator-dev, 2026-09-08)

- [ ] **Переименовать приложение `animatrona-player` → `animatrona-folder-player`** (решение
      владельца). Каталог `apps/animatrona-player/` → `apps/animatrona-folder-player/`, `name` в
      `project.json`/`package.json`, `appId`/`productName` в `electron-builder.yml`, заголовок и
      упоминания в `README.md`/`PLAN.md`/`PLAN_TESTING.md`. Приложение ещё в Фазе 1 MVP (ничего не
      реализовано) — рефакторинг дешёвый, других веток/агентов на текущее имя не завязано. Каскада
      на другие animatrona-приложения нет (не импортирует `@letar/animatrona-types`, изолирован).
      Задача не была доставлена через Agent Mail — identity `animatrona-dev` была retired на
      момент отправки, поэтому зафиксирована здесь.

## Фаза 1 — MVP

- [ ] Заменить placeholder-иконку и заголовок
- [ ] Бизнес-логика в `main/services/`
- [ ] IPC-хендлеры в `main/ipc/`
- [ ] UI в `renderer/app/page.tsx`
- [ ] Проверка dev-режима и упакованной сборки (`nx build:win animatrona-player`)
