/**
 * Общая политика повтора алертов при затянувшемся отказе (§62 PLAN-INFRA.md, разбор
 * 17-дневной тишины email-канарейки). Не путать с `json-state-file.ts` — тот читает/пишет
 * JSON на диске, этот решает, слать ли алерт по уже загрученному состоянию.
 *
 * Правило одно и то же везде, где есть повторяющаяся cron-проверка с дебаунсом: молчание
 * не наступает никогда, пока проблема жива.
 * - первый раз — при пересечении порога;
 * - дальше — при каждом удвоении счётчика неудач, чтобы не спамить, но и не пропадать;
 * - если прошлый алерт не подтверждён получателем — повторяем на каждом прогоне, потому что
 *   «отправили и потеряли» ничем не лучше, чем «не отправляли».
 *
 * Каждый потребитель (email-canary, backup-freshness) хранит своё состояние в собственной
 * форме (разные имена полей, разный смысл счётчика — подряд-неудачи IMAP vs подряд-неудачи
 * свежести бэкапа), поэтому здесь только сама формула, а не персистентный тип целиком.
 */

export interface AlertRepeatState {
  /** При каком значении счётчика ушёл последний алерт (`null` — ещё ни разу). */
  alertedAtCount: number | null
  /** Подтвердил ли получатель приём последнего алерта. `false` → повторяем каждый прогон. */
  lastAlertDelivered: boolean | null
}

export function defaultAlertRepeatState(): AlertRepeatState {
  return { alertedAtCount: null, lastAlertDelivered: null }
}

export function shouldRepeatAlert(state: AlertRepeatState, count: number, threshold: number): boolean {
  if (count < threshold) {
    return false
  }
  if (state.alertedAtCount === null) {
    return true
  }
  if (state.lastAlertDelivered === false) {
    return true
  }
  return count >= state.alertedAtCount * 2
}
