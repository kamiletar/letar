'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Heading, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const ProductSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Product Name', placeholder: 'Widget Pro' } }),
    category: z.string().min(1).meta({ ui: { title: 'Category', placeholder: 'Select category...' } }),
    supplier: z.string().min(1).meta({ ui: { title: 'Supplier', placeholder: 'Type a supplier name...' } }),
  })
  .strip()

interface DictionaryOption {
  label: string
  value: string
}

const initialCategories: DictionaryOption[] = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Furniture', value: 'furniture' },
]

const initialSuppliers: DictionaryOption[] = [
  { label: 'Acme Corp', value: 'acme' },
  { label: 'Globex', value: 'globex' },
  { label: 'Initech', value: 'initech' },
]

/**
 * Имитация окна создания записи и серверного действия: в настоящем приложении здесь открывается
 * своё диалоговое окно, а созданная запись приходит из Server Action.
 */
function fakeCreateDialog(name: string): Promise<DictionaryOption> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ label: name.trim() || 'New record', value: `new-${Math.random().toString(36).slice(2, 8)}` })
    }, 400)
  })
}

export default function CreateOptionPage() {
  const [log, setLog] = useState<string[]>([])
  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-5), msg])

  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Create Option (onCreate)</PageH1>
        <Text color="fg.muted">
          Create a dictionary record right from a Select or Combobox without leaving the form. The library shows the «+
          Add…» item, your app opens its own dialog and returns the new option — it is added to the list and selected.
        </Text>
      </div>

      <Form
        schema={ProductSchema}
        initialValue={{ name: '', category: 'electronics', supplier: '' }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          <Form.Field.String name="name" />

          <div>
            <Heading size="sm" mb={2}>
              Select — «+ Add…» is the last item
            </Heading>
            <Form.Field.Select
              name="category"
              options={initialCategories}
              createLabel="Add category…"
              onCreate={async () => {
                addLog('Select: onCreate("")')
                return fakeCreateDialog('New category')
              }}
            />
          </div>

          <div>
            <Heading size="sm" mb={2}>
              Combobox — type a name that is not in the list
            </Heading>
            <Text color="fg.muted" fontSize="sm" mb={2}>
              Type text starting with <Code>cancel</Code> to see the <Code>null</Code>{' '}
              path: the dialog is closed, nothing changes and the search text stays.
            </Text>
            <Form.Field.Combobox
              name="supplier"
              options={initialSuppliers}
              onCreate={async (text) => {
                addLog(`Combobox: onCreate("${text}")`)
                if (text.trim().toLowerCase().startsWith('cancel')) {
                  addLog('dialog closed → null')
                  return null
                }
                return fakeCreateDialog(text)
              }}
            />
          </div>

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Stack>
      </Form>

      {log.length > 0 && (
        <Stack gap={1} p={3} bg="bg.subtle" borderRadius="md">
          <Text fontSize="xs" fontWeight="bold" color="fg.muted">
            onCreate calls
          </Text>
          {log.map((entry, i) => (
            <Code key={`${i}-${entry}`} fontSize="xs">
              {entry}
            </Code>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
