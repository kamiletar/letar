import { CodeHighlighter } from '@/app/_components/code-highlighter'
import { Box, Code, Heading, Link, Table, Text } from '@chakra-ui/react'
import NextImage from 'next/image'
import React from 'react'

/**
 * Тип Markdoc Node из Keystatic
 */
export type MarkdocNode = {
  $$mdtype?: string
  type?: string
  attributes?: Record<string, unknown>
  children?: MarkdocNode[]
  errors?: unknown[]
  lines?: number[]
  inline?: boolean
  annotations?: unknown[]
  slots?: Record<string, unknown>
  location?: unknown
}

/**
 * Keystatic возвращает контент в формате { node: MarkdocNode }
 */
export type KeystaticContent = {
  node: MarkdocNode
}

/**
 * Элемент оглавления
 */
export type TocItem = {
  id: string
  text: string
  level: number
}

type Props = {
  content: KeystaticContent
}

/**
 * Генерирует slug из текста для использования как id
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Убираем спецсимволы, сохраняя Unicode буквы
    .replace(/\s+/g, '-') // Пробелы в дефисы
    .replace(/-+/g, '-') // Множественные дефисы в один
    .replace(/^-|-$/g, '') // Убираем дефисы по краям
}

/**
 * Извлекает весь текстовый контент из ноды
 */
function extractTextContent(node: MarkdocNode): string {
  if (!node) {
    return ''
  }

  const { type, attributes = {}, children = [] } = node

  if (type === 'text') {
    return (attributes.content as string) ?? ''
  }

  return children.map((child) => extractTextContent(child)).join('')
}

/**
 * Извлекает заголовки для построения оглавления
 */
export function extractTableOfContents(content: KeystaticContent): TocItem[] {
  const items: TocItem[] = []

  function traverse(node: MarkdocNode) {
    if (!node) {
      return
    }

    if (node.type === 'heading') {
      const level = (node.attributes?.level as number) ?? 1
      const text = extractTextContent(node)
      if (text) {
        items.push({
          id: slugify(text),
          text,
          level,
        })
      }
    }

    node.children?.forEach(traverse)
  }

  traverse(content.node)
  return items
}

/**
 * Рекурсивный рендер Markdoc AST из Keystatic
 */
function renderNode(node: MarkdocNode, index: number): React.ReactNode {
  if (!node || typeof node !== 'object') {
    return null
  }

  const { type, attributes = {}, children = [] } = node

  // Рендер дочерних элементов
  const renderedChildren = children.map((child, i) => renderNode(child, i))

  // Получаем текстовый контент
  const textContent = attributes.content as string | undefined

  switch (type) {
    case 'document':
      return <React.Fragment key={index}>{renderedChildren}</React.Fragment>

    case 'heading': {
      const level = (attributes.level as number) ?? 1
      const sizes: Record<number, string> = { 1: '3xl', 2: '2xl', 3: 'xl', 4: 'lg', 5: 'md', 6: 'sm' }
      const headingText = extractTextContent(node)
      const id = slugify(headingText)
      return (
        <Heading
          key={index}
          id={id}
          as={`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'}
          fontSize={sizes[level]}
          mt={6}
          mb={3}
          scrollMarginTop="80px"
        >
          {renderedChildren}
        </Heading>
      )
    }

    case 'paragraph':
      return (
        <Text key={index} fontSize="md" lineHeight="tall" mb={4}>
          {renderedChildren}
        </Text>
      )

    case 'text':
      return textContent ?? null

    case 'strong':
      return <strong key={index}>{renderedChildren}</strong>

    case 'em':
      return <em key={index}>{renderedChildren}</em>

    case 'link': {
      const href = (attributes.href as string) ?? '#'
      return (
        <Link key={index} href={href} color="fg" textDecoration="underline">
          {renderedChildren}
        </Link>
      )
    }

    case 'list': {
      const ordered = attributes.ordered as boolean
      if (ordered) {
        return (
          <ol key={index} style={{ paddingLeft: '1.5rem', marginBottom: '1rem', listStyleType: 'decimal' }}>
            {renderedChildren}
          </ol>
        )
      }
      return (
        <ul key={index} style={{ paddingLeft: '1.5rem', marginBottom: '1rem', listStyleType: 'disc' }}>
          {renderedChildren}
        </ul>
      )
    }

    case 'listItem':
      return (
        <li key={index} style={{ marginBottom: '0.25rem' }}>
          {renderedChildren}
        </li>
      )

    case 'code':
    case 'fence': {
      const codeContent = extractTextContent(node)
      const language = (attributes.language as string) || undefined
      return <CodeHighlighter key={index} code={codeContent} language={language} />
    }

    case 'codeInline':
    case 'inlineCode':
      return (
        <Code key={index} px={2} py={0.5} borderRadius="md" bg={{ base: 'gray.100', _dark: 'gray.800' }} fontSize="sm">
          {textContent ?? renderedChildren}
        </Code>
      )

    case 'blockquote':
      return (
        <Box key={index} pl={4} borderLeft="4px solid" borderColor="fg" fontStyle="italic" color="fg.muted" mb={4}>
          {renderedChildren}
        </Box>
      )

    case 'hr':
    case 'thematicBreak':
      return <Box key={index} as="hr" my={6} borderColor={{ base: 'gray.200', _dark: 'gray.700' }} />

    case 'hardBreak':
      return <br key={index} />

    case 'softBreak':
      return ' '

    case 'inline':
      return <React.Fragment key={index}>{renderedChildren}</React.Fragment>

    case 'image': {
      const src = (attributes.src as string) ?? ''
      const alt = (attributes.alt as string) ?? ''
      const title = (attributes.title as string) ?? undefined
      return (
        <Box key={index} my={6} borderRadius="lg" overflow="hidden">
          <NextImage
            src={src}
            alt={alt}
            title={title}
            width={900}
            height={500}
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            unoptimized={src.startsWith('http')}
          />
          {title && (
            <Text fontSize="sm" color="fg.muted" textAlign="center" mt={2}>
              {title}
            </Text>
          )}
        </Box>
      )
    }

    case 'table':
      return (
        <Box key={index} overflowX="auto" mb={6}>
          <Table.Root variant="outline" size="sm">
            {renderedChildren}
          </Table.Root>
        </Box>
      )

    case 'thead':
      return <Table.Header key={index}>{renderedChildren}</Table.Header>

    case 'tbody':
      return <Table.Body key={index}>{renderedChildren}</Table.Body>

    case 'tr':
      return <Table.Row key={index}>{renderedChildren}</Table.Row>

    case 'th':
      return (
        <Table.ColumnHeader key={index} fontWeight="bold" bg={{ base: 'gray.50', _dark: 'gray.800' }}>
          {renderedChildren}
        </Table.ColumnHeader>
      )

    case 'td':
      return <Table.Cell key={index}>{renderedChildren}</Table.Cell>

    default:
      // Для неизвестных типов — рендерим детей
      if (renderedChildren.length > 0) {
        return <React.Fragment key={index}>{renderedChildren}</React.Fragment>
      }
      return null
  }
}

/**
 * Компонент рендеринга Markdoc контента из Keystatic
 */
export function MdxContent({ content }: Props) {
  if (!content?.node) {
    return null
  }

  return <Box>{renderNode(content.node, 0)}</Box>
}
