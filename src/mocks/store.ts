/**
 * 内存数据表，带可选的 localStorage 持久化（浏览器刷新后数据保留）。
 * 测试环境（无 localStorage）为纯内存。
 */
export interface Store<T extends { id: string }> {
  readonly name: string
  all(): T[]
  get(id: string): T | undefined
  insert(entity: T): T
  update(id: string, patch: Partial<T>): T | undefined
  remove(id: string): boolean
  reset(): void
}

const STORAGE_PREFIX = 'nimbus-mock:'

function storage(): Storage | undefined {
  try {
    // 只在浏览器（含 jsdom）使用；纯 Node 下不碰 globalThis.localStorage（Node 22+ 会打实验性警告）
    if (typeof window === 'undefined') return undefined
    return window.localStorage ?? undefined
  } catch {
    return undefined
  }
}

export function createStore<T extends { id: string }>(name: string, seed: () => T[]): Store<T> {
  const key = STORAGE_PREFIX + name
  let data = new Map<string, T>()

  function load() {
    const raw = storage()?.getItem(key)
    if (raw) {
      try {
        const arr = JSON.parse(raw) as T[]
        data = new Map(arr.map((e) => [e.id, e]))
        return
      } catch {
        // 数据损坏则重建
      }
    }
    data = new Map(seed().map((e) => [e.id, e]))
    persist()
  }

  function persist() {
    storage()?.setItem(key, JSON.stringify([...data.values()]))
  }

  load()

  return {
    name,
    all: () => [...data.values()],
    get: (id) => data.get(id),
    insert(entity) {
      data.set(entity.id, entity)
      persist()
      return entity
    },
    update(id, patch) {
      const current = data.get(id)
      if (!current) return undefined
      const next = { ...current, ...patch }
      data.set(id, next)
      persist()
      return next
    },
    remove(id) {
      const ok = data.delete(id)
      if (ok) persist()
      return ok
    },
    reset() {
      storage()?.removeItem(key)
      load()
    },
  }
}

let counter = 0
export function newId(prefix: string) {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`
}

export function nowIso() {
  return new Date().toISOString()
}
