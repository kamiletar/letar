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
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { pointFeedAtOwnRelease } from '@letar/electron-monorepo-updater'
import { app, dialog, net } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

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
 * Планирует перезапуск приложения после тихой установки — в обход `quitAndInstall(true, true)`.
 *
 * `isForceRunAfter=true` доверяет NSIS-скрипту электрон-билдера самому перезапустить приложение
 * (`doStartApp` в `installSection.nsh` при `${isForceRun} ${andIf} ${Silent}`), но тот запускает
 * не `$INSTDIR\...exe` напрямую, а ярлык из Пуск (`$launchLink` = `$newStartMenuLink`, если
 * `${FileExists}` на момент создания секции вернул true) — тот самый `.lnk`, для которого мы уже
 * ловили гонку «не удаётся найти KamiKeyThe.lnk» на финише обычной (не-тихой) установки: файл
 * попадает в проверку `FileExists`, но не успевает стать физически запускаемым к моменту
 * `ExecShellAsUser`. В тихом режиме та же гонка не показывает диалог об ошибке — просто ничего
 * не запускается. Подтверждено живым тестом 1.9.8→1.9.9: после `quitAndInstall(true, true)`
 * процесс не поднимался 10+ секунд.
 *
 * Вместо переопределения NSIS-шаблона (он приходит из `node_modules`, наш собственный
 * `.nsh`-инклюд для electron-builder усложнил бы конфиг ради обхода стороннего бага) сами
 * планируем перезапуск через detached `cmd.exe`, который переживёт `app.quit()`: ждёт, пока
 * инсталлятор допишет `${exePath}` (тот же путь, откуда сейчас запущен этот процесс — обновление
 * ставится в ту же директорию), и запускает его напрямую, без Start Menu ярлыка.
 */
function scheduleRelaunchAfterSilentInstall(): void {
  const exePath = process.execPath
  // До 20 попыток по 1с ждём, пока файл освободится (инсталлятор держит его открытым на запись,
  // пока не допишет) — проверяем через `ren <файл> <то же имя>`: переименование в то же имя не
  // меняет содержимое, но требует эксклюзивного доступа и падает с ошибкой, пока хендл занят.
  // `copy /y file file` для этой же цели не годится — cmd отказывает с «файл не может быть
  // скопирован сам в себя» независимо от блокировки, что проверено отдельно перед этим фиксом.
  //
  // Файл `.bat` вместо однострочной команды через `spawn(..., [script])` — первая версия на
  // `.join(' & ')` собирала синтаксически битую команду («& was unexpected at this time»,
  // найдено живым тестом 1.9.11→1.9.12: apps.exe файл обновился, релонча не было, `stdio:
  // 'ignore'` скрыл ошибку cmd молча). `.bat`-файл проверяем целиком перед запуском, а не
  // полагаемся на аккуратную склейку строк через разделитель.
  const batPath = join(tmpdir(), `kamikeythe-relaunch-${Date.now()}.bat`)
  const debugLogPath = join(tmpdir(), 'kamikeythe-relauncher-debug.log')
  const batContent = [
    '@echo off',
    'setlocal enabledelayedexpansion',
    `echo [%date% %time%] relauncher started, exe="${exePath}" >> "${debugLogPath}"`,
    'for /L %%i in (1,1,20) do (',
    `  ren "${exePath}" "${basename(exePath)}" >nul 2>&1`,
    `  echo [!date! !time!] attempt %%i ren errorlevel=!errorlevel! >> "${debugLogPath}"`,
    '  if not errorlevel 1 (',
    '    timeout /t 2 /nobreak >nul',
    `    echo [!date! !time!] starting "${exePath}" >> "${debugLogPath}"`,
    `    start "" "${exePath}"`,
    `    echo [!date! !time!] start command issued, errorlevel=!errorlevel! >> "${debugLogPath}"`,
    '    goto :done',
    '  )',
    '  timeout /t 1 /nobreak >nul',
    ')',
    `echo [%date% %time%] loop exhausted without success >> "${debugLogPath}"`,
    ':done',
    `echo [%date% %time%] relauncher finished >> "${debugLogPath}"`,
    'del "%~f0" >nul 2>&1',
    '',
  ].join('\r\n')
  writeFileSync(batPath, batContent, 'utf8')

  // ⚠️ Живые тесты 1.9.10–1.9.15 показали, что сам `.bat` (ren-retry + start) логически верен —
  // отладочный лог из 1.9.15 (живой тест 1.9.15→1.9.16) зафиксировал успешный `ren` с первой
  // попытки и `start` с errorlevel=0, но процесс `KamiKeyThe.exe` при этом не выживал ни секунды.
  // Причина — Job Object: Electron/Chromium оборачивает свой процесс в job с
  // `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, а `child_process.spawn(..., { detached: true })` на
  // Windows НЕ выставляет `CREATE_BREAKAWAY_FROM_JOB` — потомки (наш `cmd.exe`, а через него и
  // перезапущенный `KamiKeyThe.exe`) остаются в этой job и умирают вместе с ней в момент
  // `app.quit()`/закрытия последнего хендла, ДО того как относящийся к ним `.bat` успевает
  // написать хотя бы первую строку лога. Подтверждено изолированным воспроизведением: процесс
  // текущей PowerShell-сессии искусственно приписывался к killer-job через
  // `AssignProcessToJobObject`, затем спавнился detached `cmd.exe` без breakaway — после выхода
  // из killer-job-процесса ни `cmd.exe`, ни запущенный им `KamiKeyThe.exe` не переживали ни
  // секунды, лог оставался пустым. Node не даёт способа передать `CREATE_BREAKAWAY_FROM_JOB`
  // напрямую — обходим это, отдавая запуск `.bat` планировщику задач (`schtasks`): процесс,
  // запущенный сервисом Task Scheduler, создаётся вне job-дерева вызывающего процесса в принципе,
  // не только вне нашего конкретного job. Проверено тем же искусственным killer-job-тестом — с
  // `schtasks /create` + `/run` `KamiKeyThe.exe` пережил закрытие job-процесса и остался работать.
  const taskName = `KamiKeyThe-Relaunch-${Date.now()}`
  const scheduledTime = new Date(Date.now() + 60_000)
  const startTime = `${String(scheduledTime.getHours()).padStart(2, '0')}:${
    String(scheduledTime.getMinutes()).padStart(2, '0')
  }`
  spawnSync('schtasks', [
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
  spawnSync('schtasks', ['/run', '/tn', taskName])
  // Запись задачи планировщика после однократного /run больше не нужна — удаляем сразу, не дожидаясь
  // истечения /st (которое всё равно не наступит: задача уже отработала через /run).
  spawnSync('schtasks', ['/delete', '/tn', taskName, '/f'])
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

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: `Версия ${info.version} скачана`,
        detail: 'Перезапустить приложение для установки?',
        buttons: ['Перезапустить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          // isSilent=true — иначе NSIS-инсталлятор (oneClick: false в electron-builder.yml)
          // показывает полный мастер установки вместо тихого обновления. isForceRunAfter здесь
          // НЕ используем (передаём false) — перезапуск после силентной установки берём на себя
          // через scheduleRelaunchAfterSilentInstall, см. её комментарий про гонку с .lnk.
          scheduleRelaunchAfterSilentInstall()
          autoUpdater.quitAndInstall(true, false)
        }
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
