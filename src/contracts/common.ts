/**
 * 前后端共享的通用契约。
 * - 前端：表单校验、类型推导、URL 查询参数解析
 * - Mock 后端：请求体校验、列表查询（搜索/过滤/排序/分页）
 * 真实后端上线时，以本目录的 schema 为接口契约对齐。
 */
import { z } from 'zod'

export const idSchema = z.string().min(1)

export const timestampFields = {
  createdAt: z.string(),
  updatedAt: z.string(),
}

export const sortOrderSchema = z.enum(['asc', 'desc'])
export type SortOrder = z.infer<typeof sortOrderSchema>

/** 所有列表接口共享的查询参数：GET /api/:resource?page=1&pageSize=10&q=&sort=&order= */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
  q: z.string().trim().optional(),
  sort: z.string().optional(),
  order: sortOrderSchema.optional(),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  })

/** 统一错误体：所有非 2xx 响应都返回此结构 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  /** 字段级错误，前端直接映射到表单 */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

export interface Option<V extends string = string> {
  value: V
  label: string
}
