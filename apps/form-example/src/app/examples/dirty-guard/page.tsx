'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { createForm } from '@letar/forms'
import Link from 'next/link'
import { z } from 'zod/v4'

const Schema = z
  .object({
    title: z.string().meta({ ui: { title: 'Title', placeholder: 'My draft article' } }),
  })
  .strip()

/** App-level instance: unsaved-changes guard is on for every form created from it */
const AppForm = createForm({ dirtyGuard: true })

export default function DirtyGuardPage() {
  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Unsaved changes guard</PageH1>
        <Text color="fg.muted">
          Set <Code>dirtyGuard</Code> once in <Code>createForm()</Code>{' '}
          and every form of the instance warns before the user leaves with unsaved changes. Turn it off per form with
          {' '}
          <Code>dirtyGuard=&#123;false&#125;</Code> — for sign-in forms, filters and one-click actions.
        </Text>
      </div>

      <div>
        <Heading size="sm" mb={2}>
          Guarded (instance default)
        </Heading>
        <AppForm schema={Schema} initialValue={{ title: '' }} onSubmit={async () => undefined}>
          <Stack gap={3}>
            <AppForm.Field.String name="title" />
            <Text fontSize="sm">
              Edit the field, then follow this <Link href="/examples/basic">link</Link> — a confirmation dialog opens.
            </Text>
          </Stack>
        </AppForm>
      </div>

      <div>
        <Heading size="sm" mb={2}>
          Not guarded (<Code>dirtyGuard=&#123;false&#125;</Code>)
        </Heading>
        <AppForm schema={Schema} initialValue={{ title: '' }} onSubmit={async () => undefined} dirtyGuard={false}>
          <Stack gap={3}>
            <AppForm.Field.String name="title" />
            <Text fontSize="sm">
              Same form, guard switched off — this <Link href="/examples/basic">link</Link> leaves silently.
            </Text>
          </Stack>
        </AppForm>
      </div>
    </Stack>
  )
}
