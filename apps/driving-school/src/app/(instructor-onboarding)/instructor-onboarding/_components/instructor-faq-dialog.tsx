'use client'

import {
  Accordion,
  Box,
  Button,
  CloseButton,
  Dialog,
  Heading,
  HStack,
  Icon,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import { LuCircleHelp, LuMessageCircleQuestion } from 'react-icons/lu'

// FAQ данные для новых инструкторов
const FAQ_ITEMS = [
  {
    question: 'Как меня найдут ученики?',
    answer:
      'После настройки профиля вы появитесь в каталоге инструкторов. Ученики смогут найти вас по городу, району, марке автомобиля, типу КПП и категориям прав. Чем полнее ваш профиль, тем выше вы в результатах поиска.',
  },
  {
    question: 'Как работает бронирование занятий?',
    answer:
      'Вы настраиваете расписание — дни и часы работы. Система автоматически создаёт слоты для записи. Ученики выбирают удобное время и отправляют заявку. Вы подтверждаете или отклоняете заявку, после чего занятие появляется в вашем календаре.',
  },
  {
    question: 'Как получить оплату за занятия?',
    answer:
      'Оплата происходит напрямую между вами и учеником. Вы устанавливаете цену за занятие в профиле. Мы не берём комиссию с ваших заработков. Способ оплаты (наличные, перевод) вы согласуете с учеником самостоятельно.',
  },
  {
    question: 'Могу ли я работать и в школе, и самостоятельно?',
    answer:
      'Да! Вы можете быть инструктором автошколы и одновременно принимать частных учеников. В профиле можно указать оба режима работы. При записи ученик увидит, что вы работаете и в школе, и индивидуально.',
  },
  {
    question: 'Как изменить расписание или цены?',
    answer:
      'После завершения настройки профиля вы сможете изменить любые данные в личном кабинете: раздел "Мой профиль" для личных данных и автомобиля, "Расписание" для настройки слотов и выходных, "Типы занятий" для цен.',
  },
  {
    question: 'Что делать, если ученик не пришёл?',
    answer:
      'Вы можете отметить занятие как "Неявка" в календаре. Система ведёт статистику посещаемости учеников. При частых неявках вы можете отказать ученику в бронировании или потребовать предоплату.',
  },
  {
    question: 'Как отменить занятие?',
    answer:
      'В разделе "Мои занятия" найдите нужное занятие и нажмите "Отменить". Ученик получит уведомление об отмене. Мы рекомендуем отменять занятия заранее (минимум за 2 часа), чтобы ученик успел перепланировать.',
  },
  {
    question: 'Могу ли я пропустить настройку профиля?',
    answer:
      'Да, вы можете пропустить онбординг и вернуться к нему позже. Однако без заполненного профиля ученики не смогут вас найти в каталоге. Мы рекомендуем заполнить хотя бы основную информацию и автомобиль.',
  },
]

interface InstructorFaqDialogProps {
  /** Вариант отображения кнопки */
  variant?: 'icon' | 'button' | 'link'
  /** Размер кнопки */
  size?: 'sm' | 'md' | 'lg'
}

export function InstructorFaqDialog({ variant = 'icon', size = 'md' }: InstructorFaqDialogProps) {
  const [open, setOpen] = useState(false)

  const triggerButton = (() => {
    switch (variant) {
      case 'icon':
        return (
          <Button variant="ghost" size={size} aria-label="Помощь">
            <LuCircleHelp />
          </Button>
        )
      case 'button':
        return (
          <Button variant="outline" size={size} colorPalette="brand">
            <LuMessageCircleQuestion />
            Нужна помощь?
          </Button>
        )
      case 'link':
        return (
          <Button variant="plain" size={size} color="fg.muted">
            <LuCircleHelp />
            Частые вопросы
          </Button>
        )
    }
  })()

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)} size="lg">
      <Dialog.Trigger asChild>{triggerButton}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="80vh" overflow="hidden" display="flex" flexDirection="column">
            <Dialog.Header>
              <HStack justify="space-between">
                <VStack align="start" gap={1}>
                  <Dialog.Title>
                    <Heading size="lg">Частые вопросы</Heading>
                  </Dialog.Title>
                  <Text color="fg.muted" fontSize="sm">
                    Ответы на популярные вопросы новых инструкторов
                  </Text>
                </VStack>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </HStack>
            </Dialog.Header>

            <Dialog.Body overflowY="auto" flex={1}>
              <Accordion.Root collapsible defaultValue={[FAQ_ITEMS[0].question]}>
                {FAQ_ITEMS.map((item) => (
                  <Accordion.Item key={item.question} value={item.question}>
                    <Accordion.ItemTrigger>
                      <HStack flex={1} textAlign="left">
                        <Icon color="brand.500">
                          <LuMessageCircleQuestion />
                        </Icon>
                        <Box flex={1}>{item.question}</Box>
                      </HStack>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <Accordion.ItemBody>
                        <Text color="fg.muted" lineHeight="tall">
                          {item.answer}
                        </Text>
                      </Accordion.ItemBody>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Dialog.Body>

            <Dialog.Footer>
              <Text fontSize="sm" color="fg.muted">
                Не нашли ответ?{' '}
                <Button variant="plain" size="sm" color="brand.500" asChild>
                  <Link href="/support/new">Напишите в поддержку</Link>
                </Button>
              </Text>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
