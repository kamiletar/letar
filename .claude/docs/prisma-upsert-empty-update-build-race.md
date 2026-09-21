# `upsert` с `update: {}` в билд-времени — гонка воркеров `next build`

⚠️ `next build` на **пустой** БД падает на фазе «Collecting page data» с `P2002` по первичному
ключу (`AppSettings_pkey`), а на второй попытке (или после первого деплоя) проходит. Локально и
на прогретой БД не воспроизводится.

## Механизм

1. Страница/layout, которую Next считает статической (нет `headers()`/`cookies()`/`connection()`,
   нет `force-dynamic`), вызывает в рендере функцию вида «прочитать singleton-настройки, а если
   строки нет — создать её»: `prisma.x.upsert({ where: { id: 'global' }, create: {...}, update: {} })`.
2. На «Collecting page data» Next запускает пул воркеров (по умолчанию `cpus - 1`, у нас
   ~11), каждый — отдельный процесс с отдельным соединением к БД и своим in-process кэшем.
3. Строки ещё нет → **все** воркеры одновременно не находят её и делают INSERT. Первый
   выигрывает, остальные получают unique violation → сборка падает.
4. Второй запуск проходит: строку создал проигравший прошлый прогон (или победитель до падения).

Ключевое: `upsert` — не гарантия атомарности. Prisma переводит его в нативный
`INSERT … ON CONFLICT` только при ряде условий (единственное уникальное поле в `where`, то же
значение в `create`, отсутствие вложенных операций и т.п.); иначе это `SELECT` → `INSERT`
двумя запросами с окном гонки между ними. В aboi сработал именно второй вариант — `P2002`
воспроизвёлся с `update: {}`. Не полагайся на `upsert` как на атомарный get-or-create, не
проверив сгенерированный SQL; для гарантии — фикс слоя 1 ниже.

Диагностика: в логе билда `Unique constraint failed on the fields: (id)` /
`PrismaClientKnownRequestError P2002` внутри `Collecting page data`, один и тот же ключ у
нескольких воркеров, и «второй деплой прошёл».

## Два слоя фикса (по образцу aboi, коммит `cc0746a`)

**1. Сделать get-or-create устойчивым к гонке** — сам смысл функции, а не обход билда
(гонка есть и в рантайме: первые параллельные запросы после деплоя на пустую БД):

```typescript
async function readOrCreateRow() {
  const existing = await prisma.appSettings.findUnique({ where: { id: 'global' } })
  if (existing) {
    return existing
  }
  try {
    return await prisma.appSettings.create({ data: { id: 'global', ...DEFAULTS } })
  } catch (error) {
    // Проигравший гонку — не ошибка: строку уже создал победитель, её и читаем
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const created = await prisma.appSettings.findUnique({ where: { id: 'global' } })
      if (created) {
        return created
      }
    }
    throw error
  }
}
```

⚠️ Код ошибки зависит от клиента: `P2002` — classic `@prisma/client` (как в aboi); у ZenStack v3
ORM это `dbErrorCode === '23505'`, см.
[zenstack-v3-orm-error-codes](/.claude/docs/zenstack-v3-orm-error-codes.md). Смотри, какой клиент
в `lib/db.ts`, прежде чем копировать `catch`.

**2. Убрать страницу из статической фазы**, если ей всё равно нужны свежие данные из БД на
каждый запрос — `export const dynamic = 'force-dynamic'` в layout/странице (в aboi — admin и
profile layout). Тогда `next build` вообще не вызывает функцию. Один этот слой без первого
недостаточен: прод-запросы на пустую БД всё равно гоняются; один первый без второго —
оставляет ненужные обращения к БД на сборке.

## Что искать при аудите

Не всякий `upsert` с `update: {}` — билд-время. Опасны вызовы из **рендера** без динамического
API. Безопасны: seed-скрипты, server actions и route handlers (не выполняются при сборке),
джобы pg-boss, Electron-приложения (SQLite, нет `next build` с пулом воркеров на общей БД),
страницы с `force-dynamic`.

Аудит 2026-09-21 (`apps/*`, `libs/*` без generated/seed): все `update: {}`-вызовы вне aboi
оказались небилд-контекстом — `domwellbes` (`tms/site-access.ts` — вызывается из действий;
`ifc/*-dictionary.ts`, `build-queue.ts` — из джоба сборки IFC; `houses/[slug]/page.tsx` — под
`force-dynamic` и зовёт только чистый `parseWallCompositions`), `driving-school`
(`complete-onboarding.action.ts` — server action в транзакции). Остальные `upsert` с непустым
`update` — записи по действию пользователя. Правок кроме aboi не потребовалось.

При добавлении нового «ленивого singleton» (`getSettings()`, `getOrCreate*()`) в приложение —
сразу делай слой 1; если он читается из layout/страницы — реши, нужен ли слой 2.
