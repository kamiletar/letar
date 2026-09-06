/**
 * Флаг «приложение выходит» — общий между main.ts и tray.ts
 *
 * Не расширяем Electron.App через `declare module 'electron'`: это модульное
 * расширение конфликтует с классом App из типов electron под tsgo/tsc в этом
 * tsconfig (TS2300 Duplicate identifier 'App').
 */

let quitting = false

export function setQuitting(value: boolean): void {
  quitting = value
}

export function isQuitting(): boolean {
  return quitting
}
