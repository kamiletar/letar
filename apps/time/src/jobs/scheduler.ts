import { prisma } from '@/lib/db'
import { createAppJobsModule } from '@letar/jobs'
import { jobs } from './index'

const timeJobs = createAppJobsModule({ cacheKey: 'time', jobs, prisma })

export const startTimeJobs = timeJobs.start
export const getTimeJobStatuses = timeJobs.getStatuses
export const runTimeJobNow = timeJobs.runNow
export const applyTimeJobOverride = timeJobs.applyOverride
