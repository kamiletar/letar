'use client'

import { useEffect, useState } from 'react'

interface Suggestion {
  id: string
  name: string
}

/**
 * Хук для подсказок при поиске.
 * Debounce 250ms, минимум 2 символа.
 */
export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions)
        }
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      setIsLoading(false)
    }
  }, [query])

  return { suggestions, isLoading }
}
