import { Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

interface CrossRefProps {
  /** URL документа (например: "/codes/tax#section-3") */
  to: string
  /** Название документа для отображения */
  doc?: string
  /** Раздел (например: "Раздел III") */
  section?: string
  /** Номер статьи */
  article?: number | string
  /** Добавить "также" после "см." */
  also?: boolean
}

/**
 * Перекрёстная ссылка на другой документ.
 * Отображается как "(см. Документ, Раздел N)".
 * Server Component — нет хуков.
 */
export function CrossRef({ to, doc, section, article, also }: CrossRefProps) {
  // Формируем текст ссылки
  const parts: string[] = []
  if (doc) {
    parts.push(doc)
  }
  if (section) {
    parts.push(section)
  }
  if (article) {
    parts.push(`Статья ${article}`)
  }

  const linkText = parts.join(', ') || 'документ'

  return (
    <Text as="span" color="fg.muted" fontSize="sm">
      (см.{also ? ' также' : ''}{' '}
      <Link asChild color="brand.600" _dark={{ color: 'brand.400' }} _hover={{ textDecoration: 'underline' }}>
        <NextLink href={to}>{linkText}</NextLink>
      </Link>
      )
    </Text>
  )
}
