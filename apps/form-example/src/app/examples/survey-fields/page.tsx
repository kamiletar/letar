'use client'

import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'

export default function SurveyFieldsExamplePage() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <Stack gap={8} maxW="3xl">
      <Stack gap={2}>
        <Heading size="xl">Survey Fields</Heading>
        <Text color="fg.muted">ImageChoice, Likert, and YesNo for building surveys and questionnaires.</Text>
      </Stack>

      <Form
        initialValue={{ experience: undefined, recommend: undefined }}
        onSubmit={(data) => setResult(JSON.stringify(data, null, 2))}
      >
        <Form.Field.Likert
          name="experience"
          label="How would you rate your experience?"
          anchors={['Very Poor', 'Poor', 'Average', 'Good', 'Excellent']}
          showNumbers
        />
        <Form.Field.YesNo
          name="recommend"
          label="Would you recommend us to a friend?"
          yesLabel="Yes!"
          noLabel="No"
          variant="thumbs"
        />
        <Form.Button.Submit>Submit</Form.Button.Submit>
      </Form>

      {result && (
        <Code p={4} borderRadius="md" display="block" whiteSpace="pre" overflow="auto" fontSize="sm">
          {result}
        </Code>
      )}
    </Stack>
  )
}
