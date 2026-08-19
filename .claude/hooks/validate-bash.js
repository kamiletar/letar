#!/usr/bin/env node
/**
 * PreToolUse хук для блокировки опасных git/bash команд в монорепо.
 *
 * Блокирует:
 * - git reset --hard (потеря изменений)
 * - git reset HEAD (сброс staging)
 * - git push --force (перезапись истории)
 * - git checkout/git restore с pathspec "." — любой ref, не только голая форма (откат всех файлов)
 * - git stash (скрытие чужих изменений)
 * - rm -rf / или rm -rf * (опасное удаление)
 * - bare ssh (Git Bash SSH плодит зомби ssh-agent.exe → No buffer space available)
 * - nx run-many -t format без --projects/--exclude (заходит в 7 submodule, PLAN-INFRA.md §32)
 * - встроенный nx format / nx format:write (это Prettier, а не dprint — тот же §32)
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

    // ⚠️ Паттерны ниже (git reset --hard, git push --force/-f, git checkout -- .,
    // git stash, rm -rf / *) НЕ привязаны к позиции команды (CMD_START), в отличие
    // от правил форматтера ниже по файлу. Они матчатся где угодно в строке — в том
    // числе внутри текста, который просто ОПИСЫВАЕТ команду, а не вызывает её
    // (heredoc-тело `git commit -m "$(cat <<'EOF' ... EOF)"`, `git log --grep=`,
    // `echo`/`grep` с этой фразой). Это осознанное решение, не забытый якорь.
    //
    // Проверено (2026-08-06, C:/web/letar):
    // 1. Грепом по телам всех 2084 коммитов репозитория ни разу не найдено
    //    настоящего попадания на "reset --hard"/"reset HEAD"/"push --force"/
    //    "push -f"/"checkout -- ."/"git stash" — на практике описания таких фиксов
    //    в коммит-мессаджах не цитируют команду дословно. Риск для git-паттернов
    //    в истории репо — не подтверждён.
    // 2. Но живьём, в этой же сессии, `git log --grep="git reset --hard"` (реальная
    //    исследовательская команда, не текст коммита) сама попала под блокировку —
    //    ложные срабатывания в интерактивном использовании Bash случаются, просто
    //    не оседают в git log, потому что блокируются ДО коммита.
    // 3. Ключевая причина не добавлять якорь: он открывает обход через command
    //    substitution. `echo "$(git reset --hard)"` и `` echo `git reset --hard` ``
    //    реально выполняют команду, но CMD_START (^, \n, ;, |, &&, ||) не считает
    //    `$(`/`` ` `` разделителем — с якорём обе формы перестали бы матчиться,
    //    а именно так и обходят такие фильтры. Для деструктивных операций пропуск
    //    (false negative) хуже блокировки безобидной команды (false positive) —
    //    поэтому эти правила остаются широкими, а нарастающий шум от ложных
    //    срабатываний в тексте — принятая цена. Правила форматтера ниже (nx format,
    //    nx run-many -t format) на такой обход не рассчитаны — там сама команда
    //    не всплывает внутри чужих command substitution, и якорь применён.
    //
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

    // --- Форматтер: два вектора массовой порчи из PLAN-INFRA.md §32 ---

    // Вектор 1. Встроенная команда Nx `nx format`/`nx format:write` — это Prettier, а не dprint.
    // Собственного .prettierrc в репозитории нет (удалён при закрытии §32), поэтому Prettier
    // отработает на дефолтах: двойные кавычки, точки с запятой, сломанный markdown в плановых
    // файлах — максимально далеко от dprint.json. Прецедент: 480 переписанных файлов в трёх
    // библиотеках. `nx format:check` не блокируем — он ничего не пишет.
    // Не путать с таргетом `format` (`nx run-many -t format`) — тот вызывает dprint, имя совпало
    // случайно.
    // ⚠️ Обе проверки ниже привязаны к ПОЗИЦИИ КОМАНДЫ (начало строки, после &&/||/;/|), а не
    // ищутся где угодно в строке. Иначе хук блокирует сам себя: эти команды постоянно
    // упоминаются в тексте — в сообщениях коммитов через heredoc, в документации, в echo.
    // Наступали дважды за одну сессию, пока правило было без якоря.
    const CMD_START = String.raw`(?:^|[\n;|]|&&|\|\|)\s*(?:bunx\s+|npx\s+|bun\s+run\s+)?`

    if (new RegExp(CMD_START + String.raw`nx\s+format(?::write)?(?!\S)`).test(command)) {
      console.error(
        '\n⛔ BLOCKED: `nx format` — это встроенная команда Nx, она запускает Prettier, а не dprint.\n'
          + 'Своего .prettierrc в репозитории нет, Prettier отработает на дефолтах и перепишет\n'
          + 'файлы против dprint.json (прецедент — 480 файлов, PLAN-INFRA.md §32).\n'
          + 'Нужен форматтер репозитория: nx run-many -t format --projects=<твои проекты>\n',
      )
      process.exit(2)
    }

    // Вектор 2. `nx run-many -t format` без ограничения области.
    // Семь submodule-приложений объявляют таргет `format` с cwd внутри себя, а `excludes`
    // корневого dprint.json при таком запуске не применяются (сопоставляются относительно
    // каталога конфига, а обход идёт от cwd). Итог — прогон пишет в 2089 файлов чужих
    // репозиториев. Сейчас без диффа (конфиги совпадают), но касаться чужого рабочего дерева
    // всё равно незачем. Разбор — .claude/docs/dprint-worktree-submodule-scope.md.
    // Вырезаем ровно одну инвокацию run-many (до конца строки или следующего разделителя),
    // чтобы `--projects` из соседней команды или из текста сообщения не считался ограничением.
    const runMany = command.match(new RegExp(CMD_START + String.raw`nx\s+run-many\b[^\n;|&]*`))
    const runManyTargets = runMany?.[0].match(/(?:-t|--targets?)[=\s]+([\w:,-]+)/)
    const formatsBlanket = runManyTargets
      && runManyTargets[1].split(',').includes('format')
      && !/--projects[=\s]|--exclude[=\s]|\s-p[=\s]/.test(runMany[0])
    if (formatsBlanket) {
      console.error(
        '\n⛔ BLOCKED: `nx run-many -t format` без --projects заходит в семь приватных\n'
          + 'submodule-приложений (aboi, aprel8008, domwellbes, driving-school, dsperevod,\n'
          + 'studio, svoichuzhie) — 2089 файлов чужих репозиториев.\n'
          + 'Ограничь область: nx run-many -t format --projects=<твои проекты>\n'
          + 'Список проектов с таргетом: nx show projects --with-target format\n'
          + 'Если действительно нужен прогон по всему публичному репо — `dprint fmt` из корня,\n'
          + 'он excludes уважает. Разбор: .claude/docs/dprint-worktree-submodule-scope.md\n',
      )
      process.exit(2)
    }

    // SSH команды через Windows SSH (.exe) на удалённых серверах — пропускаем проверку git
    // На серверах только деплой-ключ (read-only), нет других агентов
    const isRemoteSSH = /ssh\.exe\s+/.test(command)

    // --- `git checkout`/`git restore` с pathspec `.` — перезапись рабочего дерева целиком ---
    // Инцидент 2026-08-19 (.claude/docs/git-multi-agent-incidents.md): `git checkout <sha> -- .`
    // стёр чужую незакоммиченную работу. Прежнее правило матчило только голую форму без ref
    // (`git checkout -- .`) — форма с указанием любого ref (коммит/ветка/HEAD) под неё не
    // попадала, хотя опасность та же: границу задаёт pathspec `.`, а не ref. Тот же класс риска
    // у `git restore` — по умолчанию (без --staged) он тоже пишет в рабочее дерево.
    // Не блокируем: `git checkout -- <file>`, `git checkout <ref> -- <file>`,
    // `git restore <file>`, `git restore --staged .` (--staged без --worktree не трогает
    // рабочее дерево, только индекс — тот же риск-класс, что у `git reset HEAD`, уже блокирован
    // отдельным правилом выше).
    if (!isRemoteSSH) {
      for (const m of command.matchAll(/git\s+(?:checkout|restore)\b[^\n;&|]*/gi)) {
        const invocation = m[0]
        const isRestore = /^git\s+restore\b/i.test(invocation)
        let pathspecPart
        if (isRestore) {
          const touchesWorktree = !/--staged\b/i.test(invocation) || /--worktree\b/i.test(invocation)
          if (!touchesWorktree) { continue }
          pathspecPart = invocation
            .replace(/^git\s+restore\b/i, '')
            .replace(/--source[=\s]+\S+/i, '')
            .replace(/--worktree\b/i, '')
            .replace(/--staged\b/i, '')
            .trim()
        } else {
          const dashIdx = invocation.indexOf('--')
          if (dashIdx === -1) { continue // `git checkout <branch>` без pathspec — просто переключение веток
           }
          pathspecPart = invocation.slice(dashIdx + 2).trim()
        }
        if (pathspecPart === '.') {
          console.error(
            `\n⛔ BLOCKED: \`${invocation.trim()}\` заблокирован! Pathspec "." — это весь каталог,\n`
              + 'команда молча перезапишет рабочее дерево целиком, включая чужие незакоммиченные\n'
              + 'файлы (инцидент 2026-08-19 — see .claude/docs/git-multi-agent-incidents.md).\n'
              + 'Перечисли конкретные файлы: git checkout <ref> -- <file> / git restore <file>.\n',
          )
          process.exit(2)
        }
      }
    }

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
