# @letar/electron-monorepo-updater

Две независимые проблемы обновления Electron-приложений через `electron-updater` на Windows:
коллизия `GithubProvider` у приложений, публикующих релизы в общий репозиторий `kamiletar/letar`,
и ненадёжная тихая установка/перезапуск через `quitAndInstall()` на NSIS-инсталляторах с
`oneClick: false`. Обе встречаются у одних и тех же приложений, поэтому живут в одной библиотеке.

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

### `installAndRelaunchViaScheduler(options): boolean`

Тихо ставит скачанное обновление и надёжно перезапускает приложение — замена
`autoUpdater.quitAndInstall()` для NSIS-инсталляторов, собранных с `nsis.oneClick: false`. Почему
`quitAndInstall()` во всех его вариантах (без аргументов, `(true, true)`, `(true, false)` + свой
релончер по `tasklist`) не подходит — см. комментарий в начале
`src/lib/install-and-relaunch-via-scheduler.ts` и историю версий 1.9.6–1.9.27 в
`apps/kami-key-the/CHANGELOG.md`/`PLAN.md`, где схема выведена и проверена живыми тестами.

Работает через планировщик задач (`schtasks /create` + `/run` + `/delete`), не `spawn(detached)` —
на Windows потомок Node остаётся в job-дереве Electron и умирает вместе с приложением, а процесс
Task Scheduler создаётся вне этого дерева. Возвращает `false`, если планировщик не принял
задачу — в этом случае вызывающий должен откатиться на штатный `quitAndInstall(true, false)`
(обновление встанет, но без гарантии автоперезапуска).

```typescript
import { installAndRelaunchViaScheduler } from '@letar/electron-monorepo-updater'
import { autoUpdater, type UpdateDownloadedEvent } from 'electron-updater'

autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
  if (installAndRelaunchViaScheduler({ installerPath: event.downloadedFile, appLabel: 'KamiKeyThe' })) {
    // .bat запустит инсталлятор сам — отключаем штатную установку при выходе, иначе
    // electron-updater запустит второй экземпляр инсталлятора из своего quit-обработчика
    autoUpdater.autoInstallOnAppQuit = false
    app.quit()
    return
  }
  console.error('Планировщик задач не принял задачу — штатная установка без перезапуска')
  autoUpdater.quitAndInstall(true, false)
})
```

⚠️ **Живые тесты этой функции нельзя гонять из шелла агента Claude Desktop напрямую** — сам шелл
и любой процесс, который он спавнит, работает внутри MSIX-контейнера пакета и не видит реального
состояния системы (реестр, иногда — файлы). Инсталлятор и перезапущенное приложение запускай через
`schtasks`, как и сама функция это делает; подробности —
[claude-desktop-msix-container-virtualization.md](/.claude/docs/claude-desktop-msix-container-virtualization.md).

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
