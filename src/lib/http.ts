import { apiErrorSchema, type ApiErrorBody } from '@/contracts/common'
import { compact } from './utils'

/** 统一的 API 错误：携带 HTTP 状态、业务 code 与字段级错误 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fieldErrors = body.fieldErrors
  }

  static is(err: unknown): err is ApiError {
    return err instanceof ApiError
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: QueryParams
  signal?: AbortSignal
  headers?: Record<string, string>
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export function buildUrl(path: string, query?: QueryParams) {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(compact(query))) params.set(k, String(v))
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * 项目内唯一的 fetch 出口（ESLint 禁止其他地方直接用 fetch）。
 * - 自动 JSON 序列化 / 反序列化
 * - 非 2xx 统一抛出 ApiError
 * - 204 返回 undefined
 */
export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, headers } = options
  const res = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let json: unknown = undefined
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = undefined
    }
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json)
    throw new ApiError(
      res.status,
      parsed.success
        ? parsed.data
        : { code: 'HTTP_ERROR', message: `请求失败（${res.status} ${res.statusText}）` },
    )
  }
  return json as T
}
