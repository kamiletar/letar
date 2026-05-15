'use client'

import { Box, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { Form, templates } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function TemplatesDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('contactForm')

  const allTemplates = Object.values(templates)
  const current = templates[selectedTemplate as keyof typeof templates]

  return (
    <DemoPageLayout
      title="Form Templates"
      description="10 готовых шаблонов форм — выберите и используйте"
    >
      <VStack gap={6} align="stretch">
        {/* Каталог шаблонов */}
        <Box>
          <Heading size="md" mb={3}>Каталог шаблонов</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={2}>
            {allTemplates.map((t) => (
              <Box
                key={t.name}
                p={3}
                borderWidth="2px"
                borderColor={selectedTemplate === t.name ? 'blue.500' : 'border'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => setSelectedTemplate(t.name)}
                _hover={{ borderColor: 'blue.400' }}
                transition="all 0.15s"
              >
                <Text fontSize="sm" fontWeight="medium">{t.title}</Text>
                <Text fontSize="xs" color="fg.muted">{t.category}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Выбранный шаблон */}
        {current && (
          <Box>
            <Heading size="md" mb={1}>{current.title}</Heading>
            <Text fontSize="sm" color="fg.muted" mb={4}>{current.description}</Text>
            <Form.FromTemplate
              template={current}
              onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
              debug
            />
          </Box>
        )}

        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>Отправленные данные:</Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
