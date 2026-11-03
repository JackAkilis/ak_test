import { HttpResponse, delay, http, type HttpHandler } from 'msw'
import { z } from 'zod'
import type { ApiErrorBody, ListQuery } from '@/contracts/common'
import type { ResourceDef } from '@/contracts/resource'
import { env } from '@/lib/env'
import { applyListQuery } from './list-query'
import type { Store } from './store'

export function errorResponse(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status })
}

export function validationError(error: z.ZodError) {
  const flat = z.flattenError(error)
  return errorResponse(400, {
    code: 'VALIDATION_ERROR',
    message: '提交的数据不合法，请检查表单',
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  })
}

/** 模拟网络延迟；测试环境为 0 */
export async function simulateLatency() {
  if (env.isTest) return
  const ms = env.mockLatency
  if (ms > 0) await delay(ms)
}

export interface CrudHandlerOptions<TEntity extends { id: string }, TInput> {
  /** 把入参变成实体（新建），可做关联校验；返回 ApiErrorBody 表示业务错误 */
  create: (input: TInput) => TEntity | { error: ApiErrorBody; status?: number }
  /** 把入参合并到已有实体（编辑） */
  update: (current: TEntity, input: TInput) => TEntity | { error: ApiErrorBody; status?: number }
  /** 删除前校验，返回错误体则阻止删除 */
  beforeRemove?: (current: TEntity) => ApiErrorBody | undefined
}

function isError<T>(
  x: T | { error: ApiErrorBody; status?: number },
): x is { error: ApiErrorBody; status?: number } {
  return typeof x === 'object' && x !== null && 'error' in x
}

/**
 * 为一个资源生成标准 REST handlers（list / get / create / update / delete）。
 * 行为与 docs/API.md 的约定一致，真实后端只要遵循同一契约即可无缝替换。
 */
export function createCrudHandlers<
  TEntity extends { id: string },
  TInput,
  TQuery extends ListQuery,
>(
  resource: ResourceDef<TEntity, TInput, TQuery>,
  store: Store<TEntity>,
  options: CrudHandlerOptions<TEntity, TInput>,
): HttpHandler[] {
  const base = `/api/${resource.name}`

  return [
    http.get(base, async ({ request }) => {
      await simulateLatency()
      const url = new URL(request.url)
      const raw = Object.fromEntries(url.searchParams.entries())
      const parsed = resource.query.safeParse(raw)
      if (!parsed.success) return validationError(parsed.error)
      const result = applyListQuery(
        store.all(),
        parsed.data as ListQuery & Record<string, unknown>,
        {
          searchFields: resource.searchFields,
          filterFields: resource.filterFields,
          defaultSort: resource.defaultSort,
        },
      )
      return HttpResponse.json(result)
    }),

    http.get(`${base}/:id`, async ({ params }) => {
      await simulateLatency()
      const entity = store.get(String(params.id))
      if (!entity)
        return errorResponse(404, { code: 'NOT_FOUND', message: `${resource.label}不存在` })
      return HttpResponse.json(entity)
    }),

    http.post(base, async ({ request }) => {
      await simulateLatency()
      const body = await request.json().catch(() => undefined)
      const parsed = resource.input.safeParse(body)
      if (!parsed.success) return validationError(parsed.error)
      const created = options.create(parsed.data)
      if (isError(created)) return errorResponse(created.status ?? 422, created.error)
      store.insert(created)
      return HttpResponse.json(created, { status: 201 })
    }),

    http.put(`${base}/:id`, async ({ params, request }) => {
      await simulateLatency()
      const current = store.get(String(params.id))
      if (!current)
        return errorResponse(404, { code: 'NOT_FOUND', message: `${resource.label}不存在` })
      const body = await request.json().catch(() => undefined)
      const parsed = resource.input.safeParse(body)
      if (!parsed.success) return validationError(parsed.error)
      const next = options.update(current, parsed.data)
      if (isError(next)) return errorResponse(next.status ?? 422, next.error)
      store.update(current.id, next)
      return HttpResponse.json(next)
    }),

    http.delete(`${base}/:id`, async ({ params }) => {
      await simulateLatency()
      const current = store.get(String(params.id))
      if (!current)
        return errorResponse(404, { code: 'NOT_FOUND', message: `${resource.label}不存在` })
      const blocked = options.beforeRemove?.(current)
      if (blocked) return errorResponse(409, blocked)
      store.remove(current.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
