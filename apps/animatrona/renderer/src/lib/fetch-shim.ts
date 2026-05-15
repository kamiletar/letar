/**
 * Шим для node-fetch/cross-fetch — используем встроенный fetch из Node.js 22+ / Electron 40
 *
 * Electron 40 (Node.js 22) имеет нативный globalThis.fetch.
 * Вместо тяжёлой цепочки cross-fetch → node-fetch → fetch-blob → web-streams-polyfill,
 * просто переиспользуем встроенный.
 */

const _fetch = globalThis.fetch
export default _fetch
export { _fetch as fetch }
export const Headers = globalThis.Headers
export const Request = globalThis.Request
export const Response = globalThis.Response
