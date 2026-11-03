#!/usr/bin/env node
/**
 * PreToolUse(Bash) hook：拦截高危命令，避免 AI 误操作。
 * exit 2 阻断该次工具调用并把原因反馈给 Claude。
 */
import { feedback, readHookInput } from './lib.mjs'

const input = await readHookInput()
const rawCmd = String(input?.tool_input?.command ?? '')
// heredoc 正文（cat > file <<'EOF' … EOF）是数据不是命令：文档里提到危险命令不应被误拦
const cmd = stripHeredocs(rawCmd)

function stripHeredocs(text) {
  const out = []
  let closer = null
  for (const line of text.split('\n')) {
    if (closer !== null) {
      if (line.trim() === closer) closer = null
      continue
    }
    out.push(line)
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line)
    if (m) closer = m[2]
  }
  return out.join('\n')
}

const RULES = [
  {
    re: /\brm\s+-[a-z]*r[a-z]*f?[a-z]*\s+(\/|~|\.|\.\.|\*|\$HOME)(\s|$)/,
    why: '禁止递归删除项目根 / 家目录',
  },
  {
    re: /\bgit\s+push\b.*(--force|-f)\b/,
    why: '禁止 force push，请改用 --force-with-lease 并先与用户确认',
  },
  { re: /\bgit\s+reset\s+--hard\b/, why: 'git reset --hard 会丢弃工作区改动，请先与用户确认' },
  { re: /\bgit\s+checkout\s+--\s+\./, why: '会丢弃全部未提交改动，请先与用户确认' },
  { re: /\bgit\s+clean\s+-[a-z]*f/, why: 'git clean -f 会删除未跟踪文件，请先与用户确认' },
  { re: /\bnpm\s+publish\b/, why: '本项目不发布到 npm' },
  {
    re: /\brm\s+-[a-z]*r[a-z]*\s+(\S*\/)?(src|public|scripts|docs)(\s|$)/,
    why: '禁止整目录删除核心源码目录',
  },
  { re: /\bchmod\s+-R\s+777\b/, why: '不安全的权限修改' },
]

for (const rule of RULES) {
  if (rule.re.test(cmd)) {
    feedback(`[harness] 已拦截命令：${cmd.slice(0, 200)}\n原因：${rule.why}`)
  }
}

// 提示：vitest 无 run 会进入 watch 模式挂起会话
// 只匹配"作为命令调用"的 vitest（行首 / 管道 / && 之后），不误伤路径、grep 文本
const VITEST_INVOKE =
  /(^|[;&|(]\s*)(npx\s+|pnpm\s+|yarn\s+|\S*node_modules\/\.bin\/)?vitest(\s|$)(?!\s*(run|--run)\b)/m
if (VITEST_INVOKE.test(cmd)) {
  feedback(
    '[harness] `vitest` 不带 `run` 会进入 watch 模式阻塞会话，请使用 `npx vitest run` 或 `npm test`。',
  )
}
process.exit(0)
