# Блокнот Ками — выполненные задачи

## Рефакторинг: DiffView и format.ts (2026-10-06, Unreleased)

- Построчная разница вынесена в `src/app/_components/diff-view.tsx` (prop `lines`, необязательный `empty`), использована в истории и `MergePanel`; `DATE_FORMAT` — в `src/lib/format.ts` (история и главная). Вид и поведение прежние

## v0.4.1 — Деплой на staging (2026-10-06)

- `Dockerfile.production`, `docker-compose.staging.yml` (Postgres + приложение за Traefik, host-порты 5468 и 3039), `.env.staging.enc` (SOPS), `output: 'standalone'`
- Адрес стейджа `notebook-stage.s1.letar.best` (по соглашению `*-stage.s1.letar.best`: уже есть wildcard-сертификат). `notebook.letar.best` оставлен для production на s2
- OIDC-клиент `notebook-prod` создан прямой записью в БД Ключницы (`auth-hub-db` на s2, секрет хранится как SHA-256 в base64url). ⚠️ Redirect URI у Better Auth `genericOAuth` — `/api/auth/callback/<providerId>`, не `/api/auth/oauth2/callback/...`: первая версия записи была с неверным путём и ломала вход
- Первый деплой выполнил `deploy-agent-dev` (letar `1551d30ff`), миграции применены

## v0.4.0 — Офлайн и ветки (2026-10-06)

### Этап 3 — Офлайн

- Очередь отправки (`src/lib/outbox.ts`, чистая логика) и хранилище в IndexedDB (`src/lib/offline/outbox-store.ts`): правка сначала пишется на устройство, потом уходит на сервер, параллельные прогоны сериализованы
- Редактор восстанавливает неотправленный текст из очереди после перезагрузки
- Service worker `public/sw.js` без зависимостей: страницы — сначала сеть (таймаут 4 с), при отказе копия; статика Next — из кэша; `public/offline.html`. Редиректы не кэшируются. На localhost не регистрируется (проверка хоста, `NODE_ENV` запрещён линтом)
- Индикатор «Офлайн / ждут отправки» (`OfflineSync` в layout)
- Ветки (`src/lib/branches.ts`): правка от устаревшей версии сохраняется веткой (`branched: true`) вместо `CONFLICT`; слияние на странице истории (`MergePanel`, `mergeBranchesAction`), поле `NoteVersion.mergedFromId`, миграция `version_merged_from`
- 38 unit-тестов (outbox 11, branches 9, versions 18); смоук веток и слияния на локальной БД

## v0.3.0 — Редактор и версии (2026-10-06)

### Этап 2 — Редактор и версии

- Логика версий и сравнения (`src/lib/versions.ts`): новая версия по правке, откат, построчный diff по LCS, название для списка
- Server actions сохранения, отката и мягкого удаления; редактор Markdown с предпросмотром (`react-markdown`), Ctrl+S, защита от закрытия с несохранённым текстом
- Страницы: список заметок, `/notes/new`, `/notes/[id]`, `/notes/[id]/history`
- Смоук на локальной БД: пустая правка версию не создаёт, откат создаёт новую версию, старые версии менять нельзя

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
