import { describe, expect, it, vi } from 'vitest'
import { runSeed } from './run-seed'

describe('runSeed', () => {
  it('вызывает disconnect после успешного main и не трогает exitCode', async () => {
    const main = vi.fn().mockResolvedValue(undefined)
    const disconnect = vi.fn().mockResolvedValue(undefined)
    const originalExitCode = process.exitCode
    process.exitCode = undefined

    await runSeed(main, disconnect)

    expect(main).toHaveBeenCalledOnce()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(process.exitCode).toBeUndefined()

    process.exitCode = originalExitCode
  })

  it('выставляет exitCode=1 при ошибке main, но всё равно вызывает disconnect', async () => {
    const error = new Error('seed упал')
    const main = vi.fn().mockRejectedValue(error)
    const disconnect = vi.fn().mockResolvedValue(undefined)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const originalExitCode = process.exitCode
    process.exitCode = undefined

    await runSeed(main, disconnect)

    expect(disconnect).toHaveBeenCalledOnce()
    expect(process.exitCode).toBe(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(error)

    process.exitCode = originalExitCode
    consoleErrorSpy.mockRestore()
  })

  it('дожидается disconnect, даже если он асинхронный', async () => {
    const main = vi.fn().mockResolvedValue(undefined)
    let disconnected = false
    const disconnect = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      disconnected = true
    })

    await runSeed(main, disconnect)

    expect(disconnected).toBe(true)
  })
})
