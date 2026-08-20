'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text } from '@chakra-ui/react'

export default function AutosaveExamplePage() {
  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <PageH1 size="xl">Autosave to Server</PageH1>
        <Text color="fg.muted">Automatic server-side saving with debounce, offline fallback, and draft recovery.</Text>
      </Stack>

      <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
        {`import { useFormAutosave, AutosaveIndicator } from '@letar/forms'

const autosave = useFormAutosave(form, {
  endpoint: '/api/drafts',
  draftId: 'my-draft',
  interval: 5000,
  debounce: 1000,
})

// Status: 'idle' | 'saving' | 'saved' | 'error'
// saveNow() — force save
// loadDraft() — recover draft`}
      </Code>

      <Text fontSize="sm" color="fg.muted">
        This example requires a server endpoint. See the form-develop-app for a working demo.
      </Text>
    </Stack>
  )
}
