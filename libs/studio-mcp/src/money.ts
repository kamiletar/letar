/**
 * Рубли ↔ копейки для инструментов studio-mcp. Агент оперирует обычными суммами в рублях (как
 * человек), studio API — только копейками (Int, см. schema.zmodel). Независимая копия
 * apps/studio/src/lib/money.ts: библиотека не имеет доступа к исходникам приложения, только к
 * его HTTP API.
 */

export function rubToKopecks(rub: number): number {
  return Math.round(rub * 100)
}

export function kopecksToRub(kopecks: number): number {
  return kopecks / 100
}
