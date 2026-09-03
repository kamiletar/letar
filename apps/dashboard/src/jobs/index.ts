import { heartbeatJob } from './heartbeat'
import { pageviewCountJob } from './pageview-count'
import { sslCheckJob } from './ssl-check'

export const jobs = [heartbeatJob, pageviewCountJob, sslCheckJob]
