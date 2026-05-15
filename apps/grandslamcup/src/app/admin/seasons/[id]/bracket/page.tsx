'use client'

/**
 * Визуализация турнирной сетки (плей-офф) — админка.
 *
 * Desktop: CSS Grid + SVG коннекторы
 * Mobile: SegmentGroup + round tabs
 */

import { getBracketDataAction } from '@/app/_actions/bracket.action'
import type { BracketSection } from '@/app/_components/bracket'
import { TournamentBracket, transformSlotsToSections } from '@/app/_components/bracket'
import { EmptyState } from '@/app/_components/empty-state'
import { Flex, Spinner, Text } from '@chakra-ui/react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function BracketPage() {
  const params = useParams()
  const seasonId = params.id as string

  const [sections, setSections] = useState<BracketSection[]>([])
  const [loading, setLoading] = useState(true)

  const loadBracket = useCallback(async () => {
    const result = await getBracketDataAction(seasonId)
    if ('data' in result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = transformSlotsToSections(result.data as any)
      setSections(transformed)
    }
    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    loadBracket()
  }, [loadBracket])

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    )
  }

  if (sections.length === 0) {
    return (
      <EmptyState>
        <Text color="fg.muted">Сетка ещё не создана. Перейдите в «Этапы» для генерации.</Text>
      </EmptyState>
    )
  }

  return <TournamentBracket sections={sections} title="Турнирная сетка" />
}
