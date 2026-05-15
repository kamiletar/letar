'use client'

import { Box } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'

interface LegalDocumentContentProps {
  content: string
}

/**
 * Компонент для отображения контента юридического документа
 * Использует react-markdown для безопасного рендеринга Markdown
 */
export function LegalDocumentContent({ content }: LegalDocumentContentProps) {
  return (
    <Box
      css={{
        '& p': { marginBottom: '1rem' },
        '& h1': { fontSize: '1.5rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1rem' },
        '& h2': { fontSize: '1.25rem', fontWeight: '600', marginTop: '1.5rem', marginBottom: '0.75rem' },
        '& h3': { fontSize: '1.1rem', fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem' },
        '& ul, & ol': { marginLeft: '1.5rem', marginBottom: '1rem' },
        '& li': { marginBottom: '0.25rem' },
        '& strong': { fontWeight: '600' },
        '& em': { fontStyle: 'italic' },
      }}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </Box>
  )
}
