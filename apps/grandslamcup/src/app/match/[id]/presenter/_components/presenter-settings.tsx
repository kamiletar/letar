'use client'

/**
 * Настройки ведущего: жеребьёвка и toggle отвода судьи.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Flex, HStack, Switch, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuDices, LuShieldOff } from 'react-icons/lu'
import { coinFlipAction, toggleJudgeRecusalAction } from '../_actions/presenter.action'

interface PresenterSettingsProps {
  matchId: string
  judgeRecusalAllowed: boolean
}

export function PresenterSettings({ matchId, judgeRecusalAllowed }: PresenterSettingsProps) {
  const [recusalAllowed, setRecusalAllowed] = useState(judgeRecusalAllowed)
  const [flipping, setFlipping] = useState(false)
  const [flipResult, setFlipResult] = useState<string | null>(null)

  const handleRecusalToggle = async () => {
    const next = !recusalAllowed
    setRecusalAllowed(next)
    const result = await toggleJudgeRecusalAction(matchId, next)
    if (!result.success) {
      setRecusalAllowed(!next)
      toaster.error({ title: result.error ?? 'Ошибка' })
    }
  }

  const handleCoinFlip = async () => {
    setFlipping(true)
    setFlipResult(null)
    // Имитация анимации
    await new Promise((r) => setTimeout(r, 800))
    const result = await coinFlipAction(matchId)
    setFlipping(false)
    if (result.success) {
      setFlipResult(result.startingTeam ?? null)
      toaster.success({ title: `Начинает: ${result.startingTeam}` })
    } else {
      toaster.error({ title: result.error ?? 'Ошибка' })
    }
  }

  return (
    <VStack gap={3} w="full" align="stretch">
      {/* Жеребьёвка */}
      <Flex
        align="center"
        justify="space-between"
        p={3}
        bg="bg.subtle"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
      >
        <HStack gap={2}>
          <LuDices size={18} />
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              Жеребьёвка
            </Text>
            {flipResult && (
              <Badge colorPalette="green" size="sm">
                {flipResult}
              </Badge>
            )}
          </Box>
        </HStack>
        <Button size="sm" colorPalette="blue" variant="outline" onClick={handleCoinFlip} loading={flipping}>
          Подбросить
        </Button>
      </Flex>

      {/* Отвод судьи */}
      <Flex
        align="center"
        justify="space-between"
        p={3}
        bg="bg.subtle"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
      >
        <HStack gap={2}>
          <LuShieldOff size={18} />
          <Text fontSize="sm" fontWeight="medium">
            Отвод судьи
          </Text>
        </HStack>
        <Switch.Root checked={recusalAllowed} onCheckedChange={handleRecusalToggle}>
          <Switch.HiddenInput />
          <Switch.Control />
        </Switch.Root>
      </Flex>
    </VStack>
  )
}
