'use client'

import { Box } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { AddressSuggestions } from 'react-dadata'
// oxlint-disable-next-line no-unassigned-import -- стили для DaData
import 'react-dadata/dist/react-dadata.css'

/**
 * Компонент поля адреса с подсказками от DaData.
 * Используется для ввода адресов доставки с автокомплитом.
 */
export function SimpleAddressInput({
  defaultValue,
  onAddressSelect,
  onChange,
}: {
  defaultValue?: string
  onAddressSelect?: (suggestion: DaDataSuggestion<DaDataAddress>) => void
  onChange?: (value: string) => void
}): ReactElement {
  const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY || ''

  if (!apiKey) {
    console.error('NEXT_PUBLIC_DADATA_API_KEY is not set. Address suggestions will not work.')
  }

  const handleSuggestionSelect = (suggestion: DaDataSuggestion<DaDataAddress> | undefined) => {
    if (suggestion) {
      onChange?.(suggestion.value)
      onAddressSelect?.(suggestion)
    }
  }

  return (
    <Box
      width="100%"
      css={{
        '& .dadata-container': {
          position: 'relative',
          width: '100%',
        },
        '& .dadata-suggestions': {
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          marginTop: '0.25rem',
          background: 'var(--chakra-colors-bg)',
          border: '1px solid var(--chakra-colors-border)',
          borderRadius: 'var(--chakra-radii-md)',
          boxShadow: 'var(--chakra-shadows-lg)',
          maxHeight: '300px',
          overflowY: 'auto',
        },
        '& .dadata-suggestions > div': {
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        },
        '& .dadata-suggestions > div:hover, & .dadata-suggestion-current': {
          backgroundColor: 'var(--chakra-colors-bg-muted)',
        },
        '& .dadata-suggestions mark': {
          backgroundColor: 'transparent',
          fontWeight: 600,
          color: 'var(--chakra-colors-fg)',
        },
      }}
    >
      <AddressSuggestions
        token={apiKey}
        defaultQuery={defaultValue}
        inputProps={{
          placeholder: 'Введите адрес доставки',
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
        onChange={handleSuggestionSelect}
        containerClassName="dadata-container"
        suggestionsClassName="dadata-suggestions"
        currentSuggestionClassName="dadata-suggestion-current"
        hintText="Выберите вариант или продолжите ввод"
        minChars={3}
      />
    </Box>
  )
}
