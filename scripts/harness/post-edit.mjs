#!/usr/bin/env node
/**
 * PostToolUse(Edit|Write) hook：对刚修改的文件做"即时反馈"。
 * 1. prettier 自动格式化（无需 Claude 关心格式）
 * 2. eslint --fix 后仍有的问题 → 反馈
 * 3. 增量 tsc（整个项目，使用 tsBuildInfo 缓存，通常 1~3s）→ 类型错误反馈
 * 任何问题都以 exit 2 返回，Claude 会立刻看到并修复，而不是等到最后统一爆炸。
 */
import { existsSync } from 'node:fs'
import {
  feedback,
  hasNodeModules,
  isInsideProject,
  markDirty,
  readHookInput,
  rel,
  run,
  tail,
} from './lib.mjs'

const input = await readHookInput()
const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path
if (!file || !isInsideProject(file) || !existsSync(file)) process.exit(0)
if (!hasNodeModules()) process.exit(0)

const relPath = rel(file)
markDirty(relPath)

const problems = []

// 1. 格式化（支持的类型）
if (/\.(ts|tsx|js|mjs|cjs|json|css|md|yml|yaml)$/.test(relPath) && !relPath.startsWith('public/')) {
  const fmt = run('npx', ['prettier', '--write', '--log-level', 'warn', relPath])
  if (!fmt.ok) problems.push(`prettier 失败：\n${tail(fmt.out, 20)}`)
}

// 2. ESLint（只检查这个文件，带 --fix）
if (/\.(ts|tsx|js|mjs)$/.test(relPath) && !relPath.startsWith('public/')) {
  const lint = run('npx', ['eslint', '--fix', '--max-warnings', '0', relPath])
  if (!lint.ok) problems.push(`ESLint：\n${tail(lint.out, 40)}`)
}

// 3. 类型检查（增量）
if (/\.(ts|tsx)$/.test(relPath)) {
  const tsc = run('npx', ['tsc', '--noEmit', '--pretty', 'false'])
  if (!tsc.ok) problems.push(`TypeScript：\n${tail(tsc.out, 40)}`)
}

if (problems.length) {
  feedback(`[harness] ${relPath} 修改后发现问题，请立即修复：\n\n${problems.join('\n\n')}`)
}
console.log(`[harness] ${relPath} ✓ 格式化 / lint / 类型检查通过`)
