# @letar/ipfs-kubo-core

SHARED IPFS/Kubo-код Animatrona-экосистемы — без Prisma-зависимостей. Вынесено из
`apps/animatrona/main/services/{kubo,ipfs}` для переиспользования лёгкими клиентами
(`animatrona-ipfs-player` и т.п.), не только полноценным Animatrona (создатель раздач).

## Что внутри

- `kubo/` — сервис Kubo-демона (`getKuboService`), конфигурация, обнаружение IPFS Desktop,
  private relay, статистика, синхронизация пиров (`getPeerSyncService`).
- `ipfs/` — pin-менеджер (`getPinManager`), лимит конкурентности Kubo-запросов
  (`kuboLimiter`), peer-id (`loadOrCreatePeerId` и пути к blockstore/datastore), READ-часть
  работы с файлами (`cat`, `stat`, `hasBlock`, `safeCat`, `probeCidAvailable`, `saveToFile`).
- `tracker-client.ts` — клиент публикации/синхронизации с `animatrona-tracker`.
- `utils/` — `createModuleLogger`, `getAvailablePort`, `createConcurrencyLimiter`.
- `types/` — общие типы IPFS/статистики/трекера.

## ⚠️ Только READ, без WRITE

Библиотека содержит только READ-операции над файлами в IPFS (`cat`/`stat`/`has`/`saveToFile`).
WRITE-операции (`addFile`, `addBytes`, `addDirectory`, `createDirectoryFromCids`, `repoGc`)
остались в Animatrona (`apps/animatrona/main/services/ipfs/unified-ipfs-service.ts`) — они
завязаны на creator-only очередь импорта (`ImportQueueController`) и нужны только приложению,
которое реально раздаёт контент, а не лёгким плеерам-потребителям.

## Установка

```typescript
import { cat, getKuboService, getPinManager, stat } from '@letar/ipfs-kubo-core'
```

## Команды

```bash
nx test ipfs-kubo-core
nx lint ipfs-kubo-core
nx typecheck:tsgo ipfs-kubo-core
```

## Подключение к приложению

`apps/animatrona` подключена как образец (двойная сборка main — webpack `animatrona:build` и
esbuild `animatrona-main:build`, оба со своим списком `@letar/*`-алиасов):

1. `package.json` → `dependencies["@letar/ipfs-kubo-core"] = "workspace:*"` (обязательно —
   код реально импортируется, не просто числится в `implicitDependencies`).
2. `main/webpack.config.js` → `resolve.alias['@letar/ipfs-kubo-core']`.
3. `main/tsconfig.json` → `compilerOptions.paths["@letar/ipfs-kubo-core"]`.
4. `tsconfig.json` (корень приложения) → `paths` + `include`-glob
   (`../../libs/ipfs-kubo-core/src/**/*.ts`) — «смешанная модель» типов, см.
   [libs.md](/.claude/rules/libs.md#подключение-к-приложению).

После правки `package.json` — `bun install` из корня репозитория, иначе симлинк в
`node_modules/@letar/ipfs-kubo-core` не появится.
