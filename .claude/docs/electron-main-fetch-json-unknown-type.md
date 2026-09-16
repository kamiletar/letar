# `response.json()` в Electron main/ типизируется как `unknown`, не `any`

## Симптом

`main/` Electron-приложения (Nextron: `animatrona`, `label-printer-desktop`) собирается со
своим `main/tsconfig.json` с `lib: ["ES2022"]` — без `"DOM"` (main-процесс не должен видеть
браузерные типы). В таком конфиге `fetch`/`Response` резолвятся не из `lib.dom.d.ts`, а из
глобальных типов `@types/node` (undici-based). Там `Response.json(): Promise<unknown>`, а не
`Promise<any>`, как в DOM lib.

Следствие — любой код вида:

```typescript
const result = await response.json()
const data = result.data || result // TS18046: 'result' is of type 'unknown'
```

падает под `tsgo --noEmit`/`tsc --noEmit`, хотя в браузерном/Next.js окружении (renderer,
`lib: ["DOM", ...]`) тот же паттерн компилируется без единой ошибки — расхождение чисто из-за
разных `lib` у двух tsconfig одного приложения.

## Почему не ловилось раньше

Пока `main/tsconfig.json` не существовал (main/ вообще не типизировался — см.
[unit-testing.md § «Особый случай — Electron-приложения»](/.claude/docs/unit-testing.md)), эта
ошибка была невидима. Она вылезает в момент, когда `main/` впервые начинает типизироваться
отдельным конфигом с урезанным `lib`.

## Фикс

Явно типизировать результат `response.json()` через приведение, а не полагаться на `any`:

```typescript
/** ZenStack API возвращает `{ data: {...} }` либо сам объект напрямую */
type ApiWrapped<T> = T & { data?: T }

const result = (await response.json()) as ApiWrapped<Partial<SettingsData>>
const data = result.data || result
```

Не добавлять `"DOM"` в `lib` main-процесса ради этого — DOM-типы в main-процессе (Node, не
браузер) откроют доступ к глобалам (`window`, `document`), которых там физически нет.

## Где встретилось

`apps/label-printer-desktop/main/services/settings.service.ts` — main-процесс обращается к
SQLite не напрямую (Prisma не работает в Electron main под webpack), а через HTTP к Next.js
API рендерера (`main → HTTP → Next.js API → Prisma → SQLite`). Два места с
`await response.json()`.

`animatrona`, для сравнения, использует Prisma прямо в main/ (импортирует
`../../renderer/src/generated/prisma` напрямую) — паттерна с `fetch`+`response.json()` там нет,
поэтому эта ловушка у него не проявляется. Актуальна для любого будущего Electron main/,
который станет ходить в HTTP API так же, как `label-printer-desktop`.
