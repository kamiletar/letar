#!/usr/bin/env bash
# install.sh — устанавливает связку pre-commit хуков в текущий git-репозиторий.
#
# Ставит:
#   - pre-commit-scope-guard.sh — блокирует голый commit, затянувший несвязанные scope
#   - pre-commit-semgrep.sh     — статический анализ безопасности по staged-файлам
#   - pre-commit-sops.sh        — авто-шифрование .env.docker/.env.staging → *.enc
#
# Использование:
#   bash scripts/hooks/install.sh                                  # из корня letar
#   cd apps/<submodule> && bash ../../scripts/hooks/install.sh      # из приватного submodule
#   bash scripts/hooks/install.sh --all-submodules                 # из корня letar, во ВСЕ submodule разом
#
# Хуки копируются как самостоятельные файлы в hooks/ текущего .git (или .git/modules/... для
# submodule) — установка не зависит от того, лежит ли рядом каталог scripts/ во время commit.
#
# ⚠️ Каждый submodule — отдельный .git с собственным HEAD. Установка в корне letar защищает
# ТОЛЬКО коммиты в самом letar (apps/<x>/ как gitlink) — она не покрывает коммиты ВНУТРИ
# submodule (файлы apps/<x>/src/**). Без --all-submodules каждый submodule нужно защищать
# отдельно (см. .claude/rules/git.md § «Работа с приватными submodule»).

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_into() {
  local git_dir="$1"
  local label="$2"
  local hooks_dir="$git_dir/hooks"

  mkdir -p "$hooks_dir"
  cp "$SRC_DIR/pre-commit-scope-guard.sh" "$hooks_dir/_pre-commit-scope-guard.sh"
  cp "$SRC_DIR/pre-commit-sops.sh" "$hooks_dir/_pre-commit-sops.sh"
  cp "$SRC_DIR/pre-commit-semgrep.sh" "$hooks_dir/_pre-commit-semgrep.sh"
  chmod +x "$hooks_dir/_pre-commit-scope-guard.sh" "$hooks_dir/_pre-commit-sops.sh" \
    "$hooks_dir/_pre-commit-semgrep.sh"

  cat > "$hooks_dir/pre-commit" <<'DISPATCH'
#!/usr/bin/env bash
# Сгенерировано scripts/hooks/install.sh — не редактируй руками, правь исходники в scripts/hooks/
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
status=0
bash "$DIR/_pre-commit-scope-guard.sh" || status=$?
if [[ $status -eq 0 ]]; then
  bash "$DIR/_pre-commit-semgrep.sh" || status=$?
fi
if [[ $status -eq 0 ]]; then
  bash "$DIR/_pre-commit-sops.sh" || status=$?
fi
exit $status
DISPATCH
  chmod +x "$hooks_dir/pre-commit"

  echo "✅ $label → $hooks_dir/pre-commit"
}

if [[ "${1:-}" == "--all-submodules" ]]; then
  ROOT_GIT_DIR="$(git rev-parse --git-dir)"
  install_into "$ROOT_GIT_DIR" "letar (корень)"

  # ⚠️ git-dir submodule НЕ всегда лежит в .git/modules/<sm_path>. Классический
  # `git submodule update --init` кладёт его туда и оставляет в рабочем дереве файл-указатель
  # `.git`, но submodule, заведённый обычным `git clone` внутрь apps/, держит полноценный
  # каталог `.git` прямо у себя. Раньше здесь была захардкожена только первая форма — и четыре
  # приложения (studio, svoichuzhie, aprel8008, poster-microtext-desktop) молча оставались БЕЗ
  # scope-guard'а, то есть ровно те, где 2026-08-09 произошло перемешивание правок двух сессий
  # в одном коммите (см. .claude/rules/git.md § «Два агента одновременно коммитят в ОДИН
  # submodule»). Спрашиваем git — он знает обе формы.
  while IFS= read -r sm_path; do
    [[ -z "$sm_path" ]] && continue
    if ! sm_git_dir="$(git -C "$sm_path" rev-parse --absolute-git-dir 2>/dev/null)"; then
      echo "⚠️  пропущен $sm_path — git-репозиторий не найден; submodule не инициализирован?" >&2
      continue
    fi
    install_into "$sm_git_dir" "submodule $sm_path"
  done < <(git config --file .gitmodules --get-regexp path | awk '{print $2}')

  exit 0
fi

GIT_DIR="$(git rev-parse --git-dir)"
install_into "$GIT_DIR" "pre-commit хуки установлены: scope-guard + sops"
