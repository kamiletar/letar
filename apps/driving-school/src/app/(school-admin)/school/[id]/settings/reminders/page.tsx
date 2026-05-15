/**
 * Страница настроек автоматических напоминаний (Фаза 18)
 *
 * /school/[id]/settings/reminders
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getReminderRulesAction } from './_actions/reminder-rules.action'
import { ReminderSettingsPageClient } from './_components/reminder-settings-page-client'

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Настройки напоминаний | Автошкола',
  description: 'Настройка автоматических напоминаний для учеников и сотрудников',
}

export default async function ReminderSettingsPage({ params }: Props) {
  const { id: organizationId } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверяем доступ к школе
  const membership = await prisma.member.findFirst({
    where: {
      organizationId,
      userId: session.user.id,
      role: { in: ['owner', 'super_manager'] },
    },
  })

  // Владелец платформы имеет доступ ко всем школам
  const isOwner = session.user.roles?.includes('OWNER')

  if (!membership && !isOwner) {
    redirect('/school')
  }

  // Получаем правила напоминаний
  const rulesResult = await getReminderRulesAction(organizationId)
  const rules = rulesResult.success ? rulesResult.rules : []

  return <ReminderSettingsPageClient organizationId={organizationId} rules={rules} />
}
