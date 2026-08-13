'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import { FieldAddress, FieldAutocomplete, FieldCity, FieldPhone } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

// Мок-провайдер вместо DaData — в песочнице нет токена, демонстрирует только сам UI/интеграцию.
const mockAddressProvider: AddressProvider = {
  async getSuggestions(query) {
    const streets = ['ул Тверская', 'ул Арбат', 'пр-кт Ленина', 'ул Мира']
    return streets
      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({ label: `г Москва, ${s}`, value: `г Москва, ${s}`, data: { street: s } }))
  },
}

interface ContactValues {
  phone: string
  address: string
  city: string
  cityDadata: string
}

const defaultValues: ContactValues = {
  phone: '',
  address: 'г Москва, ул Тверская, д 1',
  city: '',
  cityDadata: 'Казань',
}

export default function ContactDemoPage() {
  const [submitted, setSubmitted] = useState<ContactValues | null>(null)

  return (
    <DemoPageLayout
      title="Контактные поля"
      description="Phone, Address (DaData-подобный провайдер), Autocomplete, City"
    >
      <DemoForm<ContactValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldPhone name="phone" label="Телефон" showFlag />
        <FieldAddress name="address" label="Адрес" provider={mockAddressProvider} minChars={1} />
        <FieldAutocomplete
          name="city"
          label="Город"
          suggestions={['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск']}
        />
        <FieldCity name="cityDadata" label="Город (DaData)" provider={mockAddressProvider} minChars={1} />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
