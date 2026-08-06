/* eslint-disable no-console -- утилита-обёртка для консольного вывода */
import chalk from 'chalk'
import type { Ora } from 'ora'
import ora from 'ora'

export class Console {
  private static spinner: Ora | null = null

  static printHeader(version = '1.0.0'): void {
    const lines = ['Печать этикеток "Честный знак" - Галстуки', `Версия ${version}`]
    console.log('\n' + chalk.cyan(lines.join('\n')) + '\n')
  }

  static printSeparator(): void {
    console.log(chalk.gray('-'.repeat(64)))
  }

  static success(message: string, details?: string): void {
    console.log(`${getTimestamp()} ${chalk.green('✓')} ${message}`)
    if (details) {
      console.log(`  ${chalk.gray('└─')} ${details}`)
    }
  }

  static error(message: string, details?: string): void {
    console.log(`${getTimestamp()} ${chalk.red('✗')} ${message}`)
    if (details) {
      console.log(`  ${chalk.gray('└─')} ${chalk.red(details)}`)
    }
  }

  static warn(message: string, details?: string): void {
    console.log(`${getTimestamp()} ${chalk.yellow('⚠')} ${message}`)
    if (details) {
      console.log(`  ${chalk.gray('└─')} ${chalk.yellow(details)}`)
    }
  }

  static info(message: string, details?: string): void {
    console.log(`${getTimestamp()} ${chalk.blue('ℹ')} ${message}`)
    if (details) {
      console.log(`  ${chalk.gray('└─')} ${details}`)
    }
  }

  static processing(message: string, details?: string): void {
    console.log(`${getTimestamp()} ${chalk.cyan('⟳')} ${message}`)
    if (details) {
      console.log(`  ${chalk.gray('└─')} ${details}`)
    }
  }

  static startSpinner(message: string): Ora {
    Console.spinner = ora({ text: message, color: 'cyan' }).start()
    return Console.spinner
  }

  static succeedSpinner(message?: string): void {
    if (Console.spinner) {
      Console.spinner.succeed(message)
      Console.spinner = null
    }
  }

  static failSpinner(message?: string): void {
    if (Console.spinner) {
      Console.spinner.fail(message)
      Console.spinner = null
    }
  }

  static printStats(stats: { printed: number; duplicates: number; errors: number }): void {
    Console.printSeparator()
    console.log(
      chalk.bold(
        `Статистика: напечатано ${chalk.green(stats.printed)} | `
          + `дубликатов ${chalk.yellow(stats.duplicates)} | `
          + `ошибок ${chalk.red(stats.errors)}`,
      ),
    )
    Console.printSeparator()
  }

  static printTree(data: Record<string, string | number>): void {
    Object.entries(data).forEach(([key, value], index, arr) => {
      const isLast = index === arr.length - 1
      const prefix = isLast ? '└─' : '├─'
      console.log(`  ${chalk.gray(prefix)} ${key}: ${chalk.cyan(value)}`)
    })
  }
}

function getTimestamp(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().split(' ')[0]
  return chalk.gray(`[${date} ${time}]`)
}
