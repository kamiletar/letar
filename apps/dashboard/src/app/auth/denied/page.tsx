'use client'

import { signOut } from '@/lib/auth-client'
import { Box, Button, Card, Heading, Stack, Text } from '@chakra-ui/react'
import { LuLogOut, LuShieldAlert } from 'react-icons/lu'

/**
 * Страница «Нет доступа» — для пользователей с ролью USER
 */
export default function DeniedPage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="bg" px={4}>
      <Card.Root maxW="md" w="full">
        <Card.Body>
          <Stack gap={4} align="center" textAlign="center">
            <LuShieldAlert size={48} color="var(--chakra-colors-fg-muted)" />
            <Heading size="lg">Нет доступа</Heading>
            <Text color="fg.muted">
              У вашего аккаунта нет прав для работы с дашбордом. Обратитесь к администратору для получения роли.
            </Text>
            <Button
              variant="outline"
              colorPalette="red"
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = '/auth/signin'
                    },
                  },
                })
              }
            >
              <LuLogOut />
              Выйти
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
