#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK_PATH="$PROJECT_ROOT/.git/hooks/pre-push"

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
"$REPO_ROOT/scripts/ops/pre-push-safety-check.sh"
HOOK

chmod +x "$HOOK_PATH"
printf '[hook] Installed pre-push hook at %s\n' "$HOOK_PATH"
