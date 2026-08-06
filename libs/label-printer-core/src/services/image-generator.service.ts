import bwipjs from 'bwip-js'
import { Jimp } from 'jimp'
import type { LabelConfig } from '../config/config.schema'
import { Logger } from '../utils/logger'

// Тип изображения Jimp
type JimpImage = Awaited<ReturnType<typeof Jimp.read>>

/**
 * Service for generating label images with codes
 * Использует Jimp (чистый JS) вместо sharp для совместимости с Electron
 */
export class ImageGeneratorService {
  /**
   * Generate DataMatrix code as PNG buffer
   */
  static async generateDataMatrix(data: string, size: number): Promise<Buffer> {
    const logger = Logger.getInstance()
    try {
      logger.info('Generating DataMatrix', { data, targetSize: size })

      const png = await bwipjs.toBuffer({
        bcid: 'datamatrix',
        text: data,
        scale: 2, // Module size in pixels
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0,
      })

      logger.info('DataMatrix generated, will resize to target size')
      return png
    } catch (error) {
      logger.error('Failed to generate DataMatrix', { error })
      throw error
    }
  }

  /**
   * Generate GTIN barcode as PNG buffer (auto-detects format based on length)
   */
  static async generateGTINBarcode(gtin: string, width: number, height: number): Promise<Buffer> {
    const logger = Logger.getInstance()
    try {
      // Extract only digits from GTIN
      const gtinDigits = gtin.replace(/\D/g, '')

      // Auto-detect barcode type based on length
      let bcid: string
      if (gtinDigits.length === 14) {
        bcid = 'itf14' // ITF-14 for GTIN-14
      } else if (gtinDigits.length === 13) {
        bcid = 'ean13' // EAN-13 for GTIN-13
      } else if (gtinDigits.length === 12) {
        bcid = 'ean13' // EAN-13 (will add check digit)
      } else {
        throw new Error(`Invalid GTIN length: ${gtinDigits.length} digits (expected 12, 13, or 14)`)
      }

      logger.info('Generating GTIN barcode', {
        originalGtin: gtin,
        gtinDigits,
        length: gtinDigits.length,
        barcodeType: bcid,
        targetWidth: width,
        targetHeight: height,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bwip-js не экспортирует тип опций
      const barcodeOptions: any = {
        bcid,
        text: gtinDigits,
        scale: 2, // Module size in pixels
        height: 10, // Bar height in modules (not pixels)
        includetext: true,
        textxalign: 'center',
        paddingwidth: 0, // No horizontal padding
        paddingheight: 0, // No vertical padding
      }

      // For ITF-14, disable the bearer bars (border/frame)
      if (bcid === 'itf14') {
        barcodeOptions.bearers = 0 // 0 = no bearers (no frame)
      }

      // For EAN-13, disable guard whitespace/bars
      if (bcid === 'ean13') {
        barcodeOptions.guardwhitespace = false // No guard bars
      }

      const png = await bwipjs.toBuffer(barcodeOptions)

      logger.info('GTIN barcode generated, will resize to target size')
      return png
    } catch (error) {
      logger.error('Failed to generate GTIN barcode', { error, gtin })
      throw error
    }
  }

  /**
   * Generate complete label image with template and codes
   */
  static async generateLabelImage(
    templateBuffer: Buffer | null,
    dataMatrixData: string,
    gtinData: string,
    labelConfig: LabelConfig,
  ): Promise<Buffer> {
    const logger = Logger.getInstance()
    const { width, height } = labelConfig

    logger.info('Generating label image', {
      width,
      height,
      hasTemplate: !!templateBuffer,
      dataMatrixData,
      gtinData,
    })

    // Start with template or create blank white canvas
    let base: JimpImage
    if (templateBuffer) {
      base = await Jimp.read(templateBuffer)
      base.resize({ w: width, h: height })
    } else {
      // Create white background - используем fromBuffer с пустым PNG
      const whitePixelPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8////fwYACQAB/d+nVgAAAABJRU5ErkJggg==',
        'base64',
      )
      base = await Jimp.read(whitePixelPng)
      base.resize({ w: width, h: height })
    }

    // Generate and add DataMatrix if enabled
    if (labelConfig.elements.datamatrix.enabled) {
      const dataMatrixPng = await ImageGeneratorService.generateDataMatrix(
        dataMatrixData,
        labelConfig.elements.datamatrix.size,
      )

      logger.info('Resizing DataMatrix', {
        targetSize: labelConfig.elements.datamatrix.size,
        position: { x: labelConfig.elements.datamatrix.x, y: labelConfig.elements.datamatrix.y },
      })

      const dataMatrixImage = await Jimp.read(dataMatrixPng)
      dataMatrixImage.contain({
        w: labelConfig.elements.datamatrix.size,
        h: labelConfig.elements.datamatrix.size,
      })

      // Composite onto base
      base.composite(dataMatrixImage, labelConfig.elements.datamatrix.x, labelConfig.elements.datamatrix.y)
    }

    // Generate and add GTIN barcode if enabled
    if (labelConfig.elements.gtin.enabled) {
      const gtinBarcodePng = await ImageGeneratorService.generateGTINBarcode(
        gtinData,
        labelConfig.elements.gtin.width,
        labelConfig.elements.gtin.height,
      )

      logger.info('Resizing GTIN barcode', {
        targetWidth: labelConfig.elements.gtin.width,
        targetHeight: labelConfig.elements.gtin.height,
        position: { x: labelConfig.elements.gtin.x, y: labelConfig.elements.gtin.y },
      })

      const gtinBarcodeImage = await Jimp.read(gtinBarcodePng)
      // Rotate -90 degrees (270 degrees clockwise)
      gtinBarcodeImage.rotate(-90)
      gtinBarcodeImage.contain({
        w: labelConfig.elements.gtin.width,
        h: labelConfig.elements.gtin.height,
      })

      // Composite onto base
      base.composite(gtinBarcodeImage, labelConfig.elements.gtin.x, labelConfig.elements.gtin.y)
    }

    // Export as PNG buffer
    const finalBuffer = await base.getBuffer('image/png')

    logger.info('Label image generated successfully')
    return finalBuffer
  }
}
