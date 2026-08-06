#!/usr/bin/env node
/**
 * PreToolUse хук для блокировки опасных git/bash команд в монорепо.
 *
 * Блокирует:
 * - git reset --hard (потеря изменений)
 * - git reset HEAD (сброс staging)
 * - git push --force (перезапись истории)
 * - git checkout -- . (откат всех файлов)
 * - git stash (скрытие чужих изменений)
 * - rm -rf / или rm -rf * (опасное удаление)
 * - bare ssh (Git Bash SSH плодит зомби ssh-agent.exe → No buffer space available)
 *
 * Exit codes:
 * - 0: разрешить выполнение
 * - 2: заблокировать с сообщением об ошибке
 */

// Читаем JSON из stdin
let input = ''
process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input)
    const command = data.tool_input?.command || ''

    // Паттерны для блокировки
    const BLOCKED = [
      {
        pattern: /git\s+reset\s+--hard/i,
        message:
          'git reset --hard заблокирован! В монорепо это может удалить изменения других агентов. Используй git checkout <file> для конкретных файлов.',
      },
      {
        pattern: /git\s+reset\s+HEAD(?!\^)(?!\~)/i,
        message:
          'git reset HEAD заблокирован! Это сбросит staging всех файлов, включая изменения других агентов. Используй git reset HEAD <file> для конкретного файла.',
      },
      {
        pattern: /git\s+push\s+.*--force/i,
        message:
          'git push --force заблокирован! Это перезапишет историю на remote. Используй git push --force-with-lease если действительно нужно.',
      },
      {
        pattern: /git\s+push\s+-f\b/i,
        message: 'git push -f заблокирован! Это перезапишет историю на remote.',
      },
      {
        pattern: /git\s+checkout\s+--\s+\./i,
        message:
          'git checkout -- . заблокирован! Это откатит ВСЕ изменения в репозитории. Используй git checkout -- <file> для конкретного файла.',
      },
      {
        pattern: /git\s+stash(?!\s+pop|\s+apply|\s+list|\s+show)/i,
        message:
          'git stash заблокирован в монорепо! Это скроет изменения других агентов. Коммить свои изменения или используй git stash push -m "name" -- <files>.',
      },
      {
        // Блокируем rm -rf с корневым путём (/ или \) без дальнейших компонентов
        pattern: /rm\s+(-[rf]+\s+)+[\/\\]\s*$/i,
        message: 'rm -rf / заблокирован! Опасная команда удаления.',
      },
      {
        pattern: /rm\s+(-[rf]+\s+)+\*/i,
        message: 'rm -rf * заблокирован! Используй более конкретный путь.',
      },
    ]

    // Блокируем bare ssh из Git Bash — плодит зомби ssh-agent.exe
    // Git Bash SSH (/usr/bin/ssh) при каждом вызове создаёт ssh-agent.exe,
    // который никогда не завершается. 42+ агентов → "No buffer space available".
    // Правильно: /c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa
    // Ловим ssh только как команду (в начале или после &&/||/;), не внутри строковых аргументов
    const bareSSH = /(?:^|(?:&&|\|\||;)\s*)(?:unset\s+\w+\s*&&\s*)*(?:SSH_AUTH_SOCK=\S*\s+)?ssh\s+(?!.*\.exe)/.test(
      command,
    )
    if (bareSSH) {
      console.error(
        '\n\u26d4 BLOCKED: Bare ssh из Git Bash плодит зомби ssh-agent.exe!\n'
          + 'Используй Windows SSH:\n'
          + '  /c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa deploy@server "command"\n',
      )
      process.exit(2)
    }

    // SSH команды через Windows SSH (.exe) на удалённых серверах — пропускаем проверку git
    // На серверах только деплой-ключ (read-only), нет других агентов
    const isRemoteSSH = /ssh\.exe\s+/.test(command)

    // Проверяем на заблокированные паттерны (только локальные команды)
    if (!isRemoteSSH) {
      for (const { pattern, message } of BLOCKED) {
        if (pattern.test(command)) {
          console.error(`\n\u26d4 BLOCKED: ${message}\n`)
          process.exit(2)
        }
      }
    }

    // Предупреждения (разрешаем, но выводим warning)
    const WARNINGS = [
      {
        pattern: /git\s+add\s+\.(?!\w)/,
        message:
          'git add . в монорепо добавит ВСЕ файлы, включая изменения других агентов. Лучше использовать git add apps/<project>/',
      },
    ]

    for (const { pattern, message } of WARNINGS) {
      if (pattern.test(command)) {
        console.error(`\n\u26a0\ufe0f WARNING: ${message}\n`)
        // Не блокируем, просто предупреждаем
      }
    }

    // Разрешаем выполнение
    process.exit(0)
  } catch {
    // При ошибке парсинга разрешаем (fail open)
    process.exit(0)
  }
})
