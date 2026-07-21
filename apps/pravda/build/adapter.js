// Воркараунд Next.js 16 бага https://github.com/vercel/next.js/issues/85374 —
// при `output: 'export'` RSC-сегменты (Cache Components, включены всегда, не только
// при явном использовании фичи) пишутся на диск вложенными директориями
// (`__next/section/__PAGE__.txt`), а клиентский роутер запрашивает их плоским,
// dot-separated именем (`__next.section.__PAGE__.txt`) — путь расходится на Windows-сборках,
// баг подтверждён апстримом (открыт на момент фикса, PR #86948 не смёржен). 404 на prefetch
// не роняют страницу напрямую, но ломают клиентскую RSC-навигацию между статьями (см.
// navigation.spec.ts «Клиентская навигация (RSC)» — контент не обновлялся/URL не совпадал).
// Разбор и код адаптера — https://blog.axiorema.com/engineering/uncurious-case-broken-static-exports-404s-nextjs-16/
const fs = require('fs')
const path = require('path')

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'fix-issue-85374',

  async onBuildComplete({ outputs }) {
    for (const file of outputs.staticFiles) {
      const sourcePath = file.filePath
      const targetPath = fixupPath(sourcePath)
      if (targetPath) {
        await fs.promises.rename(sourcePath, targetPath)
      }
    }
  },
}

function fixupPath(filePath) {
  const components = filePath.split(path.sep)
  const idx = components.findIndex((x) => x.startsWith('__next.'))

  if (idx >= 0 && idx < components.length - 1) {
    // Схлопываем оставшиеся сегменты в одно dot-separated имя.
    const result = components.slice(0, idx)
    result.push(components.slice(idx).join('.'))
    return result.join(path.sep)
  }
  return null
}

module.exports = adapter
