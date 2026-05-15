import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/chats/unread-count
 * Получить количество непрочитанных сообщений для текущего пользователя
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Получаем все чаты пользователя с подсчетом непрочитанных сообщений
    const participations = await prisma.chatParticipant.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: {
        chatId: true,
        lastReadAt: true,
        chat: {
          select: {
            messages: {
              where: {
                authorId: { not: userId },
              },
              select: {
                createdAt: true,
              },
            },
          },
        },
      },
    })

    // Подсчитываем непрочитанные сообщения
    let totalUnread = 0

    for (const participation of participations) {
      const unreadCount = participation.chat.messages.filter((message: { createdAt: Date }) => {
        // Если lastReadAt null, все сообщения непрочитанные
        if (!participation.lastReadAt) {
          return true
        }
        // Иначе считаем сообщения после lastReadAt
        return message.createdAt > participation.lastReadAt
      }).length

      totalUnread += unreadCount
    }

    return NextResponse.json({ count: totalUnread })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
