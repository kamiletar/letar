/**
 * Скрипт генерации статических OG Images для всех документов.
 * Запуск: bun run generate:og
 *
 * Генерирует:
 * - public/og/home.png — главная страница
 * - public/og/constitution.png, public/og/codes-tax.png, и т.д. — документы
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import satori from 'satori'
import sharp from 'sharp'

// Импортируем список документов
import { type DocumentCategory, type DocumentInfo, documents } from '../src/lib/documents'

const __dirname = dirname(fileURLToPath(import.meta.url))

const WIDTH = 1200
const HEIGHT = 630
const OUTPUT_DIR = join(__dirname, '../public/og')

// URL шрифтов Noto Sans (полные файлы с latin + cyrillic)
// Используем Google Fonts GitHub репозиторий
const FONT_URLS = {
  regular: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  bold: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
}

// Цвета категорий
const categoryColors: Record<DocumentCategory, string> = {
  'Основные законы': '#E53E3E',
  Кодексы: '#3182CE',
  Уставы: '#38A169',
  Регламенты: '#805AD5',
}

/**
 * Загружает шрифт из URL.
 */
async function loadFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  return response.arrayBuffer()
}

/**
 * Генерирует OG Image для главной страницы.
 */
function createHomeImage() {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
        color: 'white',
        fontFamily: 'Noto Sans',
        padding: 48,
      },
      children: {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 24,
            padding: '48px 64px',
            background: 'rgba(0, 0, 0, 0.2)',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  fontSize: 56,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  textAlign: 'center',
                },
                children: 'Свод законов России',
              },
            },
            {
              type: 'div',
              props: {
                style: { fontSize: 28, opacity: 0.9, marginBottom: 32 },
                children: 'PRAVDA',
              },
            },
            {
              type: 'div',
              props: {
                style: { display: 'flex', gap: 48, fontSize: 20, opacity: 0.8 },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 8 },
                      children: '22 документа',
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 8 },
                      children: '1337 статей',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  }
}

/**
 * Генерирует OG Image для документа.
 */
function createDocumentImage(doc: DocumentInfo) {
  const categoryColor = categoryColors[doc.category]

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${categoryColor} 0%, #1a365d 100%)`,
        color: 'white',
        fontFamily: 'Noto Sans',
        padding: 48,
      },
      children: {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 24,
            padding: '48px 64px',
            background: 'rgba(0, 0, 0, 0.2)',
            maxWidth: '90%',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  fontSize: 48,
                  fontWeight: 'bold',
                  marginBottom: 16,
                  textAlign: 'center',
                  lineHeight: 1.2,
                },
                children: doc.title,
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 24,
                  opacity: 0.9,
                  marginBottom: 24,
                },
                children: {
                  type: 'span',
                  props: {
                    style: {
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '8px 16px',
                      borderRadius: 8,
                    },
                    children: doc.category,
                  },
                },
              },
            },
            {
              type: 'div',
              props: {
                style: { fontSize: 20, opacity: 0.7, letterSpacing: 2 },
                children: 'PRAVDA — Свод законов России',
              },
            },
          ],
        },
      },
    },
  }
}

/** Шрифты (загружаются один раз) */
let fonts: { name: string; data: ArrayBuffer; weight: number }[] = []

/**
 * Конвертирует satori элемент в PNG.
 */
async function renderToPng(element: ReturnType<typeof createHomeImage>): Promise<Buffer> {
  const svg = await satori(element as React.ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  })

  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * Генерирует имя файла из href документа.
 * /constitution -> constitution.png
 * /codes/tax -> codes-tax.png
 */
function getFilename(href: string): string {
  return href.slice(1).replace(/\//g, '-') + '.png'
}

async function main() {
  console.log('🎨 Генерация OG Images...\n')

  // Загружаем шрифты Noto Sans (полные TTF файлы с latin + cyrillic)
  console.log('  📥 Загрузка шрифтов...')
  const [regular, bold] = await Promise.all([loadFont(FONT_URLS.regular), loadFont(FONT_URLS.bold)])

  fonts = [
    { name: 'Noto Sans', data: regular, weight: 400 },
    { name: 'Noto Sans', data: bold, weight: 700 },
  ]

  // Создаём директорию
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Генерируем главную страницу
  console.log('  📄 home.png')
  const homePng = await renderToPng(createHomeImage())
  await writeFile(join(OUTPUT_DIR, 'home.png'), homePng)

  // Генерируем документы
  for (const doc of documents) {
    const filename = getFilename(doc.href)
    console.log(`  📄 ${filename}`)
    const png = await renderToPng(createDocumentImage(doc))
    await writeFile(join(OUTPUT_DIR, filename), png)
  }

  console.log(`\n✅ Сгенерировано ${documents.length + 1} изображений в public/og/`)
}

main().catch(console.error)
