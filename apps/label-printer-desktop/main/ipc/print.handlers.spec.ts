/**
 * Тесты для IPC handlers печати
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Мокаем electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Мокаем settingsService
vi.mock('../services/settings.service', () => ({
  settingsService: {
    getSettings: vi.fn(),
    getPrinterConfig: vi.fn(),
    getLabelConfig: vi.fn(),
    isAllowDuplicates: vi.fn(),
  },
}))

// Мокаем fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}))

import { ipcMain } from 'electron'
import { registerPrintHandlers, resetPrinterService } from './print.handlers'

describe('print.handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPrinterService()
  })

  describe('registerPrintHandlers', () => {
    it('должен зарегистрировать все handlers', () => {
      registerPrintHandlers()

      expect(ipcMain.handle).toHaveBeenCalledWith('print:validate', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('print:execute', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('print:generateBarcodes', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('print:printImage', expect.any(Function))
    })
  })

  describe('print:validate handler', () => {
    it('должен валидировать корректный код маркировки', async () => {
      registerPrintHandlers()

      // Получаем зарегистрированный handler
      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const validateCall = handleCalls.find((call) => call[0] === 'print:validate')
      expect(validateCall).toBeDefined()

      const validateHandler = validateCall![1] as (event: unknown, code: string) => Promise<unknown>

      // Валидный код маркировки с проверенным GTIN (04610000000007)
      // Формат: 01 + GTIN14 + 21 + serial + 91 + crypto (минимум 4 символа)
      const validCode = '010461000000000721SN12345691CRYPT'
      const result = await validateHandler({}, validCode)

      expect(result).toMatchObject({
        isValid: true,
        code: {
          fullCode: validCode,
          gtin: '04610000000007',
          gtin13: '4610000000007',
          serialNumber: 'SN123456',
          cryptoCode: 'CRYPT',
        },
      })
    })

    it('должен возвращать ошибку для невалидного GTIN', async () => {
      registerPrintHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const validateCall = handleCalls.find((call) => call[0] === 'print:validate')
      const validateHandler = validateCall![1] as (event: unknown, code: string) => Promise<unknown>

      // Невалидный GTIN (неверная контрольная сумма)
      const invalidCode = '010461234567890021ABC123\x1D93XXXX'
      const result = await validateHandler({}, invalidCode)

      expect(result).toMatchObject({
        isValid: false,
        error: {
          type: 'GTIN',
          message: 'Неверный GTIN',
        },
      })
    })

    it('должен возвращать ошибку для неверного формата', async () => {
      registerPrintHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const validateCall = handleCalls.find((call) => call[0] === 'print:validate')
      const validateHandler = validateCall![1] as (event: unknown, code: string) => Promise<unknown>

      // Слишком короткий код
      const shortCode = '01ABC'
      const result = await validateHandler({}, shortCode)

      expect(result).toMatchObject({
        isValid: false,
        error: {
          type: 'FORMAT',
          message: 'Неверный формат кода',
        },
      })
    })

    it('должен возвращать ошибку для пустого кода', async () => {
      registerPrintHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const validateCall = handleCalls.find((call) => call[0] === 'print:validate')
      const validateHandler = validateCall![1] as (event: unknown, code: string) => Promise<unknown>

      const result = await validateHandler({}, '')

      expect(result).toMatchObject({
        isValid: false,
        error: expect.objectContaining({
          message: expect.any(String),
        }),
      })
    })
  })

  describe('resetPrinterService', () => {
    it('должен сбрасывать printerService без ошибок', () => {
      expect(() => resetPrinterService()).not.toThrow()
    })
  })
})
