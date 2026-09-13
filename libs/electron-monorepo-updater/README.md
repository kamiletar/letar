# @letar/electron-monorepo-updater

Обходит коллизию `GithubProvider` из `electron-updater` для Electron-приложений, публикующих
GitHub Releases в общий репозиторий `kamiletar/letar` (не в отдельный dedicated-репозиторий на
приложение).

## Проблема

`kamiletar/letar` — общий публичный монорепо: несколько Electron-приложений (`animatrona`,
`kami-key-the`, ...) публикуют туда GitHub Releases, различая их только префиксом тега
(`animatrona-v1.2.3`, `kami-key-the-v1.7.4`). Штатный `GithubProvider` electron-updater всегда
бьёт в repo-wide `GET /repos/{owner}/{repo}/releases/latest` — это самый свежий релиз **любого**
приложения репозитория, не обязательно того, что его запросило. Разбор конкретного инцидента —
[`.claude/docs/electron-monorepo-shared-releases.md`](/.claude/docs/electron-monorepo-shared-releases.md).

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { pointFeedAtOwnRelease } from '@letar/electron-monorepo-updater'
```

## API

### `findOwnLatestTag(options): Promise<string | null>`

Ищет тег последнего (не draft, не prerelease) релиза с заданным префиксом через `GET /releases`
(не `/latest`). Возвращает `null`, если своих релизов ещё нет.

### `pointFeedAtOwnRelease(autoUpdater, options): Promise<boolean>`

Находит свой тег и вызывает `autoUpdater.setFeedURL({ provider: 'generic', url: ... })` на
конкретный релиз. Возвращает `false` (не трогая `autoUpdater`), если своего релиза не найдено —
в этом случае `autoUpdater.checkForUpdates()` вызывать не нужно.

## Использование в Electron main-процессе

```typescript
import { pointFeedAtOwnRelease } from '@letar/electron-monorepo-updater'
import { app, net } from 'electron'
import { autoUpdater } from 'electron-updater'

const TAG_PREFIX = 'animatrona-v' // свой префикс на каждое приложение

export async function checkForUpdates(): Promise<void> {
  const found = await pointFeedAtOwnRelease(autoUpdater, {
    fetchFn: net.fetch,
    owner: 'kamiletar',
    repo: 'letar',
    tagPrefix: TAG_PREFIX,
    userAgent: `${app.getName()}-Update-Client`,
    onNotFound: (message) => console.warn(`[Updater] ${message}`),
  })
  if (!found) {
    return
  }
  await autoUpdater.checkForUpdates()
}
```

## Команды

```bash
nx test electron-monorepo-updater
nx lint electron-monorepo-updater
nx typecheck:tsgo electron-monorepo-updater
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/electron-monorepo-updater` в реальные `dependencies`
приложения (`workspace:*`), не только в `nx.implicitDependencies` — см.
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
