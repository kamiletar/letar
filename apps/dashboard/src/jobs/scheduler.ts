import { prisma } from '@/lib/db'
import { createAppJobsModule } from '@letar/jobs'
import { jobs } from './index'

const dashboardJobs = createAppJobsModule({ cacheKey: 'dashboard', jobs, prisma })

export const startDashboardJobs = dashboardJobs.start
export const getDashboardJobStatuses = dashboardJobs.getStatuses
export const runDashboardJobNow = dashboardJobs.runNow
export const applyDashboardJobOverride = dashboardJobs.applyOverride
