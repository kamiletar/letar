import * as fs from 'fs'
import * as path from 'path'

// Читаем stickers.js из старого репозитория
const oldRepoPath = path.join(__dirname, '../../../../elfafeya.art')
const stickersPath = path.join(oldRepoPath, 'src/components/Stickers/data/stickers.js')

console.log('Reading stickers from:', stickersPath)

// Читаем файл как текст
const fileContent = fs.readFileSync(stickersPath, 'utf-8')

// Извлекаем объект export default { ... } через regex
const exportMatch = fileContent.match(/export default\s*(\{[\s\S]*\})/)
if (!exportMatch) {
  throw new Error('Could not find export default in stickers.js')
}

// Парсим данные вручную - ищем паттерн key: { fields }
const dataText = exportMatch[1]
const entryPattern = /(\w+):\s*\{([^}]*)\}/g
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const entries: Record<string, any> = {}

let match
while ((match = entryPattern.exec(dataText)) !== null) {
  const [, key, fields] = match

  // Парсим поля внутри объекта
  const name = fields.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || key
  const defaultEffectIndex = fields.match(/default_effect_index:\s*(\d+)/)?.[1] || '0'

  entries[key] = {
    name,
    defaultEffectIndex: parseInt(defaultEffectIndex, 10),
  }
}

console.log(`Found ${Object.keys(entries).length} mandalas`)

// Конвертируем в массив для БД
const mandalas = Object.entries(entries).map(([slug, data], index) => ({
  slug,
  name: data.name,
  description: null, // Заполним позже
  imageUrl: `/images/mandalas/${slug}.png`, // Путь к полному изображению
  thumbnailUrl: `/images/mandalas/small/${slug}.png`, // Путь к миниатюре
  watermarkUrl: null, // Пока нет
  metaTitle: data.name,
  metaDescription: `Мандала "${data.name}" - точечная роспись, автор Эльфафея`,
  metaKeywords: `мандала, ${data.name}, точечная роспись, медитация`,
  ogImage: `/images/mandalas/${slug}.png`,
  defaultEffectIndex: data.defaultEffectIndex,
  order: index,
  published: true,
}))

// Сохраняем в JSON
const outputPath = path.join(__dirname, '../data/mandalas.json')
fs.writeFileSync(outputPath, JSON.stringify(mandalas, null, 2))

console.log(`✓ Extracted ${mandalas.length} mandalas to ${outputPath}`)

// Выводим список для проверки

console.log('\nMandalas list:')
mandalas.forEach((m) => {
  console.log(`  - ${m.slug}: "${m.name}" (effect: ${m.defaultEffectIndex})`)
})
