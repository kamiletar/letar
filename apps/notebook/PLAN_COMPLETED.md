# Блокнот Ками — выполненные задачи

## v0.2.0 — Схема БД и вход (2026-10-05)

### Этап 1 — Каркас и вход

- Схема `schema.zmodel`: `User`/`Session`/`Account`/`Verification`, `Rubric`, `Note`, `NoteVersion`, `NoteRubric`
- Версии неизменяемы (`@@deny('update,delete')`), заметка хранит только `currentVersionId` и `publishedVersionId`
- Статусы заметки `PRIVATE` → `PENDING` → `PUBLISHED`
- Миграция `init`, локальная БД в контейнере `notebook-postgres-dev` (порт 5470)
- Вход через Ключницу (`hub-client`), доступ только по `OWNER_EMAIL`
- Стартовые рубрики создаются при первом входе

## v0.1.0 — Каркас приложения (2026-10-05)

### Фаза 0 — Фундамент

- Сгенерирован каркас приложения (`nx g @letar/generators:new-app notebook`)

---

**Последнее обновление:** 2026-10-06
