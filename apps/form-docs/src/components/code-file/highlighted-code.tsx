import { highlight } from 'fumadocs-core/highlight'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'

export interface HighlightedCodeProps {
  code: string
  lang?: string
  title?: string
}

/**
 * Подсвечивает код на сервере (Shiki, `fumadocs-core/highlight`) и рендерит в стандартном
 * `CodeBlock` fumadocs-ui — тот же визуальный компонент, что и у ручных ```tsx-блоков в MDX.
 *
 * Асинхронный серверный компонент — highlight-разметка попадает в HTML на этапе сборки
 * (решение 2, P7 PLAN.md), без клиентского JS для подсветки.
 */
export async function HighlightedCode({ code, lang = 'tsx', title }: HighlightedCodeProps) {
  const rendered = await highlight(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    // defaultColor: false — без этого Shiki печатает цвета light-темы буквально в
    // background-color/color, а --shiki-dark(-bg) остаются неиспользуемыми custom
    // properties: тёмная тема не подхватывается, блок навсегда светлый. Обычные
    // ```-блоки MDX работают верно, потому что fumadocs-mdx сам передаёт этот флаг
    // в свой rehype-code пресет по умолчанию — здесь вызываем highlight() напрямую,
    // тот же флаг нужен явно.
    defaultColor: false,
    components: { pre: Pre },
  })

  return <CodeBlock title={title}>{rendered}</CodeBlock>
}
