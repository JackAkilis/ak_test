import type { ListQuery, Paginated } from '@/contracts/common'
import type { ResourceDef } from '@/contracts/resource'
import { http } from './http'

export interface ResourceApi<TEntity, TInput, TQuery> {
  list: (query: TQuery, signal?: AbortSignal) => Promise<Paginated<TEntity>>
  get: (id: string, signal?: AbortSignal) => Promise<TEntity>
  create: (input: TInput) => Promise<TEntity>
  update: (id: string, input: TInput) => Promise<TEntity>
  remove: (id: string) => Promise<void>
}

/**
 * 由资源定义生成 REST 客户端。接口约定见 docs/API.md：
 *   GET    /api/:name?page&pageSize&q&sort&order&<filters>
 *   GET    /api/:name/:id
 *   POST   /api/:name
 *   PUT    /api/:name/:id
 *   DELETE /api/:name/:id
 */
export function createResourceApi<TEntity extends { id: string }, TInput, TQuery extends ListQuery>(
  resource: ResourceDef<TEntity, TInput, TQuery>,
): ResourceApi<TEntity, TInput, TQuery> {
  const base = `/api/${resource.name}`
  return {
    list: (query, signal) =>
      http<Paginated<TEntity>>(base, {
        query: query as Record<string, string | number | undefined>,
        signal,
      }),
    get: (id, signal) => http<TEntity>(`${base}/${encodeURIComponent(id)}`, { signal }),
    create: (input) => http<TEntity>(base, { method: 'POST', body: input }),
    update: (id, input) =>
      http<TEntity>(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    remove: (id) => http<void>(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}
