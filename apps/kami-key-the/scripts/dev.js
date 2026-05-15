/**
 * Dev-скрипт: запуск Vite dev server + webpack + Electron
 *
 * 1. Билдит main process через webpack
 * 2. Запускает Vite dev server для renderer
 * 3. Запускает Electron с URL Vite dev server
 */

const { spawn, execFileSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

/** Запустить Vite dev server и дождаться готовности, вернуть реальный порт */
function startVite() {
  return new Promise((resolve, reject) => {
    const viteBin = path.resolve(ROOT, '../../node_modules/.bin/vite')
    const vite = spawn(viteBin, ['--port', '5173'], {
      cwd: path.join(ROOT, 'renderer'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let resolved = false

    vite.stdout.on('data', (data) => {
      const msg = data.toString()
      process.stdout.write(`[vite] ${msg}`)
      if (!resolved) {
        // Стрипаем ANSI escape коды перед парсингом порта
        const clean = msg.replace(/\x1b\[[0-9;]*m/g, '')
        const match = clean.match(/localhost:(\d+)/)
        if (match) {
          resolved = true
          resolve({ process: vite, port: Number(match[1]) })
        }
      }
    })

    vite.stderr.on('data', (data) => {
      process.stderr.write(`[vite] ${data}`)
    })

    vite.on('error', reject)

    // Таймаут — fallback на дефолтный порт
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve({ process: vite, port: 5173 })
      }
    }, 5000)
  })
}

function buildMain() {
  console.log('[webpack] Сборка main process...')
  const webpackBin = path.resolve(ROOT, '../../node_modules/.bin/webpack')
  execFileSync(webpackBin, ['--config', 'main/webpack.config.js'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  console.log('[webpack] Готово')
}

async function main() {
  // Билдим main process
  buildMain()

  // Запускаем Vite
  console.log('[vite] Запуск dev server...')
  const { process: viteProcess, port } = await startVite()

  // Запускаем Electron
  const devUrl = `http://localhost:${port}`
  console.log(`[electron] Запуск... (VITE_DEV_SERVER_URL=${devUrl})`)
  const electronBin = require('electron')
  const electron = spawn(String(electronBin), ['.'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl,
    },
  })

  electron.on('close', (code) => {
    console.log(`[electron] Завершён с кодом ${code}`)
    viteProcess.kill()
    process.exit(code ?? 0)
  })

  // При завершении скрипта — убить дочерние процессы
  process.on('SIGINT', () => {
    electron.kill()
    viteProcess.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Ошибка запуска:', err)
  process.exit(1)
})
