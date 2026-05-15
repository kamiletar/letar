'use client'

import { IconButton, Input, InputGroup, type InputProps } from '@chakra-ui/react'
import { memo } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  /** Текущее значение поиска */
  value: string
  /** Колбэк изменения значения */
  onChange: (value: string) => void
  /** Колбэк очистки поиска */
  onClear?: () => void
  /** Placeholder текст */
  placeholder?: string
}

/**
 * Мемоизированный компонент поиска.
 * Предотвращает потерю фокуса при ре-рендерах родительского компонента.
 */
export const SearchInput = memo(function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Поиск...',
  size = 'md',
  disabled,
  ...rest
}: SearchInputProps) {
  return (
    <InputGroup
      startElement={<LuSearch />}
      endElement={
        value && onClear ? (
          <IconButton size="xs" variant="ghost" aria-label="Очистить поиск" onClick={onClear} tabIndex={-1} me="-1">
            <LuX />
          </IconButton>
        ) : undefined
      }
    >
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={size}
        disabled={disabled}
        borderRadius="full"
        _focus={{ borderColor: 'fg' }}
        {...rest}
      />
    </InputGroup>
  )
})
