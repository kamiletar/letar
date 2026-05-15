'use client'

import { Badge, Button, Card, Collapsible, Heading, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { LuChevronDown, LuPlay } from 'react-icons/lu'

/** Тестовые коды маркировки для симуляции */
export const SAMPLE_CODES = ['01029004884898622157E7kj>y4(qSm 91EE10 92d/qKOY233wKHeaSakk2J/iQxJ8mKtZ8EUEPCvDqAKIY=']

/** Пропсы компонента MockScannerPanel */
export interface MockScannerPanelProps {
  /** Текущее значение ввода */
  mockCode: string
  /** Callback изменения значения */
  onMockCodeChange: (value: string) => void
  /** Callback симуляции сканирования */
  onMockScan: () => void
  /** Callback сканирования случайного кода */
  onRandomScan: () => void
  /** Callback сканирования конкретного кода */
  onScanCode: (code: string) => void
  /** Открыта ли панель */
  isOpen: boolean
  /** Callback изменения открытия */
  onOpenChange: (open: boolean) => void
}

/**
 * Панель симуляции сканера
 * Позволяет тестировать без физического сканера
 */
export function MockScannerPanel({
  mockCode,
  onMockCodeChange,
  onMockScan,
  onRandomScan,
  onScanCode,
  isOpen,
  onOpenChange,
}: MockScannerPanelProps) {
  return (
    <Collapsible.Root open={isOpen} onOpenChange={(e) => onOpenChange(e.open)}>
      <Card.Root borderColor="orange.500" borderWidth="1px">
        <Card.Header py={3} cursor="pointer">
          <Collapsible.Trigger asChild>
            <HStack justify="space-between" w="full">
              <HStack gap={2}>
                <Badge colorPalette="orange">DEV</Badge>
                <Heading size="sm">Симуляция сканера</Heading>
              </HStack>
              <Icon transition="transform 0.2s" transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}>
                <LuChevronDown />
              </Icon>
            </HStack>
          </Collapsible.Trigger>
        </Card.Header>
        <Collapsible.Content>
          <Card.Body pt={0}>
            <VStack gap={4} align="stretch">
              <Text fontSize="sm" color="fg.muted">
                Используйте эту панель для тестирования без физического сканера
              </Text>

              <HStack gap={2}>
                <Input
                  flex={1}
                  placeholder="Введите код маркировки..."
                  value={mockCode}
                  onChange={(e) => onMockCodeChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onMockScan()}
                  fontFamily="mono"
                  fontSize="sm"
                />
                <Button colorPalette="blue" onClick={onMockScan} disabled={!mockCode.trim()}>
                  <LuPlay />
                  Сканировать
                </Button>
              </HStack>

              <HStack gap={2} wrap="wrap">
                <Button size="sm" variant="outline" onClick={onRandomScan}>
                  Случайный код
                </Button>
                {SAMPLE_CODES.slice(0, 2).map((code, i) => (
                  <Button key={i} size="sm" variant="ghost" onClick={() => onScanCode(code)} fontFamily="mono">
                    {code.substring(2, 16)}...
                  </Button>
                ))}
              </HStack>
            </VStack>
          </Card.Body>
        </Collapsible.Content>
      </Card.Root>
    </Collapsible.Root>
  )
}
