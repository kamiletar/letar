/**
 * Тесты для IPC handlers настроек
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Мокаем electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Мокаем settingsService (без использования внешних переменных)
vi.mock('../services/settings.service', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}))

// Мокаем Logger — в проде требует Logger.initialize() до первого getInstance()
vi.mock('@letar/label-printer-core', () => ({
  Logger: {
    getInstance: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

import { ipcMain } from 'electron'
import { settingsService } from '../services/settings.service'
import { registerSettingsHandlers } from './settings.handlers'

// Тестовые настройки
const mockSettings = {
  id: 'default',
  printerName: 'TSC_TE300',
  printerMode: 'REAL',
  printerSpeed: 4,
  printerDensity: 8,
  copies: 1,
  templateId: null,
  datamatrixX: 26,
  datamatrixY: 160,
  datamatrixSize: 90,
  gtinX: 526,
  gtinY: 10,
  gtinWidth: 140,
  gtinHeight: 440,
  allowDuplicates: false,
  autoReconnect: true,
  retryAttempts: 3,
  updatedAt: new Date(),
}

describe('settings.handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Настраиваем моки в beforeEach
    vi.mocked(settingsService.getSettings).mockResolvedValue(mockSettings)
    vi.mocked(settingsService.updateSettings).mockResolvedValue(undefined)
  })

  describe('registerSettingsHandlers', () => {
    it('должен зарегистрировать все handlers', () => {
      registerSettingsHandlers()

      expect(ipcMain.handle).toHaveBeenCalledWith('settings:get', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('settings:save', expect.any(Function))
    })
  })

  describe('settings:get handler', () => {
    it('должен возвращать настройки из settingsService', async () => {
      registerSettingsHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const getCall = handleCalls.find((call) => call[0] === 'settings:get')
      expect(getCall).toBeDefined()

      const getHandler = getCall![1] as () => Promise<unknown>
      const result = await getHandler()

      expect(settingsService.getSettings).toHaveBeenCalled()
      expect(result).toEqual(mockSettings)
    })
  })

  describe('settings:save handler', () => {
    it('должен сохранять настройки через settingsService', async () => {
      registerSettingsHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const saveCall = handleCalls.find((call) => call[0] === 'settings:save')
      expect(saveCall).toBeDefined()

      const saveHandler = saveCall![1] as (event: unknown, data: unknown) => Promise<unknown>

      const updateData = { printerName: 'NewPrinter', copies: 5 }
      const result = await saveHandler({}, updateData)

      expect(settingsService.updateSettings).toHaveBeenCalledWith(updateData)
      expect(result).toEqual({ success: true })
    })

    it('должен исключать id и updatedAt при сохранении', async () => {
      registerSettingsHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const saveCall = handleCalls.find((call) => call[0] === 'settings:save')
      const saveHandler = saveCall![1] as (event: unknown, data: unknown) => Promise<unknown>

      const updateData = {
        id: 'should-be-removed',
        updatedAt: new Date(),
        printerName: 'NewPrinter',
      }
      await saveHandler({}, updateData)

      expect(settingsService.updateSettings).toHaveBeenCalledWith({
        printerName: 'NewPrinter',
      })
    })

    it('должен возвращать ошибку при сбое сохранения', async () => {
      vi.mocked(settingsService.updateSettings).mockRejectedValueOnce(new Error('Database error'))

      registerSettingsHandlers()

      const handleCalls = vi.mocked(ipcMain.handle).mock.calls
      const saveCall = handleCalls.find((call) => call[0] === 'settings:save')
      const saveHandler = saveCall![1] as (event: unknown, data: unknown) => Promise<unknown>

      const result = await saveHandler({}, { printerName: 'Test' })

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      })
    })
  })
})
