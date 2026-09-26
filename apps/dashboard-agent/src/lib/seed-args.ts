/**
 * Аргументы сида для POST /api/deploy/app (`seedArgs`) — белый список и валидация.
 *
 * Аргументы уходят в deploy-affected.sh как `--seed-arg <arg>` и дальше в `nx run <app>:db:seed -- <arg>`.
 * Сырую строку от клиента в команду не подставляем: только точные значения из белого списка.
 * Скрипт и deploy-mcp держат такой же список независимо (агент собирается образом без монорепо,
 * общего модуля у них нет) — расширяя список, правь все три места.
 */
export const ALLOWED_SEED_ARGS = ['--sync-texts', '--dry-run'] as const

export type SeedArg = (typeof ALLOWED_SEED_ARGS)[number]

export type SeedArgsResult = { ok: true; args: SeedArg[] } | { ok: false; error: string }

/**
 * Проверяет `seedArgs` из тела запроса. Пусто/не передано → `ok` с пустым списком.
 * Отказ: не массив, значение вне белого списка, `seedArgs` без `seed: true`, `--dry-run` без
 * `--sync-texts` (у обычного append-only сида dry-run не определён — он бы молча записал данные).
 */
export function parseSeedArgs(raw: unknown, seed: boolean): SeedArgsResult {
  if (raw === undefined || raw === null) {
    return { ok: true, args: [] }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'seedArgs должен быть массивом строк' }
  }
  const args: SeedArg[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !(ALLOWED_SEED_ARGS as readonly string[]).includes(item)) {
      return { ok: false, error: `seedArgs: недопустимое значение, разрешены только ${ALLOWED_SEED_ARGS.join(', ')}` }
    }
    if (!args.includes(item as SeedArg)) {
      args.push(item as SeedArg)
    }
  }
  if (args.length === 0) {
    return { ok: true, args }
  }
  if (!seed) {
    return { ok: false, error: 'seedArgs требует seed: true' }
  }
  if (args.includes('--dry-run') && !args.includes('--sync-texts')) {
    return { ok: false, error: 'seedArgs: --dry-run имеет смысл только вместе с --sync-texts' }
  }
  return { ok: true, args }
}
