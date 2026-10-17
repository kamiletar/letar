#!/usr/bin/env bash

# Читаем только значения, не исполняем содержимое расшифрованного dotenv.
check_jobs_env() {
  local env_file="$1" enabled reason
  if [ ! -f "$env_file" ]; then
    echo '❌ Не найден dotenv для проверки фоновых заданий' >&2
    return 1
  fi
  enabled=$(sed -n 's/^JOBS_ENABLED=//p' "$env_file" | tail -n 1)
  enabled="${enabled%$'\r'}"
  case "$enabled" in
    true) return 0 ;;
    false)
      reason=$(sed -n 's/^JOBS_DISABLED_REASON=//p' "$env_file" | tail -n 1)
      reason="${reason//[[:space:]]/}"
      reason="${reason//\"/}"
      reason="${reason//\'/}"
      if [ -n "$reason" ] && [[ "$reason" != \#* ]]; then
        echo '⚠️ JOBS_ENABLED=false: фоновые задания явно отключены с указанной причиной'
        return 0
      fi
      echo '❌ JOBS_ENABLED=false требует непустой JOBS_DISABLED_REASON в dotenv' >&2
      ;;
    *) echo '❌ Требуется явный JOBS_ENABLED=true или false с JOBS_DISABLED_REASON в dotenv' >&2 ;;
  esac
  return 1
}
