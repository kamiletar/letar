export { findOwnLatestTag } from './lib/find-own-release'
export type { FindOwnLatestTagOptions, GithubReleaseSummary, MinimalFetch } from './lib/find-own-release'
export { buildRelaunchBatScript, installAndRelaunchViaScheduler } from './lib/install-and-relaunch-via-scheduler'
export type {
  BuildRelaunchBatScriptOptions,
  InstallAndRelaunchViaSchedulerOptions,
} from './lib/install-and-relaunch-via-scheduler'
export { pointFeedAtOwnRelease } from './lib/point-feed-at-own-release'
export type { FeedTargetAutoUpdater, PointFeedAtOwnReleaseOptions } from './lib/point-feed-at-own-release'
