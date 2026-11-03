#!/usr/bin/env bash
# 统一质量门禁。本地、Claude hooks、CI 都调用同一脚本，保证"同一套标准"。
#   bash scripts/check.sh          # 全量：typecheck + lint + format + unit test + build
#   bash scripts/check.sh --quick  # 快速：typecheck + lint + unit test（Stop hook 使用）
set -euo pipefail
cd "$(dirname "$0")/.."

QUICK=0
for arg in "$@"; do [[ "$arg" == "--quick" ]] && QUICK=1; done

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
ok() { printf '\033[1;32m✓ %s\033[0m\n' "$1"; }

START=$(date +%s)

step "TypeScript 类型检查"
npx tsc --noEmit --pretty false
ok "typecheck"

step "ESLint"
npx eslint . --max-warnings 0
ok "lint"

if [[ $QUICK -eq 0 ]]; then
  step "Prettier 格式检查"
  npx prettier --check . --log-level warn
  ok "format"
fi

step "单元 / 集成测试 (vitest)"
npx vitest run --reporter=dot
ok "test"

if [[ $QUICK -eq 0 ]]; then
  step "生产构建"
  npx vite build --logLevel warn
  ok "build"
fi

END=$(date +%s)
printf '\n\033[1;32m全部通过\033[0m（%ss）\n' "$((END - START))"
