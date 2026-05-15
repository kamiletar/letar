/**
 * Barrel re-export для scorer actions.
 * Потребители продолжают импортировать из этого файла.
 * Директива 'use server' не нужна — каждый action-файл объявляет её сам.
 */

export { issueCardAction } from './cards.action'
export { assignManualJudgeAction, createJuryInviteAction, removeManualJudgeAction } from './jury.action'
export {
  finishHalfAction,
  finishMatchAction,
  setFirstHalfStartTeamAction,
  setVictoryPoemAction,
  startMatchAction,
} from './match-lifecycle.action'
export {
  confirmPoetResultAction,
  endPerformanceAction,
  finishPairAction,
  nextRoundAction,
  setCurrentPerformerAction,
  showHalfSummaryAction,
  startPerformanceAction,
} from './round-management.action'
export {
  enterManualVoteAction,
  forceCompleteVotingAction,
  resetJudgeVoteAction,
  startDeliveryVotingAction,
  startTextVotingAction,
  updatePerformanceScoresAction,
} from './voting.action'
