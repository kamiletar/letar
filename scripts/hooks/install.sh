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
#
# Хуки копируются как самостоятельные файлы в hooks/ текущего .git (или .git/modules/... для
# submodule) — установка не зависит от того, лежит ли рядом каталог scripts/ во время commit.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir)"
HOOKS_DIR="$GIT_DIR/hooks"

mkdir -p "$HOOKS_DIR"
cp "$SRC_DIR/pre-commit-scope-guard.sh" "$HOOKS_DIR/_pre-commit-scope-guard.sh"
cp "$SRC_DIR/pre-commit-sops.sh" "$HOOKS_DIR/_pre-commit-sops.sh"
chmod +x "$HOOKS_DIR/_pre-commit-scope-guard.sh" "$HOOKS_DIR/_pre-commit-sops.sh"

cat > "$HOOKS_DIR/pre-commit" <<'DISPATCH'
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
chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ pre-commit хуки установлены: scope-guard + sops → $HOOKS_DIR/pre-commit"
