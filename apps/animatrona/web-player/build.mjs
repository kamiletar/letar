/**
 * Скрипт сборки Animatrona Web Player
 *
 * Собирает TypeScript в единый JS файл для standalone использования.
 */

import { build } from 'esbuild'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const isWatch = process.argv.includes('--watch')
const isProd = process.argv.includes('--prod')

async function buildPlayer() {
  const outdir = join(__dirname, 'dist')

  // Создаём выходную директорию
  if (!existsSync(outdir)) {
    mkdirSync(outdir, { recursive: true })
  }

  // Сборка TypeScript
  const result = await build({
    entryPoints: [join(__dirname, 'src/player.ts')],
    bundle: true,
    outfile: join(outdir, 'player.js'),
    format: 'iife',
    target: ['chrome100', 'firefox100', 'safari15'],
    minify: isProd,
    sourcemap: !isProd,
    platform: 'browser',
    logLevel: 'info',
    ...(isWatch
      ? {
          watch: {
            onRebuild(error, result) {
              if (error) console.error('Rebuild failed:', error)
              else console.log('Rebuild succeeded')
            },
          },
        }
      : {}),
  })

  // Копируем статические файлы
  copyFileSync(join(__dirname, 'index.html'), join(outdir, 'index.html'))
  copyFileSync(join(__dirname, 'styles.css'), join(outdir, 'styles.css'))

  console.log('Web player built successfully!')
  console.log(`Output: ${outdir}`)

  return result
}

buildPlayer().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
