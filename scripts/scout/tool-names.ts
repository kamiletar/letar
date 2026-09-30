/**
 * Соответствие старых имён инструментов новым (миграция инструкций 2026-09-30).
 *
 * Эталон `tool-gold.jsonl`, `eval-cases.jsonl` и история вызовов `sessions-live.jsonl` хранят имена
 * времён, когда были команды `.claude/commands` (`infra:deploy`) и скилы, удалённые аудитом. Файлы
 * данных не переписываем — имена переводятся при чтении через `canonicalTool`.
 *
 * `string` — новое имя (переименование или слияние), `null` — пункта больше нет: такой вызов или
 * ответ эталона считается «пустым».
 */
export const TOOL_RENAMES: Record<string, string | null> = {
  // команды с подкаталогом → скилы через дефис
  'audit:backup-audit': 'audit-backup-audit',
  'audit:forms-audit': 'audit-forms-audit',
  'audit:perf-audit': 'audit-perf-audit',
  'audit:seo-audit': 'audit-seo-audit',
  'audit:ui-ux-audit': 'ui-ux-audit',
  'create:new-app': 'create-new-app',
  'create:new-electron-app': 'create-new-electron-app',
  'infra:deploy': 'infra-deploy',
  'infra:deps-update': 'infra-deps-update',
  'infra:glitchtip-errors': 'infra-glitchtip-errors',
  'workflow:archive-completed': 'workflow-archive-completed',
  'workflow:test-write': 'workflow-test-write',
  // слиты в другие скилы
  'db-schema-assistant': 'zenstack-helper',
  'form-generator': 'form-pipeline',
  // удалены аудитом скилов
  'deployment-assistant': null,
  'test-generator': null,
  'sync-env': null,
  'code-quality-gate': null,
  'workflow:code-review': null,
  'workflow:debug': null,
  'workflow:refactor': null,
  'workflow:update-docs': null,
  'audit:security-check': null,
  'create:new-api': null,
  'create:new-component': null,
  'create:new-lib': null,
  'infra:db-migrate': null,
  'infra:deps-analyze': null,
}

/** Текущее имя инструмента: `undefined` в таблице — имя не менялось, `null` — пункта нет */
export function canonicalTool(name: string): string | null {
  return Object.hasOwn(TOOL_RENAMES, name) ? TOOL_RENAMES[name] : name
}

/** Список имён через таблицу: удалённые пропадают, повторы схлопываются */
export function canonicalTools(names: string[]): string[] {
  return [...new Set(names.map(canonicalTool).filter((n): n is string => n !== null))]
}
