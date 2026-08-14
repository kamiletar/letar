/**
 * Общий host-level lock между /api/deploy/* и /api/e2e/* — оба спавнят долгоживущие
 * процессы на хосте через nsenter и конкурируют за один и тот же checkout/node_modules
 * (bun install, next build, playwright webServer резолвит next/package.json).
 *
 * Раньше isDeployRunning() (deploy.ts) и isE2eRunning() (e2e.ts) были независимыми
 * проверками, каждая смотрела только в свою историю — деплой не знал про идущий e2e и
 * наоборот. Инцидент 2026-08-14 на s3: deploy_app(kami, staging) и run_e2e(form-example)
 * запустились одновременно (агент решил, что раз это разные приложения — безопасно),
 * kami был на середине `bun install`, и webServer form-example упал с
 * "node_modules is being reorganized by a concurrent install" — Playwright не смог
 * зарезолвить next/package.json. Оба guard'а были зелёными по отдельности: каждый видел
 * только свою историю пустой.
 *
 * Здесь — единственный источник истины "что сейчас крутится на хосте", проверяемый
 * ОБЕИМИ сторонами перед стартом. Действует per-process (per-server) — ровно то, что
 * нужно, так как s2 и s3 это два независимых процесса dashboard-agent на двух хостах.
 */

interface HostLock {
  kind: 'deploy' | 'e2e'
  label: string
  since: string
}

let current: HostLock | null = null

/** Атомарно (Node однопоточный, между проверкой и установкой ничего не выполняется)
 * пытается занять хост. Возвращает false, если уже занят чем-то другим. */
export function tryAcquireHostLock(kind: HostLock['kind'], label: string): boolean {
  if (current) {
    return false
  }
  current = { kind, label, since: new Date().toISOString() }
  return true
}

/** Освобождает лок. Безопасно вызывать даже если лок уже снят (idempotent). */
export function releaseHostLock(): void {
  current = null
}

/** Текущий держатель лока или null, если хост свободен. */
export function getHostLock(): HostLock | null {
  return current
}
