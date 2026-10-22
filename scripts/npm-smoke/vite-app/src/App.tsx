// Пакет вне Next.js: та же форма и useQueryOptions из @letar/forms-query на заглушке результата запроса.
import { Form } from '@letar/forms'
import { useQueryOptions } from '@letar/forms-query'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Название' } }),
  regionId: z.string().meta({ ui: { title: 'Регион' } }),
})

const regionsResult = {
  data: [
    { id: 'msk', name: 'Москва' },
    { id: 'spb', name: 'Санкт-Петербург' },
  ],
  isLoading: false,
}

const toOption = (region: { id: string; name: string }) => ({ label: region.name, value: region.id })

export function App() {
  const regions = useQueryOptions(regionsResult, toOption)
  return (
    <main>
      <h1>Smoke: @letar/forms в Vite</h1>
      <Form schema={Schema} initialValue={{ title: '', regionId: 'msk' }} onSubmit={async () => {}}>
        <Form.Field.String name="title" />
        <Form.Field.Select name="regionId" {...regions.fieldProps} />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </main>
  )
}
