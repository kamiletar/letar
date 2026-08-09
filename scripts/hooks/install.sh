#!/usr/bin/env bash
# install.sh — устанавливает связку pre-commit хуков в текущий git-репозиторий.
#
# Ставит:
#   - pre-commit-scope-guard.sh — блокирует голый commit, затянувший несвязанные scope
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
  chmod +x "$hooks_dir/_pre-commit-scope-guard.sh" "$hooks_dir/_pre-commit-sops.sh"

  cat > "$hooks_dir/pre-commit" <<'DISPATCH'
#!/usr/bin/env bash
# Сгенерировано scripts/hooks/install.sh — не редактируй руками, правь исходники в scripts/hooks/
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
status=0
bash "$DIR/_pre-commit-scope-guard.sh" || status=$?
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

  # Формат `git submodule foreach 'echo "$sm_path"'` даёт относительный путь submodule от корня;
  # git-dir каждого submodule лежит в .git/modules/<sm_path> независимо от текущей глубины.
  while IFS= read -r sm_path; do
    [[ -z "$sm_path" ]] && continue
    sm_git_dir=".git/modules/$sm_path"
    if [[ -d "$sm_git_dir" ]]; then
      install_into "$sm_git_dir" "submodule $sm_path"
    else
      echo "⚠️  пропущен $sm_path — git-dir не найден ($sm_git_dir); submodule не инициализирован?" >&2
    fi
  done < <(git config --file .gitmodules --get-regexp path | awk '{print $2}')

  exit 0
fi

GIT_DIR="$(git rev-parse --git-dir)"
install_into "$GIT_DIR" "pre-commit хуки установлены: scope-guard + sops"
