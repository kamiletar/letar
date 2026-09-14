import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Мок Canvas 2D API для jsdom.
 *
 * jsdom сам не реализует rendering — context берётся из нативного пакета `canvas` (peer
 * dependency), который грузит .node-аддон и набор DLL (cairo/pango/...). При test isolation
 * vitest (каждый spec-файл — свежий модульный реестр) аддон переинициализируется в каждом файле
 * заново, и под нагрузкой первая загрузка иногда превышает таймаут — падает не рендер подписи
 * (`FieldSignature`), а сам `getContext`. Тесты проверяют только факт отсутствия исключений и
 * форму data URI, не пиксели — детерминированный no-op мок достаточен и быстрее.
 *
 * Вызывать из `vitest.setup.ts` пакета, использующего `FieldSignature` (или другой компонент,
 * рисующий на canvas) в тестах.
 *
 * Реализация лежит прямо в этом файле, а не в отдельном `mock-canvas-2d.ts` с реэкспортом —
 * `vitest.setup.ts` резолвится нативным Node-загрузчиком Nx (не бандлером Vite), который не
 * умеет extensionless относительные импорты внутри `.ts`-модуля, полученного через bare-
 * специфайер пакета. Та же причина, что у `buildFormsCoreAlias` ниже.
 */
export function mockCanvas2D(): void {
  if (typeof HTMLCanvasElement === 'undefined') {
    return
  }

  const noop = () => {}
  const mockContext2D = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: noop,
    clearRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    stroke: noop,
    fill: noop,
    fillText: noop,
    strokeText: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    drawImage: noop,
    setTransform: noop,
    measureText: () => ({ width: 0 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: noop,
    createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  } as unknown as CanvasRenderingContext2D

  HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
    apply(target, thisArg, args) {
      const [contextId] = args as [string]
      if (contextId === '2d') {
        return mockContext2D
      }
      return Reflect.apply(target, thisArg, args)
    },
  })

  HTMLCanvasElement.prototype.toDataURL =
    ((type = 'image/png') => `data:${type};base64,mock`) as typeof HTMLCanvasElement.prototype.toDataURL
}

/**
 * Строит Vite `resolve.alias` для всех подпутей `@letar/forms-core`, читая их из `exports`
 * пакета — используется в `vitest.config.ts` пакетов, зависящих от исходников forms-core
 * напрямую (forms, forms-react, forms-shadcn).
 *
 * Реализация лежит прямо в этом файле, а не в отдельном `vitest-alias.ts` с реэкспортом из
 * `index.ts` — `vitest.config.ts` резолвится нативным Node-загрузчиком Nx (не бандлером Vite),
 * который не умеет extensionless относительные импорты внутри `.ts`-модуля, полученного через
 * bare-специфайер пакета. Прямой импорт без промежуточного реэкспорта эту ловушку обходит.
 *
 * @param formsCoreDir — абсолютный путь до `libs/forms-core` (обычно `resolve(__dirname, '../forms-core')`)
 */
export function buildFormsCoreAlias(formsCoreDir: string): Record<string, string> {
  const formsCoreExports = JSON.parse(readFileSync(resolve(formsCoreDir, 'package.json'), 'utf-8'))
    .exports

  // Vite/rollup-plugin-alias матчит объектные алиасы по префиксу, первый подошедший выигрывает —
  // bare-ключ `@letar/forms-core` ОБЯЗАН сортироваться после каждого подпути, иначе он
  // перехватывает `/schema`, `/uikit` и т.д. до того, как очередь доходит до их собственной
  // (более специфичной) записи. `exports` перечисляет `.` первым, поэтому сортируем по длине
  // ключа по убыванию, а не полагаемся на порядок `Object.entries`.
  return Object.fromEntries(
    Object.entries(formsCoreExports)
      .filter(([subpath]) => subpath !== './package.json')
      .map(([subpath, target]) => [
        subpath === '.' ? '@letar/forms-core' : `@letar/forms-core${subpath.slice(1)}`,
        resolve(formsCoreDir, (target as Record<string, string>)['@letar/source']),
      ])
      .sort(([a], [b]) => b.length - a.length),
  )
}
