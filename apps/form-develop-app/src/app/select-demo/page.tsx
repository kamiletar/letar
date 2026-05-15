'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демо-схема для NativeSelect и CascadingSelect
 */
const DemoSchema = z
  .object({
    // NativeSelect fields
    simpleSelect: z.string().meta({
      ui: { title: 'Simple NativeSelect', placeholder: 'Select option...' },
    }),
    sizeSelect: z.string().meta({
      ui: { title: 'Size Selection' },
    }),
    prioritySelect: z
      .string()
      .optional()
      .meta({
        ui: { title: 'Priority (optional)' },
      }),

    // CascadingSelect fields
    country: z.string().meta({
      ui: { title: 'Country', placeholder: 'Select country...' },
    }),
    city: z
      .string()
      .optional()
      .meta({
        ui: { title: 'City', placeholder: 'Select city...' },
      }),

    // Вложенные поля
    address: z.object({
      region: z.string().meta({
        ui: { title: 'Region', placeholder: 'Select region...' },
      }),
      district: z
        .string()
        .optional()
        .meta({
          ui: { title: 'District', placeholder: 'Select district...' },
        }),
    }),
  })
  .strip()

type DemoData = z.infer<typeof DemoSchema>

const initialData: DemoData = {
  simpleSelect: '',
  sizeSelect: 'md',
  prioritySelect: undefined,
  country: '',
  city: undefined,
  address: {
    region: '',
    district: undefined,
  },
}

// Данные для NativeSelect
const simpleOptions = [
  { title: 'Option 1', value: 'opt1' },
  { title: 'Option 2', value: 'opt2' },
  { title: 'Option 3', value: 'opt3' },
]

const sizeOptions = [
  { title: 'Extra Small', value: 'xs' },
  { title: 'Small', value: 'sm' },
  { title: 'Medium', value: 'md' },
  { title: 'Large', value: 'lg' },
]

const priorityOptions = [
  { title: 'Low Priority', value: 'low' },
  { title: 'Medium Priority', value: 'medium' },
  { title: 'High Priority', value: 'high' },
  { title: 'Critical', value: 'critical' },
]

// Данные для CascadingSelect
const countries = [
  { label: 'Russia', value: 'ru' },
  { label: 'USA', value: 'us' },
  { label: 'Germany', value: 'de' },
]

const citiesByCountry: Record<string, { label: string; value: string }[]> = {
  ru: [
    { label: 'Moscow', value: 'msk' },
    { label: 'Saint Petersburg', value: 'spb' },
    { label: 'Novosibirsk', value: 'nsk' },
  ],
  us: [
    { label: 'New York', value: 'nyc' },
    { label: 'Los Angeles', value: 'la' },
    { label: 'Chicago', value: 'chi' },
  ],
  de: [
    { label: 'Berlin', value: 'ber' },
    { label: 'Munich', value: 'mun' },
    { label: 'Hamburg', value: 'ham' },
  ],
}

const regions = [
  { label: 'Moscow Region', value: 'msk_reg' },
  { label: 'Leningrad Region', value: 'len_reg' },
  { label: 'Krasnodar Region', value: 'krd_reg' },
]

const districtsByRegion: Record<string, { label: string; value: string }[]> = {
  msk_reg: [
    { label: 'Odintsovo', value: 'odin' },
    { label: 'Khimki', value: 'khim' },
    { label: 'Balashikha', value: 'bal' },
  ],
  len_reg: [
    { label: 'Vsevolozhsk', value: 'vsev' },
    { label: 'Gatchina', value: 'gat' },
    { label: 'Vyborg', value: 'vyb' },
  ],
  krd_reg: [
    { label: 'Sochi', value: 'soc' },
    { label: 'Novorossiysk', value: 'nov' },
    { label: 'Anapa', value: 'ana' },
  ],
}

export default function SelectDemoPage() {
  const [submitted, setSubmitted] = useState<DemoData | null>(null)

  return (
    <DemoPageLayout title="Select Demo" description="NativeSelect и CascadingSelect компоненты" maxW="800px">
      <Form
        schema={DemoSchema}
        initialValue={initialData}
        onSubmit={(data) => {
          setSubmitted(data)
        }}
      >
        {/* NativeSelect секция */}
        <Box borderWidth={1} borderRadius="md" p={4} mb={6}>
          <Heading size="md" mb={4}>
            NativeSelect
          </Heading>
          <Text color="fg.muted" mb={4}>
            Нативный браузерный select для лучшего UX на мобильных устройствах
          </Text>
          <VStack gap={4} align="stretch">
            <Form.Field.NativeSelect name="simpleSelect" options={simpleOptions} />

            <Form.Field.NativeSelect name="sizeSelect" options={sizeOptions} />

            <Form.Field.NativeSelect name="prioritySelect" options={priorityOptions} />
          </VStack>
        </Box>

        {/* CascadingSelect секция */}
        <Box borderWidth={1} borderRadius="md" p={4} mb={6}>
          <Heading size="md" mb={4}>
            CascadingSelect
          </Heading>
          <Text color="fg.muted" mb={4}>
            Каскадный select с зависимостью от другого поля (Страна → Город)
          </Text>
          <VStack gap={4} align="stretch">
            <Form.Field.Select name="country" options={countries} />

            <Form.Field.CascadingSelect
              name="city"
              dependsOn="country"
              loadOptions={async (parentValue) => {
                // Имитация загрузки с сервера
                await new Promise((r) => setTimeout(r, 300))
                const countryCode = parentValue as string | undefined
                if (!countryCode) {
                  return []
                }
                return citiesByCountry[countryCode] ?? []
              }}
            />
          </VStack>
        </Box>

        {/* Вложенные CascadingSelect */}
        <Box borderWidth={1} borderRadius="md" p={4} mb={6}>
          <Heading size="md" mb={4}>
            Nested CascadingSelect
          </Heading>
          <Text color="fg.muted" mb={4}>
            Каскадные select с вложенными путями (address.region → address.district)
          </Text>
          <VStack gap={4} align="stretch">
            <Form.Field.Select name="address.region" options={regions} />

            <Form.Field.CascadingSelect
              name="address.district"
              dependsOn="address.region"
              loadOptions={async (parentValue) => {
                await new Promise((r) => setTimeout(r, 200))
                const regionCode = parentValue as string | undefined
                if (!regionCode) {
                  return []
                }
                return districtsByRegion[regionCode] ?? []
              }}
            />
          </VStack>
        </Box>

        <Form.Button.Submit>Submit</Form.Button.Submit>
      </Form>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
