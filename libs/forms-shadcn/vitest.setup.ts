// Расширенные матчеры для DOM тестирования
import '@testing-library/jest-dom/vitest'

// Мок Canvas 2D API для jsdom.
// jsdom сам не реализует rendering — context берётся из нативного пакета `canvas` (peer dependency),
// который грузит .node-аддон и набор DLL (cairo/pango/...). FieldSignature вызывает
// `canvas.getContext('2d')` уже в `useEffect` при монтировании (initCanvas), поэтому реальный
// нативный аддон грузится в каждом из тестов `field-signature.spec.tsx`. При test isolation
// (каждый spec-файл — свежий модульный реестр) аддон переинициализируется заново в каждом файле,
// и под нагрузкой первая загрузка иногда превышает таймаут — тот же класс флаки, что был найден и
// починен в `libs/forms/vitest.setup.ts` (field-signature.spec.tsx там). Тесты этой библиотеки
// проверяют только факт отсутствия исключений, не пиксели — детерминированный no-op мок достаточен.
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

// jsdom не реализует ResizeObserver — нужен Radix Slider (измеряет трек для позиции thumb).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {
      // noop — jsdom не считает layout, реальный размер трека тестам не нужен
    }
    unobserve(): void {
      // noop
    }
    disconnect(): void {
      // noop
    }
  }
}
