'use client'

/**
 * Модальный выбор ведущего / счетовода.
 * Показывает частых (кто уже был) + поиск по имени/email.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { assignMatchStaffAction, searchStaffUsersAction } from '@/app/admin/matches/_actions/match-admin.action'
import { Badge, Box, Button, Dialog, Flex, HStack, Input, Portal, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { LuSearch, LuUser, LuX } from 'react-icons/lu'

interface StaffUser {
  id: string
  name: string | null
  email: string
}

interface StaffPickerProps {
  matchId: string
  field: 'scorerUserId' | 'presenterUserId'
  currentUser: { id: string; name: string | null } | null
}

export function StaffPicker({ matchId, field, currentUser }: StaffPickerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [frequent, setFrequent] = useState<StaffUser[]>([])
  const [results, setResults] = useState<StaffUser[]>([])
  const [loading, startLoading] = useTransition()
  const [assigning, startAssigning] = useTransition()

  const role = field === 'presenterUserId' ? 'presenter' : 'scorer'

  // Загрузка частых при открытии
  useEffect(() => {
    if (!open) return
    startLoading(async () => {
      const res = await searchStaffUsersAction('', role)
      if ('data' in res && res.data) {
        setFrequent(res.data.frequent)
        setResults([])
      }
    })
  }, [open, role])

  // Поиск с debounce
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim().length < 2) {
        setResults([])
        return
      }
      startLoading(async () => {
        const res = await searchStaffUsersAction(value, role)
        if ('data' in res && res.data) {
          setResults(res.data.results)
        }
      })
    },
    [role]
  )

  const handleSelect = (userId: string | null) => {
    startAssigning(async () => {
      const result = await assignMatchStaffAction({ matchId, [field]: userId })
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const displayName = currentUser?.name ?? '—'
  const showFrequent = query.trim().length < 2 && frequent.length > 0
  const showResults = query.trim().length >= 2

  return (
    <>
      <Button
        size="xs"
        variant={currentUser ? 'subtle' : 'outline'}
        onClick={() => setOpen(true)}
        maxW="160px"
        truncate
      >
        <LuUser />
        <Text truncate>{displayName}</Text>
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="center">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="440px">
              <Dialog.Header>
                <Dialog.Title>{field === 'presenterUserId' ? 'Выбор ведущего' : 'Выбор счетовода'}</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <Button variant="ghost" size="sm" position="absolute" top={2} right={2}>
                    <LuX />
                  </Button>
                </Dialog.CloseTrigger>
              </Dialog.Header>

              <Dialog.Body>
                <VStack gap={3} align="stretch">
                  {/* Поиск */}
                  <HStack>
                    <LuSearch />
                    <Input
                      placeholder="Поиск по имени или email..."
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      size="sm"
                      autoFocus
                    />
                  </HStack>

                  {/* Убрать текущего */}
                  {currentUser && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => handleSelect(null)}
                      loading={assigning}
                    >
                      <LuX />
                      Убрать {field === 'presenterUserId' ? 'ведущего' : 'счетовода'}
                    </Button>
                  )}

                  {/* Частые */}
                  {showFrequent && (
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={2}>
                        Назначались ранее:
                      </Text>
                      <VStack gap={1} align="stretch">
                        {frequent.map((u) => (
                          <UserRow
                            key={u.id}
                            user={u}
                            isActive={u.id === currentUser?.id}
                            loading={assigning}
                            onSelect={() => handleSelect(u.id)}
                          />
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* Результаты поиска */}
                  {showResults && (
                    <Box>
                      <Text fontSize="xs" color="fg.muted" mb={2}>
                        {loading ? 'Поиск...' : `Найдено: ${results.length}`}
                      </Text>
                      <VStack gap={1} align="stretch">
                        {results.map((u) => (
                          <UserRow
                            key={u.id}
                            user={u}
                            isActive={u.id === currentUser?.id}
                            loading={assigning}
                            onSelect={() => handleSelect(u.id)}
                          />
                        ))}
                        {!loading && results.length === 0 && (
                          <Text fontSize="sm" color="fg.muted" textAlign="center" py={2}>
                            Никого не найдено
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  )}

                  {/* Подсказка */}
                  {!showFrequent && !showResults && (
                    <Text fontSize="sm" color="fg.muted" textAlign="center" py={4}>
                      Введите минимум 2 символа для поиска
                    </Text>
                  )}
                </VStack>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}

function UserRow({
  user,
  isActive,
  loading,
  onSelect,
}: {
  user: StaffUser
  isActive: boolean
  loading: boolean
  onSelect: () => void
}) {
  return (
    <Flex
      align="center"
      gap={2}
      px={3}
      py={2}
      borderRadius="md"
      bg={isActive ? 'brand.subtle' : 'transparent'}
      _hover={{ bg: isActive ? 'brand.subtle' : 'bg.subtle' }}
      cursor="pointer"
      onClick={loading ? undefined : onSelect}
      opacity={loading ? 0.5 : 1}
    >
      <LuUser size={14} />
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'} truncate>
          {user.name ?? 'Без имени'}
        </Text>
        <Text fontSize="xs" color="fg.muted" truncate>
          {user.email}
        </Text>
      </Box>
      {isActive && (
        <Badge size="xs" colorPalette="green">
          Текущий
        </Badge>
      )}
    </Flex>
  )
}
