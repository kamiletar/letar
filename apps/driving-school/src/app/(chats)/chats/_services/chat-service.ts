/**
 * Сервис бизнес-логики чатов
 *
 * Содержит чистые функции для работы с чатами без Server Actions.
 * Может использоваться как в actions, так и в API routes.
 */

import { prisma } from '@/lib/db'

import type { ChatType, UserRole } from '@letar/driving-school-db/prisma'

// ============================================================================
// ТИПЫ
// ============================================================================

export interface ChatSummary {
  id: string
  type: ChatType
  name: string | null
  avatar: string | null
  lastMessageAt: Date | null
  unreadCount: number
  lastMessage: {
    content: string
    authorName: string | null
    createdAt: Date
  } | null
  // Для приватных чатов — инфо о собеседнике
  otherParticipant?: {
    id: string
    name: string | null
    image: string | null
    roles: UserRole[]
  }
}

export interface ChatMessage {
  id: string
  content: string
  authorId: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  replyTo: {
    id: string
    content: string
    authorName: string | null
  } | null
  reactions: Array<{
    emoji: string
    count: number
    hasReacted: boolean
  }>
  editedAt: Date | null
  createdAt: Date
}

export interface ChatDetails {
  id: string
  type: ChatType
  name: string | null
  avatar: string | null
  participants: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string | null
      image: string | null
      roles: UserRole[]
    }
    isAdmin: boolean
  }>
  messages: ChatMessage[]
  isMuted: boolean
}

export interface Contact {
  id: string
  name: string | null
  image: string | null
  roles: UserRole[]
}

// ============================================================================
// ПОЛУЧЕНИЕ СПИСКА ЧАТОВ
// ============================================================================

/**
 * Получает список чатов пользователя с последними сообщениями и счётчиком непрочитанных
 *
 * Оптимизировано: вместо N+1 запросов count для каждого чата,
 * используем один запрос с raw SQL для подсчёта непрочитанных сообщений.
 */
export async function getUserChats(userId: string): Promise<ChatSummary[]> {
  // Получаем все чаты, где пользователь участник
  const participations = await prisma.chatParticipant.findMany({
    where: {
      userId,
      leftAt: null,
    },
    include: {
      chat: {
        include: {
          participants: {
            where: { leftAt: null },
            include: {
              user: {
                select: { id: true, name: true, image: true, roles: true },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              author: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: {
      chat: { lastMessageAt: 'desc' },
    },
  })

  // Если нет чатов — возвращаем пустой массив
  if (participations.length === 0) {
    return []
  }

  // Подготавливаем данные для batch-запроса непрочитанных сообщений
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma сложный тип с include
  const chatIds = participations.map((p: any) => p.chat.id)

  // Один запрос для всех непрочитанных сообщений с учётом lastReadAt каждого чата
  // Используем groupBy с фильтрацией по OR условиям
  const unreadCounts = await prisma.chatMessage.groupBy({
    by: ['chatId'],
    where: {
      chatId: { in: chatIds },
      deletedAt: null,
      authorId: { not: userId },
    },
    _count: { id: true },
  })

  // Создаём Map для быстрого доступа: chatId -> общее количество сообщений от других
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma groupBy тип
  const totalMessagesMap = new Map<string, number>(unreadCounts.map((c: any) => [c.chatId, c._count.id]))

  // Для корректного подсчёта с учётом lastReadAt, нам нужно посчитать прочитанные сообщения
  // и вычесть их из общего количества
  // Собираем чаты с lastReadAt для отдельного запроса
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma тип
  const chatsWithLastRead = participations.filter((p: any) => p.lastReadAt !== null)

  const readMessagesMap = new Map<string, number>()

  if (chatsWithLastRead.length > 0) {
    // Запрос для подсчёта прочитанных сообщений (до lastReadAt) для каждого чата
    // Используем Promise.all с batch-запросами по чанкам для оптимизации
    const BATCH_SIZE = 10
    const batches: (typeof chatsWithLastRead)[] = []

    for (let i = 0; i < chatsWithLastRead.length; i += BATCH_SIZE) {
      batches.push(chatsWithLastRead.slice(i, i + BATCH_SIZE))
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        // Для каждого batch создаём один запрос с OR условиями
        // lastReadAt гарантированно не null, т.к. batch из chatsWithLastRead (отфильтровано выше)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma тип
        const orConditions = batch.map((p: any) => ({
          chatId: p.chat.id,

          createdAt: { lte: p.lastReadAt! },
          deletedAt: null,
          authorId: { not: userId },
        }))

        const readCounts = await prisma.chatMessage.groupBy({
          by: ['chatId'],
          where: { OR: orConditions },
          _count: { id: true },
        })

        return readCounts
      })
    )

    // Объединяем результаты
    for (const batchResult of batchResults) {
      for (const item of batchResult) {
        readMessagesMap.set(item.chatId, item._count.id)
      }
    }
  }

  // Формируем результат
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma сложный тип с include
  const chats: ChatSummary[] = participations.map((p: any) => {
    const chat = p.chat
    const lastMsg = chat.messages[0]

    // Вычисляем непрочитанные: общее количество - прочитанные
    const totalFromOthers = totalMessagesMap.get(chat.id) || 0
    const readCount = p.lastReadAt ? readMessagesMap.get(chat.id) || 0 : 0
    const unreadCount = Math.max(0, totalFromOthers - readCount)

    // Для приватных чатов находим собеседника
    let otherParticipant: ChatSummary['otherParticipant']
    if (chat.type === 'PRIVATE') {
      // Тип участника чата из include в prisma запросе
      type ChatParticipant = {
        userId: string
        user: {
          id: string
          name: string | null
          image: string | null
          roles: UserRole[]
        }
      }
      const other = chat.participants.find((pp: ChatParticipant) => pp.userId !== userId)
      if (other) {
        otherParticipant = {
          id: other.user.id,
          name: other.user.name,
          image: other.user.image,
          roles: other.user.roles,
        }
      }
    }

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      avatar: chat.avatar,
      lastMessageAt: chat.lastMessageAt,
      unreadCount,
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            authorName: lastMsg.author.name,
            createdAt: lastMsg.createdAt,
          }
        : null,
      otherParticipant,
    }
  })

  return chats
}

// ============================================================================
// ПОЛУЧЕНИЕ ЧАТА С СООБЩЕНИЯМИ
// ============================================================================

/**
 * Получает детали чата с сообщениями
 * @returns null если пользователь не участник или чат не найден
 */
export async function getChatDetails(chatId: string, userId: string): Promise<ChatDetails | null> {
  // Проверяем, что пользователь участник
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId, userId },
    },
  })

  if (!participation || participation.leftAt) {
    return null
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: { id: true, name: true, image: true, roles: true },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              author: { select: { name: true } },
            },
          },
          reactions: true,
        },
      },
    },
  })

  if (!chat) {
    return null
  }

  // Формируем сообщения с агрегированными реакциями
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma сложный тип
  const messages: ChatMessage[] = chat.messages.reverse().map((msg: any) => {
    // Группируем реакции по эмодзи
    const reactionsMap = new Map<string, { count: number; hasReacted: boolean }>()
    for (const r of msg.reactions) {
      const existing = reactionsMap.get(r.emoji) || { count: 0, hasReacted: false }
      existing.count++
      if (r.userId === userId) {
        existing.hasReacted = true
      }
      reactionsMap.set(r.emoji, existing)
    }

    return {
      id: msg.id,
      content: msg.content,
      authorId: msg.authorId,
      author: msg.author,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            content: msg.replyTo.content.slice(0, 100),
            authorName: msg.replyTo.author.name,
          }
        : null,
      reactions: Array.from(reactionsMap.entries()).map(([emoji, data]) => ({
        emoji,
        ...data,
      })),
      editedAt: msg.editedAt,
      createdAt: msg.createdAt,
    }
  })

  return {
    id: chat.id,
    type: chat.type,
    name: chat.name,
    avatar: chat.avatar,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma сложный тип
    participants: chat.participants.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      user: p.user,
      isAdmin: p.isAdmin,
    })),
    messages,
    isMuted: participation.isMuted,
  }
}

// ============================================================================
// СОЗДАНИЕ/ПОЛУЧЕНИЕ ПРИВАТНОГО ЧАТА
// ============================================================================

/**
 * Получает или создаёт приватный чат между двумя пользователями
 */
export async function getOrCreatePrivateChat(userId: string, participantId: string): Promise<string> {
  if (participantId === userId) {
    throw new Error('CANNOT_CHAT_WITH_SELF')
  }

  // Ищем существующий приватный чат
  const existingParticipation = await prisma.chatParticipant.findFirst({
    where: {
      userId,
      leftAt: null,
      chat: {
        type: 'PRIVATE',
        participants: {
          some: {
            userId: participantId,
            leftAt: null,
          },
        },
      },
    },
    include: {
      chat: {
        include: {
          participants: { where: { leftAt: null } },
        },
      },
    },
  })

  if (existingParticipation && existingParticipation.chat.participants.length === 2) {
    return existingParticipation.chat.id
  }

  // Создаём новый чат
  const chat = await prisma.chat.create({
    data: {
      type: 'PRIVATE',
      participants: {
        create: [{ userId }, { userId: participantId }],
      },
    },
  })

  return chat.id
}

// ============================================================================
// СИСТЕМНЫЕ ЧАТЫ
// ============================================================================

/**
 * Получает или создаёт системный чат (INSTRUCTORS, STUDENTS, GENERAL)
 */
export async function getOrCreateSystemChat(
  userId: string,
  type: 'INSTRUCTORS' | 'STUDENTS' | 'GENERAL',
  hasInstructorProfile: boolean,
  hasStudentProfile: boolean
): Promise<string> {
  // Проверяем доступ
  if (type === 'INSTRUCTORS' && !hasInstructorProfile) {
    throw new Error('FORBIDDEN')
  }
  if (type === 'STUDENTS' && !hasStudentProfile) {
    throw new Error('FORBIDDEN')
  }

  // Ищем существующий системный чат
  let chat = await prisma.chat.findFirst({
    where: { type },
  })

  if (!chat) {
    // Создаём системный чат
    const chatName = type === 'INSTRUCTORS' ? 'Чат инструкторов' : type === 'STUDENTS' ? 'Чат учеников' : 'Общий чат'

    chat = await prisma.chat.create({
      data: {
        type,
        name: chatName,
      },
    })
  }

  // Проверяем, что пользователь участник
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: chat.id, userId },
    },
  })

  if (!participation) {
    // Добавляем пользователя как участника
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
      },
    })
  } else if (participation.leftAt) {
    // Восстанавливаем участие
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: null },
    })
  }

  return chat.id
}

// ============================================================================
// ЧАТ ШКОЛЫ
// ============================================================================

/**
 * Получает или создаёт чат школы
 */
export async function getOrCreateSchoolChat(userId: string, organizationId: string): Promise<string> {
  // Проверяем, что пользователь член организации
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  })

  if (!membership) {
    throw new Error('FORBIDDEN')
  }

  // Ищем чат школы
  let chat = await prisma.chat.findFirst({
    where: {
      type: 'SCHOOL',
      organizationId,
    },
  })

  if (!chat) {
    // Создаём чат школы
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    chat = await prisma.chat.create({
      data: {
        type: 'SCHOOL',
        organizationId,
        name: `Чат: ${organization?.name || 'Школа'}`,
      },
    })
  }

  // Проверяем/добавляем участие
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: chat.id, userId },
    },
  })

  if (!participation) {
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: membership.role === 'ADMIN',
      },
    })
  } else if (participation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: null },
    })
  }

  return chat.id
}

// ============================================================================
// ЧАТ УЧЕБНОЙ ГРУППЫ
// ============================================================================

/**
 * Получает или создаёт чат учебной группы
 */
export async function getOrCreateStudyGroupChat(userId: string, studyGroupId: string): Promise<string> {
  // Проверяем учебную группу
  const studyGroup = await prisma.studyGroup.findUnique({
    where: { id: studyGroupId },
    include: {
      members: {
        where: { leftAt: null },
        select: { userId: true },
      },
      organization: {
        include: {
          members: {
            where: {
              role: { in: ['owner', 'theory_instructor'] },
            },
            select: { userId: true },
          },
        },
      },
    },
  })

  if (!studyGroup) {
    throw new Error('NOT_FOUND')
  }

  // Проверяем, что пользователь член группы или инструктор/админ школы
  // Тип члена группы из select в prisma запросе
  type GroupMember = { userId: string }
  const isStudent = studyGroup.members.some((m: GroupMember) => m.userId === userId)
  const isOrgStaff = studyGroup.organization.members.some((m: GroupMember) => m.userId === userId)

  if (!isStudent && !isOrgStaff) {
    throw new Error('FORBIDDEN')
  }

  // Ищем чат группы
  let chat = await prisma.chat.findFirst({
    where: {
      type: 'STUDY_GROUP',
      studyGroupId,
    },
  })

  if (!chat) {
    // Создаём чат группы
    const newChat = await prisma.chat.create({
      data: {
        type: 'STUDY_GROUP',
        studyGroupId,
        name: `Группа: ${studyGroup.name}`,
      },
    })
    chat = newChat

    // Добавляем всех участников группы
    // Тип члена группы из select в prisma запросе
    type GroupMember = { userId: string }
    const memberUserIds = studyGroup.members.map((m: GroupMember) => m.userId)
    const staffUserIds = studyGroup.organization.members.map((m: GroupMember) => m.userId)
    const allUserIds = [...new Set([...memberUserIds, ...staffUserIds])]

    await prisma.chatParticipant.createMany({
      data: allUserIds.map((uid) => ({
        chatId: newChat.id,
        userId: uid,
        isAdmin: staffUserIds.includes(uid),
      })),
      skipDuplicates: true,
    })
  }

  // Проверяем/добавляем участие текущего пользователя
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: chat.id, userId },
    },
  })

  if (!participation) {
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: isOrgStaff,
      },
    })
  } else if (participation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: null },
    })
  }

  return chat.id
}

// ============================================================================
// ЧАТ ИНСТРУКТОРА С УЧЕНИКАМИ
// ============================================================================

/**
 * Получает или создаёт чат инструктора с учениками
 * @param organizationId - ID организации (для школьного инструктора) или undefined (для фрилансера)
 */
export async function getOrCreateInstructorStudentsChat(
  userId: string,
  userRoles: UserRole[],
  organizationId?: string
): Promise<string> {
  const isFreelance = userRoles.includes('FREELANCE_INSTRUCTOR')

  // Для школьного инструктора проверяем членство
  let isOrgInstructor = false
  if (organizationId) {
    const membership = await prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })
    isOrgInstructor = membership?.role === 'instructor'
  }

  if (!isFreelance && !isOrgInstructor) {
    throw new Error('FORBIDDEN')
  }

  const isFreelanceChat = !organizationId

  // Ищем существующий чат
  let chat = await prisma.chat.findFirst({
    where: {
      type: 'INSTRUCTOR_STUDENTS',
      instructorId: userId,
      ...(isFreelanceChat ? { isFreelanceChat: true } : { organizationId, isFreelanceChat: false }),
    },
  })

  if (!chat) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    const chatName = isFreelanceChat
      ? `Ученики: ${user?.name || 'Инструктор'}`
      : `Ученики в школе: ${user?.name || 'Инструктор'}`

    chat = await prisma.chat.create({
      data: {
        type: 'INSTRUCTOR_STUDENTS',
        name: chatName,
        instructorId: userId,
        isFreelanceChat,
        organizationId: isFreelanceChat ? null : organizationId,
      },
    })

    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: true,
      },
    })
  } else {
    // Проверяем/восстанавливаем участие инструктора
    const participation = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: chat.id, userId } },
    })

    if (!participation) {
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId,
          isAdmin: true,
        },
      })
    } else if (participation.leftAt) {
      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { leftAt: null },
      })
    }
  }

  return chat.id
}

/**
 * Добавляет ученика в чат инструктора
 */
export async function addStudentToInstructorChat(
  instructorUserId: string,
  studentUserId: string,
  organizationId?: string
): Promise<void> {
  const isFreelanceChat = !organizationId

  let chat = await prisma.chat.findFirst({
    where: {
      type: 'INSTRUCTOR_STUDENTS',
      instructorId: instructorUserId,
      ...(isFreelanceChat ? { isFreelanceChat: true } : { organizationId, isFreelanceChat: false }),
    },
  })

  if (!chat) {
    const instructor = await prisma.user.findUnique({
      where: { id: instructorUserId },
      select: { name: true },
    })

    const chatName = isFreelanceChat
      ? `Ученики: ${instructor?.name || 'Инструктор'}`
      : `Ученики в школе: ${instructor?.name || 'Инструктор'}`

    chat = await prisma.chat.create({
      data: {
        type: 'INSTRUCTOR_STUDENTS',
        name: chatName,
        instructorId: instructorUserId,
        isFreelanceChat,
        organizationId: isFreelanceChat ? null : organizationId,
      },
    })

    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId: instructorUserId,
        isAdmin: true,
      },
    })
  }

  // Проверяем/добавляем ученика
  const studentParticipation = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId: chat.id, userId: studentUserId } },
  })

  if (!studentParticipation) {
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId: studentUserId,
        isAdmin: false,
      },
    })
  } else if (studentParticipation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: studentParticipation.id },
      data: { leftAt: null },
    })
  }
}

/**
 * Удаляет ученика из чата инструктора (мягкое удаление)
 */
export async function removeStudentFromInstructorChat(
  instructorUserId: string,
  studentUserId: string,
  organizationId?: string
): Promise<void> {
  const isFreelanceChat = !organizationId

  const chat = await prisma.chat.findFirst({
    where: {
      type: 'INSTRUCTOR_STUDENTS',
      instructorId: instructorUserId,
      ...(isFreelanceChat ? { isFreelanceChat: true } : { organizationId, isFreelanceChat: false }),
    },
  })

  if (!chat) {
    return // Чата нет — ничего делать не нужно
  }

  const participation = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId: chat.id, userId: studentUserId } },
  })

  if (participation && !participation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: new Date() },
    })
  }
}

// ============================================================================
// КОНТАКТЫ
// ============================================================================

/**
 * Получает контакты пользователя для создания чата
 */
export async function getUserContacts(
  userId: string,
  hasStudentProfile: boolean,
  hasInstructorProfile: boolean
): Promise<Contact[]> {
  const contacts: Contact[] = []

  if (hasStudentProfile) {
    // Ученик видит своих инструкторов
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        instructorConnections: {
          where: { status: 'ACTIVE' },
          include: {
            instructor: {
              include: {
                user: {
                  select: { id: true, name: true, image: true, roles: true },
                },
              },
            },
          },
        },
      },
    })

    if (student) {
      for (const c of student.instructorConnections) {
        contacts.push({
          id: c.instructor.user.id,
          name: c.instructor.user.name,
          image: c.instructor.user.image,
          roles: c.instructor.user.roles,
        })
      }
    }
  }

  if (hasInstructorProfile) {
    // Инструктор видит своих учеников
    const instructor = await prisma.instructorProfile.findUnique({
      where: { userId },
      include: {
        studentConnections: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true, image: true, roles: true },
                },
              },
            },
          },
        },
      },
    })

    if (instructor) {
      for (const c of instructor.studentConnections) {
        if (!contacts.some((contact) => contact.id === c.student.user.id)) {
          contacts.push({
            id: c.student.user.id,
            name: c.student.user.name,
            image: c.student.user.image,
            roles: c.student.user.roles,
          })
        }
      }
    }
  }

  // Также добавляем коллег из организации
  const orgMemberships = await prisma.member.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId: { not: userId } },
            include: {
              user: {
                select: { id: true, name: true, image: true, roles: true },
              },
            },
          },
        },
      },
    },
  })

  for (const membership of orgMemberships) {
    for (const member of membership.organization.members) {
      if (!contacts.some((c) => c.id === member.user.id)) {
        contacts.push({
          id: member.user.id,
          name: member.user.name,
          image: member.user.image,
          roles: member.user.roles,
        })
      }
    }
  }

  return contacts
}

// ============================================================================
// НАСТРОЙКИ ЧАТА
// ============================================================================

/**
 * Обновляет настройки чата (mute)
 */
export async function updateChatSettings(chatId: string, userId: string, isMuted: boolean): Promise<void> {
  await prisma.chatParticipant.update({
    where: {
      chatId_userId: { chatId, userId },
    },
    data: { isMuted },
  })
}

/**
 * Отмечает чат как прочитанный
 */
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  await prisma.chatParticipant.update({
    where: {
      chatId_userId: { chatId, userId },
    },
    data: { lastReadAt: new Date() },
  })
}

// ============================================================================
// ПЛАТФОРМЕННЫЕ ЧАТЫ
// ============================================================================

/**
 * Получает или создаёт общий канал PLATFORM_FEEDBACK
 */
export async function getOrCreatePlatformFeedbackChat(userId: string, isOwner: boolean): Promise<string> {
  // Ищем существующий чат PLATFORM_FEEDBACK (singleton)
  let chat = await prisma.chat.findFirst({
    where: { type: 'PLATFORM_FEEDBACK' },
  })

  if (!chat) {
    // Создаём чат
    chat = await prisma.chat.create({
      data: {
        type: 'PLATFORM_FEEDBACK',
        name: 'Обратная связь с платформой',
      },
    })
  }

  // Проверяем/добавляем участие
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: chat.id, userId },
    },
  })

  if (!participation) {
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: isOwner,
      },
    })
  } else if (participation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: null },
    })
  }

  return chat.id
}

/**
 * Получает или создаёт приватный чат школы с поддержкой платформы
 */
export async function getOrCreatePlatformSupportChat(
  userId: string,
  organizationId: string,
  isOwner: boolean
): Promise<string> {
  // Получаем информацию о школе
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  })

  if (!organization) {
    throw new Error('ORGANIZATION_NOT_FOUND')
  }

  // Ищем существующий чат PLATFORM_SUPPORT для этой школы
  let chat = await prisma.chat.findFirst({
    where: {
      type: 'PLATFORM_SUPPORT',
      organizationId,
    },
  })

  if (!chat) {
    // Создаём чат
    chat = await prisma.chat.create({
      data: {
        type: 'PLATFORM_SUPPORT',
        organizationId,
        name: `Поддержка: ${organization.name}`,
      },
    })

    // Автоматически добавляем всех OWNER платформы
    const owners = await prisma.user.findMany({
      where: {
        roles: { has: 'OWNER' },
      },
      select: { id: true },
    })

    if (owners.length > 0) {
      await prisma.chatParticipant.createMany({
        data: owners.map((owner: { id: string }) => ({
          chatId: chat!.id,
          userId: owner.id,
          isAdmin: true,
        })),
        skipDuplicates: true,
      })
    }
  }

  // Проверяем/добавляем участие текущего пользователя
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: chat.id, userId },
    },
  })

  if (!participation) {
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: isOwner,
      },
    })
  } else if (participation.leftAt) {
    await prisma.chatParticipant.update({
      where: { id: participation.id },
      data: { leftAt: null },
    })
  }

  return chat.id
}

/**
 * Получает или создаёт чат школы с учеником
 */
export async function getOrCreateSchoolStudentChat(
  userId: string,
  organizationId: string,
  studentUserId: string,
  isAdminUser: boolean
): Promise<string> {
  // Получаем информацию о школе и ученике
  const [organization, student] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: studentUserId },
      select: { name: true },
    }),
  ])

  if (!organization) {
    throw new Error('ORGANIZATION_NOT_FOUND')
  }

  if (!student) {
    throw new Error('STUDENT_NOT_FOUND')
  }

  // Ищем существующий чат SCHOOL_STUDENT для пары школа+ученик
  let chat = await prisma.chat.findFirst({
    where: {
      type: 'SCHOOL_STUDENT',
      organizationId,
      studentUserId,
    },
  })

  if (!chat) {
    // Создаём чат
    chat = await prisma.chat.create({
      data: {
        type: 'SCHOOL_STUDENT',
        organizationId,
        studentUserId,
        name: `${organization.name} → ${student.name || 'Ученик'}`,
      },
    })

    // Добавляем ученика как участника
    await prisma.chatParticipant.create({
      data: {
        chatId: chat.id,
        userId: studentUserId,
        isAdmin: false,
      },
    })
  }

  // Проверяем/добавляем участие текущего пользователя (если это менеджер)
  if (userId !== studentUserId) {
    const participation = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId: chat.id, userId },
      },
    })

    if (!participation) {
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId,
          isAdmin: isAdminUser,
        },
      })
    } else if (participation.leftAt) {
      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { leftAt: null },
      })
    }
  }

  return chat.id
}
