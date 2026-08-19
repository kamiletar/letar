# ZenStack: self-only read-политика `User` тихо режет справочник сотрудников до одной записи

## Симптом

Модель `User` разрешает чтение только самому себе:

```zmodel
@@allow('read,update', auth() != null && auth().id == this.id)
@@allow('all', auth().isAdmin)
```

Любой код под enhanced-клиентом (`getEnhancedPrisma(user)`), вызванный от имени **не-ADMIN**
сотрудника (`SALES`, `DIRECTOR`, `MANAGER` и т.п.), на `db.user.findMany()` / `db.user.findFirst()`
получает не ошибку, а пустой список или ровно одну запись — самого вызывающего. Типичное
проявление: выпадающий список «выбрать менеджера/ответственного/исполнителя» в staff-панели
показывает только текущего пользователя, хотя в БД сотрудников много.

## Причина

Read-политика ZenStack — это не проверка допуска перед операцией, а **построчный WHERE**,
подмешиваемый в запрос. `auth().id == this.id` для каждой строки таблицы `User` истинно только
для одной строки — строки самого вызывающего. `findMany()` не бросает исключение (в отличие от
[create → read-back](/.claude/docs/zenstack-public-write-read-back.md), где нарушение политики
даёт явную ошибку) — он просто отфильтровывает всё, что не прошло проверку, и возвращает то, что
осталось. Симптом маскируется под «результат пуст» или «результат из одной записи», а не под отказ
в доступе — заметить это без явного теста на роль, отличную от ADMIN, сложно.

Второй допуск в примере (`@@allow('all', auth().isAdmin)`) снимает проблему только для ADMIN —
для всех остальных ролей self-only остаётся единственной применимой веткой политики.

## Где всплывает

Любой **staff-facing lookup справочника пользователей** внутри enhanced-клиента, вызванный не от
имени ADMIN: выбор менеджера сделки, назначение ответственного, список исполнителей, список для
переназначения. Не всплывает на самих self-facing экранах («мой профиль») — там `findUnique` по
своему же `id` и так возвращает то, что нужно.

## Решение

Для чтения справочника `User` внутри server action/страницы, где доступ уже прогейтен на своём
уровне (`requireRole()` или аналог, проверяющий, что текущий актор — сотрудник с нужной ролью) —
использовать **сырой** Prisma-клиент, а не enhanced:

```typescript
'use server'

import { prisma } from '@/lib/db'

// Сырой prisma, не getEnhancedPrisma(): у User read-политика self-only
// (auth().id == this.id) + allow('all', isAdmin) — под enhanced-клиентом не-ADMIN сотрудник
// получил бы в списке менеджеров только самого себя. Доступ уже прогейтен requireRole() выше.
export async function listManagersAction() {
  await requireRole(['SALES', 'DIRECTOR', 'ADMIN'])

  return prisma.user.findMany({
    where: { role: { in: ['SALES', 'DIRECTOR'] } },
    select: { id: true, name: true, email: true },
  })
}
```

Тот же обход нужен и на чтение (`findMany` для выпадающего списка), и на **проверку существования**
конкретного `userId` перед записью (`findUnique` при валидации `managerId`/`newManagerId` в
server action) — обе операции идут через ту же read-политику и одинаково молча не находят чужого
пользователя.

Это узкое, предметное исключение — не повод переводить весь доступ к `User` на сырой клиент.
Все остальные операции (запись, self-facing чтение) должны по-прежнему идти через
`getEnhancedPrisma()`, чтобы access control policies применялись автоматически.

## Живой пример (domwellbes)

Три места, поймавшие эту ловушку в одной сессии 2026-08-19 (`apps/domwellbes/PLAN_COMPLETED.md`,
записи «Сессия 2026-08-19 — CRM М7A.2: реестр intake (задача №40)» и «Сессия 2026-08-19 (точечный
фикс) — DIRECTOR не мог переназначить менеджера сделки»):

- `apps/domwellbes/src/app/(admin)/admin/_actions/deal-intake.action.ts` — проверка `managerId`
  перед созданием сделки.
- `apps/domwellbes/src/app/(admin)/admin/_actions/deal-reassign.action.ts` — проверка
  `newManagerId` перед переназначением.
- `apps/domwellbes/src/app/(admin)/admin/deals/[id]/page.tsx` и
  `apps/domwellbes/src/app/(admin)/admin/deals/new/page.tsx` — список менеджеров для выпадающего
  списка.

Политика модели — `apps/domwellbes/schema.zmodel:601`. Сырой клиент экспортируется из
`apps/domwellbes/src/lib/db.ts:45`.

## Проверено в остальном монорепо — открытых находок нет

Грепом `auth().id == this.id` / `auth() == this` по всем `schema.zmodel` монорепо (2026-08-19)
найдено ещё 9 приложений с self-only веткой в политике `User` (`aprel8008`, `archetest`,
`auth-hub`, `time`, `animatrona-tracker`, `svoichuzhie`, `mandala`, `kami`, `dsperevod`,
`grandslamcup`, `driving-school`) — но ни одно не воспроизводит баг:

- **`archetest`, `dsperevod`, `grandslamcup`** — рядом с self-only есть отдельная широкая ветка
  `@@allow('read,update,delete', 'ADMIN' in auth().roles)` / `auth().role == 'ADMIN'`: под ADMIN
  (обычно и есть staff-роль, делающая lookup) политика не режет список.
- **`mandala`, `auth-hub`, `aprel8008`, `animatrona-tracker`, `kami`** — у `User` есть отдельная
  `@@allow('read', true)`: чтение открыто всем, self-only действует только на `update`.
- **`time`** — read по-настоящему self-only (`auth() == this` без исключений), но это
  персональное приложение-напоминалка без staff-ролей и списков сотрудников — `findMany`/`findFirst`
  по `User` в `apps/time/src` не встречается вовсе, применять паттерн некому.
- **`driving-school`** — read открыт `auth() != null && deletedAt == null` (любой авторизованный),
  self-only там только на уровне **полей** `email`/`phone` (`@allow`, не `@@allow`) — другой
  механизм, не подверженный этой ловушке.
- **`studio`** — рядом с self-only есть `@@allow('all', auth().isOwner)`, но `isOwner` — это
  единственный владелец студии, не multi-user staff-роль; в приложении нет промежуточных
  сотрудников, которым нужен был бы lookup чужих `User`, поэтому ветка не эксплуатируется на
  практике. Если в studio появится вторая non-owner staff-роль с доступом к спискам
  пользователей — эту модель стоит перепроверить первой.

Если заводишь новое multi-user staff-приложение с self-only политикой `User` — проверяй эту же
модель до того, как писать первый список сотрудников.
