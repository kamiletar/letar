#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/lib/check-jobs-env.sh"
mkdir -p "$root/.claude/artifacts"
test_dir=$(mktemp -d "$root/.claude/artifacts/jobs-env-test.XXXXXX")
trap 'rm -f "$test_dir/env"; rmdir "$test_dir"' EXIT
count=0
check_case() {
  local expected="$1" content="$2" actual=0
  printf '%s' "$content" > "$test_dir/env"
  check_jobs_env "$test_dir/env" >/dev/null 2>&1 || actual=$?
  if [ "$actual" != "$expected" ]; then
    printf 'Неверный результат проверки jobs: кейс %s\n' "$count" >&2
    exit 1
  fi
  count=$((count + 1))
}
check_case 0 $'JOBS_ENABLED=true\n'
check_case 0 $'JOBS_ENABLED=false\nJOBS_DISABLED_REASON=Ожидаем проверку SMTP\n'
check_case 0 $'JOBS_ENABLED=false\r\nJOBS_DISABLED_REASON="Проверка SMTP"\r\n'
check_case 1 ''
check_case 1 $'JOBS_ENABLED=false\n'
check_case 1 $'JOBS_ENABLED=TRUE\n'
check_case 1 $'JOBS_ENABLED=maybe\nJOBS_DISABLED_REASON=Причина\n'
check_case 1 $'JOBS_ENABLED=false\nJOBS_DISABLED_REASON=   \n'
check_case 1 $'JOBS_ENABLED=false\nJOBS_DISABLED_REASON=""\n'
check_case 1 "JOBS_ENABLED=false
JOBS_DISABLED_REASON=''
"
check_case 1 $'JOBS_ENABLED=false\nJOBS_DISABLED_REASON=# комментарий\n'
check_case 1 $'JOBS_ENABLED=true\nJOBS_ENABLED=false\n'
check_case 0 $'JOBS_ENABLED=false\nJOBS_ENABLED=true\n'
check_jobs_env "$test_dir/missing" >/dev/null 2>&1 && exit 1
printf 'Проверка jobs dotenv: %s кейсов и отсутствующий файл — PASS\n' "$count"
