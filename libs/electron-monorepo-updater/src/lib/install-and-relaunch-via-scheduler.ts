/**
 * Тихая установка NSIS-инсталлятора (`oneClick: false`) с гарантированным перезапуском —
 * вместо `autoUpdater.quitAndInstall()`. Запускать инсталлятор должен НЕ наш процесс, а внешний
 * `.bat`, который дожидается его завершения и только потом поднимает приложение.
 *
 * Извлечено из `kami-key-the` (`main/updater.ts`, релиз 1.9.27) — история находок и живых тестов,
 * приведших к этой схеме, там же в комментариях и в `PLAN.md`/`CHANGELOG.md` версий 1.9.6–1.9.27.
 * Короткая версия:
 *
 * - `quitAndInstall()` без аргументов при `oneClick: false` показывает пользователю полный
 *   мастер NSIS вместо тихого обновления (`isSilent` по умолчанию `false`).
 * - `quitAndInstall(true, true)` (тихо + автозапуск) не перезапускает приложение надёжно: макрос
 *   `doStartApp` шаблона electron-builder запускает не exe напрямую, а Start Menu-ярлык
 *   (`$launchLink`), который в момент установки этой переменной может ещё не существовать на
 *   диске — гонка, не показывающая ошибку в тихом режиме, просто ничего не запускающая.
 * - `quitAndInstall(true, false)` + свой релончер, угадывающий конец установки (`ren` на exe,
 *   опрос `tasklist` по имени) — тупик: electron-updater запускает инсталлятор отвязанным
 *   процессом и не сообщает ни момент его завершения, ни код выхода, а `tasklist` обрезает имя
 *   образа до 25 символов и не находит длинные имена файлов инсталлятора.
 *
 * Рабочая схема: `.bat`, запущенный через планировщик задач (не `spawn(detached)` — на Windows
 * Node не выставляет `CREATE_BREAKAWAY_FROM_JOB`, и потомок остаётся в job-дереве Electron, умирая
 * вместе с приложением), сам: 1) ждёт выхода текущего процесса по PID; 2) синхронно запускает
 * инсталлятор и пишет в лог его код выхода; 3) только после этого запускает приложение напрямую
 * по exe-пути, минуя `.lnk` целиком.
 */

import { spawnSync } from 'node:child_process'
import { appendFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface BuildRelaunchBatScriptOptions {
  /** Путь до скачанного инсталлятора (`installerPath` из `UpdateDownloadedEvent`) */
  installerPath: string
  /** Путь к exe текущего приложения, которым перезапускать после установки */
  exePath: string
  /** PID текущего процесса — `.bat` дождётся его выхода перед запуском инсталлятора */
  pid: number
  /** Куда писать журнал шагов `.bat` (ожидание PID, старт/код выхода инсталлятора, старт приложения) */
  debugLogPath: string
  /** Куда перенаправить stdout/stderr перезапущенного приложения */
  appOutputLogPath: string
  /** Аргументы инсталлятора после пути к нему, например `['--updated', '/S']` для тихой NSIS-установки */
  installerArgs: string[]
}

/**
 * Строит содержимое `.bat`-скрипта релончера — вынесено отдельно от записи файла и вызова
 * `schtasks`, чтобы логику можно было проверить юнит-тестом без реального планировщика задач.
 */
export function buildRelaunchBatScript(options: BuildRelaunchBatScriptOptions): string {
  const { installerPath, exePath, pid, debugLogPath, appOutputLogPath, installerArgs } = options
  const installerCommand = [installerPath, ...installerArgs].map((part) => `"${part}"`).join(' ')
  const log = (text: string): string => `echo [%date% %time%] ${text} >> "${debugLogPath}"`
  // Внутри блоков `( ... )` `%var%` раскрывается при разборе всего блока — там нужны `!var!`
  const logInBlock = (text: string): string => `echo [!date! !time!] ${text} >> "${debugLogPath}"`

  return [
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
    installerCommand,
    'set "INSTALL_RESULT=%errorlevel%"',
    log('installer exited, errorlevel=%INSTALL_RESULT%'),
    // 3. Запуск приложения — напрямую, последней командой, с выводом в лог: cmd передаёт хендлы
    //    `>>`/`2>&1` через STARTUPINFO и GUI-процессу. Строка блокирует `.bat` до выхода
    //    приложения — это нормально, его никто не ждёт.
    log('starting app'),
    `"${exePath}" >> "${appOutputLogPath}" 2>&1`,
    log('app process exited, errorlevel=%errorlevel%'),
    'del "%~f0" >nul 2>&1',
    '',
  ].join('\r\n')
}

export interface InstallAndRelaunchViaSchedulerOptions {
  /** Путь до скачанного инсталлятора (`installerPath` из `UpdateDownloadedEvent`) */
  installerPath: string
  /**
   * Имя приложения без пробелов — используется в имени задачи планировщика (`<appLabel>-Update-…`)
   * и в именах файлов `.bat`/лога во временной директории, например `"KamiKeyThe"`
   */
  appLabel: string
  /** Аргументы инсталлятора после пути к нему. По умолчанию тихая NSIS-установка `['--updated', '/S']` */
  installerArgs?: string[]
  /** Путь к exe текущего приложения — по умолчанию `process.execPath` */
  exePath?: string
  /** PID текущего процесса — по умолчанию `process.pid` */
  pid?: number
}

/**
 * Тихо ставит скачанное обновление и перезапускает приложение через планировщик задач.
 *
 * @returns `false`, если планировщик не принял задачу — вызывающий должен откатиться на штатный
 * `autoUpdater.quitAndInstall()`, чтобы обновление хотя бы установилось, пусть и без гарантии
 * автоперезапуска.
 */
export function installAndRelaunchViaScheduler(options: InstallAndRelaunchViaSchedulerOptions): boolean {
  const exePath = options.exePath ?? process.execPath
  const pid = options.pid ?? process.pid
  const installerArgs = options.installerArgs ?? ['--updated', '/S']
  const slug = options.appLabel.toLowerCase()
  const stamp = Date.now()
  const batPath = join(tmpdir(), `${slug}-update-${stamp}.bat`)
  const debugLogPath = join(tmpdir(), `${slug}-relauncher-debug.log`)
  const appOutputLogPath = join(tmpdir(), `${slug}-app-output.log`)

  const batContent = buildRelaunchBatScript({
    installerPath: options.installerPath,
    exePath,
    pid,
    debugLogPath,
    appOutputLogPath,
    installerArgs,
  })
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
  const taskName = `${options.appLabel}-Update-${stamp}`
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
