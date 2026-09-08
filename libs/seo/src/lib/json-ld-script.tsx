/**
 * Server-component, инжектящий JSON-LD на страницу.
 * Пропс `html` — уже сериализованный JSON со экранированным `</script>`.
 * Контент полностью контролируется сервером (никакого пользовательского ввода).
 */
export function JsonLdScript({ html }: { html: string }) {
  const dangerProp = { __html: html }
  return <script type="application/ld+json" dangerouslySetInnerHTML={dangerProp} />
}

/**
 * Сериализует данные для вставки в `<script type="application/ld+json">`.
 * Safe-by-construction: `JSON.stringify` не пускает символы, ломающие HTML, кроме `</script>`;
 * дополнительно экранируем его вручную. Никакого пользовательского ввода — только серверные данные.
 */
export function toJsonLdHtml(data: Record<string, unknown> | unknown[]): string {
  return JSON.stringify(data).replace(/<\/script>/g, '<\\/script>')
}
