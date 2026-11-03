import type { z } from 'zod'
import type { ListQuery, Option, SortOrder } from './common'

/**
 * 资源定义 = 一个业务模块的"接口契约"。
 * 前端 CRUD hooks、CrudPage、Mock handlers 都只依赖这个对象，
 * 因此新增模块只需要：写一个 ResourceDef + 列定义 + 表单。
 */
export interface ResourceDef<
  TEntity extends { id: string },
  TInput,
  TQuery extends ListQuery = ListQuery,
> {
  /** 资源名，决定接口路径 /api/<name> 与 react-query key */
  name: string
  /** 中文名，用于标题、提示文案 */
  label: string
  entity: z.ZodType<TEntity>
  /** 新建 / 编辑共用的入参 schema */
  input: z.ZodType<TInput>
  /** 列表查询参数 schema（在 listQuerySchema 基础上扩展过滤字段） */
  query: z.ZodType<TQuery>
  /** 关键字搜索匹配的字段 */
  searchFields: (keyof TEntity & string)[]
  /** 精确匹配的过滤字段（取值来自 query） */
  filterFields: (keyof TQuery & keyof TEntity & string)[]
  defaultSort: { field: keyof TEntity & string; order: SortOrder }
}

export function defineResource<
  TEntity extends { id: string },
  TInput,
  TQuery extends ListQuery = ListQuery,
>(def: ResourceDef<TEntity, TInput, TQuery>) {
  return def
}

export type EntityOf<R> = R extends ResourceDef<infer E, unknown, ListQuery> ? E : never
export type InputOf<R> = R extends ResourceDef<{ id: string }, infer I, ListQuery> ? I : never
export type QueryOf<R> = R extends ResourceDef<{ id: string }, unknown, infer Q> ? Q : never

/** 把枚举 + 中文标签表转成下拉选项 */
export function toOptions<V extends string>(labels: Record<V, string>): Option<V>[] {
  return (Object.keys(labels) as V[]).map((value) => ({ value, label: labels[value] }))
}
