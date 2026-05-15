/**
 * Поиск символов по названию/синонимам с debounce 300мс
 *
 * Возможности:
 * - Клавиатурная навигация (стрелки вверх/вниз, Enter)
 * - Недавно использованные символы
 * - Фильтрация по категориям Unicode-блоков
 * - Drag-and-drop символов на клавиши клавиатуры
 */

import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import { matchesCategory, SYMBOL_CATEGORIES } from './symbol-categories'

const RECENT_KEY = 'kami-key-the-recent-symbols'
const MAX_RECENT = 8
const PAGE_SIZE = 50

/** Загрузить недавние символы из localStorage */
function loadRecent(): string[] {
  try {
    const data = localStorage.getItem(RECENT_KEY)
    return data ? (JSON.parse(data) as string[]) : []
  } catch {
    return []
  }
}

/** Сохранить символ в недавние */
function pushRecent(codeHex: string) {
  const recent = loadRecent().filter((c) => c !== codeHex)
  recent.unshift(codeHex)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface SymbolSearchProps {
  symbols: SymbolEntry[]
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  keyLabel: string
}

export function SymbolSearch({ symbols, onAssign, keyLabel }: SymbolSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolEntry[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [categoryId, setCategoryId] = useState('all')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Недавно использованные
  const [recentCodes] = useState(loadRecent)
  const recentSymbols = recentCodes.map((c) => symbols.find((s) => s.c === c)).filter((s): s is SymbolEntry => !!s)

  // Категория для фильтрации
  const activeCategory = SYMBOL_CATEGORIES.find((c) => c.id === categoryId) ?? SYMBOL_CATEGORIES[0]

  // Количество символов в каждой категории (мемоизировано)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cat of SYMBOL_CATEGORIES) {
      if (cat.id === 'all') {
        counts.set(cat.id, symbols.length)
      } else {
        counts.set(cat.id, symbols.filter((s) => matchesCategory(parseInt(s.c, 16), cat)).length)
      }
    }
    return counts
  }, [symbols])

  // Видимые категории — только те, в которых есть символы
  const visibleCategories = SYMBOL_CATEGORIES.filter((c) => (categoryCounts.get(c.id) ?? 0) > 0)

  const search = useCallback(
    (q: string) => {
      if (!q || q.length < 2) {
        // Если выбрана категория — показать все символы этой категории
        if (categoryId !== 'all') {
          const catResults = symbols.filter((s) => matchesCategory(parseInt(s.c, 16), activeCategory))
          setResults(catResults)
        } else {
          setResults([])
        }
        setHighlightIndex(-1)
        setVisibleCount(PAGE_SIZE)
        return
      }
      const lower = q.toLowerCase()
      let matches = symbols.filter(
        (s) => s.n.toLowerCase().includes(lower) || (s.s && s.s.toLowerCase().includes(lower))
      )
      // Фильтр по категории
      if (categoryId !== 'all') {
        matches = matches.filter((s) => matchesCategory(parseInt(s.c, 16), activeCategory))
      }
      setResults(matches)
      setHighlightIndex(-1)
      setVisibleCount(PAGE_SIZE)
    },
    [symbols, categoryId, activeCategory]
  )

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, search])

  // Скролл к подсвеченному элементу
  useEffect(() => {
    if (highlightIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.children[highlightIndex] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const handleAssign = (entry: SymbolEntry, slot: 'char' | 'shiftChar') => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    pushRecent(entry.c)
    onAssign(ch, entry.n, slot)
  }

  // Drag-and-drop: начало перетаскивания символа
  const handleDragStart = (e: React.DragEvent, entry: SymbolEntry) => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    e.dataTransfer.setData('application/json', JSON.stringify({ char: ch, name: entry.n }))
    e.dataTransfer.effectAllowed = 'copy'
    // Визуальный drag-preview: символ крупно
    const preview = document.createElement('div')
    preview.textContent = ch
    preview.style.cssText =
      'font-size:32px;padding:4px 8px;background:#1e2a4a;color:#6c7ae0;border-radius:6px;position:absolute;top:-1000px'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 24, 24)
    requestAnimationFrame(() => document.body.removeChild(preview))
  }

  const fullList = results.length > 0 ? results : query.trim().length < 2 && categoryId === 'all' ? recentSymbols : []
  const activeList = fullList.slice(0, visibleCount)
  const hasMore = fullList.length > visibleCount
  const showingRecent =
    results.length === 0 && query.trim().length < 2 && categoryId === 'all' && recentSymbols.length > 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeList.length === 0) {
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < activeList.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : activeList.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      const entry = activeList[highlightIndex]
      // Shift+Enter → назначить в shiftChar, Enter → в char
      handleAssign(entry, e.shiftKey ? 'shiftChar' : 'char')
    }
  }

  return (
    <Box>
      {/* Фильтр по категориям */}
      <Flex gap="1" mb="2" flexWrap="wrap">
        {visibleCategories.map((cat) => (
          <Box
            key={cat.id}
            px="2"
            py="0.5"
            borderRadius="4px"
            fontSize="xs"
            cursor="pointer"
            userSelect="none"
            bg={categoryId === cat.id ? '#3a3a6a' : 'transparent'}
            color={categoryId === cat.id ? '#8a9af0' : '#666'}
            border={categoryId === cat.id ? '1px solid #5a5a8a' : '1px solid transparent'}
            _hover={{ color: '#aaa', bg: '#2a2a4a' }}
            onClick={() => {
              setCategoryId(cat.id)
              setHighlightIndex(-1)
              setVisibleCount(PAGE_SIZE)
            }}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <Text as="span" color="#555" ml="1">
                {categoryCounts.get(cat.id)}
              </Text>
            )}
          </Box>
        ))}
      </Flex>

      <Input
        placeholder="Поиск символа по названию..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        bg="#1a1a2e"
        border="1px solid #3a3a5a"
        color="white"
        mb="2"
        _focus={{ borderColor: '#6c7ae0' }}
        _placeholder={{ color: '#666' }}
      />

      {showingRecent && (
        <Text color="#666" fontSize="xs" mb="1" px="1">
          Недавние:
        </Text>
      )}

      {activeList.length > 0 && (
        <Box ref={resultsRef} maxH="300px" overflowY="auto" border="1px solid #3a3a5a" borderRadius="6px">
          {activeList.map((s, idx) => {
            const cp = parseInt(s.c, 16)
            const ch = String.fromCodePoint(cp)
            const isHighlighted = idx === highlightIndex
            return (
              <Flex
                key={s.c}
                align="center"
                gap="2"
                px="3"
                py="1.5"
                borderBottom="1px solid #2a2a4a"
                _last={{ borderBottom: 'none' }}
                bg={isHighlighted ? '#3a3a6a' : 'transparent'}
                _hover={{ bg: '#2a2a4a' }}
                cursor="grab"
                draggable
                onDragStart={(e) => handleDragStart(e, s)}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => handleAssign(s, 'char')}
              >
                <Text fontSize="2xl" w="36px" textAlign="center" pointerEvents="none">
                  {ch}
                </Text>
                <Text color="#6c7ae0" fontSize="xs" fontFamily="monospace" w="60px" pointerEvents="none">
                  U+{s.c}
                </Text>
                <Text flex="1" fontSize="sm" pointerEvents="none">
                  {s.n}
                  {s.s && (
                    <Text as="span" color="#888">
                      {' \u2014 '}
                      {s.s}
                    </Text>
                  )}
                </Text>
                <Flex gap="1">
                  <Button
                    size="xs"
                    bg="#1e3a4a"
                    color="#4ac"
                    border="1px solid #2a5a6a"
                    _hover={{ bg: '#2a5a6a' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssign(s, 'char')
                    }}
                    title={`Назначить на AltGr+${keyLabel}`}
                  >
                    AltGr+{keyLabel}
                  </Button>
                  <Button
                    size="xs"
                    bg="#1e2a4a"
                    color="#6c7ae0"
                    border="1px solid #3a4a7a"
                    _hover={{ bg: '#2a3a6a' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssign(s, 'shiftChar')
                    }}
                    title={`Назначить на AltGr+Shift+${keyLabel}`}
                  >
                    +Shift+{keyLabel}
                  </Button>
                </Flex>
              </Flex>
            )
          })}
          {hasMore && (
            <Flex justify="center" py="2" borderTop="1px solid #2a2a4a">
              <Button
                size="xs"
                variant="ghost"
                color="#6c7ae0"
                _hover={{ bg: '#2a2a4a' }}
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Показать ещё ({fullList.length - visibleCount} из {fullList.length})
              </Button>
            </Flex>
          )}
        </Box>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <Text color="#666" p="2" fontSize="sm">
          Ничего не найдено
        </Text>
      )}

      {activeList.length > 0 && (
        <Text color="#555" fontSize="xs" mt="1" px="1">
          {'\u2191\u2193'} навигация, Enter — AltGr, Shift+Enter — +Shift, перетащи на клавишу
        </Text>
      )}
    </Box>
  )
}
