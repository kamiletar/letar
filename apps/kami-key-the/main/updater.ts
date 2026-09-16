/**
 * Автообновление через electron-updater — источник GitHub Releases.
 *
 * ⚠️ НЕ используем встроенный GithubProvider электрон-апдейтера напрямую — `kamiletar/letar`
 * общий для нескольких приложений, репозиторий-wide `/releases/latest` вернёт чужой релиз.
 * Разбор и общая реализация обхода — `@letar/electron-monorepo-updater`
 * (`.claude/docs/electron-monorepo-shared-releases.md`).
 *
 * Диалоговый UX (не toast/renderer-стрим, как у animatrona) — по образцу
 * label-printer-desktop: у KamiKeyThe нет постоянно открытого окна (приложение живёт в трее).
 */

import { spawnSync } from 'node:child_process'
import { appendFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { pointFeedAtOwnRelease } from '@letar/electron-monorepo-updater'
import { app, dialog, net } from 'electron'
import { autoUpdater, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater'

const REPO_OWNER = 'kamiletar'
const REPO_NAME = 'letar'
const TAG_PREFIX = 'kami-key-the-v'

let initialized = false

function configureLogger(): void {
  autoUpdater.logger = {
    info: (message: string) => console.log(`[Updater] ${message}`),
    warn: (message: string) => console.warn(`[Updater] ${message}`),
    error: (message: string) => console.error(`[Updater] ${message}`),
    debug: (message: string) => console.log(`[Updater:debug] ${message}`),
  }
}

/**
 * Тихо ставит скачанное обновление и перезапускает приложение — вместо
 * `autoUpdater.quitAndInstall()`. Запускать инсталлятор должен НЕ наш процесс, а внешний `.bat`,
 * который дожидается его завершения и только потом поднимает приложение.
 *
 * Почему не `quitAndInstall(true, true)`: NSIS-шаблон electron-builder перезапускает приложение
 * через ярлык из Пуск (`$launchLink`), который в тихом режиме не успевает стать запускаемым —
 * процесс просто не поднимается (живой тест 1.9.8→1.9.9).
 *
 * Почему не `quitAndInstall(true, false)` + свой релончер (1.9.10–1.9.26): electron-updater
 * запускает инсталлятор отвязанным процессом и не сообщает ни момент его завершения, ни код
 * выхода. Релончеру приходилось угадывать конец установки — пробой `ren` на exe (exe занят лишь
 * ~2с в середине установки) и опросом `tasklist`. Запустишь приложение раньше времени — NSIS
 * (`CHECK_APP_RUNNING` в `allowOnlyOneInstallerInstance.nsh`, ищет любой процесс из `$INSTDIR`)
 * убивает его как «не закрывшийся старый» либо, не сумев закрыть, в тихом режиме молча делает
 * `Quit` без установки (код 2). Проверка из 1.9.25 к тому же не работала вовсе: табличный
 * `tasklist` обрезает имя образа до 25 символов, и `KamiKeyThe-Setup-1.9.26.exe` не находился
 * никогда. Живой тест 1.9.25→1.9.26 прошёл только за счёт удачного тайминга: exe записан в
 * 22:55:27.8, релонч — в 22:55:30, пока инсталлятор, возможно, ещё работал.
 *
 * Теперь `.bat` сам: 1) ждёт выхода нашего процесса по PID; 2) синхронно запускает инсталлятор
 * и пишет в лог его код выхода — cmd в batch-режиме ждёт и GUI-процесс (проверено: 19с ожидания,
 * `errorlevel=0`, exe пересоздан до выхода инсталлятора); 3) только после этого запускает
 * приложение. Если установка упала — запускает старую версию, чтобы пользователь не остался без
 * приложения; при следующем старте проверка обновлений предложит его снова.
 *
 * Запуск `.bat` — через планировщик задач (`schtasks /create` + `/run`), не `spawn(detached)`:
 * Node на Windows не выставляет `CREATE_BREAKAWAY_FROM_JOB`, и потомок остаётся в job-дереве
 * Electron (живые тесты 1.9.10–1.9.15: процесс умирал вместе с приложением). Процесс сервиса
 * Task Scheduler создаётся вне этого дерева в принципе.
 *
 * @returns `false`, если планировщик не принял задачу — вызывающий откатывается на штатный
 * `quitAndInstall`, чтобы обновление хотя бы установилось, пусть и без перезапуска.
 */
function installAndRelaunchViaScheduler(installerPath: string): boolean {
  const exePath = process.execPath
  const pid = process.pid
  const stamp = Date.now()
  const batPath = join(tmpdir(), `kamikeythe-update-${stamp}.bat`)
  const debugLogPath = join(tmpdir(), 'kamikeythe-relauncher-debug.log')
  const appOutputLogPath = join(tmpdir(), 'kamikeythe-app-output.log')
  const log = (text: string): string => `echo [%date% %time%] ${text} >> "${debugLogPath}"`
  // Внутри блоков `( ... )` `%var%` раскрывается при разборе всего блока — там нужны `!var!`
  const logInBlock = (text: string): string => `echo [!date! !time!] ${text} >> "${debugLogPath}"`

  const batContent = [
    '@echo off',
    // Файл пишется в UTF-8, cmd по умолчанию читает его в OEM-кодировке — кириллица в пути
    // профиля (`C:\Users\Имя\...`) превратилась бы в мусор
    'chcp 65001 >nul',
    'setlocal enabledelayedexpansion',
    log(`updater started, pid=${pid}, installer="${installerPath}", exe="${exePath}"`),
    // 1. Ждём выхода текущего процесса. Потолок 30с — дальше NSIS закроет его сам (`isUpdated`
    //    ветка `CHECK_APP_RUNNING`), ожидание здесь лишь избавляет от его kill-цикла.
    //    В CSV PID стоит в кавычках отдельным полем — ищем вместе с кавычками.
    'for /L %%i in (1,1,30) do (',
    `  tasklist /fi "PID eq ${pid}" /fo csv /nh | findstr /C:"\\"${pid}\\"" >nul 2>&1`,
    '  if errorlevel 1 (',
    `    ${logInBlock('app process exited after %%i checks')}`,
    '    goto :app_exited',
    '  )',
    '  timeout /t 1 /nobreak >nul',
    ')',
    log('app process still running after 30 checks, installer will close it'),
    ':app_exited',
    // 2. Синхронная тихая установка — те же аргументы, что передаёт `NsisUpdater.doInstall`
    log('installer starting'),
    `"${installerPath}" --updated /S`,
    'set "INSTALL_RESULT=%errorlevel%"',
    log('installer exited, errorlevel=%INSTALL_RESULT%'),
    // 3. Запуск приложения — напрямую, последней командой, с выводом в лог: cmd передаёт хендлы
    //    `>>`/`2>&1` через STARTUPINFO и GUI-процессу (`start /B` с редиректом файл не создавал,
    //    1.9.21). Строка блокирует `.bat` до выхода приложения — это нормально, его никто не ждёт.
    log('starting app'),
    `"${exePath}" >> "${appOutputLogPath}" 2>&1`,
    log('app process exited, errorlevel=%errorlevel%'),
    'del "%~f0" >nul 2>&1',
    '',
  ].join('\r\n')
  writeFileSync(batPath, batContent, 'utf8')

  const logSchtasksResult = (label: string, result: ReturnType<typeof spawnSync>): void => {
    appendFileSync(
      debugLogPath,
      `[${new Date().toISOString()}] schtasks ${label}: status=${result.status} error=${String(result.error)} stdout=${
        JSON.stringify(result.stdout?.toString())
      } stderr=${JSON.stringify(result.stderr?.toString())}\n`,
      'utf8',
    )
  }
  const taskName = `KamiKeyThe-Update-${stamp}`
  // `/st` обязателен для `/sc once`, но время не наступит: задачу сразу запускаем через `/run`
  const scheduledTime = new Date(stamp + 60_000)
  const startTime = `${String(scheduledTime.getHours()).padStart(2, '0')}:${
    String(scheduledTime.getMinutes()).padStart(2, '0')
  }`
  const createResult = spawnSync('schtasks', [
    '/create',
    '/tn',
    taskName,
    '/tr',
    `cmd.exe /d /c "${batPath}"`,
    '/sc',
    'once',
    '/st',
    startTime,
    '/f',
  ])
  logSchtasksResult('create', createResult)
  if (createResult.status !== 0) {
    return false
  }
  const runResult = spawnSync('schtasks', ['/run', '/tn', taskName])
  logSchtasksResult('run', runResult)
  // Запись задачи после однократного /run не нужна — уже запущенный процесс это не затрагивает
  const deleteResult = spawnSync('schtasks', ['/delete', '/tn', taskName, '/f'])
  logSchtasksResult('delete', deleteResult)
  return runResult.status === 0
}

/** Направить electron-updater на релиз конкретно KamiKeyThe (не repo-wide "latest") */
function pointOwnFeed(): Promise<boolean> {
  return pointFeedAtOwnRelease(autoUpdater, {
    fetchFn: net.fetch,
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tagPrefix: TAG_PREFIX,
    userAgent: 'KamiKeyThe-Update-Client',
    onNotFound: (message) => console.warn(`[Updater] ${message}`),
  })
}

/**
 * Инициализация автообновления — вызывать один раз из app.whenReady().
 * В dev-режиме (не упаковано) ничего не делает.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('[Updater] Dev-режим — проверка обновлений пропущена')
    return
  }
  if (initialized) {
    return
  }
  initialized = true

  configureLogger()
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: `Доступна новая версия KamiKeyThe ${info.version}`,
        detail: 'Скачать и установить сейчас?',
        buttons: ['Скачать', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          void autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: `Версия ${event.version} скачана`,
        detail: 'Перезапустить приложение для установки?',
        buttons: ['Перезапустить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response !== 0) {
          return
        }
        if (installAndRelaunchViaScheduler(event.downloadedFile)) {
          // Инсталлятор запустит `.bat` — отключаем штатную установку при выходе, иначе
          // electron-updater запустит второй экземпляр инсталлятора из своего quit-обработчика
          autoUpdater.autoInstallOnAppQuit = false
          app.quit()
          return
        }
        // Планировщик недоступен — ставим штатно (isSilent=true: иначе NSIS с `oneClick: false`
        // покажет полный мастер). Перезапуска не будет, но версия обновится.
        console.error('[Updater] Планировщик задач не принял задачу — штатная установка без перезапуска')
        autoUpdater.quitAndInstall(true, false)
      })
  })

  autoUpdater.on('error', (err) => {
    console.error(`[Updater] ${err.message}`)
  })

  // Тихая проверка при старте — без диалога «обновлений нет», чтобы не мешать
  // (приложение живёт в трее, пользователь не ждёт ответа на этот вызов)
  setTimeout(() => {
    pointOwnFeed()
      .then((found) => {
        if (found) {
          return autoUpdater.checkForUpdates()
        }
        return undefined
      })
      .catch((err: unknown) => {
        console.error('[Updater] Ошибка проверки при старте:', err)
      })
  }, 10_000)
}

/**
 * Проверка по требованию (пункт меню трея «Проверить обновления») —
 * в отличие от тихой стартовой проверки, всегда показывает результат.
 */
export async function checkForUpdatesManually(): Promise<void> {
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Проверка обновлений',
      message: 'Недоступно в режиме разработки',
    })
    return
  }

  try {
    const found = await pointOwnFeed()
    if (!found) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Обновлений нет',
        message: `Релизы KamiKeyThe не найдены (у вас установлена ${app.getVersion()})`,
      })
      return
    }

    const result = await autoUpdater.checkForUpdates()
    if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Обновлений нет',
        message: `У вас установлена последняя версия (${app.getVersion()})`,
      })
    }
    // Если обновление доступно — диалог со скачиванием покажет обработчик update-available выше
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await dialog.showMessageBox({
      type: 'error',
      title: 'Ошибка проверки обновлений',
      message,
    })
  }
}
