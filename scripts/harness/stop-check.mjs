#!/usr/bin/env node
/**
 * Stop hook："完成定义"守门员。
 * 本回合有源码改动时，运行 check:quick（typecheck + lint + 单测）。
 * 失败 → exit 2，Claude 必须继续修复而不能宣布完成。
 * stop_hook_active=true 表示上一次 Stop hook 已经让 Claude 继续过，避免无限循环：此时只报告不阻断。
 */
import {
  clearDirty,
  feedback,
  hasNodeModules,
  readDirty,
  readHookInput,
  run,
  tail,
} from './lib.mjs'

const input = await readHookInput()
const dirty = readDirty()
if (!dirty.length || !hasNodeModules()) process.exit(0)

const relevant = dirty.filter(
  (f) => /^(src|e2e|scripts)\//.test(f) || /\.(ts|tsx|json|js|mjs)$/.test(f),
)
if (!relevant.length) {
  clearDirty()
  process.exit(0)
}

const res = run('bash', ['scripts/check.sh', '--quick'])
if (res.ok) {
  clearDirty()
  console.log(`[harness] 本回合改动 ${relevant.length} 个文件，check:quick 全部通过 ✓`)
  process.exit(0)
}

const msg = `[harness] 回合结束前校验失败（涉及改动：${relevant.join(', ')}）\n\n${tail(res.out, 80)}\n\n请修复后再结束。`
if (input?.stop_hook_active) {
  // 已经被拦过一次仍失败：放行，但把结果留在上下文里，避免死循环
  console.log(msg + '\n（stop_hook_active：本次不再阻断，请向用户说明未通过项）')
  process.exit(0)
}
feedback(msg)
