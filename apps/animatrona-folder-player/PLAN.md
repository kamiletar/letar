# PLAN — Animatrona Folder Player

## ✅ Переименование из `animatrona-player` (2026-09-08)

Приложение переименовано в `animatrona-folder-player` по решению владельца (задача от
`animatrona-coordinator-dev`, доставлена не через Agent Mail — identity `animatrona-dev` была
retired на момент отправки, зафиксирована прямо здесь координатором). Каталог, `name` в
`project.json`/`package.json`, `appId` в `electron-builder.yml`, упоминания в
`README.md`/`PLAN.md`/`PLAN_TESTING.md` — обновлены. Продуктовое имя (`productName`/
`shortcutName` в `electron-builder.yml`) оставлено «Animatrona Player» — это отображаемое
пользователю название, не внутренний слаг. Каскада на другие animatrona-приложения не было
(не импортирует `@letar/animatrona-types`, изолирован).

## Фаза 1 — MVP

- [ ] Заменить placeholder-иконку и заголовок
- [ ] Бизнес-логика в `main/services/`
- [ ] IPC-хендлеры в `main/ipc/`
- [ ] UI в `renderer/app/page.tsx`
- [ ] Проверка dev-режима и упакованной сборки (`nx build:win animatrona-folder-player`)
