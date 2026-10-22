'use client'

// Ручная проверка DirtyGuard: изменить поле, нажать ссылку → диалог «Остаться»/«Уйти», переход без перезагрузки.
import { Form } from '@letar/forms'
import Link from 'next/link'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z
    .string()
    .min(1)
    .meta({ ui: { title: 'Название' } }),
})

export default function DirtyPage() {
  return (
    <main>
      <Link href="/" id="leave-link">Уйти на главную</Link>
      <Form schema={Schema} initialValue={{ title: '' }} onSubmit={async () => {}}>
        <Form.DirtyGuard />
        <Form.Field.String name="title" />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </main>
  )
}
