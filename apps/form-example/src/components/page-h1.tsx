import { Heading, type HeadingProps } from '@chakra-ui/react'

/**
 * Заголовок страницы examples — Chakra Heading рендерит <h2> по умолчанию
 * (см. .claude/docs/chakra-heading-defaults-to-h2.md), поэтому единственный
 * настоящий <h1> страницы оборачивается явно через asChild.
 */
export function PageH1({ children, ...props }: HeadingProps) {
  return (
    <Heading asChild {...props}>
      <h1>{children}</h1>
    </Heading>
  )
}
