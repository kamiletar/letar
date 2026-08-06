'use client'

import { Box, HStack, IconButton, Input, type InputProps } from '@chakra-ui/react'
import { LuSearch, LuX } from 'react-icons/lu'

/** Пропсы компонента SearchInput */
export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  /** Текущее значение поиска */
  value: string
  /** Callback при изменении значения */
  onChange: (value: string) => void
  /** Показывать ли кнопку очистки */
  showClear?: boolean
  /** Максимальная ширина (по умолчанию 400px) */
  maxW?: string | number
}

/**
 * Поисковая строка с иконкой и опциональной кнопкой очистки
 * Устраняет дублирование search-input паттерна на страницах
 *
 * @example
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Поиск по GTIN..."
 * />
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Поиск...',
  showClear = true,
  maxW = '400px',
  ...inputProps
}: SearchInputProps) {
  return (
    <HStack>
      <Box position="relative" flex={1} maxW={maxW}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pl={10}
          {...inputProps}
        />
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
          <LuSearch />
        </Box>
      </Box>
      {showClear && value && (
        <IconButton
          aria-label="Очистить поиск"
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
        >
          <LuX />
        </IconButton>
      )}
    </HStack>
  )
}
