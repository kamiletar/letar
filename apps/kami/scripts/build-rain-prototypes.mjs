import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(appRoot, 'src/app/_components/matrix-rain.tsx'), 'utf8')
const array = source.split('export const RECIPES: string[] = [')[1]?.split('\n]')[0]
if (!array) throw new Error('Не найден исходный массив рецептов MatrixRain')
// Читаем только строковые литералы массива; исходный модуль и его зависимости не исполняются.
const recipes = [...array.matchAll(/^\s*'((?:\\.|[^'\\])*)',?\r?$/gm)].map((match) =>
  JSON.parse(`"${match[1].replaceAll('"', '\\"')}"`)
)
if (recipes.length !== 19) throw new Error(`Ожидалось 19 исходных текстов, найдено ${recipes.length}`)
const template = await readFile(resolve(appRoot, 'prototypes/rain-motion.html'), 'utf8')
const output = resolve(appRoot, '../../.claude/artifacts/kami-feedback-2026-10-25/rain-motion.html')
await mkdir(dirname(output), { recursive: true })
await writeFile(output, template.replace('/* RECIPES_SOURCE */ []', JSON.stringify(recipes).replaceAll('<', '\\u003c')), 'utf8')
console.log(`Готово: ${output}; исходных текстов: ${recipes.length}`)
