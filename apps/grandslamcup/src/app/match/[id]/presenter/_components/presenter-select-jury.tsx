'use client'

/**
 * Экран SELECT_JURY: QR-код на всю ширину + список слотов судей.
 *
 * QR-код генерируется из inviteKey переданного через SSE.
 * Судьи подключаются к матчу через этот QR.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'

/** Цвета судей */
const JUDGE_COLORS: Record<string, string> = {
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
  PURPLE: 'purple',
}

interface PresenterSelectJuryProps {
  match: { id: string }
  matchState: MatchSSEState | null
}

export function PresenterSelectJury({ match, matchState }: PresenterSelectJuryProps) {
  const inviteKey = matchState?.inviteKey ?? null
  const judges = matchState?.judges ?? []
  const connectedCount = judges.length

  // URL для QR-кода
  const inviteUrl = inviteKey
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/match/${match.id}/judge?key=${inviteKey}`
    : null

  return (
    <VStack gap={6} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="2xl" mb={1}>
          Подключение жюри
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {connectedCount} из 5 судей подключились
        </Text>
      </Box>

      {/* QR-код */}
      {inviteUrl
        ? (
          <Box bg="white" p={4} borderRadius="xl" borderWidth="2px" borderColor="border.muted" textAlign="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteUrl)}`}
              alt="QR-код для подключения судей"
              width={300}
              height={300}
              style={{ margin: '0 auto', display: 'block', maxWidth: '100%' }}
            />
            <Text fontSize="xs" color="fg.muted" mt={2} wordBreak="break-all">
              {inviteUrl}
            </Text>
          </Box>
        )
        : (
          <Box
            bg="bg.subtle"
            p={8}
            borderRadius="xl"
            textAlign="center"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="border.muted"
          >
            <Text color="fg.muted">QR-код появится когда скорер запустит матч</Text>
          </Box>
        )}

      {/* Список слотов судей */}
      <VStack gap={2} align="stretch">
        {[1, 2, 3, 4, 5].map((num) => {
          const judge = judges.find((j) => j.judgeNumber === num)
          return (
            <HStack
              key={num}
              p={3}
              borderRadius="md"
              bg={judge ? 'green.subtle' : 'bg.panel'}
              borderWidth="1px"
              borderColor={judge ? 'green.solid' : 'border.muted'}
              justify="space-between"
            >
              <HStack gap={2}>
                <Badge colorPalette={judge?.color ? (JUDGE_COLORS[judge.color] ?? 'gray') : 'gray'} size="md">
                  {num}
                </Badge>
                <Text fontSize="sm" fontWeight={judge ? 'medium' : 'normal'} color={judge ? 'fg' : 'fg.muted'}>
                  {judge ? judge.name || `Судья ${num}` : `Слот ${num} — ожидание`}
                </Text>
              </HStack>
              {judge && (
                <Badge colorPalette="green" size="sm">
                  ✓
                </Badge>
              )}
            </HStack>
          )
        })}
      </VStack>
    </VStack>
  )
}
