// Обе функции возвращают ОДНУ и ту же форму (с полем isError) без аннотации типа —
// так вывод типов SDK-колбэка работает. Аннотация или union из двух разных форм
// ломает overload-резолюцию tool() (ZodRawShapeCompat) в @modelcontextprotocol/sdk.

/** Оборачивает результат в MCP text-content. */
export function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: false as boolean }
}

/** Оборачивает ошибку в MCP isError-ответ с диагностикой. */
export function errorText(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: true as boolean }
}

/** JSON-представление данных для вывода в чат. */
export function pretty(data: unknown): string {
  return '```json\n' + JSON.stringify(data, null, 2) + '\n```'
}
