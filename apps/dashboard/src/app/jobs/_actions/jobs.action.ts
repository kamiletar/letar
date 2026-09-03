'use server'

import { applyDashboardJobOverride, runDashboardJobNow } from '@/jobs/scheduler'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function runJobNowAction(jobId: string) {
  await requireAdmin()
  await runDashboardJobNow(jobId)
  revalidatePath('/jobs')
}

export async function setJobEnabledAction(jobId: string, enabled: boolean) {
  await requireAdmin()
  const row = await prisma.jobOverride.upsert({
    where: { jobId },
    create: { jobId, enabled },
    update: { enabled },
  })
  await applyDashboardJobOverride(jobId, { schedule: row.schedule, enabled: row.enabled })
  revalidatePath('/jobs')
}
