// Расширенные матчеры для DOM тестирования
import '@testing-library/jest-dom/vitest'
// Мок для IndexedDB (требуется для offline функций)
import 'fake-indexeddb/auto'

// Polyfill для structuredClone (требуется для Chakra UI v3)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))
}

// Мок Canvas 2D API для jsdom.
// jsdom сам не реализует rendering — context берётся из нативного пакета `canvas` (peer dependency),
// который грузит .node-аддон и набор DLL (cairo/pango/...). При параллельном запуске тестов
// (test isolation: каждый spec-файл — свежий модульный реестр) аддон переинициализируется в
// каждом файле заново, и под нагрузкой первая загрузка иногда превышает 5с — падает не рендер
// подписи, а таймаут jsdom/vitest на getContext. Полей уровня пикселей (getImageData/toDataURL
// с реальным содержимым) тесты library не проверяют — только факт отсутствия исключений и форму
// data URI, поэтому детерминированный no-op мок достаточен и быстрее.
if (typeof HTMLCanvasElement !== 'undefined') {
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

  HTMLCanvasElement.prototype.toDataURL = ((type = 'image/png') =>
    `data:${type};base64,mock`) as typeof HTMLCanvasElement.prototype.toDataURL
}

// Полифилл localStorage для jsdom (removeItem/clear могут отсутствовать)
if (typeof window !== 'undefined') {
  const store = new Map<string, string>()
  const storageMock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
  // Переопределяем localStorage только если методы отсутствуют
  if (typeof window.localStorage.removeItem !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true })
  }
}
