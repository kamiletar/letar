'use client'

import { Alert, Box, Button, Card, Heading, List, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

interface RisksConsentProps {
  onAccept: () => void
}

const RISKS = [
  {
    title: 'Брендинг писем',
    text: 'Письма верификации и сброса пароля уходят с домена letar.best, не с домена клиента. Клиент должен уведомить своих пользователей.',
  },
  {
    title: 'Общий OAuth-аккаунт',
    text: 'Все приложения используют одни Google/VK/GitHub OAuth credentials Ключницы. Бан аккаунта одного приложения заблокирует всех.',
  },
  {
    title: 'Смена user.id',
    text: 'Пользователи нового приложения получат ID из БД Ключницы, не из своей БД. Если у приложения уже есть пользователи — нужна миграция данных.',
  },
  {
    title: 'Обработка персональных данных',
    text: 'Ключница становится обработчиком ПДн пользователей клиентского приложения. Обязателен договор поручения обработки ПДн (152-ФЗ).',
  },
]

/** Экран рисков перед созданием OIDC-клиента. Показывается один раз. */
export function RisksConsent({ onAccept }: RisksConsentProps) {
  const [accepted, setAccepted] = useState(false)

  return (
    <Box maxW="2xl" mx="auto">
      <Card.Root borderColor="orange.500" borderWidth={1}>
        <Card.Header>
          <Heading size="md" color="orange.600">
            Перед созданием клиента — прочти риски
          </Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap={4}>
            <Alert.Root status="warning" borderRadius="md">
              <Alert.Indicator />
              <Alert.Description>
                Подключение нового приложения к Ключнице создаёт операционные и юридические зависимости. Убедись, что
                клиент понимает условия.
              </Alert.Description>
            </Alert.Root>

            <List.Root gap={3}>
              {RISKS.map((risk) => (
                <List.Item key={risk.title}>
                  <Stack gap={0.5}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {risk.title}
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                      {risk.text}
                    </Text>
                  </Stack>
                </List.Item>
              ))}
            </List.Root>

            <Box>
              <Button
                colorPalette="orange"
                onClick={() => {
                  setAccepted(true)
                  onAccept()
                }}
                disabled={accepted}
              >
                Понятно, продолжить
              </Button>
            </Box>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
