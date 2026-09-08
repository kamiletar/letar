/**
 * Headless-проверка ffmpeg-части main-процесса (Фаза 6) — без окна и без GUI.
 *
 * GUI Electron в песочнице не поднимается, но main-процесс доходит до `app.whenReady()` и
 * гоняет любые сервисы (паттерн из .claude/rules/electron.md § «Грабли»).
 *
 * Перед запуском собрать сервисы в CJS-бандл:
 *
 *   bun build main/services/ffmpeg/ffmpeg-installer.service.ts main/services/ffmpeg/transcode.service.ts \
 *     --target=node --format=cjs --external electron --outdir scripts/.bundle
 *
 * Запуск (npx падает на EOVERRIDE в этом монорепо — звать бинарь напрямую):
 *
 *   ../../node_modules/.bin/electron.exe scripts/verify-ffmpeg.cjs [путь-к-видеофайлу]
 *
 * С аргументом-файлом дополнительно прогоняет реальную подготовку через ffmpeg.
 */

const { app } = require('electron')
const path = require('node:path')

const installer = require('./.bundle/main/services/ffmpeg/ffmpeg-installer.service.js')
const transcode = require('./.bundle/main/services/ffmpeg/transcode.service.js')
const plan = require('./.bundle/shared/transcode-plan.js')

function line(label, value) {
  console.log(`  ${label.padEnd(22)} ${value}`)
}

async function main() {
  console.log('\n=== 1. Статус ffmpeg ===')
  const status = await installer.getFfmpegStatus()
  line('available', status.available)
  line('source', status.source ?? '—')
  line('ffmpegPath', status.ffmpegPath ?? '—')
  line('version', status.version ?? '—')
  line('missingDecoders', status.missingDecoders.join(', ') || 'нет — все на месте')
  line('installSupported', status.installSupported)

  console.log('\n=== 2. План обработки (синтетические дорожки) ===')
  const cases = [
    ['обычный H.264 8bit + AAC (.mkv)', {
      videoTracks: [{ codec: 'AVC', bitDepth: 8 }],
      audioTracks: [{ codec: 'AAC' }],
      filePath: 'C:/anime/ep01.mkv',
    }],
    ['H.264 + AC3 (.mkv)', {
      videoTracks: [{ codec: 'AVC', bitDepth: 8 }],
      audioTracks: [{ codec: 'AC-3' }],
      filePath: 'C:/anime/ep01.mkv',
    }],
    ['Hi10P + DTS (.mkv)', {
      videoTracks: [{ codec: 'AVC', bitDepth: 10 }],
      audioTracks: [{ codec: 'DTS' }],
      filePath: 'C:/anime/ep01.mkv',
    }],
    ['H.264 + AAC в .avi', {
      videoTracks: [{ codec: 'AVC', bitDepth: 8 }],
      audioTracks: [{ codec: 'AAC' }],
      filePath: 'C:/anime/ep01.avi',
    }],
  ]

  for (const [label, input] of cases) {
    const result = plan.buildTranscodePlan(input)
    console.log(`  ${label}`)
    line('  → стратегия', `${result.strategy} (${result.cost})`)
    line('  → аргументы', plan.buildCodecArgs(result).join(' '))
  }

  const filePath = process.argv.find((arg, index) => index > 1 && !arg.startsWith('-') && arg.includes('.'))
  if (filePath && filePath.endsWith('.cjs') === false) {
    console.log(`\n=== 3. Реальная подготовка файла: ${filePath} ===`)
    if (!status.available) {
      console.log('  ffmpeg недоступен — пропускаем')
    } else {
      const started = Date.now()
      const result = await transcode.transcodeFile(
        {
          filePath: path.resolve(filePath),
          plan: plan.buildTranscodePlan({ videoTracks: [], audioTracks: [], filePath }),
        },
        (progress) => process.stdout.write(`\r  прогресс: ${progress.percent ?? '?'}%   `),
      )
      console.log(`\n  готово за ${Math.round((Date.now() - started) / 1000)}с → ${result.outputPath}`)
    }
  } else {
    console.log('\n=== 3. Реальная подготовка пропущена (передай путь к видеофайлу аргументом) ===')
  }

  console.log('\nOK\n')
  app.quit()
}

app.whenReady().then(main).catch((error) => {
  console.error('ОШИБКА:', error)
  app.exit(1)
})
