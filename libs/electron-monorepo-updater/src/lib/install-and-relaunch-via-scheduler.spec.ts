import { describe, expect, it } from 'vitest'

import { buildRelaunchBatScript } from './install-and-relaunch-via-scheduler'

describe('buildRelaunchBatScript', () => {
  const baseOptions = {
    installerPath: 'C:\\Users\\Kami\\AppData\\Local\\Temp\\KamiKeyThe-Setup-1.9.27.exe',
    exePath: 'C:\\Users\\Kami\\AppData\\Local\\Programs\\KamiKeyThe\\KamiKeyThe.exe',
    pid: 4242,
    debugLogPath: 'C:\\Temp\\kamikeythe-relauncher-debug.log',
    appOutputLogPath: 'C:\\Temp\\kamikeythe-app-output.log',
    installerArgs: ['--updated', '/S'],
  }

  it('ждёт выхода процесса по PID перед запуском инсталлятора', () => {
    const script = buildRelaunchBatScript(baseOptions)
    const installerCommand = `"${baseOptions.installerPath}" "--updated" "/S"`

    expect(script).toContain('tasklist /fi "PID eq 4242" /fo csv /nh')
    expect(script.indexOf('tasklist /fi')).toBeLessThan(script.indexOf(installerCommand))
  })

  it('запускает инсталлятор синхронно с переданными аргументами и сохраняет его errorlevel', () => {
    const script = buildRelaunchBatScript(baseOptions)

    expect(script).toContain(`"${baseOptions.installerPath}" "--updated" "/S"`)
    expect(script).toContain('set "INSTALL_RESULT=%errorlevel%"')
  })

  it('запускает приложение по exe-пути напрямую, а не через .lnk, после установки', () => {
    const script = buildRelaunchBatScript(baseOptions)

    const installerIndex = script.indexOf(baseOptions.installerPath)
    const exeStartIndex = script.indexOf(`"${baseOptions.exePath}" >> `)

    expect(exeStartIndex).toBeGreaterThan(-1)
    expect(exeStartIndex).toBeGreaterThan(installerIndex)
    expect(script).toContain(`>> "${baseOptions.appOutputLogPath}" 2>&1`)
  })

  it('переключает cmd в UTF-8, чтобы кириллица в пути профиля не превращалась в мусор', () => {
    const script = buildRelaunchBatScript(baseOptions)

    expect(script).toContain('chcp 65001 >nul')
  })

  it('удаляет сам себя последней командой', () => {
    const script = buildRelaunchBatScript(baseOptions)

    expect(script.trim().endsWith('del "%~f0" >nul 2>&1')).toBe(true)
  })

  it('использует другие аргументы инсталлятора, если переданы не дефолтные', () => {
    const script = buildRelaunchBatScript({ ...baseOptions, installerArgs: ['--silent'] })

    expect(script).toContain(`"${baseOptions.installerPath}" "--silent"`)
    expect(script).not.toContain('/S')
  })
})
