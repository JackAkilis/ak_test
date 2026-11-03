#!/usr/bin/env node
/**
 * SessionStart hook：把项目的"操作须知"注入会话上下文，并检查环境。
 * stdout 的内容会作为上下文提供给 Claude。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, hasNodeModules, run } from './lib.mjs'

const lines = []
lines.push('[harness] Nimbus Admin 会话启动检查')
lines.push(`- Node ${process.version}`)

if (!hasNodeModules()) {
  lines.push('- ⚠️ 未安装依赖：请先运行 `npm install`，否则 typecheck / test hooks 无法工作')
} else {
  lines.push('- 依赖已安装')
}

if (existsSync(join(ROOT, '.git'))) {
  const st = run('git', ['status', '--porcelain'])
  const n = st.out ? st.out.split('\n').length : 0
  lines.push(n ? `- git 工作区有 ${n} 个改动文件（git status 查看）` : '- git 工作区干净')
}

lines.push(
  '- 流程：改契约 → 改 Mock → 改 UI → `npm run check:quick`；新模块用 `npm run gen:module`',
)
lines.push('- 每次 Edit/Write 后会自动跑 prettier + eslint + tsc；回合结束前会自动跑 check:quick')
lines.push('- 详细约定见 CLAUDE.md，接口契约见 docs/API.md')
console.log(lines.join('\n'))
