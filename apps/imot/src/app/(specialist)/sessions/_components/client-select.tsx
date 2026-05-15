'use client'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'

export interface ClientSelectProps {
  name: string
  defaultValue?: string
  clients: Array<{ id: string; name: string }>
}

/**
 * Компонент выбора клиента из списка.
 * Используется в форме создания сессии.
 */
export function ClientSelect({ name, defaultValue, clients }: ClientSelectProps) {
  return (
    <NativeSelectRoot>
      <NativeSelectField name={name} defaultValue={defaultValue} placeholder="Выберите клиента">
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </NativeSelectField>
    </NativeSelectRoot>
  )
}
