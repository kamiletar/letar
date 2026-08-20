'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Stack, Text, VStack } from '@chakra-ui/react'
import { ConversationalMode, Form } from '@letar/forms'
import { useState } from 'react'

export default function ConversationalExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="lg">
      <Stack gap={2}>
        <PageH1 size="xl">Conversational Mode</PageH1>
        <Text color="fg.muted">Typeform-style one-question-at-a-time experience.</Text>
      </Stack>

      <Form
        initialValue={{ name: '', email: '', rating: undefined }}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
      >
        <ConversationalMode
          showProgress
          showQuestionNumber
          completedScreen={
            <VStack gap={2} textAlign="center">
              <Text fontSize="xl">Thank you!</Text>
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </VStack>
          }
        >
          <Form.Field.String name="name" label="What's your name?" />
          <Form.Field.String name="email" label="Your email address?" />
          <Form.Field.Likert
            name="rating"
            label="How do you rate our service?"
            anchors={['Terrible', 'Bad', 'OK', 'Good', 'Excellent']}
          />
        </ConversationalMode>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
