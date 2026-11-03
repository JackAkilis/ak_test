import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CACHE_DIR = join(ROOT, 'node_modules', '.cache', 'harness')
export const DIRTY_FILE = join(CACHE_DIR, 'dirty.json')

/** 读取 hook 的 stdin JSON（Claude Code 通过 stdin 传入事件） */
export async function readHookInput() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI ?? '1' },
    ...opts,
  })
  return {
    ok: res.status === 0,
    out: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim(),
    status: res.status,
  }
}

export function hasNodeModules() {
  return existsSync(join(ROOT, 'node_modules', '.bin', 'tsc'))
}

export function rel(p) {
  return relative(ROOT, p)
}

export function isInsideProject(p) {
  const r = relative(ROOT, resolve(p))
  return r && !r.startsWith('..') && !r.includes('node_modules')
}

/** 记录本会话内被修改的文件，供 Stop hook 判断是否需要全量校验 */
export function markDirty(file) {
  mkdirSync(CACHE_DIR, { recursive: true })
  const list = readDirty()
  if (!list.includes(file)) list.push(file)
  writeFileSync(DIRTY_FILE, JSON.stringify(list))
}
export function readDirty() {
  try {
    return JSON.parse(readFileSync(DIRTY_FILE, 'utf-8'))
  } catch {
    return []
  }
}
export function clearDirty() {
  rmSync(DIRTY_FILE, { force: true })
}

/** 截断长输出，只保留最后 N 行，避免淹没上下文 */
export function tail(text, lines = 60) {
  const arr = text.split('\n')
  return arr.length > lines
    ? `…(省略 ${arr.length - lines} 行)\n${arr.slice(-lines).join('\n')}`
    : text
}

/**
 * 以 hook 协议反馈给 Claude：
 * exit 2 = 阻断 / 要求修复（stderr 内容会进入 Claude 上下文）
 * exit 0 = 通过（stdout 仅在 verbose 下展示）
 */
export function feedback(message) {
  process.stderr.write(message.endsWith('\n') ? message : message + '\n')
  process.exit(2)
}
