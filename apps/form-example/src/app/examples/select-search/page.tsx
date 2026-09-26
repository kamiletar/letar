'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const RegionSchema = z
  .object({
    region: z.string().min(1).meta({ ui: { title: 'Region', placeholder: 'Choose a region...' } }),
    color: z.string().min(1).meta({ ui: { title: 'Color (5 options — no search)', placeholder: 'Choose...' } }),
  })
  .strip()

const regions = [
  'Moscow',
  'Saint Petersburg',
  'Novosibirsk',
  'Yekaterinburg',
  'Kazan',
  'Nizhny Novgorod',
  'Chelyabinsk',
  'Samara',
  'Omsk',
  'Rostov-on-Don',
  'Ufa',
  'Krasnoyarsk',
  'Voronezh',
  'Perm',
  'Volgograd',
].map((name) => ({ label: name, value: name.toLowerCase().replaceAll(' ', '-') }))

const colors = ['Red', 'Green', 'Blue', 'Black', 'White'].map((name) => ({ label: name, value: name.toLowerCase() }))

export default function SelectSearchPage() {
  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Select Search</PageH1>
        <Text color="fg.muted">
          A <Code>Form.Field.Select</Code>{' '}
          with more than 9 options shows a search field inside the open list — no prop needed. Type{' '}
          <Code>ghbdtn</Code>-style queries in the wrong keyboard layout and it still finds the option. Turn it off with
          {' '}
          <Code>searchable=&#123;false&#125;</Code>.
        </Text>
      </div>

      <Form
        schema={RegionSchema}
        initialValue={{ region: '', color: '' }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <div>
            <Heading size="sm" mb={2}>15 options — search appears</Heading>
            <Form.Field.Select name="region" options={regions} />
          </div>
          <div>
            <Heading size="sm" mb={2}>5 options — plain list</Heading>
            <Form.Field.Select name="color" options={colors} />
          </div>
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
