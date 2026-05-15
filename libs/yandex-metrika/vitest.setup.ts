import '@testing-library/jest-dom/vitest'

// Polyfill для structuredClone (требуется для некоторых библиотек)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))
}
