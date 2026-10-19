// Серверный компонент (без 'use client'): <Form> приходит из пакета. Если директива 'use client' не дошла
// до собранного @letar/forms, сборка падает на createContext/useState ещё при загрузке модуля в серверном слое.
// Составные части (`Form.Field.String`) на сервере недоступны — RSC не пускает «внутрь» клиентского модуля,
// поэтому поля лежат в клиентском demo-fields.tsx.
import { Form } from '@letar/forms'
import { DemoFields } from './demo-fields'

async function save() {
  'use server'
}

export default function Page() {
  return (
    <main>
      <h1>Smoke: @letar/forms в Next.js</h1>
      <Form initialValue={{ title: '', rating: 5, kind: 'a' }} onSubmit={save}>
        <DemoFields />
      </Form>
    </main>
  )
}
