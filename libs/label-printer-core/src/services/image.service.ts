import * as fs from 'fs'
import { Jimp } from 'jimp'
import * as path from 'path'
import type { LabelConfig } from '../config/config.schema'
import type { MarkingCode } from '../models/marking-code.model'
import { BarcodeService } from './barcode.service'

// Тип изображения Jimp
type JimpImage = Awaited<ReturnType<typeof Jimp.read>>

export class ImageService {
  static async generateLabel(code: MarkingCode, config: LabelConfig): Promise<Buffer> {
    // Check if template exists
    if (!fs.existsSync(config.templatePath)) {
      // Create directory if it doesn't exist
      const templateDir = path.dirname(config.templatePath)
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true })
      }

      // Create a blank white template if not exists
      const whitePixelPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8////fwYACQAB/d+nVgAAAABJRU5ErkJggg==',
        'base64',
      )
      const blankTemplate = await Jimp.read(whitePixelPng)
      blankTemplate.resize({ w: config.width, h: config.height })
      const blankBuffer = await blankTemplate.getBuffer('image/png')

      fs.writeFileSync(config.templatePath, blankBuffer)
    }

    // Load template
    const template: JimpImage = await Jimp.read(config.templatePath)

    // Generate and add DataMatrix
    if (config.elements.datamatrix.enabled) {
      const datamatrix = await BarcodeService.generateDataMatrix(code.fullCode, config)
      const datamatrixImage = await Jimp.read(datamatrix)
      template.composite(datamatrixImage, config.elements.datamatrix.x, config.elements.datamatrix.y)
    }

    // Generate and add GTIN barcode
    if (config.elements.gtin.enabled) {
      const gtin = await BarcodeService.generateGTINBarcode(code.gtin, config)
      const gtinImage = await Jimp.read(gtin)
      template.composite(gtinImage, config.elements.gtin.x, config.elements.gtin.y)
    }

    return await template.getBuffer('image/png')
  }
}
