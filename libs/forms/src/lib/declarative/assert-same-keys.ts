/**
 * Compile-time-only проверка набора ключей двух types.
 *
 * Только `export type` — нет рантайм-кода, безопасно импортировать `import type`
 * в публичный API library.
 *
 * Сравнивает именно **набор ключей**, не типы значений по ключам: у ручных
 * compound-интерфейсов (`form-compound-types.ts`) сигнатуры полей часто упрощены
 * relative to реальных пропсов компонентов — точное совпадение типов давало бы
 * ложные срабатывания там, где реальной проблемы нет. Годится там, где риск —
 * именно пропавшее/лишнее поле, а не расхождение в форме пропсов конкретного поля.
 */
type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends (
  <G>() => G extends U ? 1 : 2
) ? Y
  : N

export type AssertSameKeys<Impl, Declared> = IfEquals<
  keyof Impl,
  keyof Declared,
  true,
  { onlyInImplementation: Exclude<keyof Impl, keyof Declared>; onlyInDeclaredType: Exclude<keyof Declared, keyof Impl> }
>

/**
 * Вызвать как `assertSameKeys<AssertSameKeys<typeof impl, DeclaredType>>()`.
 * Если ключи разошлись, generic-параметр — не `true`, и вызов не типизируется —
 * компиляция падает прямо в месте проверки. Рантайм-тело — no-op.
 */
export function assertSameKeys<_T extends true>(): void {
  // no-op — вся работа делается type-checker'ом на уровне generic-ограничения
}
