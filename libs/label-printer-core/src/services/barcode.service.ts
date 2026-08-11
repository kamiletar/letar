import bwipjs from 'bwip-js'
import { Jimp } from 'jimp'
import type { LabelConfig } from '../config/config.schema'

/**
 * Таблица конвертации русской раскладки в английскую.
 * USB HID сканер эмулирует нажатия клавиш — при русской раскладке
 * ASCII символы интерпретируются как кириллица.
 */
const russianToEnglish: Record<string, string> = {
  // Строчные буквы (ЙЦУКЕН → QWERTY)
  й: 'q',
  ц: 'w',
  у: 'e',
  к: 'r',
  е: 't',
  н: 'y',
  г: 'u',
  ш: 'i',
  щ: 'o',
  з: 'p',
  х: '[',
  ъ: ']',
  ф: 'a',
  ы: 's',
  в: 'd',
  а: 'f',
  п: 'g',
  р: 'h',
  о: 'j',
  л: 'k',
  д: 'l',
  ж: ';',
  э: "'",
  я: 'z',
  ч: 'x',
  с: 'c',
  м: 'v',
  и: 'b',
  т: 'n',
  ь: 'm',
  б: ',',
  ю: '.',
  ё: '`',
  // Заглавные буквы
  Й: 'Q',
  Ц: 'W',
  У: 'E',
  К: 'R',
  Е: 'T',
  Н: 'Y',
  Г: 'U',
  Ш: 'I',
  Щ: 'O',
  З: 'P',
  Х: '{',
  Ъ: '}',
  Ф: 'A',
  Ы: 'S',
  В: 'D',
  А: 'F',
  П: 'G',
  Р: 'H',
  О: 'J',
  Л: 'K',
  Д: 'L',
  Ж: ':',
  Э: '"',
  Я: 'Z',
  Ч: 'X',
  С: 'C',
  М: 'V',
  И: 'B',
  Т: 'N',
  Ь: 'M',
  Б: '<',
  Ю: '>',
  Ё: '~',
  // Специальные символы (Shift + цифры)
  '№': '#', // Shift+3
  '?': '&', // Shift+7
  '.': '/', // Shift+7 на некоторых раскладках или просто /
}

/**
 * Конвертирует строку из русской раскладки в английскую.
 * Если строка содержит кириллицу — значит при сканировании была включена русская раскладка.
 */
export function convertRussianLayoutToEnglish(str: string): string {
  let result = ''
  for (const char of str) {
    result += russianToEnglish[char] ?? char
  }
  return result
}

/**
 * Проверяет, содержит ли строка кириллицу
 */
export function containsCyrillic(str: string): boolean {
  return /[\u0400-\u04FF]/.test(str)
}

/** GS (Group Separator) символ для разделения AI в GS1 DataMatrix */
const GS = String.fromCharCode(0x1d) // ASCII 29

/**
 * Парсит код маркировки "Честный знак" и добавляет GS разделители.
 * Структура: 01{GTIN}21{Serial}<GS>91{Key}<GS>92{Signature}
 *
 * При сканировании GS символы не отображаются, поэтому мы восстанавливаем их.
 */
function addGS1Separators(code: string): string {
  // Регулярка для парсинга кода маркировки
  // 01 + 14 цифр GTIN + 21 + Serial + 91 + Key + 92 + Signature
  const match = code.match(/^01(\d{14})21(.+?)91(.+?)92(.+)$/)

  if (!match) {
    // Не удалось распарсить — возвращаем как есть
    return code
  }

  const [, gtin, serial, key, signature] = match

  // Собираем код с GS разделителями:
  // 01{GTIN}21{Serial}<GS>91{Key}<GS>92{Signature}
  // GS нужен после AI с переменной длиной (21, 91), но не после последнего (92)
  return `01${gtin}21${serial}${GS}91${key}${GS}92${signature}`
}

export class BarcodeService {
  /**
   * Генерирует DataMatrix для кодов маркировки "Честный знак".
   * - Автоматически конвертирует кириллицу если сканировали с русской раскладкой
   * - Добавляет GS разделители между AI для корректного GS1 DataMatrix
   */
  static async generateDataMatrix(code: string, config: LabelConfig): Promise<Buffer> {
    try {
      // 1. Автоконвертация раскладки
      let normalizedCode = code
      if (containsCyrillic(code)) {
        normalizedCode = convertRussianLayoutToEnglish(code)
      }

      // 2. Добавляем GS разделители для GS1 DataMatrix
      const gs1Code = addGS1Separators(normalizedCode)

      const buffer = await bwipjs.toBuffer({
        bcid: 'datamatrix',
        text: gs1Code,
        scale: 3,
        includetext: false,
      })

      // Resize to fit the configured size
      const image = await Jimp.read(buffer)
      image.contain({
        w: config.elements.datamatrix.size,
        h: config.elements.datamatrix.size,
      })
      return await image.getBuffer('image/png')
    } catch (error) {
      throw new Error(`Failed to generate DataMatrix: ${error}`, { cause: error })
    }
  }

  /**
   * Генерирует GTIN баркод EAN-13 (горизонтальный).
   * Поворот для вертикального размещения делается через CSS.
   */
  static async generateGTINBarcode(gtin: string, config: LabelConfig): Promise<Buffer> {
    // Убираем первую 0 для EAN-13 (14 -> 13 символов)
    let barcodeText = gtin
    if (gtin.length === 14 && gtin[0] === '0') {
      barcodeText = gtin.substring(1)
    }

    try {
      const buffer = await bwipjs.toBuffer({
        bcid: 'ean13',
        text: barcodeText,
        scale: 3,
        height: 12,
        includetext: config.elements.gtin.includeText,
        textxalign: 'center',
      })

      return buffer
    } catch (error) {
      throw new Error(`Failed to generate GTIN barcode: ${error}`, { cause: error })
    }
  }
}
