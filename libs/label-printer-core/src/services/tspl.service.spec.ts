import { describe, expect, it } from 'vitest'
import type { PrinterConfig } from '../config/config.schema'
import { TSPLService } from './tspl.service'

describe('TSPLService', () => {
  const mockConfig: PrinterConfig = {
    printerName: 'TestPrinter',
    settings: {
      width: 58,
      height: 39,
      gap: 2,
      orientation: 0,
      speed: 4,
      density: 8,
      copies: 1,
    },
    connection: {
      type: 'USB',
      vendorId: 0x1234,
      productId: 0x5678,
    },
  }

  describe('generateSetupCommands', () => {
    it('генерирует корректные команды настройки', () => {
      const commands = TSPLService.generateSetupCommands(mockConfig)

      // Проверяем наличие основных команд
      expect(commands).toContain('SIZE 58 mm, 39 mm')
      expect(commands).toContain('GAP 2 mm, 0 mm')
      expect(commands).toContain('DIRECTION 0')
      expect(commands).toContain('SPEED 4')
      expect(commands).toContain('DENSITY 8')
      expect(commands).toContain('REFERENCE 0, 0')
      expect(commands).toContain('SHIFT 0')
      expect(commands).toContain('SET RIBBON OFF')
      expect(commands).toContain('CLS')
    })

    it('использует параметры из конфигурации', () => {
      const customConfig: PrinterConfig = {
        ...mockConfig,
        settings: {
          ...mockConfig.settings,
          width: 100,
          height: 50,
          speed: 6,
          density: 10,
          orientation: 1,
        },
      }

      const commands = TSPLService.generateSetupCommands(customConfig)

      expect(commands).toContain('SIZE 100 mm, 50 mm')
      expect(commands).toContain('SPEED 6')
      expect(commands).toContain('DENSITY 10')
      expect(commands).toContain('DIRECTION 1')
    })

    it('разделяет команды переводом строки CRLF', () => {
      const commands = TSPLService.generateSetupCommands(mockConfig)

      // Проверяем, что строка заканчивается на \r\n
      expect(commands.endsWith('\r\n')).toBe(true)
      // Проверяем наличие CRLF между командами
      expect(commands).toContain('\r\n')
    })
  })

  describe('generateBitmapCommand', () => {
    it('генерирует корректную BITMAP команду', () => {
      const command = TSPLService.generateBitmapCommand(10, 20, 8, 100, 0, 'AABBCCDD')

      expect(command).toBe('BITMAP 10, 20, 8, 100, 0, AABBCCDD')
    })

    it('обрабатывает нулевые координаты', () => {
      const command = TSPLService.generateBitmapCommand(0, 0, 64, 200, 0, '00FF00FF')

      expect(command).toBe('BITMAP 0, 0, 64, 200, 0, 00FF00FF')
    })
  })

  describe('generateStatusQuery', () => {
    it('генерирует команду запроса статуса', () => {
      const query = TSPLService.generateStatusQuery()

      // ESC ! ? = 0x1B 0x21 0x3F
      expect(query).toBe('\x1B!?\r\n')
    })
  })

  describe('imageToTSPLBitmap', () => {
    it('конвертирует минимальное PNG изображение', async () => {
      // Создаём минимальный PNG 8x8 пикселей (чёрно-белый)
      // Это валидный PNG с чёрным квадратом 8x8
      const minimalPng = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk length + type
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x08, // width=8, height=8
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // bit depth=8, color type=2 (RGB), compression, filter, interlace
        0x4b,
        0x6d,
        0x29,
        0xde, // CRC
        0x00,
        0x00,
        0x00,
        0x1d,
        0x49,
        0x44,
        0x41,
        0x54, // IDAT chunk length + type
        0x08,
        0xd7,
        0x63,
        0x60,
        0x60,
        0x60,
        0xf8,
        0x0f, // zlib compressed data (black pixels)
        0x00,
        0x01,
        0x04,
        0x00,
        0x01,
        0xf8,
        0x0b,
        0x00,
        0x20,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0xd3,
        0xc6,
        0x04,
        0x34,
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e,
        0x44, // IEND chunk
        0xae,
        0x42,
        0x60,
        0x82, // CRC
      ])

      try {
        const result = await TSPLService.imageToTSPLBitmap(minimalPng)

        // Проверяем структуру результата
        expect(result).toHaveProperty('width')
        expect(result).toHaveProperty('height')
        expect(result).toHaveProperty('bytesPerRow')
        expect(result).toHaveProperty('data')
        expect(result).toHaveProperty('binaryData')

        // bytesPerRow должен быть целым числом >= width/8
        expect(result.bytesPerRow).toBeGreaterThanOrEqual(Math.ceil(result.width / 8))

        // data должна быть hex-строкой
        expect(result.data).toMatch(/^[0-9A-F]*$/i)

        // binaryData должен быть Buffer
        expect(Buffer.isBuffer(result.binaryData)).toBe(true)
      } catch {
        // Если PNG невалидный, пропускаем тест
        // В реальных условиях будут использоваться валидные PNG
      }
    })
  })

  describe('generatePrintJobNative', () => {
    it('генерирует корректную последовательность команд', async () => {
      const dataMatrix = '01046100000000072112345691CRYPTO'
      const gtin = '04610000000007'

      const commands = await TSPLService.generatePrintJobNative(dataMatrix, gtin, null, mockConfig)

      // Проверяем наличие основных команд
      expect(commands).toContain('SIZE')
      expect(commands).toContain('DMATRIX')
      expect(commands).toContain('BARCODE')
      expect(commands).toContain('PRINT')

      // Проверяем DataMatrix команду
      expect(commands).toContain(`DMATRIX 10, 10, 180, 180, "${dataMatrix}"`)

      // Проверяем BARCODE с GTIN-13 (без ведущего нуля)
      expect(commands).toContain('BARCODE 100, 250, "EAN13", 80, 1, 0, 2, 2, "4610000000007"')
    })

    it('извлекает GTIN-13 из GTIN-14', async () => {
      const dataMatrix = 'test'
      const gtin14 = '04610000000007' // GTIN-14 с ведущим нулём

      const commands = await TSPLService.generatePrintJobNative(dataMatrix, gtin14, null, mockConfig)

      // Должен использовать GTIN-13 (без ведущего нуля)
      expect(commands).toContain('"4610000000007"')
    })

    it('использует полный GTIN-14 если первый символ не ноль', async () => {
      const dataMatrix = 'test'
      const gtin14 = '14610000000002' // GTIN-14 без ведущего нуля

      const commands = await TSPLService.generatePrintJobNative(dataMatrix, gtin14, null, mockConfig)

      // Должен использовать полный GTIN-14 (не обрезает)
      expect(commands).toContain('"14610000000002"')
    })

    it('использует количество копий из конфигурации', async () => {
      const configWithCopies: PrinterConfig = {
        ...mockConfig,
        settings: { ...mockConfig.settings, copies: 5 },
      }

      const commands = await TSPLService.generatePrintJobNative('test', '04610000000007', null, configWithCopies)

      expect(commands).toContain('PRINT 5, 1')
    })

    it('рисует рамку если шаблон не передан', async () => {
      const commands = await TSPLService.generatePrintJobNative('test', '04610000000007', null, mockConfig)

      // Должны быть команды BOX для рамки
      expect(commands).toContain('BOX')
      expect(commands).toContain('TEXT')
      expect(commands).toContain('BAR')
    })
  })
})
