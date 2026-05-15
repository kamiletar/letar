'use client'

import { Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { AddressSuggestions } from 'react-dadata'
// oxlint-disable-next-line import/no-unassigned-import -- CSS импорт
import 'react-dadata/dist/react-dadata.css'

export type AddressInputProps = {
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  onAddressSelect?: (suggestion: DaDataSuggestion<DaDataAddress>) => void
}

/**
 * Контролируемый компонент поля адреса с подсказками от DaData.
 */
export function AddressInput({ value = '', onChange, onBlur, placeholder, onAddressSelect }: AddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY || ''
  const [inputValue, setInputValue] = useState(value)

  // Синхронизация с внешним value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  if (!apiKey) {
    console.error('NEXT_PUBLIC_DADATA_API_KEY is not set. Address suggestions will not work.')
  }

  return (
    <Box width="100%">
      {/* DaData компонент с подсказками */}
      <AddressSuggestions
        token={apiKey}
        defaultQuery={inputValue}
        inputProps={{
          placeholder: placeholder ?? 'Введите адрес',
          onBlur: () => onBlur?.(),
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value
            setInputValue(newValue)
            onChange?.(newValue)
          },
          style: {
            width: '100%',
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            lineHeight: '1.5',
            border: '1px solid var(--chakra-colors-border)',
            borderRadius: 'var(--chakra-radii-md)',
            outline: 'none',
            transition: 'border-color 0.2s',
          },
        }}
        onChange={(suggestion) => {
          if (suggestion) {
            setInputValue(suggestion.value)
            onChange?.(suggestion.value)
            onAddressSelect?.(suggestion)
          } else {
            setInputValue('')
            onChange?.('')
          }
        }}
        containerClassName="dadata-container"
        suggestionsClassName="dadata-suggestions"
        currentSuggestionClassName="dadata-suggestion-current"
        hintText="Выберите вариант или продолжите ввод"
        minChars={3}
      />

      <style jsx global>
        {`
          .dadata-container {
            position: relative;
            width: 100%;
          }

          .dadata-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 1000;
            margin-top: 0.25rem;
            background: var(--chakra-colors-bg);
            border: 1px solid var(--chakra-colors-border);
            border-radius: var(--chakra-radii-md);
            box-shadow: var(--chakra-shadows-lg);
            max-height: 300px;
            overflow-y: auto;
          }

          .dadata-suggestions > div {
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .dadata-suggestions > div:hover,
          .dadata-suggestion-current {
            background-color: var(--chakra-colors-gray-100);
          }

          /* Dark mode support */
          [data-theme='dark'] .dadata-suggestions > div:hover,
          [data-theme='dark'] .dadata-suggestion-current {
            background-color: var(--chakra-colors-gray-700);
          }

          .dadata-suggestions mark {
            background-color: transparent;
            font-weight: 600;
            color: var(--chakra-colors-fg);
          }
        `}
      </style>
    </Box>
  )
}
