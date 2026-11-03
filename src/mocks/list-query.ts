import type { ListQuery, Paginated } from '@/contracts/common'

export interface ListQueryOptions {
  searchFields: readonly string[]
  filterFields: readonly string[]
  defaultSort: { field: string; order: 'asc' | 'desc' }
}

function compare(a: unknown, b: unknown) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'zh-CN')
}

/**
 * 纯函数：对内存数组执行"搜索 → 过滤 → 排序 → 分页"。
 * 真实后端应实现同样语义（见 docs/API.md）。
 */
export function applyListQuery<T extends object>(
  items: T[],
  query: ListQuery & Record<string, unknown>,
  options: ListQueryOptions,
): Paginated<T> {
  const read = (item: T, field: string) => (item as Record<string, unknown>)[field]
  let result = items

  const q = query.q?.trim().toLowerCase()
  if (q) {
    result = result.filter((item) =>
      options.searchFields.some((f) =>
        String(read(item, f) ?? '')
          .toLowerCase()
          .includes(q),
      ),
    )
  }

  for (const field of options.filterFields) {
    const value = query[field]
    if (value === undefined || value === null || value === '') continue
    result = result.filter((item) => String(read(item, field)) === String(value))
  }

  const sortField = query.sort || options.defaultSort.field
  const order = query.order ?? (query.sort ? 'asc' : options.defaultSort.order)
  result = [...result].sort((a, b) => {
    const c = compare(read(a, sortField), read(b, sortField))
    return order === 'asc' ? c : -c
  })

  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 10
  const start = (page - 1) * pageSize
  return {
    data: result.slice(start, start + pageSize),
    total: result.length,
    page,
    pageSize,
  }
}
