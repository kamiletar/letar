'use client'

import { ChakraProvider, defaultSystem, Heading, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { SubmittedDataPreview } from '../_components'

const Schema = z.object({
  birthday: z.string().meta({ ui: { title: 'Date' } }),
  time: z.string().meta({ ui: { title: 'Time' } }),
})

export default function DateDemoPage() {
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <ChakraProvider value={defaultSystem}>
      <Form schema={Schema} initialValue={{ birthday: '', time: '' }} onSubmit={(data) => setSubmitted(data)}>
        <Stack gap={4}>
          <Heading size="sm">Date &amp; Time Fields</Heading>
          <Form.Field.Date name="birthday" />
          <Form.Field.Time name="time" />
          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
          <SubmittedDataPreview data={submitted} />
        </Stack>
      </Form>
    </ChakraProvider>
  )
}
