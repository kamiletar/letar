'use client'

/**
 * Рендеринг Markdown контента с Chakra UI стилями
 */

import { Box, Code, Heading, Link, Text } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Box className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <Heading as="h1" size="2xl" mt={8} mb={4}>
              {children}
            </Heading>
          ),
          h2: ({ children }) => (
            <Heading as="h2" size="xl" mt={6} mb={3}>
              {children}
            </Heading>
          ),
          h3: ({ children }) => (
            <Heading as="h3" size="lg" mt={4} mb={2}>
              {children}
            </Heading>
          ),
          h4: ({ children }) => (
            <Heading as="h4" size="md" mt={3} mb={2}>
              {children}
            </Heading>
          ),
          p: ({ children }) => (
            <Text mb={4} lineHeight="tall">
              {children}
            </Text>
          ),
          a: ({ href, children }) => (
            <Link color="brand.fg" textDecoration="underline" href={href ?? '#'}>
              {children}
            </Link>
          ),
          code: ({ children }) => <Code fontSize="sm">{children}</Code>,
          blockquote: ({ children }) => (
            <Box borderLeftWidth="4px" borderColor="brand.fg" pl={4} py={2} my={4} color="fg.muted" fontStyle="italic">
              {children}
            </Box>
          ),
          ul: ({ children }) => (
            <Box as="ul" pl={6} mb={4} listStyleType="disc">
              {children}
            </Box>
          ),
          ol: ({ children }) => (
            <Box as="ol" pl={6} mb={4} listStyleType="decimal">
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Box as="li" mb={1}>
              {children}
            </Box>
          ),
          hr: () => <Box as="hr" my={6} borderColor="border.muted" />,
          strong: ({ children }) => (
            <Text as="strong" fontWeight="bold">
              {children}
            </Text>
          ),
          em: ({ children }) => (
            <Text as="em" fontStyle="italic">
              {children}
            </Text>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}
