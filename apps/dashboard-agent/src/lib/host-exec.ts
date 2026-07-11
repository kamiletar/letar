/**
 * Хелперы для выхода из контейнера dashboard-agent в namespace хоста через `nsenter`.
 * Используется deploy.ts (запуск deploy-affected.sh) и e2e.ts (запуск nx e2e) — оба
 * приложения физически существуют только на хосте, не внутри контейнера агента.
 */

const NSENTER_HOST_FLAGS = ['-t', '1', '-m', '-u', '-n', '-i'] as const

/** Аргументы `nsenter` для запуска исполняемого файла с аргументами на хосте (без shell). */
export function hostExecArgs(command: string[]): string[] {
  return [...NSENTER_HOST_FLAGS, '--', ...command]
}

/**
 * Аргументы `nsenter` для запуска shell-команды на хосте через `bash -c`.
 * ⚠️ shellCommand интерполируется в shell-строку — вызывающий код обязан валидировать
 * каждый параметр, попадающий в неё, ДО вызова (иначе command injection в root-контекст хоста).
 */
export function hostShellArgs(shellCommand: string): string[] {
  return [...NSENTER_HOST_FLAGS, '--', 'bash', '-c', shellCommand]
}
